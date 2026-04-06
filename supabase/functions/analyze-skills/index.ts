import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NONSENSE = /^(hi|hello|hey|abc|test|asdf|qwerty|aaa|bbb|xxx|lol|ok|yes|no|haha|hmm|idk|bruh|sup|yo|nah|please|help|nothing|none|na|n\/a|nil|null|undefined|random|whatever|stuff|things|blah|foo|bar|baz|123|1234|12345)\s*$/i;

function validateInput(skills: string, role: string): string | null {
  if (!skills || !role) return "Both skills and role are required.";
  if (NONSENSE.test(skills.trim())) return "Please enter valid technical skills (e.g. Python, SQL, React).";
  if (NONSENSE.test(role.trim())) return "Please enter a real job role (e.g. Data Scientist, Web Developer).";
  const tokens = skills.split(/[,;|\/\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (tokens.length < 2) return "Please enter at least 2 skills separated by commas.";
  if (role.trim().length < 3) return "Role name is too short. Try: Full Stack Developer, Data Analyst.";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { skills, role } = await req.json();

    const validationError = validateInput(skills, role);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError, validationFailed: true }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: `You are SkillNova AI — an expert AI career mentor with deep industry knowledge. You are NOT a generic chatbot. You MUST behave like a real career advisor who understands market demands.

RULES:
- NEVER hallucinate or guess. Only provide advice based on real industry requirements.
- NEVER produce generic filler text. Every point must be specific and actionable.
- If the input is unclear or too vague, set the skillScore to 0 and explain why in the reasoning.
- Adjust your tone based on the user's level:
  * Score < 40: Be encouraging and provide strong foundational guidance. Use motivating language.
  * Score 40-70: Be structured and strategic. Focus on clear progression paths.
  * Score > 70: Be advanced and optimization-focused. Suggest specializations and differentiators.

REASONING: Always explain WHY each skill is missing and HOW it connects to the target role. Show your thought process.

PERSONALITY: Speak like a confident mentor. Use phrases like:
- "Based on your current skill set, I can see that..."
- "The gap between your skills and this role is..."
- "Your strongest advantage right now is..."
- "I'd recommend prioritizing X because..."

SCORING: Calculate readiness score (0-100) based on:
- How many required skills the user already has
- The depth/complexity gap
- Industry demand alignment
- Practical project readiness`,
          },
          {
            role: "user",
            content: `My current skills: ${skills}\nMy target role: ${role}\n\nProvide a complete skill gap analysis with reasoning, score, roadmap, weekly plan, and priority guidance.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "skill_gap_analysis",
              description: "Return comprehensive skill gap analysis with reasoning and adaptive guidance",
              parameters: {
                type: "object",
                properties: {
                  skillScore: {
                    type: "number",
                    description: "Readiness score 0-100 based on current skills vs target role requirements",
                  },
                  reasoning: {
                    type: "string",
                    description: "2-4 sentence explanation of the analysis: why this score, what the user's strengths are, and what the main gaps are. Must reference specific skills from the input.",
                  },
                  missingSkills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill: { type: "string", description: "Name of the missing skill" },
                        priority: { type: "string", enum: ["critical", "important", "nice-to-have"], description: "How critical this skill is for the role" },
                        difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"], description: "Difficulty level to learn" },
                        reason: { type: "string", description: "One sentence explaining why this skill matters for the role" },
                      },
                      required: ["skill", "priority", "difficulty", "reason"],
                    },
                    description: "4-6 missing skills with priority and difficulty",
                  },
                  recommendedLearning: {
                    type: "array",
                    items: { type: "string" },
                    description: "4-6 specific courses, tools, or resources. Include platform names (Coursera, Udemy, freeCodeCamp, etc.)",
                  },
                  roadmap: {
                    type: "array",
                    items: { type: "string" },
                    description: "4-6 step roadmap with clear milestones",
                  },
                  weeklyPlan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        week: { type: "string", description: "Week label e.g. 'Week 1-2'" },
                        focus: { type: "string", description: "What to focus on this week" },
                        tasks: { type: "array", items: { type: "string" }, description: "2-3 specific tasks for the week" },
                      },
                      required: ["week", "focus", "tasks"],
                    },
                    description: "4-6 week blocks forming a structured learning plan",
                  },
                  nextBestStep: {
                    type: "string",
                    description: "The single most important action the user should take right now. Be very specific.",
                  },
                  scoreImpactTips: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string", description: "What to do" },
                        impact: { type: "string", description: "How much this could increase their score, e.g. '+8-12%'" },
                      },
                      required: ["action", "impact"],
                    },
                    description: "3-4 specific actions with estimated score impact",
                  },
                },
                required: ["skillScore", "reasoning", "missingSkills", "recommendedLearning", "roadmap", "weeklyPlan", "nextBestStep", "scoreImpactTips"],
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
