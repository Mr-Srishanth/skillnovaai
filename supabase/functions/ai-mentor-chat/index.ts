import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const listOr = (arr: unknown, fallback = "NOT AVAILABLE") => {
  if (!Array.isArray(arr) || arr.length === 0) return fallback;
  return arr
    .map((v: any) => (typeof v === "string" ? v : v?.skill || v?.title || v?.name || ""))
    .filter(Boolean)
    .join(", ") || fallback;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userContext, recentLearning, projectContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const c = userContext || {};
    const r = c.readiness || {};
    const dims = Array.isArray(r.dimensions) ? r.dimensions : [];

    const learningLines = Array.isArray(recentLearning) && recentLearning.length
      ? recentLearning
          .map((k: any) =>
            `  • ${k.title}${k.topic ? ` (${k.topic})` : ""} — quiz ${k.quiz_score ?? "not taken"}${k.mastered ? ", mastered" : ""}, studied ${k.created_at?.slice(0, 10) ?? "recently"}`
          )
          .join("\n")
      : "  NOT AVAILABLE — the user has not created any knowledge packs yet.";

    const pc = projectContext || null;
    const projectBlock = pc
      ? `
=== CURRENT PROJECT INTELLIGENCE CONTEXT (the project the user is working on right now) ===
Project: ${pc.title} (${pc.projectType || "type unknown"})
What it is: ${pc.summary}
Target role for this project: ${pc.targetRole || "NOT AVAILABLE"}
Difficulty: ${pc.difficulty} | Estimated effort: ${pc.effort}
Planned stack: ${listOr(pc.stack)}
Skills the user already has evidence for: ${listOr(pc.matched, "none yet")}
Prioritised gaps: ${(pc.gaps || []).map((g: any) => `${g.skill} (${g.priority})`).join(", ") || "none"}
Career relevance: ${pc.relevance} — ${pc.relevanceWhy}
Evidence still missing: ${listOr(pc.missingEvidence, "none recorded")}
Roadmap phases: ${listOr(pc.phases)}
Analysed next best action: ${pc.nextAction}
When the user says "this project", "it" or asks about deployment/skills/timeline without naming a project, they mean THIS project. Never ask them to repeat it.
=== END PROJECT CONTEXT ===`
      : "";

    const contextBlock = `
=== SKILLNOVA STATE (the ONLY facts you may treat as true about this user) ===
Career goal / target role: ${c.goal || "NOT AVAILABLE"}
Current skills: ${c.skills || "NOT AVAILABLE"}
Latest skill-gap analysis score: ${c.score ?? "NOT AVAILABLE"}
Known skill gaps: ${listOr(c.missingSkills)}
CAREER READINESS (authoritative, never recompute or invent): ${r.overall ?? "NOT AVAILABLE"}${r.overall != null ? "%" : ""}
Readiness dimensions: ${dims.length ? dims.map((d: any) => `${d.name} ${d.score}`).join(", ") : "NOT AVAILABLE"}
Strongest dimension: ${r.strongest?.name ?? "NOT AVAILABLE"} | Weakest dimension: ${r.weakest?.name ?? "NOT AVAILABLE"}
Roadmap milestones completed: ${listOr(c.completedMilestones, "none yet")}
Projects built: ${c.projectsCount ?? 0}
Knowledge packs: ${c.knowledgePacks ?? 0} (mastered ${c.knowledgeMastered ?? 0}), average quiz score: ${c.avgQuizScore ?? "NOT AVAILABLE"}
Resume ATS score: ${c.resumeScore ?? "NOT AVAILABLE"}
Mock interviews: ${c.interviewsCount ?? 0}, interview score: ${c.interviewScore ?? "NOT AVAILABLE"}
Daily study hours: ${c.studyHours ?? "NOT AVAILABLE"}
Streak: ${c.streak ?? 0} days | XP: ${c.xp ?? 0} | Level: ${c.level || "Beginner"}
Region: ${c.region || "India"} (salary currency: India → ₹ LPA, United States → $, United Kingdom → £, Europe → €)
Recent learning history:
${learningLines}
=== END STATE ===
${projectBlock}`;

    const systemPrompt = `You are the SkillNova AI Mentor — the personal career coach inside SkillNova OS. You have been following this student's progress and you know their data. You are NOT a general assistant.

PERSONALITY: intelligent, calm, direct, honest, practical, encouraging without cheerleading, and willing to challenge the user when they are drifting. Talk like an excellent human mentor, never like a chatbot. No motivational quotes. Never open with "To achieve your goal...".

INTENT: silently classify each message as CAREER, LEARNING, SKILL GAP, ROADMAP, PROJECT, RESUME, INTERVIEW, PRODUCTIVITY, MOTIVATION, DECISION, COMPANY, SALARY or GENERAL, and answer for that intent only. Never state the classification.

STRUCTURE — pick the SMALLEST useful shape, never a fixed template:
- Simple question → 2–5 sentences, no headings.
- Planning / complex question → short markdown sections chosen from: "### 🎯 Recommendation", "### Why", "### Next Actions", "### Expected Impact", "### SkillNova Data". Only include sections that add value.
- Study plans → a time-boxed session (e.g. "TODAY — 90 MINUTES" with 3–4 blocks) sized to the user's actual daily study hours.
- Project asks → recommend exactly ONE project: what it is, why it fits their gaps, skills gained, resume value, effort estimate.
- Resume asks → name the single highest-impact weakness and the fix. Do not restate the whole ATS report.
- Interview asks → use their interview score and weak areas, then give targeted practice.

DECISIVENESS: make the call. Never list four options and ask them to choose — pick one, justify it in one or two lines using their real gaps and skills, and move on.

ACTION: end any actionable answer with ONE clear next action. Never dump 15 tasks. Prioritise ruthlessly.

PROACTIVITY: when the state shows a real imbalance, call it out unprompted in one line — e.g. learning with zero projects, rising skills with an unanalysed resume, a broken streak, or several technologies started at once.

DATA RULES (critical):
- Use only the SkillNova state below. Never invent skills, projects, scores, salaries or history.
- When a value is NOT AVAILABLE, say so plainly and tell them which SkillNova module to use to fill it in.
- Quote the readiness number exactly as given; never estimate a new one.
- Never invent precise percentage gains. Say "this should lift your Projects dimension" rather than "+8%", unless a number is present in the state.
- Reference recent learning for continuity when relevant, but never claim memories not in the state.

LENGTH: default 250–350 words max; much shorter for simple questions. Scannable bullets, bold for key terms, no walls of text.
${contextBlock}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-12),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Your mentor is busy right now. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits are exhausted. Add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Your mentor is temporarily unavailable. Try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-mentor-chat error:", e);
    return new Response(JSON.stringify({ error: "Your mentor is temporarily unavailable. Try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
