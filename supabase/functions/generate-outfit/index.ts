import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Product { title: string; price: string; image: string; link: string; }

// ───────── Product search (unchanged sync mode) ─────────
async function handleProductSearch(query: string, limit: number): Promise<Response> {
  const cleanQuery = query
    .replace(/^\d+\.\s*/, "")
    .replace(/^The\s+\w+:\s*/i, "")
    .replace(/^An?\s+/i, "")
    .replace(/\s+or\s+.+$/i, "")
    .replace(/\s+in\s+a\s+.+$/i, "")
    .replace(/[.]+$/, "")
    .trim();

  const products: Product[] = [];
  const encodedQuery = encodeURIComponent(cleanQuery);

  try {
    const imageSearchUrl = `https://lexica.art/api/v1/search?q=${encodedQuery}+fashion+photography`;
    const imageResponse = await fetch(imageSearchUrl);
    let images: string[] = [];
    if (imageResponse.ok) {
      const data = await imageResponse.json();
      images = (data.images || []).map((img: any) => img.src).filter(Boolean);
    }

    const platforms = [
      { name: "Myntra", base: `https://www.myntra.com/${cleanQuery.replace(/\s+/g, "-")}` },
      { name: "Ajio", base: `https://www.ajio.com/search/?text=${encodedQuery}` },
      { name: "Amazon", base: `https://www.amazon.in/s?k=${encodedQuery}` },
      { name: "Flipkart", base: `https://www.flipkart.com/search?q=${encodedQuery}` },
    ];

    for (let i = 0; i < limit; i++) {
      const platform = platforms[i % platforms.length];
      products.push({
        title: `${cleanQuery} on ${platform.name}`,
        price: i % 2 === 0 ? "Browse Styles" : "View Collection",
        image: images[i] || "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=800",
        link: platform.base,
      });
    }
  } catch (e) {
    console.error("Search failed:", e);
  }

  return new Response(JSON.stringify({ products, query: cleanQuery, success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ───────── Background job processor ─────────
async function processOutfitJob(jobId: string, supabaseAdmin: any, body: any) {
  const { occasion, season, palette, vibe, gender, analysisContext, specifications, userId } = body;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    await supabaseAdmin.from("generation_jobs").update({ status: "processing" }).eq("id", jobId);

    const genderLabel = gender === "male" ? "men's" : "women's";
    const prompt = `Generate a complete ${genderLabel} outfit recommendation for:
- Occasion: ${occasion}
- Season: ${season}
${palette ? `- Color Palette: ${palette}` : ""}
${vibe ? `- Style Vibe: ${vibe}` : ""}
${specifications ? `\n**User specifications (must respect):** ${specifications}` : ""}
${analysisContext ? `\n\nPrior analysis of user (use as inspiration, don't repeat current pieces):\n${String(analysisContext).slice(0, 2000)}` : ""}

Provide:
1. Creative outfit name
2. Item breakdown: **Top**, **Bottom**, **Shoes**, **Accessories**
3. **Styling Tips**: 2-3
4. **Alternatives**: 1-2 swaps

Use markdown. Be specific with colors, materials. Tailor to ${genderLabel} fashion.`;

    const textResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are StyleSense, an expert AI fashion stylist. Be specific and richly formatted." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!textResp.ok) {
      const t = await textResp.text();
      throw new Error(`Text gen failed (${textResp.status}): ${t.slice(0, 200)}`);
    }
    const textData = await textResp.json();
    const text = textData.choices?.[0]?.message?.content || "Unable to generate outfit.";

    // Image generation
    let imageUrl: string | undefined;
    try {
      const imagePrompt = `Editorial fashion flat-lay mood board for a ${vibe || "stylish"} ${genderLabel} ${occasion} outfit, ${season}. ${palette ? `Palette: ${palette}.` : ""} ${specifications ? `Must include: ${specifications}.` : ""} Cream background, elegant arrangement, ultra high-res.`;
      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (imgResp.ok) {
        const imgData = await imgResp.json();
        const dataUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (dataUrl?.startsWith("data:")) {
          // Upload base64 to storage so it's a permanent URL
          const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
          if (match) {
            const mime = match[1];
            const ext = mime.split("/")[1] || "png";
            const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
            const path = `${userId}/${jobId}.${ext}`;
            const { error: upErr } = await supabaseAdmin.storage
              .from("outfit-uploads")
              .upload(path, bytes, { contentType: mime, upsert: true });
            if (!upErr) {
              const { data: pub } = supabaseAdmin.storage.from("outfit-uploads").getPublicUrl(path);
              imageUrl = pub.publicUrl;
            }
          }
        } else if (dataUrl) {
          imageUrl = dataUrl;
        }
      }
    } catch (imgErr) {
      console.error("Image gen error:", imgErr);
    }

    // Auto-save to saved_outfits (Lookbook)
    const outfitName = `${vibe || "Stylish"} ${occasion} Look`.trim();
    const { data: savedOutfit } = await supabaseAdmin.from("saved_outfits").insert({
      user_id: userId,
      name: outfitName,
      description: specifications || null,
      occasion,
      season,
      ai_generated_text: text,
      image_url: imageUrl || null,
    }).select().single();

    // Auto-save to wardrobe as a generated look
    if (imageUrl) {
      await supabaseAdmin.from("wardrobe_items").insert({
        user_id: userId,
        name: outfitName,
        category: "Generated Outfit",
        color: palette || null,
        season: season || null,
        image_url: imageUrl,
        tags: [vibe, occasion, "ai-generated"].filter(Boolean),
        notes: specifications || null,
      });
    }

    await supabaseAdmin.from("generation_jobs").update({
      status: "completed",
      output_text: text,
      output_image_url: imageUrl || null,
    }).eq("id", jobId);

    console.log(`Job ${jobId} completed. Saved outfit: ${savedOutfit?.id}`);
  } catch (err: any) {
    console.error(`Job ${jobId} failed:`, err);
    await supabaseAdmin.from("generation_jobs").update({
      status: "failed",
      error: err?.message || "Unknown error",
    }).eq("id", jobId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    if (body.action === "search-products") {
      return await handleProductSearch(body.query || "", body.limit || 5);
    }

    // Background outfit job
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create job row
    const { data: job, error: jobErr } = await supabaseAdmin.from("generation_jobs").insert({
      user_id: user.id,
      kind: "outfit",
      status: "pending",
      input: {
        occasion: body.occasion,
        season: body.season,
        palette: body.palette,
        vibe: body.vibe,
        gender: body.gender,
        specifications: body.specifications,
      },
    }).select().single();

    if (jobErr || !job) throw new Error(jobErr?.message || "Failed to create job");

    // Run in background — survives client refresh / tab switch
    // @ts-ignore - EdgeRuntime is provided by Deno Deploy
    EdgeRuntime.waitUntil(processOutfitJob(job.id, supabaseAdmin, { ...body, userId: user.id }));

    return new Response(JSON.stringify({ jobId: job.id, status: "pending" }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-outfit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
