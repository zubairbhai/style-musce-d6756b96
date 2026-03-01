import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrls, occasion, season, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!imageUrls || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are StyleSense, an expert AI fashion analyst and stylist. You analyze outfit images and provide detailed, honest, and constructive feedback.

Your analysis should include:
1. **Overall Assessment** - Rate the outfit (1-10) and give a brief verdict
2. **What Works Well** - Highlight the strengths of the outfit
3. **Areas for Improvement** - Constructive suggestions
4. **Combination Suggestions** - If multiple clothing items are shown, suggest the best combinations
5. **Styling Tips** - Specific advice for the occasion/season
6. **Alternative Pieces** - Suggest swaps that could elevate the look

Context:
- Occasion: ${occasion || "Not specified"}
- Season: ${season || "Not specified"}
- Additional context: ${context || "None"}

Be warm, encouraging, and specific. Use markdown formatting with headers, bullet points, and bold text. Add relevant fashion emojis sparingly.`;

    // Build message content with images
    const userContent: any[] = [
      {
        type: "text",
        text: `Please analyze ${imageUrls.length > 1 ? "these outfit pieces" : "this outfit"} and give me your expert styling opinion.${occasion ? ` I'm dressing for: ${occasion}.` : ""}${season ? ` Season: ${season}.` : ""}${context ? ` ${context}` : ""}`,
      },
    ];

    for (const url of imageUrls) {
      userContent.push({
        type: "image_url",
        image_url: { url },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Unable to analyze the outfit.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-outfit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
