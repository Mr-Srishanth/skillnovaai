import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NONSENSE = /^(hi|hello|hey|abc|test|asdf|qwerty|lol|ok|yes|no|random|whatever|blah|foo|bar|baz|123)\s*$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, skills, roleA, roleB } = await req.json();

    // Validate
    if (mode === "current-vs-target") {
      if (!skills?.trim() || !roleA?.trim()) {
        return new Response(JSON.stringify({ error: "Please provide your skills and target role.", validationFailed: true }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (NONSENSE.test(skills.trim()) || NONSENSE.test(roleA.trim())) {
        return new Response(JSON.stringify({ error: "Please enter valid skills and a real job role.", validationFailed: true }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      if (!roleA?.trim() || !roleB?.trim()) {
        return new Response(JSON.stringify({ error: "Please provide both roles to compare.", validationFailed: true }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (NONSENSE.test(roleA.trim()) || NONSENSE.test(roleB.trim())) {
        return new Response(JSON.stringify({ error: "Please enter real job roles.", validationFailed: true }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isCurrentVsTarget = mode === "current-vs-target";

    const userPrompt = isCurrentVsTarget
      ? `My current skills: ${skills}\nTarget role: ${roleA}\n\nCompare my current skills against the target role requirements. Provide a readiness score (0-100) and clear reasoning.`
      : `Compare these two career roles:\nRole A: ${roleA}\nRole B: ${roleB}\n${skills ? `My current skills: ${skills}` : ""}\n\nCompare required skills, difficulty, time to learn, and job readiness for both roles. Provide clear reasoning about which is better suited.`;

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
            content: `You are SkillNova AI — an expert career comparison advisor. Be specific, data-driven, and insightful. Never hallucinate or produce generic advice. Always explain your reasoning with specific references to the skills and roles provided. Speak like a confident mentor.`,
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "career_comparison",
              description: "Return structured career comparison with reasoning",
              parameters: {
                type: "object",
                properties: {
                  leftLabel: { type: "string" },
                  rightLabel: { type: "string" },
                  leftSkills: { type: "array", items: { type: "string" } },
                  rightSkills: { type: "array", items: { type: "string" } },
                  leftDifficulty: { type: "string" },
                  rightDifficulty: { type: "string" },
                  leftTimeToLearn: { type: "string" },
                  rightTimeToLearn: { type: "string" },
                  readinessScore: { type: "number", description: "0-100 readiness score (for current-vs-target)" },
                  reasoning: { type: "string", description: "2-3 sentence explanation of the comparison" },
                  insights: { type: "array", items: { type: "string" }, description: "3-5 specific comparative insights" },
                },
                required: ["leftLabel", "rightLabel", "leftSkills", "rightSkills", "leftDifficulty", "rightDifficulty", "leftTimeToLearn", "rightTimeToLearn", "insights"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "career_comparison" } },
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
    result.mode = mode;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compare-careers error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
