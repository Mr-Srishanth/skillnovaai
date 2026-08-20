/**
 * SkillNova Career OS — one shared AI engine for every new intelligence module.
 * Modes: job-extract | job-plan | verify-generate | verify-grade | simulate |
 *        opportunities | plan | coach | resume-job | interview-questions | interview-followup
 *
 * The engine never invents user history: all learner facts arrive in the request
 * as an already-computed Career Brain snapshot. Numeric readiness / match scores
 * are computed deterministically on the client — the AI only reasons and explains.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const BASE_RULES = `You are the SkillNova Career OS intelligence engine.
HARD RULES:
- Ground every statement in the CAREER BRAIN snapshot provided. Never invent experience, employers, certifications, metrics or achievements.
- When evidence is missing, say "insufficient evidence" rather than guessing.
- Be specific and decisive. No filler, no motivational fluff, no lists of options where one recommendation is expected.
- Never promise outcomes. Use "estimated", "potential", "based on your current profile".
- Simple, clear English.`;

const str = { type: "string" };
const strArr = { type: "array", items: { type: "string" } };

const SCHEMAS: Record<string, any> = {
  "job-extract": {
    name: "job_requirements",
    description: "Structured requirements extracted from a job description",
    parameters: {
      type: "object",
      properties: {
        title: str,
        company: str,
        seniority: str,
        requiredSkills: {
          type: "array",
          description: "Must-have skills, canonical names (e.g. 'Spring Boot', 'AWS', 'SQL')",
          items: {
            type: "object",
            properties: {
              skill: str,
              importance: { type: "string", enum: ["critical", "high", "medium"] },
              aliases: { ...strArr, description: "other names the same skill may appear under" },
            },
            required: ["skill", "importance", "aliases"],
          },
        },
        preferredSkills: {
          type: "array",
          items: {
            type: "object",
            properties: { skill: str, aliases: strArr },
            required: ["skill", "aliases"],
          },
        },
        technologies: strArr,
        responsibilities: strArr,
        experience: str,
        education: str,
        softSkills: strArr,
        domain: strArr,
        keywords: { ...strArr, description: "10-18 ATS keywords" },
      },
      required: [
        "title", "company", "seniority", "requiredSkills", "preferredSkills", "technologies",
        "responsibilities", "experience", "education", "softSkills", "domain", "keywords",
      ],
    },
  },

  "job-plan": {
    name: "job_intelligence",
    description: "Explained gap ranking and action plan for one specific job",
    parameters: {
      type: "object",
      properties: {
        verdict: { ...str, description: "2 sentences on how this learner stands against this job, referencing real evidence" },
        gaps: {
          type: "array",
          description: "Ranked missing/weak requirements, highest hiring impact first (max 6)",
          items: {
            type: "object",
            properties: {
              skill: str,
              impact: { type: "string", enum: ["high", "medium-high", "medium", "low"] },
              why: { ...str, description: "why this matters for THIS job" },
              currentEvidence: { ...str, description: "what the learner can currently prove, or 'No evidence yet'" },
              action: { ...str, description: "one concrete next action" },
              module: { type: "string", enum: ["knowledge", "projects", "verify", "resume", "interview"] },
            },
            required: ["skill", "impact", "why", "currentEvidence", "action", "module"],
          },
        },
        today: { ...str, description: "one action doable today" },
        thisWeek: { ...str, description: "one outcome to reach this week" },
        next: { ...str, description: "the step after that" },
        resumeAdvice: str,
        interviewFocus: { ...strArr, description: "3-5 topics this interview will probe" },
      },
      required: ["verdict", "gaps", "today", "thisWeek", "next", "resumeAdvice", "interviewFocus"],
    },
  },

  "verify-generate": {
    name: "skill_assessment",
    description: "An adaptive, multi-dimensional assessment that actually tests a skill",
    parameters: {
      type: "object",
      properties: {
        skill: str,
        dimensions: { ...strArr, description: "the dimensions being tested, e.g. Concepts, Coding, Debugging" },
        questions: {
          type: "array",
          description: "8 questions spread across the dimensions and difficulties",
          items: {
            type: "object",
            properties: {
              id: str,
              dimension: str,
              type: { type: "string", enum: ["mcq", "concept", "coding", "debugging", "scenario", "architecture", "problem", "defense"] },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
              prompt: str,
              code: { ...str, description: "optional snippet the question refers to; empty string when unused" },
              options: { ...strArr, description: "exactly 4 options for mcq, empty otherwise" },
              answerIndex: { type: "number", description: "correct option index for mcq, -1 otherwise" },
              expected: { ...str, description: "what a correct free-text answer must contain" },
            },
            required: ["id", "dimension", "type", "difficulty", "prompt", "code", "options", "answerIndex", "expected"],
          },
        },
      },
      required: ["skill", "dimensions", "questions"],
    },
  },

  "verify-grade": {
    name: "skill_verification_result",
    description: "Evidence-based grading of a skill assessment",
    parameters: {
      type: "object",
      properties: {
        dimensionScores: {
          type: "array",
          items: {
            type: "object",
            properties: { dimension: str, score: { type: "number" }, comment: str },
            required: ["dimension", "score", "comment"],
          },
        },
        overall: { type: "number", description: "0-100 weighted score" },
        verifiedLevel: { type: "string", enum: ["Not verified", "Beginner", "Beginner+", "Intermediate", "Intermediate+", "Advanced", "Expert"] },
        whatWasTested: strArr,
        evidence: { ...strArr, description: "specific things the learner demonstrated, quoting their answers" },
        weakAreas: strArr,
        nextRecommendation: str,
        nextTopic: { ...str, description: "a Knowledge Engine topic that fixes the biggest weakness" },
      },
      required: ["dimensionScores", "overall", "verifiedLevel", "whatWasTested", "evidence", "weakAreas", "nextRecommendation", "nextTopic"],
    },
  },

  simulate: {
    name: "career_simulation",
    description: "Scenario comparison of career paths using the learner's real profile",
    parameters: {
      type: "object",
      properties: {
        assumptions: { ...strArr, description: "transparent assumptions behind the estimates" },
        paths: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: str,
              currentFit: { type: "number", description: "0-100 estimated fit from the evidence given" },
              fitReason: str,
              transferableSkills: strArr,
              skillGaps: strArr,
              requiredSkills: strArr,
              requiredProjects: strArr,
              effort: { ...str, description: "estimated preparation effort at the learner's study hours" },
              potentialRoles: strArr,
              opportunityLandscape: str,
              risk: str,
            },
            required: ["role", "currentFit", "fitReason", "transferableSkills", "skillGaps", "requiredSkills", "requiredProjects", "effort", "potentialRoles", "opportunityLandscape", "risk"],
          },
        },
        scenarioImpact: { ...str, description: "how the what-if scenario changes the trajectory; empty when no scenario given" },
        recommendation: str,
      },
      required: ["assumptions", "paths", "scenarioImpact", "recommendation"],
    },
  },

  opportunities: {
    name: "opportunity_matches",
    description: "Real, verifiable opportunity programmes and channels matched to the learner",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "6-9 opportunities. Only well-known, genuinely recurring programmes, platforms or opportunity categories — never invented companies, never invented deadlines.",
          items: {
            type: "object",
            properties: {
              title: str,
              organization: { ...str, description: "the real programme/platform owner, or 'Various' for a category" },
              kind: { type: "string", enum: ["job", "internship", "hackathon", "competition", "scholarship", "open-source", "fellowship", "freelance"] },
              matchLevel: { type: "string", enum: ["high", "medium", "low"] },
              matchReason: { ...str, description: "why THIS learner fits, referencing their evidence" },
              requiredSkills: strArr,
              missingSkills: strArr,
              preparation: { ...strArr, description: "2-4 concrete preparation steps" },
              eligibility: str,
              timing: { ...str, description: "typical timing, e.g. 'applications usually open in March' — never a fabricated exact deadline" },
              link: { ...str, description: "official URL if you are certain it exists, otherwise empty string" },
            },
            required: ["title", "organization", "kind", "matchLevel", "matchReason", "requiredSkills", "missingSkills", "preparation", "eligibility", "timing", "link"],
          },
        },
      },
      required: ["items"],
    },
  },

  plan: {
    name: "execution_plan",
    description: "Realistic execution plan fitted to the learner's available study time",
    parameters: {
      type: "object",
      properties: {
        rationale: { ...str, description: "1-2 sentences on why this plan, given their gaps and unfinished work" },
        tasks: {
          type: "array",
          description: "6-10 tasks total across horizons; today's tasks must fit the available hours",
          items: {
            type: "object",
            properties: {
              title: str,
              type: { type: "string", enum: ["learn", "practice", "build", "verify", "apply", "interview", "resume", "revision"] },
              horizon: { type: "string", enum: ["today", "week", "month"] },
              why: str,
              effortMinutes: { type: "number" },
              module: { type: "string", enum: ["knowledge", "projects", "verify", "resume", "interview", "hiring", "opportunities", "analyze"] },
            },
            required: ["title", "type", "horizon", "why", "effortMinutes", "module"],
          },
        },
      },
      required: ["rationale", "tasks"],
    },
  },

  coach: {
    name: "next_best_action",
    description: "The single highest-impact next action for this learner",
    parameters: {
      type: "object",
      properties: {
        action: { ...str, description: "one imperative sentence" },
        why: { ...str, description: "why this beats every other option right now, citing their evidence" },
        module: { type: "string", enum: ["knowledge", "projects", "verify", "resume", "interview", "hiring", "opportunities", "plan", "analyze"] },
        actionType: { type: "string", enum: ["learn", "build", "verify", "resume", "interview", "apply", "explore", "complete"] },
        expectedImpact: { ...str, description: "what measurably improves if they do it" },
        estimatedTime: str,
        runnerUp: { ...str, description: "the next best alternative, one line" },
      },
      required: ["action", "why", "module", "actionType", "expectedImpact", "estimatedTime", "runnerUp"],
    },
  },

  "resume-job": {
    name: "resume_job_alignment",
    description: "Job-specific resume intelligence grounded in the learner's real evidence",
    parameters: {
      type: "object",
      properties: {
        alignment: { type: "number", description: "0-100 alignment of this resume to this job" },
        summary: str,
        strongEvidence: {
          type: "array",
          items: {
            type: "object",
            properties: { item: str, evidence: str },
            required: ["item", "evidence"],
          },
        },
        weakEvidence: {
          type: "array",
          items: {
            type: "object",
            properties: { item: str, issue: str, fix: str },
            required: ["item", "issue", "fix"],
          },
        },
        unsupportedClaims: { ...strArr, description: "claims in the resume with no backing evidence in the brain; empty if none" },
        missingKeywords: strArr,
        missingSkills: strArr,
        projectRelevance: str,
        rewrites: {
          type: "array",
          description: "2-4 bullet rewrites using ONLY facts already present",
          items: {
            type: "object",
            properties: { before: str, after: str },
            required: ["before", "after"],
          },
        },
      },
      required: ["alignment", "summary", "strongEvidence", "weakEvidence", "unsupportedClaims", "missingKeywords", "missingSkills", "projectRelevance", "rewrites"],
    },
  },

  "interview-questions": {
    name: "interview_set",
    description: "Role, job and project specific interview questions",
    parameters: {
      type: "object",
      properties: {
        focus: { ...str, description: "what this set probes and why, given the learner's profile" },
        questions: {
          type: "array",
          description: "5 questions ordered easiest to hardest",
          items: {
            type: "object",
            properties: {
              question: str,
              category: { type: "string", enum: ["hr", "behavioral", "technical", "coding", "dsa", "system-design", "database", "cloud", "ai-ml", "project-defense"] },
              why: { ...str, description: "why this question is asked of THIS candidate" },
              lookingFor: strArr,
            },
            required: ["question", "category", "why", "lookingFor"],
          },
        },
      },
      required: ["focus", "questions"],
    },
  },

  "interview-followup": {
    name: "interview_followup",
    description: "Adaptive follow-up and evaluation of a single answer",
    parameters: {
      type: "object",
      properties: {
        technical: { type: "number" },
        problemSolving: { type: "number" },
        communication: { type: "number" },
        projectUnderstanding: { type: "number" },
        roleRelevance: { type: "number" },
        overall: { type: "number" },
        strengths: strArr,
        weaknesses: strArr,
        followUp: { ...str, description: "the next question, derived from what they actually said" },
        weakTopic: { ...str, description: "a Knowledge Engine topic that fixes the biggest weakness, empty if none" },
      },
      required: ["technical", "problemSolving", "communication", "projectUnderstanding", "roleRelevance", "overall", "strengths", "weaknesses", "followUp", "weakTopic"],
    },
  },

  "mission-plan": {
    name: "career_mission",
    description: "A complete autonomous career mission derived from one plain-language goal",
    parameters: {
      type: "object",
      properties: {
        role: { ...str, description: "canonical target role, e.g. 'AI/ML Engineer'" },
        timelineMonths: { type: "number", description: "months until the stated deadline; infer a sensible default if unstated" },
        outcome: { ...str, description: "the concrete outcome the learner wants, e.g. 'internship', 'full-time job'" },
        summary: { ...str, description: "2 sentences describing the mission and how it will be achieved" },
        requiredSkills: strArr,
        gaps: {
          type: "array",
          description: "skills the learner is missing or weak in, ranked by hiring impact",
          items: {
            type: "object",
            properties: {
              skill: str,
              severity: { type: "string", enum: ["critical", "high", "medium"] },
              why: str,
              closeBy: { type: "string", enum: ["learn", "build", "verify"] },
            },
            required: ["skill", "severity", "why", "closeBy"],
          },
        },
        phases: {
          type: "array",
          description: "3-6 sequential phases covering foundations through hiring preparation",
          items: {
            type: "object",
            properties: {
              name: str,
              weeks: { type: "number" },
              focus: str,
              skills: strArr,
              milestones: strArr,
            },
            required: ["name", "weeks", "focus", "skills", "milestones"],
          },
        },
        projects: {
          type: "array",
          description: "2-4 portfolio projects that close the biggest gaps",
          items: {
            type: "object",
            properties: {
              title: str,
              why: str,
              skills: strArr,
              difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
              durationWeeks: { type: "number" },
              stack: strArr,
              milestones: strArr,
              resumeImpact: str,
            },
            required: ["title", "why", "skills", "difficulty", "durationWeeks", "stack", "milestones", "resumeImpact"],
          },
        },
        learningTopics: {
          type: "array",
          items: {
            type: "object",
            properties: { topic: str, why: str, phase: { type: "number" } },
            required: ["topic", "why", "phase"],
          },
        },
        interviewFocus: strArr,
        resumeFocus: strArr,
        opportunityTargets: {
          type: "array",
          description: "categories of opportunities (never invented companies or postings)",
          items: {
            type: "object",
            properties: { category: str, why: str, readyAfterPhase: { type: "number" } },
            required: ["category", "why", "readyAfterPhase"],
          },
        },
      },
      required: ["role", "timelineMonths", "outcome", "summary", "requiredSkills", "gaps", "phases", "projects", "learningTopics", "interviewFocus", "resumeFocus", "opportunityTargets"],
    },
  },
};

const MODE_INSTRUCTIONS: Record<string, string> = {
  "job-extract": "Extract the job's real requirements. Normalise skill names to canonical forms and list realistic aliases. Do not invent requirements that are not implied by the text.",
  "job-plan": "Rank what stands between this learner and this job by hiring impact. Use the evidence table verbatim — never claim evidence that is not listed.",
  "verify-generate": "Design an assessment that genuinely separates someone who can do the skill from someone who only read about it. Choose the assessment types that fit the skill. Adapt difficulty to the claimed level.",
  "verify-grade": "Grade strictly from the answers given. An empty or vague answer scores low. Do not reward confidence without substance. One weak answer must not collapse an otherwise strong dimension.",
  simulate: "Compare the paths using only the learner's real skills and evidence. Be honest about transferability and effort. Never present a prediction as a guarantee.",
  opportunities: "Recommend only opportunities the learner is plausibly eligible for. Prefer real recurring programmes (e.g. GSoC, MLH hackathons, Outreachy, national hackathons) and concrete platform categories. Never invent a company, a deadline, or a link you are unsure of.",
  plan: "Fit today's work inside the available hours. Re-use unfinished tasks instead of duplicating them. Never punish missed work — replan calmly.",
  coach: "Pick exactly ONE next action with the highest impact on job readiness. Prefer proving or building over more passive learning when the learner already has knowledge but no evidence.",
  "resume-job": "Compare the resume against the job AND the evidence table. Flag any resume claim not backed by evidence. Never write a bullet containing a fact that is not already true.",
  "interview-questions": "Ground every question in the target job, the learner's real projects and their weakest verified areas. No generic questions.",
  "mission-plan": "Turn the learner's one-line career goal into a single realistic end-to-end mission. Use the Career Brain snapshot for what they already have — never re-teach skills they have evidence for, and never claim gaps in skills they have verified. Fit the phase weeks inside the stated timeline and their daily study hours. Projects must close named gaps. Opportunity targets are CATEGORIES (e.g. 'AI/ML internships at Indian product startups'), never named companies or postings.",
  "interview-followup": "Evaluate honestly and ask a follow-up that digs into what the candidate actually said, including trade-offs and failure modes.",
};

function brainToText(b: any): string {
  if (!b || typeof b !== "object") return "No profile data available.";
  const ev = Array.isArray(b.evidence)
    ? b.evidence
        .map((e: any) => `  - ${e.skill}: ${e.level} (${e.sources?.join("; ") || "no source"})`)
        .join("\n")
    : "  - none";
  return `CAREER BRAIN SNAPSHOT
Goal / target role: ${b.goal || "not set"}
Self-reported skills: ${b.skills || "none recorded"}
Career readiness: ${b.readiness ?? "n/a"}% (strongest: ${b.strongest || "n/a"}, weakest: ${b.weakest || "n/a"})
Known skill gaps: ${(b.missingSkills || []).join(", ") || "none recorded"}
Projects built: ${b.projectsCount ?? 0}${b.projects?.length ? ` — ${b.projects.map((p: any) => `${p.title} [${(p.stack || []).join(", ")}] ${p.status || ""}`).join(" | ")}` : ""}
Knowledge packs: ${b.knowledgePacks ?? 0} (mastered ${b.knowledgeMastered ?? 0}, avg quiz ${b.avgQuizScore ?? "n/a"})${b.recentTopics?.length ? `, recent topics: ${b.recentTopics.join(", ")}` : ""}
Verified skills: ${b.verified?.length ? b.verified.map((v: any) => `${v.skill}=${v.level} (${v.score}%)`).join(", ") : "none verified yet"}
Resume score: ${b.resumeScore ?? "not analysed"} | Interview score: ${b.interviewScore ?? "no interviews yet"}
Streak: ${b.streak ?? 0} days | XP: ${b.xp ?? 0} | Study time: ${b.studyHours ?? 2} h/day | Region: ${b.region || "India"}
Tracked jobs: ${b.jobs?.length ? b.jobs.map((j: any) => `${j.title}@${j.company || "?"} match ${j.match ?? "?"}% status ${j.status}`).join(" | ") : "none"}
Open tasks: ${b.openTasks?.length ? b.openTasks.join(" | ") : "none"}

EVIDENCE TABLE (strength per skill — never claim more than this):
${ev}`;
}

serve_handler();

function serve_handler() {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    try {
      const body = await req.json().catch(() => ({}));
      const mode = String(body?.mode || "");
      const schema = SCHEMAS[mode];
      if (!schema) return json({ error: `Unknown mode: ${mode || "(missing)"}` }, 400);

      const payload = body?.payload ?? {};
      const brain = body?.brain ?? null;

      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) return json({ error: "AI is not configured." }, 500);

      const userMessage = `${brainToText(brain)}

TASK: ${MODE_INSTRUCTIONS[mode]}

INPUT
---
${typeof payload === "string" ? payload : JSON.stringify(payload).slice(0, 60000)}
---`;

      const res = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: BASE_RULES },
            { role: "user", content: userMessage },
          ],
          tools: [{ type: "function", function: schema }],
          tool_choice: { type: "function", function: { name: schema.name } },
        }),
      });

      if (res.status === 429) return json({ error: "SkillNova AI is rate limited right now. Try again in a moment." }, 429);
      if (res.status === 402) return json({ error: "AI credits exhausted. Add credits to continue." }, 402);
      if (!res.ok) {
        const t = await res.text();
        console.error("career-os gateway error", mode, res.status, t.slice(0, 500));
        return json({ error: "The AI engine could not complete this request. Please retry." }, 502);
      }

      const data = await res.json();
      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!call?.function?.arguments) return json({ error: "The AI returned an unreadable response. Please retry." }, 502);

      let parsed: unknown;
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch {
        return json({ error: "The AI returned malformed data. Please retry." }, 502);
      }

      return json(parsed);
    } catch (e) {
      console.error("career-os error", e);
      return json({ error: (e as Error).message || "Unexpected engine error." }, 500);
    }
  });
}
