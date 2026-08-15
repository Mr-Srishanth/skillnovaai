import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "recommend" | "blueprint" | "assist" | "resume" | "interview" | "code" | "intelligence";

const SYSTEM = `You are SkillNova Project Intelligence — a senior software architect and career engineer.
RULES:
- Every recommendation must be justified by THIS user's career goal, skills, gaps and readiness. Never generic filler.
- Be technically credible: real architectures, real schemas, real endpoints, realistic timelines.
- Never fabricate metrics or achievements the user has not earned.
- Simple, clear English. Short, concrete sentences. Always explain WHY.`;

const QUALITY = {
  type: "object",
  description: "Explainable 0-100 sub-scores. Each must be justified by the project's real characteristics.",
  properties: {
    careerRelevance: { type: "number" },
    skillCoverage: { type: "number" },
    portfolioValue: { type: "number" },
    technicalDepth: { type: "number" },
    difficultyFit: { type: "number", description: "How well the difficulty matches the user's current level" },
    realWorldValue: { type: "number" },
  },
  required: ["careerRelevance", "skillCoverage", "portfolioValue", "technicalDepth", "difficultyFit", "realWorldValue"],
};

const RECOMMENDATION_ITEM = {
  type: "object",
  properties: {
    title: { type: "string", description: "Specific, product-like project name" },
    summary: { type: "string", description: "1-2 sentence description of what it is" },
    projectType: { type: "string", description: "e.g. 'Full-stack web platform', 'ML service', 'CLI tool'" },
    difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Expert"] },
    duration: { type: "string", description: "e.g. '3-4 weeks at 2h/day'" },
    techStack: { type: "array", items: { type: "string" } },
    skillsDeveloped: { type: "array", items: { type: "string" } },
    skillsAddressed: { type: "array", items: { type: "string" }, description: "Which of the user's actual skill gaps this closes" },
    careerRelevance: { type: "string", description: "How it moves the user toward their target role" },
    resumeValue: { type: "string", description: "What a recruiter would see" },
    why: { type: "string", description: "Why SkillNova recommends THIS project to THIS user, referencing their data" },
    whatYouLearn: { type: "string" },
    recruiterProof: { type: "string", description: "What the user can demonstrate to a recruiter afterwards" },
    prerequisites: {
      type: "array",
      description: "0-3 topics the user must learn first, only if genuinely missing",
      items: {
        type: "object",
        properties: { topic: { type: "string" }, reason: { type: "string" } },
        required: ["topic", "reason"],
      },
    },
    preparationNote: { type: "string", description: "If the difficulty is above the user's level, explain the required preparation. Otherwise empty string." },
    quality: QUALITY,
  },
  required: [
    "title", "summary", "projectType", "difficulty", "duration", "techStack", "skillsDeveloped",
    "skillsAddressed", "careerRelevance", "resumeValue", "why", "whatYouLearn", "recruiterProof",
    "prerequisites", "preparationNote", "quality",
  ],
};


const INTELLIGENCE_SCHEMA = {
  name: "project_intelligence",
  description: "Structured analysis of a raw project idea and what it means for THIS user's career",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "A clear, product-like project title derived from the idea" },
      projectType: { type: "string" },
      summary: { type: "string", description: "2-3 sentences describing what the project actually is" },
      problem: { type: "string", description: "The real problem it solves, or UNKNOWN if the idea does not state one" },
      targetUsers: { type: "array", items: { type: "string" } },
      coreFeatures: { type: "array", description: "4-8 features the MVP genuinely needs", items: { type: "string" } },
      technologies: {
        type: "array",
        description: "Recommended stack, each with the layer it serves and why it fits this idea and user",
        items: {
          type: "object",
          properties: { tech: { type: "string" }, layer: { type: "string" }, why: { type: "string" } },
          required: ["tech", "layer", "why"],
        },
      },
      requiredSkills: {
        type: "array",
        description: "6-12 concrete skills the build genuinely requires. Use skill names, not sentences.",
        items: {
          type: "object",
          properties: {
            skill: { type: "string" },
            importance: { type: "string", enum: ["critical", "high", "medium"] },
            confidence: { type: "string", enum: ["known", "estimated", "inferred", "unknown"], description: "How certain this requirement is from the idea as stated" },
            why: { type: "string", description: "Why the project needs it" },
          },
          required: ["skill", "importance", "confidence", "why"],
        },
      },
      difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Expert"] },
      estimatedEffort: { type: "string", description: "Realistic effort given the user's stated hours per week, e.g. '5-6 weeks at 8h/week'" },
      prerequisites: {
        type: "array",
        description: "0-4 things to learn before starting, only if genuinely missing",
        items: { type: "object", properties: { topic: { type: "string" }, reason: { type: "string" } }, required: ["topic", "reason"] },
      },
      careerRelevance: {
        type: "object",
        properties: {
          level: { type: "string", enum: ["High", "Medium", "Low"] },
          why: { type: "string", description: "How this project moves THIS user toward their target role, referencing their real data" },
          strengthens: { type: "array", items: { type: "string" }, description: "Capabilities the project strengthens" },
        },
        required: ["level", "why", "strengthens"],
      },
      targetRoles: { type: "array", items: { type: "string" }, description: "Roles this project is credible evidence for" },
      evidence: {
        type: "array",
        description: "Artifacts the finished project can produce and what each one proves",
        items: { type: "object", properties: { artifact: { type: "string" }, proves: { type: "string" } }, required: ["artifact", "proves"] },
      },
      missingEvidence: {
        type: "array",
        description: "What the idea as stated does NOT prove for the target role, and how to add it",
        items: { type: "string" },
      },
      roadmap: {
        type: "array",
        description: "5-6 phases: Foundation, Core Build, Intelligence, Testing, Deployment, Career Evidence. Practical, not micro-tasks.",
        items: {
          type: "object",
          properties: {
            phase: { type: "string" },
            objective: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            tasks: { type: "array", description: "3-6 meaningful tasks", items: { type: "string" } },
            output: { type: "string" },
            evidence: { type: "string" },
          },
          required: ["phase", "objective", "skills", "tasks", "output", "evidence"],
        },
      },
      assumptions: { type: "array", items: { type: "string" }, description: "Anything you had to assume because the idea did not state it. Empty array if none." },
    },
    required: [
      "title", "projectType", "summary", "problem", "targetUsers", "coreFeatures", "technologies",
      "requiredSkills", "difficulty", "estimatedEffort", "prerequisites", "careerRelevance",
      "targetRoles", "evidence", "missingEvidence", "roadmap", "assumptions",
    ],
  },
};

const SCHEMAS: Record<Mode, any> = {
  intelligence: INTELLIGENCE_SCHEMA,
  recommend: {
    name: "project_recommendations",
    description: "Personalized project recommendations for this exact user",
    parameters: {
      type: "object",
      properties: {
        headline: { type: "string", description: "One sentence on what this user should be building right now and why" },
        topGap: { type: "string", description: "The highest-impact skill gap this batch targets" },
        projects: { type: "array", description: "Exactly the requested number of distinct projects", items: RECOMMENDATION_ITEM },
      },
      required: ["headline", "topGap", "projects"],
    },
  },
  blueprint: {
    name: "project_blueprint",
    description: "Full technical blueprint for the selected project",
    parameters: {
      type: "object",
      properties: {
        overview: { type: "string" },
        problemStatement: { type: "string" },
        targetUsers: { type: "array", items: { type: "string" } },
        realWorldUseCase: { type: "string" },
        features: {
          type: "object",
          properties: {
            mvp: { type: "array", items: { type: "string" } },
            important: { type: "array", items: { type: "string" } },
            advanced: { type: "array", items: { type: "string" } },
            optional: { type: "array", items: { type: "string" } },
          },
          required: ["mvp", "important", "advanced", "optional"],
        },
        skillsDeveloped: { type: "array", items: { type: "string" } },
        techStack: {
          type: "array",
          description: "Each technology with the layer it serves and WHY it fits this user and project",
          items: {
            type: "object",
            properties: {
              layer: { type: "string", description: "e.g. Frontend, Backend, Database, AI, Auth, Deployment" },
              tech: { type: "string" },
              why: { type: "string" },
            },
            required: ["layer", "tech", "why"],
          },
        },
        architecture: {
          type: "object",
          properties: {
            summary: { type: "string" },
            nodes: {
              type: "array",
              description: "5-9 architecture nodes in flow order",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "short slug id" },
                  label: { type: "string" },
                  kind: { type: "string", enum: ["client", "frontend", "api", "backend", "ai", "database", "storage", "external", "auth", "deployment"] },
                  detail: { type: "string" },
                },
                required: ["id", "label", "kind", "detail"],
              },
            },
            edges: {
              type: "array",
              items: {
                type: "object",
                properties: { from: { type: "string" }, to: { type: "string" }, label: { type: "string" } },
                required: ["from", "to", "label"],
              },
            },
          },
          required: ["summary", "nodes", "edges"],
        },
        database: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  purpose: { type: "string" },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { type: "string" },
                        key: { type: "string", enum: ["PK", "FK", "none"] },
                        note: { type: "string" },
                      },
                      required: ["name", "type", "key", "note"],
                    },
                  },
                },
                required: ["name", "purpose", "fields"],
              },
            },
            relationships: { type: "array", items: { type: "string" }, description: "e.g. 'users 1—N projects'" },
            sql: { type: "string", description: "Copyable CREATE TABLE statements for the schema" },
          },
          required: ["entities", "relationships", "sql"],
        },
        api: {
          type: "array",
          items: {
            type: "object",
            properties: {
              method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
              route: { type: "string" },
              purpose: { type: "string" },
              request: { type: "string", description: "JSON example or 'none'" },
              response: { type: "string", description: "JSON example" },
            },
            required: ["method", "route", "purpose", "request", "response"],
          },
        },
        uiScreens: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, purpose: { type: "string" }, elements: { type: "array", items: { type: "string" } } },
            required: ["name", "purpose", "elements"],
          },
        },
        folderStructure: { type: "string", description: "ASCII tree matching the chosen stack" },
        milestones: {
          type: "array",
          description: "6-8 development phases in order",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "short slug id, unique" },
              phase: { type: "string", description: "e.g. 'Phase 1 — Project Setup'" },
              goal: { type: "string" },
              estimatedTime: { type: "string" },
              dependencies: { type: "array", items: { type: "string" } },
              skillsPracticed: { type: "array", items: { type: "string" } },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: { id: { type: "string", description: "unique slug id" }, title: { type: "string" } },
                  required: ["id", "title"],
                },
              },
            },
            required: ["id", "phase", "goal", "estimatedTime", "dependencies", "skillsPracticed", "tasks"],
          },
        },
        testingStrategy: { type: "array", items: { type: "string" } },
        deploymentStrategy: { type: "array", items: { type: "string" } },
        futureImprovements: { type: "array", items: { type: "string" } },
        knowledgeGaps: {
          type: "array",
          description: "Topics from this project the user should study in the Knowledge Engine first",
          items: {
            type: "object",
            properties: { topic: { type: "string" }, why: { type: "string" } },
            required: ["topic", "why"],
          },
        },
      },
      required: [
        "overview", "problemStatement", "targetUsers", "realWorldUseCase", "features", "skillsDeveloped",
        "techStack", "architecture", "database", "api", "uiScreens", "folderStructure", "milestones",
        "testingStrategy", "deploymentStrategy", "futureImprovements", "knowledgeGaps",
      ],
    },
  },
  assist: {
    name: "project_assistant",
    description: "Answer grounded in the current project",
    parameters: {
      type: "object",
      properties: {
        answer: { type: "string", description: "Markdown answer specific to this project, its stack, architecture and current milestone" },
        code: { type: "string", description: "Code block content when code is genuinely useful, otherwise empty string" },
        codeLanguage: { type: "string", description: "Language of the code, or empty string" },
        codeLocation: { type: "string", description: "Where the code belongs in the project structure, or empty string" },
        dependencies: { type: "array", items: { type: "string" }, description: "Packages/services required, may be empty" },
        pitfalls: { type: "array", items: { type: "string" }, description: "Potential issues to watch for, may be empty" },
        nextStep: { type: "string", description: "The single next action for the user in this project" },
      },
      required: ["answer", "code", "codeLanguage", "codeLocation", "dependencies", "pitfalls", "nextStep"],
    },
  },
  resume: {
    name: "project_resume_entry",
    description: "Truthful resume entry for the completed work. Never invent metrics.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        oneLiner: { type: "string" },
        bullets: { type: "array", items: { type: "string" }, description: "3-5 achievement bullets based ONLY on what was actually built" },
        technologies: { type: "array", items: { type: "string" } },
        impact: { type: "string", description: "Truthful impact statement without fabricated numbers" },
      },
      required: ["title", "oneLiner", "bullets", "technologies", "impact"],
    },
  },
  interview: {
    name: "project_interview_questions",
    description: "Interview questions derived from this project's actual architecture",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          description: "10-14 questions across the categories",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: ["Technical", "Architecture", "Database", "API", "AI", "Security", "Trade-offs", "Behavioral"] },
              question: { type: "string" },
              whatTheyWant: { type: "string", description: "What a strong answer must contain, referencing this project" },
            },
            required: ["category", "question", "whatTheyWant"],
          },
        },
      },
      required: ["questions"],
    },
  },
  code: {
    name: "project_code",
    description: "Targeted code generation for the current project",
    parameters: {
      type: "object",
      properties: {
        explanation: { type: "string" },
        code: { type: "string" },
        language: { type: "string" },
        location: { type: "string" },
        dependencies: { type: "array", items: { type: "string" } },
        pitfalls: { type: "array", items: { type: "string" } },
      },
      required: ["explanation", "code", "language", "location", "dependencies", "pitfalls"],
    },
  },
};

function profileBlock(p: any) {
  const r = p?.readiness || {};
  const dims = Array.isArray(r.dimensions)
    ? r.dimensions.map((d: any) => `${d.name}: ${d.score}/100`).join(", ")
    : "not computed";
  return `USER CAREER PROFILE
- Target role / career goal: ${p?.goal || "Not specified"}
- Current skills: ${p?.skills || "Not specified"}
- Skill gaps: ${(p?.missingSkills || []).join(", ") || "none recorded"}
- Career readiness (authoritative, do not recompute): ${r.overall ?? "unknown"}/100
- Readiness dimensions: ${dims}
- Weakest dimension: ${r.weakest?.name || "unknown"} (${r.weakest?.score ?? "?"}/100)
- Roadmap milestones completed: ${(p?.completedMilestones || []).join(", ") || "none"}
- Projects built so far: ${p?.projectsCount ?? 0}
- Knowledge packs studied: ${p?.knowledgePacks ?? 0} (mastered: ${p?.knowledgeMastered ?? 0}, avg quiz: ${p?.avgQuizScore ?? "n/a"})
- Resume ATS score: ${p?.resumeScore ?? "not analysed"}
- Mock interview score: ${p?.interviewScore ?? "n/a"}
- Daily study hours: ${p?.studyHours ?? 2}
- Streak: ${p?.streak ?? 0} days | XP: ${p?.xp ?? 0} | Level: ${p?.level || "Beginner"}`;
}

function projectBlock(pr: any) {
  if (!pr) return "";
  const bp = pr.blueprint || {};
  const arch = bp.architecture?.nodes?.map((n: any) => n.label).join(" -> ") || "not generated";
  return `\nCURRENT PROJECT
- Title: ${pr.title}
- Type: ${pr.projectType || pr.project_type || "n/a"} | Difficulty: ${pr.difficulty}
- Tech stack: ${(pr.techStack || pr.tech_stack || []).join(", ")}
- Skills developed: ${(pr.skillsDeveloped || pr.skills_developed || []).join(", ")}
- Architecture flow: ${arch}
- Database entities: ${(bp.database?.entities || []).map((e: any) => e.name).join(", ") || "n/a"}
- API routes: ${(bp.api || []).map((a: any) => `${a.method} ${a.route}`).join(", ") || "n/a"}
- Current milestone: ${pr.currentMilestone || "not started"}
- Completed tasks: ${(pr.completedTasks || []).length} of ${pr.totalTasks ?? "?"}
- Remaining next tasks: ${(pr.nextTasks || []).join("; ") || "n/a"}`;
}

function buildUserMessage(mode: Mode, profile: any, payload: any) {
  const base = profileBlock(profile);
  switch (mode) {
    case "recommend": {
      const count = payload?.count || 3;
      const existing = (payload?.existingTitles || []).join(", ") || "none";
      const src = payload?.source || "ai";
      const input = payload?.input ? `\nUSER REQUEST INPUT (${src}): "${payload.input}"` : "";
      return `${base}${input}
Already saved/built projects (do NOT repeat these): ${existing}

Recommend exactly ${count} distinct projects for this user, ordered best-first. Generation mode: ${src}.
Each project must close a real gap from this profile and be buildable in the user's available study time.
If the user gave input above, honour it while still tying it to their career goal.`;
    }
    case "blueprint":
      return `${base}${projectBlock(payload?.project)}
Produce the complete technical blueprint for the project titled "${payload?.project?.title}".
Scale the depth to the difficulty "${payload?.project?.difficulty}" and the user's real level. Milestone task ids must be unique slugs.`;
    case "assist":
      return `${base}${projectBlock(payload?.project)}
The user asks: "${payload?.question}"
Answer specifically for THIS project — reference its stack, architecture, schema and current milestone. Never answer generically.`;
    case "resume":
      return `${base}${projectBlock(payload?.project)}
Write a truthful resume entry for this project based only on the milestones and tasks the user actually completed. No invented numbers or metrics.`;
    case "interview":
      return `${base}${projectBlock(payload?.project)}
Generate interview questions grounded in this project's real architecture, database and trade-offs.`;
    case "code":
      return `${base}${projectBlock(payload?.project)}
Generate code for: "${payload?.request}". Keep it focused and idiomatic for the project's stack.`;
    case "intelligence": {
      const i = payload?.idea || {};
      const opt = [
        i.targetRole ? `Target role for this project: ${i.targetRole}` : "",
        i.deadline ? `Deadline: ${i.deadline}` : "",
        i.hoursPerWeek ? `Hours available per week: ${i.hoursPerWeek}` : "",
        i.preferredTech ? `Preferred technology: ${i.preferredTech}` : "",
        i.stage ? `Current project stage: ${i.stage}` : "",
      ].filter(Boolean).join("\n") || "No extra constraints given.";
      return `${base}

PROJECT IDEA (raw, from the user): "${i.idea}"
${opt}

Analyse this idea as SkillNova Project Intelligence.
- Extract only what the idea and constraints actually support. Mark uncertain requirements with confidence "estimated" or "inferred", and use the literal string "UNKNOWN" for anything you cannot determine.
- Judge career relevance against THIS user's target role, gaps and readiness above. Do not flatter the idea — if it is weak evidence for their goal, say so and say what would fix it.
- Never claim the user has skills, projects or verification that are not in the profile above.
- Effort must respect the stated hours per week when given.`;
    }
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

    const goalOrRole = profile?.goal || payload?.idea?.targetRole || "";
    if (String(goalOrRole).trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Set your career goal first — run a Skill Analysis, or enter a target role for this project.", needsProfile: true }),
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
          { role: "user", content: buildUserMessage(mode as Mode, { ...profile, goal: goalOrRole }, payload) },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to continue." }), {
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

    return new Response(toolCall.function.arguments, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("project-studio error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
