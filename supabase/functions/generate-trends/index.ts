import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category } = await req.json();
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is not configured");

    const prompt = `Generate 4 current fashion trends for the "${category}" category. For each trend provide:
1. A catchy trend title
2. A detailed description (2-3 sentences) about the trend, what makes it popular, and how to incorporate it

Return as JSON array with objects having "title" and "description" fields. Return ONLY the JSON array, no other text.`;

    const response = await fetch("https://ai.gateway.stylesense.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a fashion trend analyst. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded" : "Payment required" }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse JSON from response
    let trends: Array<{ title: string; description: string; imageUrl?: string }> = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        trends = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse trends JSON");
    }

    // Generate images for each trend
    for (let i = 0; i < trends.length; i++) {
      try {
        const imgResponse = await fetch("https://ai.gateway.stylesense.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: `Fashion editorial photo representing the trend "${trends[i].title}" in ${category} fashion. Stylish, modern, high-end fashion photography. 16:9 aspect ratio.` }],
            modalities: ["image", "text"],
          }),
        });

        if (imgResponse.ok) {
          const imgData = await imgResponse.json();
          trends[i].imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        }
      } catch (imgErr) {
        console.error(`Image gen error for trend ${i}:`, imgErr);
      }
    }

    return new Response(JSON.stringify({ trends }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
