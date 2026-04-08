import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NONSENSE = /^(hi|hello|hey|abc|test|asdf|qwerty|aaa|bbb|xxx|lol|ok|yes|no)\s*$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { skills, targetRole, studyHoursPerDay } = await req.json();

    if (!skills || NONSENSE.test(skills.trim())) {
      return new Response(JSON.stringify({ error: "Please enter valid skills." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!targetRole || NONSENSE.test(targetRole.trim())) {
      return new Response(JSON.stringify({ error: "Please enter a valid target role." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hours = Number(studyHoursPerDay);
    if (!hours || hours < 0.5 || hours > 16) {
      return new Response(JSON.stringify({ error: "Study hours must be between 0.5 and 16." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
            content: `You are a career growth predictor. Given a user's current skills, target role, and daily study time, predict realistic growth milestones at 1 month, 3 months, and 6 months. Be realistic — not overly optimistic. Factor in study hours realistically (1hr/day is slow, 4hrs is dedicated, 8+ is full-time bootcamp pace).`,
          },
          {
            role: "user",
            content: `Current skills: ${skills}\nTarget role: ${targetRole}\nStudy hours per day: ${hours}\n\nPredict my career growth trajectory.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "career_simulation",
              description: "Predict career growth trajectory with milestones and salary estimates",
              parameters: {
                type: "object",
                properties: {
                  currentReadiness: {
                    type: "number",
                    description: "Current readiness percentage 0-100",
                  },
                  milestones: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        period: { type: "string", description: "Time period label e.g. '1 Month'" },
                        readiness: { type: "number", description: "Predicted readiness % at this point" },
                        skillsGained: { type: "array", items: { type: "string" }, description: "2-4 skills the user would have learned" },
                        milestone: { type: "string", description: "Key achievement at this stage" },
                        jobReady: { type: "boolean", description: "Whether the user would be job-ready at this point" },
                      },
                      required: ["period", "readiness", "skillsGained", "milestone", "jobReady"],
                    },
                    description: "Exactly 3 milestones: 1 month, 3 months, 6 months",
                  },
                  salaryRange: {
                    type: "object",
                    properties: {
                      entry: { type: "string", description: "Entry-level salary range e.g. '$50K-$70K'" },
                      mid: { type: "string", description: "Mid-level salary range after 1-2 years" },
                      senior: { type: "string", description: "Senior salary range after 3-5 years" },
                    },
                    required: ["entry", "mid", "senior"],
                  },
                  insight: {
                    type: "string",
                    description: "2-3 sentence personalized insight about their trajectory. Reference their specific situation.",
                  },
                  recommendation: {
                    type: "string",
                    description: "One specific recommendation to accelerate their growth",
                  },
                },
                required: ["currentReadiness", "milestones", "salaryRange", "insight", "recommendation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "career_simulation" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulate-career error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
