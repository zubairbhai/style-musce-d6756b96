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

    const userContent: any[] = [
      {
        type: "text",
        text: `Analyze ${imageUrls.length > 1 ? "these images" : "this image"}. First detect if a human is present. If yes, identify skin tone, body type, and every clothing piece + accessories visible. Then give styling feedback.${occasion ? ` Occasion: ${occasion}.` : ""}${season ? ` Season: ${season}.` : ""}${context ? ` User wants: ${context}.` : ""} Always call the report_analysis tool with your findings.`,
      },
    ];
    for (const url of imageUrls) {
      userContent.push({ type: "image_url", image_url: { url } });
    }

    const tool = {
      type: "function",
      function: {
        name: "report_analysis",
        description: "Report a structured outfit analysis with detection + styling feedback.",
        parameters: {
          type: "object",
          properties: {
            is_human: { type: "boolean", description: "True only if a real human person is clearly visible." },
            detected_object: { type: "string", description: "If not human, what is shown (e.g. 'tree', 'car', 'product photo on hanger')." },
            skin_tone: { type: "string", enum: ["Fair", "Light", "Medium", "Wheatish", "Tan", "Brown", "Dark", "Unknown"] },
            body_type: { type: "string", enum: ["Slim", "Athletic", "Average", "Curvy", "Plus", "Unknown"] },
            gender_presentation: { type: "string", enum: ["male", "female", "androgynous", "unknown"] },
            outfit: {
              type: "object",
              properties: {
                upper_wear: { type: "string", description: "e.g. 'White cotton crew-neck T-shirt'" },
                bottom_wear: { type: "string" },
                footwear: { type: "string" },
                outerwear: { type: "string", description: "Jacket/coat or empty if none" },
                accessories: { type: "array", items: { type: "string" } },
                dominant_colors: { type: "array", items: { type: "string" }, description: "Top 3 outfit colors as common names" },
              },
              required: ["upper_wear", "bottom_wear", "footwear", "accessories", "dominant_colors"],
            },
            rating: { type: "number", description: "Overall outfit rating 1-10", minimum: 1, maximum: 10 },
            verdict: { type: "string", description: "One-sentence overall verdict." },
            what_works: { type: "array", items: { type: "string" }, description: "2-4 strengths" },
            improvements: { type: "array", items: { type: "string" }, description: "2-4 actionable suggestions" },
            styling_tips: { type: "array", items: { type: "string" }, description: "2-3 tips for the occasion/season" },
            alternative_pieces: { type: "array", items: { type: "string" }, description: "1-3 swap ideas to elevate the look" },
          },
          required: ["is_human", "rating", "verdict", "what_works", "improvements", "styling_tips"],
          additionalProperties: false,
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are StyleSense, an expert AI fashion analyst. You MUST first decide if a real human is clearly visible. Do NOT classify trees, mannequins-only shots, objects, or pets as humans. If not human, set is_human=false, fill detected_object, leave outfit fields as 'N/A', rating=0, verdict='Not a human — no clothing analyzed.', and leave the styling arrays empty. If human, fill every field thoroughly. Always respond by calling the report_analysis tool.",
          },
          { role: "user", content: userContent },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "report_analysis" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded" : "Payment required" }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = null;
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch (e) { console.error("Tool parse error:", e); }
    }

    if (!parsed) {
      return new Response(JSON.stringify({ error: "Unable to parse analysis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ structured: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-outfit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
