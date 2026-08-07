import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "roadmap" | "readiness" | "company" | "salary" | "trends" | "insights";

const SYSTEM = `You are SkillNova Career Intelligence — an elite AI career analyst.
RULES:
- Ground every number and recommendation in the specific user profile provided. Never generic filler.
- Be realistic: no inflated scores, no fake certainty. Use ranges when estimating.
- Simple, clear English. Short, concrete sentences.
- Always explain WHY, not just WHAT.`;

const SCHEMAS: Record<Mode, any> = {
  roadmap: {
    name: "career_roadmap",
    description: "A living, milestone-based career roadmap adapted to the user's profile",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "2 sentence overview of the roadmap strategy for this user" },
        totalEstimatedWeeks: { type: "number" },
        milestones: {
          type: "array",
          description: "Exactly 8 milestones in order: Learn, Practice, Build, Deploy, Portfolio, Resume, Interview, Placement Ready",
          items: {
            type: "object",
            properties: {
              stage: { type: "string", enum: ["Learn", "Practice", "Build", "Deploy", "Portfolio", "Resume", "Interview", "Placement Ready"] },
              title: { type: "string", description: "Specific title tailored to the target role" },
              description: { type: "string", description: "1-2 sentences on what to accomplish and why it matters" },
              difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
              estimatedTime: { type: "string", description: "e.g. '3 weeks'" },
              tasks: { type: "array", items: { type: "string" }, description: "3-4 concrete checkable tasks" },
              resources: { type: "array", items: { type: "string" }, description: "2-3 named resources/tools" },
              projects: { type: "array", items: { type: "string" }, description: "1-2 project ideas for this milestone" },
            },
            required: ["stage", "title", "description", "difficulty", "estimatedTime", "tasks", "resources", "projects"],
          },
        },
      },
      required: ["summary", "totalEstimatedWeeks", "milestones"],
    },
  },
  readiness: {
    name: "career_readiness",
    description: "Narrative layer on top of the deterministic readiness scores supplied in the profile",
    parameters: {
      type: "object",
      properties: {
        verdict: { type: "string", description: "One punchy sentence describing where the user stands, consistent with the supplied overall score" },
        dimensions: {
          type: "array",
          description: "Exactly 6 dimensions, same names and order as the supplied scores",
          items: {
            type: "object",
            properties: {
              name: { type: "string", enum: ["Skills", "Projects", "Knowledge", "Resume", "Interview", "Consistency"] },
              insight: { type: "string", description: "1-2 sentences explaining the supplied score using the user's actual profile" },
              action: { type: "string", description: "The single next action to raise this score" },
            },
            required: ["name", "insight", "action"],
          },
        },
        strongest: { type: "string", description: "1 sentence about the supplied strongest dimension" },
        weakest: { type: "string", description: "1 sentence about the supplied weakest dimension" },
      },
      required: ["verdict", "dimensions", "strongest", "weakest"],
    },

  },
  company: {
    name: "company_readiness",
    description: "Company-by-company hiring readiness analysis",
    parameters: {
      type: "object",
      properties: {
        companies: {
          type: "array",
          description: "Analysis for each requested company",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              readiness: { type: "number", description: "0-100 readiness for this company's bar" },
              interviewDifficulty: { type: "string", enum: ["moderate", "hard", "very hard"] },
              summary: { type: "string", description: "1-2 sentences on the fit and what stands between the user and an offer" },
              missingSkills: { type: "array", items: { type: "string" }, description: "3-5 skills required by this company that the user lacks" },
              recommendedProjects: { type: "array", items: { type: "string" }, description: "2-3 projects that impress this company" },
              checklist: { type: "array", items: { type: "string" }, description: "4-6 preparation checklist items" },
            },
            required: ["name", "readiness", "interviewDifficulty", "summary", "missingSkills", "recommendedProjects", "checklist"],
          },
        },
      },
      required: ["companies"],
    },
  },
  salary: {
    name: "salary_insights",
    description: "Realistic salary intelligence for the user's profile",
    parameters: {
      type: "object",
      properties: {
        currency: { type: "string", description: "e.g. 'INR' or 'USD' — pick based on region context" },
        currentRange: { type: "string", description: "Salary range the user could realistically get today, e.g. '4-6 LPA'" },
        futureRange: { type: "string", description: "Range after completing the roadmap" },
        currentPotential: { type: "number", description: "0-100 how much of the role's salary ceiling the user can command now" },
        futurePotential: { type: "number", description: "0-100 after roadmap completion" },
        reasoning: { type: "string", description: "2-3 sentences grounded in the user's skills and projects" },
        growthTimeline: {
          type: "array",
          description: "4 points: Now, 6 months, 1 year, 3 years",
          items: {
            type: "object",
            properties: {
              period: { type: "string" },
              range: { type: "string" },
              note: { type: "string" },
            },
            required: ["period", "range", "note"],
          },
        },
        regions: {
          type: "array",
          description: "4-5 regions with comparative pay",
          items: {
            type: "object",
            properties: { region: { type: "string" }, range: { type: "string" }, note: { type: "string" } },
            required: ["region", "range", "note"],
          },
        },
        boosters: { type: "array", items: { type: "string" }, description: "3-4 specific things that would raise their pay band" },
      },
      required: ["currency", "currentRange", "futureRange", "currentPotential", "futurePotential", "reasoning", "growthTimeline", "regions", "boosters"],
    },
  },
  trends: {
    name: "industry_trends",
    description: "Industry trend intelligence relevant to the user's target career",
    parameters: {
      type: "object",
      properties: {
        headline: { type: "string", description: "One sentence summary of where this field is heading" },
        trendingSkills: {
          type: "array",
          description: "6 trending skills",
          items: {
            type: "object",
            properties: {
              skill: { type: "string" },
              demand: { type: "number", description: "0-100 hiring demand index" },
              growth: { type: "string", description: "e.g. '+34% YoY'" },
              relevance: { type: "string", enum: ["core", "adjacent", "future"] },
            },
            required: ["skill", "demand", "growth", "relevance"],
          },
        },
        emergingTech: {
          type: "array",
          description: "4 emerging technologies",
          items: {
            type: "object",
            properties: { name: { type: "string" }, why: { type: "string" }, adoption: { type: "string", enum: ["early", "growing", "mainstream"] } },
            required: ["name", "why", "adoption"],
          },
        },
        certifications: {
          type: "array",
          description: "4 top certifications",
          items: {
            type: "object",
            properties: { name: { type: "string" }, provider: { type: "string" }, value: { type: "string" } },
            required: ["name", "provider", "value"],
          },
        },
        fastGrowingCareers: {
          type: "array",
          description: "4 fast growing adjacent careers",
          items: {
            type: "object",
            properties: { role: { type: "string" }, growth: { type: "string" }, overlap: { type: "string", description: "How it overlaps with the user's path" } },
            required: ["role", "growth", "overlap"],
          },
        },
        hiringDemand: {
          type: "array",
          description: "6 monthly demand index points forming a trend line",
          items: {
            type: "object",
            properties: { label: { type: "string" }, value: { type: "number", description: "0-100" } },
            required: ["label", "value"],
          },
        },
        recommendations: { type: "array", items: { type: "string" }, description: "3-4 learning recommendations tailored to the user" },
      },
      required: ["headline", "trendingSkills", "emergingTech", "certifications", "fastGrowingCareers", "hiringDemand", "recommendations"],
    },
  },
  insights: {
    name: "career_insights",
    description: "Dynamic personalized career insights",
    parameters: {
      type: "object",
      properties: {
        headline: { type: "string", description: "One motivating sentence about the user's current trajectory" },
        insights: {
          type: "array",
          description: "5-7 highly specific insights derived from the user's data",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short punchy insight, e.g. 'Finish React before Node.js'" },
              detail: { type: "string", description: "1-2 sentences of reasoning referencing the user's actual data" },
              type: { type: "string", enum: ["progress", "recommendation", "warning", "strength"] },
              impact: { type: "string", description: "e.g. '+8% readiness'" },
            },
            required: ["title", "detail", "type", "impact"],
          },
        },
        focusThisWeek: { type: "string", description: "The one thing to focus on this week" },
      },
      required: ["headline", "insights", "focusThisWeek"],
    },
  },
};

const CURRENCY_RULE: Record<string, string> = {
  India: "Report ALL money in Indian Rupees using LPA format, e.g. '₹4–7 LPA'. Never use dollars.",
  "United States": "Report all money in USD per year, e.g. '$70K–$95K'.",
  "United Kingdom": "Report all money in GBP per year, e.g. '£38K–£55K'.",
  Europe: "Report all money in EUR per year, e.g. '€45K–€65K'.",
  Remote: "Report all money in USD per year, e.g. '$70K–$95K'.",
};

function buildUserMessage(mode: Mode, profile: any, payload: any) {
  const p = profile || {};
  const r = p.readiness || {};
  const dims = Array.isArray(r.dimensions)
    ? r.dimensions.map((d: any) => `${d.name}: ${d.score}/100`).join(", ")
    : "not computed";
  const region = p.region || "India";

  const base = `USER CAREER PROFILE
- Career goal / target role: ${p.goal || "Not specified"}
- Current skills: ${p.skills || "Not specified"}
- Latest skill-gap analysis score: ${p.score ?? "no analysis yet"}
- COMPUTED CAREER READINESS (authoritative, do not contradict): ${r.overall ?? "unknown"}/100
- Readiness dimension scores (authoritative): ${dims}
- Missing skills identified earlier: ${(p.missingSkills || []).join(", ") || "none recorded"}
- Completed roadmap milestones: ${(p.completedMilestones || []).join(", ") || "none yet"}
- Projects completed: ${p.projectsCount ?? 0}
- Knowledge packs studied: ${p.knowledgePacks ?? 0} (mastered: ${p.knowledgeMastered ?? 0}, avg quiz: ${p.avgQuizScore ?? "n/a"})
- Resume ATS score: ${p.resumeScore ?? "not analysed"}
- Mock interviews taken: ${p.interviewsCount ?? 0} (best score: ${p.interviewScore ?? "n/a"})
- Daily study hours: ${p.studyHours ?? 2}
- Total analyses run: ${p.analysesCount ?? 0}
- Activity streak (days): ${p.streak ?? 0}
- XP / level: ${p.xp ?? 0} / ${p.level || "Beginner"}
- Region: ${region}
- CURRENCY RULE: ${CURRENCY_RULE[region] || CURRENCY_RULE.India}
`;

  switch (mode) {
    case "company":
      return `${base}\nGenerate company readiness for these companies: ${(payload?.companies || []).join(", ")}. Judge against each company's real hiring bar for the target role.`;
    case "roadmap":
      return `${base}\nBuild the living 8-milestone roadmap for this exact user. Skip or shorten stages they already cover; go deeper where they are weak.`;
    case "readiness":
      return `${base}\nThe scores above are already computed by the platform engine. Do NOT invent new scores. Write the verdict, and for each of the 6 dimensions write an insight that explains its exact supplied score plus one next action.`;
    case "salary":
      return `${base}\nEstimate salary strictly following the CURRENCY RULE above. Ground the numbers in this user's actual skills, projects and readiness.`;
    default:
      return `${base}\nProduce the analysis for this exact user.`;
  }
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, profile, payload } = await req.json();

    if (!mode || !SCHEMAS[mode as Mode]) {
      return new Response(JSON.stringify({ error: "Invalid mode." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile?.goal || String(profile.goal).trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Set your career goal first — run a Skill Analysis to unlock this.", needsProfile: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const schema = SCHEMAS[mode as Mode];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildUserMessage(mode as Mode, profile, payload) },
        ],
        tools: [{ type: "function", function: schema }],
        tool_choice: { type: "function", function: { name: schema.name } },
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
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response from AI");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("career-intelligence error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
