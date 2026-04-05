import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, skills, roleA, roleB } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isCurrentVsTarget = mode === "current-vs-target";

    const userPrompt = isCurrentVsTarget
      ? `My current skills: ${skills}\nTarget role: ${roleA}\n\nCompare my current skills against the target role requirements. Provide a readiness score (0-100).`
      : `Compare these two career roles:\nRole A: ${roleA}\nRole B: ${roleB}\n${skills ? `My current skills: ${skills}` : ""}\n\nCompare required skills, difficulty, time to learn, and job readiness for both roles.`;

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
            content: `You are an expert AI career advisor. Compare careers or skills vs role requirements. Be specific, insightful, and encouraging. Provide actionable insights that help with decision-making.`,
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "career_comparison",
              description: "Return structured career comparison",
              parameters: {
                type: "object",
                properties: {
                  leftLabel: { type: "string", description: "Label for left side (e.g. 'Your Skills' or role name)" },
                  rightLabel: { type: "string", description: "Label for right side (target role or second role)" },
                  leftSkills: { type: "array", items: { type: "string" }, description: "4-6 skills for left side" },
                  rightSkills: { type: "array", items: { type: "string" }, description: "4-6 skills for right side" },
                  leftDifficulty: { type: "string", description: "Difficulty level: Beginner, Intermediate, Advanced, Expert" },
                  rightDifficulty: { type: "string", description: "Difficulty level" },
                  leftTimeToLearn: { type: "string", description: "Estimated time e.g. '3-6 months'" },
                  rightTimeToLearn: { type: "string", description: "Estimated time" },
                  readinessScore: { type: "number", description: "0-100 readiness score (only for current-vs-target mode, null for role-vs-role)" },
                  insights: { type: "array", items: { type: "string" }, description: "3-5 comparative insights explaining differences and recommendations" },
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
