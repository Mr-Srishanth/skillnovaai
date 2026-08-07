import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NONSENSE = /^(hi|hello|hey|abc|test|asdf|qwerty|aaa|bbb|xxx|lol|ok|yes|no)\s*$/i;

const CURRENCY_RULE: Record<string, string> = {
  India: "Report ALL salary figures in Indian Rupees using LPA format, e.g. '₹4–7 LPA'. Never use dollars.",
  "United States": "Report all salary figures in USD per year, e.g. '$70K–$95K'.",
  "United Kingdom": "Report all salary figures in GBP per year, e.g. '£38K–£55K'.",
  Europe: "Report all salary figures in EUR per year, e.g. '€45K–€65K'.",
  Remote: "Report all salary figures in USD per year, e.g. '$70K–$95K'.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { skills, targetRole, studyHoursPerDay, region, currentReadiness, forecast, signals } = await req.json();

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

    const rgn = region || "India";
    const points = Array.isArray(forecast) && forecast.length
      ? forecast.map((f: any) => `${f.period}: ${f.readiness}%`).join(", ")
      : "not supplied";

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
            content: `You are a career growth predictor. The platform engine has ALREADY computed the readiness percentages — never invent or contradict them. Your job is to describe what happens at each checkpoint (3, 6 and 12 months) and estimate realistic pay. ${CURRENCY_RULE[rgn] || CURRENCY_RULE.India}`,
          },
          {
            role: "user",
            content: `Current skills: ${skills}
Target role: ${targetRole}
Study hours per day: ${hours}
Region: ${rgn}
Current computed readiness: ${currentReadiness ?? "unknown"}%
Engine-projected readiness: ${points}
Other signals: projects ${signals?.projectsCount ?? 0}, knowledge packs ${signals?.knowledgePacks ?? 0}, resume score ${signals?.resumeScore ?? "n/a"}, interview score ${signals?.interviewScore ?? "n/a"}, streak ${signals?.streak ?? 0} days

For each of the 3 checkpoints describe the milestone reached and the skills gained at that specific readiness level, then give the salary bands.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "career_simulation",
              description: "Narrative for the engine-computed growth trajectory",
              parameters: {
                type: "object",
                properties: {
                  milestones: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        period: { type: "string", description: "'3 Months', '6 Months' or '12 Months'" },
                        skillsGained: { type: "array", items: { type: "string" }, description: "2-4 skills learned by this point" },
                        milestone: { type: "string", description: "Key achievement at this stage, consistent with the supplied readiness" },
                      },
                      required: ["period", "skillsGained", "milestone"],
                    },
                    description: "Exactly 3 entries: 3 Months, 6 Months, 12 Months",
                  },
                  salaryRange: {
                    type: "object",
                    properties: {
                      entry: { type: "string", description: "Entry-level band in the required currency" },
                      mid: { type: "string", description: "Mid-level band after 1-2 years" },
                      senior: { type: "string", description: "Senior band after 3-5 years" },
                    },
                    required: ["entry", "mid", "senior"],
                  },
                  insight: {
                    type: "string",
                    description: "2-3 sentences about this trajectory, referencing their study hours and actual signals",
                  },
                  recommendation: {
                    type: "string",
                    description: "One specific action that would accelerate the curve most",
                  },
                },
                required: ["milestones", "salaryRange", "insight", "recommendation"],
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
