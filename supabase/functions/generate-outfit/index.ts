import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Unified outfit generation + product search edge function.
 * 
 * Accepts two modes:
 * 1. Outfit Generation (original): { occasion, season, palette, vibe, gender }
 * 2. Product Search (new):         { action: "search-products", query: string, limit?: number }
 */

interface Product {
  title: string;
  price: string;
  image: string;
  link: string;
}

async function handleProductSearch(query: string, limit: number): Promise<Response> {
  // Clean up query: remove prefixes, trailing periods, "A/An" starters, "or" alternatives
  const cleanQuery = query
    .replace(/^\d+\.\s*/, "")
    .replace(/^The\s+\w+:\s*/i, "")
    .replace(/^An?\s+/i, "")
    .replace(/\s+or\s+.+$/i, "") // pick first option before "or"
    .replace(/\s+in\s+a\s+.+$/i, "") // remove "in a crisp poplin cotton"
    .replace(/[.]+$/, "")
    .trim();

  console.log("Searching products (cleaned):", cleanQuery);

  const products: Product[] = [];
  const encodedQuery = encodeURIComponent(cleanQuery);

  try {
    // Try to fetch high-quality fashion images for the query (FREE via Lexica API)
    // Lexica is an AI search engine with a public API that returns stunning fashion images.
    const imageSearchUrl = `https://lexica.art/api/v1/search?q=${encodedQuery}+fashion+photography`;
    const imageResponse = await fetch(imageSearchUrl);
    
    let images: string[] = [];
    if (imageResponse.ok) {
      const data = await imageResponse.json();
      images = (data.images || []).map((img: any) => img.src).filter(Boolean);
    }

    // Direct shopping platforms in India
    const platforms = [
      { name: "Myntra", base: `https://www.myntra.com/${cleanQuery.replace(/\s+/g, "-")}`, color: "pink" },
      { name: "Ajio", base: `https://www.ajio.com/search/?text=${encodedQuery}`, color: "black" },
      { name: "Amazon", base: `https://www.amazon.in/s?k=${encodedQuery}`, color: "yellow" },
      { name: "Flipkart", base: `https://www.flipkart.com/search?q=${encodedQuery}`, color: "blue" },
    ];

    // Build product objects
    for (let i = 0; i < limit; i++) {
        const platform = platforms[i % platforms.length];
        const platformSuffix = i >= platforms.length ? ` (Var ${Math.floor(i / platforms.length)})` : "";
        
        products.push({
            title: `${cleanQuery} on ${platform.name}${platformSuffix}`,
            price: i % 2 === 0 ? "Browse Styles" : "View Collection",
            image: images[i] || "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=800", // Fallback to a curated shop image
            link: platform.base,
        });
    }

    if (products.length > 0) {
      return new Response(
        JSON.stringify({ products, query: cleanQuery, success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("Lexica/Search failed:", e);
  }

  // Final fallback (should rarely hit this if Lexica is up)
  const finalFallback: Product[] = [
    {
      title: `${cleanQuery} on Myntra`,
      price: "Check Collection",
      image: "https://images.unsplash.com/photo-1489980557514-251d61e3eeb6?auto=format&fit=crop&q=80&w=800",
      link: `https://www.myntra.com/${cleanQuery.replace(/\s+/g, "-")}`,
    },
    {
      title: `${cleanQuery} on Ajio`,
      price: "View Offers",
      image: "https://images.unsplash.com/photo-1445205170230-053b830c6050?auto=format&fit=crop&q=80&w=800",
      link: `https://www.ajio.com/search/?text=${encodedQuery}`,
    }
  ];

  return new Response(
    JSON.stringify({ products: finalFallback, query: cleanQuery, fallback: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleOutfitGeneration(body: any): Promise<Response> {
  const { occasion, season, palette, vibe, gender, analysisContext } = body;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const genderLabel = gender === "male" ? "men's" : "women's";

  const prompt = `Generate a complete ${genderLabel} outfit recommendation for the following:
- Occasion: ${occasion}
- Season: ${season}
${palette ? `- Color Palette: ${palette}` : ""}
${vibe ? `- Style Vibe: ${vibe}` : ""}
${analysisContext ? `\n\nPrior outfit analysis of the user (use as inspiration & avoid repeating their current pieces):\n${String(analysisContext).slice(0, 2000)}` : ""}

Provide:
1. A creative outfit name/title
2. Item-by-item breakdown:
   - **Top**: specific item with color, fabric, style
   - **Bottom**: specific item with color, fabric, style
   - **Shoes**: specific footwear
   - **Accessories**: 2-3 accessories
3. **Styling Tips**: 2-3 tips for pulling it together
4. **Alternatives**: 1-2 swap options

Use markdown formatting. Be specific with colors, materials, and brands where appropriate. Tailor all items specifically for ${genderLabel} fashion.`;

  const textResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are StyleSense, an expert AI fashion stylist. Provide detailed, specific outfit recommendations with rich formatting." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!textResponse.ok) {
    const status = textResponse.status;
    if (status === 429 || status === 402) {
      return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded" : "Payment required" }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    throw new Error("AI text generation failed");
  }

  const textData = await textResponse.json();
  const text = textData.choices?.[0]?.message?.content || "Unable to generate outfit.";

  // Generate mood board image via Lovable AI Gateway
  let imageUrl: string | undefined;
  try {
    if (LOVABLE_API_KEY) {
      const imagePrompt = `Fashion flat-lay mood board for a ${vibe || "stylish"} ${genderLabel} ${occasion} outfit for ${season}. ${palette ? `Color palette: ${palette}.` : ""} Editorial fashion photography, elegant arrangement on cream background, high-end ${genderLabel} fashion items, accessories, and textures. Ultra high resolution.`;

      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      }
    }
  } catch (imgErr) {
    console.error("Image generation error:", imgErr);
  }

  return new Response(JSON.stringify({ text, imageUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // Route to product search if action is specified
    if (body.action === "search-products") {
      const query = body.query || "";
      const limit = body.limit || 5;
      if (!query) {
        return new Response(
          JSON.stringify({ error: "No search query provided", products: [] }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return await handleProductSearch(query, limit);
    }

    // Default: outfit generation
    return await handleOutfitGeneration(body);
  } catch (e) {
    console.error("generate-outfit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
