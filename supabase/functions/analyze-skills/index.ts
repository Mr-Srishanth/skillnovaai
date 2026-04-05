import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { skills, role } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert AI career advisor. Given a user's current skills and their dream job role, analyze the gap and respond using the provided tool. Be specific, actionable, and encouraging. Use simple English and keep items concise (one line each).`,
          },
          {
            role: "user",
            content: `My current skills: ${skills}\nMy dream role: ${role}\n\nAnalyze my skill gap.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "skill_gap_analysis",
              description: "Return structured skill gap analysis",
              parameters: {
                type: "object",
                properties: {
                  missingSkills: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of 4-6 skills the user is missing for their target role",
                  },
                  recommendedLearning: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of 4-6 specific courses, tools, or resources to learn",
                  },
                  roadmap: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 step roadmap to reach their goal",
                  },
                },
                required: ["missingSkills", "recommendedLearning", "roadmap"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "skill_gap_analysis" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-skills error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
