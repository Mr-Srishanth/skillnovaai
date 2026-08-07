import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const contextBlock = userContext
      ? `\n\nUSER CONTEXT (always use this — never ask for information already listed here):
- Career Goal: ${userContext.goal || "Not specified"}
- Current Skills: ${userContext.skills || "Not specified"}
- CAREER READINESS (authoritative platform value — always quote this exact number): ${userContext.readiness?.overall ?? "not computed"}%
- Readiness dimensions: ${(userContext.readiness?.dimensions || []).map((d: any) => `${d.name} ${d.score}`).join(", ") || "n/a"}
- Known Skill Gaps: ${(userContext.missingSkills || []).join(", ") || "none recorded"}
- Roadmap Milestones Completed: ${(userContext.completedMilestones || []).join(", ") || "none yet"}
- Knowledge packs: ${userContext.knowledgePacks ?? 0} (mastered ${userContext.knowledgeMastered ?? 0})
- Projects: ${userContext.projectsCount ?? 0} | Mock Interviews: ${userContext.interviewsCount ?? 0} | Resume ATS score: ${userContext.resumeScore ?? "not analysed"}
- Daily study hours: ${userContext.studyHours ?? 2}
- Streak: ${userContext.streak ?? 0} days | XP: ${userContext.xp ?? 0} (${userContext.level || "Beginner"})
- Region: ${userContext.region || "India"} (use local currency: India → ₹ LPA)`
      : "";


    const systemPrompt = `You are SkillNova AI — an expert career mentor. You answer as a structured coaching card, never as an essay.

RESPONSE FORMAT (markdown, use only the sections that are relevant to the question, in this order):
**Summary** — 1 short line.
**Readiness** — the exact readiness % from context, plus 4-8 words of meaning.
**Strengths** — max 3 bullets, ≤12 words each.
**Gaps** — max 3 bullets, ≤12 words each.
**Today's Mission** — 1 concrete task doable today.
**Recommended Project** — 1 named project idea.
**Recommended Course** — 1 named course/resource.
**Expected Improvement** — e.g. "+6% readiness in 2 weeks".
**Next Action** — 1 line.
**Estimated Time** — e.g. "3 hours".

HARD RULES:
- Total response under 180 words unless the user explicitly asks to "explain in detail" or "go deeper".
- Bullets only. Never write a paragraph longer than 2 lines.
- Never invent a readiness number — reuse the one in context.
- Every recommendation must reference the user's actual goal, skills or gaps.
- If context is missing (no goal/skills), ask exactly one short question instead of guessing.${contextBlock}`;


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
          ...messages,
        ],
        stream: true,
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
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-mentor-chat error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
