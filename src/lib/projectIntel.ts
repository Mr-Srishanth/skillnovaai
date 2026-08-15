/**
 * SkillNova — Project Intelligence
 *
 * The THINKING layer for a raw project idea. It reuses:
 *  - the existing `project-studio` edge function (new "intelligence" mode) for real AI,
 *  - the existing Career Brain evidence model for the skill comparison (deterministic),
 *  - the existing Project Studio tables for persistence when a project is started.
 *
 * Nothing here duplicates Career Brain, the AI Mentor or Project Studio.
 */

import { findEvidence, type SkillEvidence } from "@/lib/careerBrain";
import { runStudio } from "@/lib/projectStudio";
import type { CareerProfile } from "@/hooks/useCareerProfile";

/* ------------------------------------------------------------------ types */

export type Confidence = "known" | "estimated" | "inferred" | "unknown";
export type Importance = "critical" | "high" | "medium";

export interface IdeaInput {
  idea: string;
  targetRole?: string;
  deadline?: string;
  hoursPerWeek?: string;
  preferredTech?: string;
  stage?: string;
}

export interface RequiredSkill {
  skill: string;
  importance: Importance;
  confidence: Confidence;
  why: string;
}

export interface IntelPhase {
  phase: string;
  objective: string;
  skills: string[];
  tasks: string[];
  output: string;
  evidence: string;
}

export interface ProjectIntelligence {
  title: string;
  projectType: string;
  summary: string;
  problem: string;
  targetUsers: string[];
  coreFeatures: string[];
  technologies: { tech: string; layer: string; why: string }[];
  requiredSkills: RequiredSkill[];
  difficulty: string;
  estimatedEffort: string;
  prerequisites: { topic: string; reason: string }[];
  careerRelevance: { level: "High" | "Medium" | "Low"; why: string; strengthens: string[] };
  targetRoles: string[];
  evidence: { artifact: string; proves: string }[];
  missingEvidence: string[];
  roadmap: IntelPhase[];
  assumptions: string[];
}

export interface SkillRow {
  skill: string;
  importance: Importance;
  why: string;
  confidence: Confidence;
  strength: number;
  level: SkillEvidence["level"];
  proof: string;
}

export interface GapRow extends SkillRow {
  priority: "High" | "Medium" | "Low";
  projectImpact: string;
  careerImpact: string;
  score: number;
}

export interface IntelComparison {
  matched: SkillRow[];
  partial: SkillRow[];
  gaps: GapRow[];
  coverage: number;
}

export interface IntelNextAction {
  action: string;
  why: string;
  time: string;
  impact: string;
  skill: string | null;
  goal: string;
}

/* ------------------------------------------------------------------- AI */

export async function analyzeIdea(profile: CareerProfile, idea: IdeaInput) {
  return runStudio<ProjectIntelligence>("intelligence", profile, { idea });
}

/** Human-readable message for a failed analysis, with a dedicated 402 wording. */
export const intelErrorMessage = (message: string) => {
  const m = (message || "").toLowerCase();
  if (m.includes("credit") || m.includes("402") || m.includes("payment"))
    return "AI analysis is temporarily unavailable because the AI provider has reached its current credit limit.";
  if (m.includes("rate") || m.includes("429")) return "The AI is rate limited right now. Try again in a moment.";
  return message || "Project analysis failed. Try again.";
};

/* --------------------------------------------------- Career Brain compare */

const IMPORTANCE_WEIGHT: Record<Importance, number> = { critical: 3, high: 2, medium: 1.25 };

export function compareWithBrain(intel: ProjectIntelligence, evidence: SkillEvidence[], missingSkills: string[]): IntelComparison {
  const rows: SkillRow[] = (intel.requiredSkills || []).map((r) => {
    const ev = findEvidence(evidence, r.skill);
    return {
      skill: r.skill,
      importance: r.importance || "medium",
      why: r.why,
      confidence: r.confidence || "estimated",
      strength: ev?.strength ?? 0,
      level: ev?.level ?? "No evidence",
      proof: ev ? ev.sources.map((s) => s.detail).join("; ") : "No evidence in your Career Brain yet",
    };
  });

  const matched = rows.filter((r) => r.strength >= 68);
  const partial = rows.filter((r) => r.strength > 0 && r.strength < 68);
  const missing = rows.filter((r) => r.strength === 0);

  const goalGap = (skill: string) => missingSkills.some((m) => m.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(m.toLowerCase()));

  const gaps: GapRow[] = [...missing, ...partial]
    .map((r) => {
      const deficit = 1 - Math.min(1, r.strength / 75);
      const score = IMPORTANCE_WEIGHT[r.importance] * deficit + (goalGap(r.skill) ? 0.8 : 0);
      const priority: GapRow["priority"] = score >= 2.4 ? "High" : score >= 1.2 ? "Medium" : "Low";
      return {
        ...r,
        score,
        priority,
        projectImpact:
          r.importance === "critical"
            ? "Blocks the core functionality — the project cannot ship without it."
            : r.importance === "high"
              ? "Needed for a working, credible build."
              : "Improves quality, but the project can start without it.",
        careerImpact: goalGap(r.skill)
          ? "Also one of the recorded gaps for your career goal — closing it counts twice."
          : r.strength === 0
            ? "New evidence in your Career Brain once you build with it."
            : `Upgrades your evidence from "${r.level}" toward proven.`,
      };
    })
    .sort((a, b) => b.score - a.score);

  const totalWeight = rows.reduce((s, r) => s + IMPORTANCE_WEIGHT[r.importance], 0) || 1;
  const coverage = Math.round(
    (rows.reduce((s, r) => s + IMPORTANCE_WEIGHT[r.importance] * Math.min(1, r.strength / 75), 0) / totalWeight) * 100,
  );

  return { matched, partial, gaps, coverage };
}

/* -------------------------------------------------------- next best action */

export function intelNextAction(
  intel: ProjectIntelligence,
  cmp: IntelComparison,
  profile: CareerProfile,
): IntelNextAction {
  const goal = profile.goal || intel.targetRoles?.[0] || "your target role";
  const top = cmp.gaps[0];

  if (top) {
    return {
      action: `Learn ${top.skill} fundamentals — one focused session`,
      why: `${top.why} ${top.priority === "High" ? "It is the highest-impact gap standing between you and this build." : "It is the next gap worth closing before the build stalls."}`,
      time: top.priority === "High" ? "45–60 min" : "30 min",
      impact: top.careerImpact,
      skill: top.skill,
      goal,
    };
  }

  const firstPhase = intel.roadmap?.[0];
  return {
    action: firstPhase ? `Start Phase 1 — ${firstPhase.objective}` : "Start the build in Project Studio",
    why: "Your Career Brain already shows evidence for every skill this project requires, so building is now worth more than studying.",
    time: "1–2 h",
    impact: "Turns existing knowledge into visible, verifiable project evidence.",
    skill: null,
    goal,
  };
}

/* ------------------------------------------- shared context + module handoff */

const CTX_KEY = "skillnova:project-intel:active";
const HANDOFF_KEY = "skillnova:handoff";

export interface ActiveProjectContext {
  title: string;
  projectType: string;
  summary: string;
  targetRole: string;
  difficulty: string;
  effort: string;
  stack: string[];
  matched: string[];
  gaps: { skill: string; priority: string }[];
  relevance: string;
  relevanceWhy: string;
  missingEvidence: string[];
  phases: string[];
  nextAction: string;
  savedAt: string;
}

export function setActiveProjectContext(ctx: ActiveProjectContext | null) {
  try {
    if (!ctx) localStorage.removeItem(CTX_KEY);
    else localStorage.setItem(CTX_KEY, JSON.stringify(ctx));
  } catch {
    /* storage full — context is optional */
  }
  window.dispatchEvent(new CustomEvent("skillnova:project-context"));
}

export function getActiveProjectContext(): ActiveProjectContext | null {
  try {
    const raw = localStorage.getItem(CTX_KEY);
    return raw ? (JSON.parse(raw) as ActiveProjectContext) : null;
  } catch {
    return null;
  }
}

export function buildContext(
  intel: ProjectIntelligence,
  cmp: IntelComparison,
  next: IntelNextAction,
  targetRole: string,
): ActiveProjectContext {
  return {
    title: intel.title,
    projectType: intel.projectType,
    summary: intel.summary,
    targetRole,
    difficulty: intel.difficulty,
    effort: intel.estimatedEffort,
    stack: (intel.technologies || []).map((t) => t.tech),
    matched: cmp.matched.map((m) => m.skill),
    gaps: cmp.gaps.slice(0, 6).map((g) => ({ skill: g.skill, priority: g.priority })),
    relevance: intel.careerRelevance?.level || "Unknown",
    relevanceWhy: intel.careerRelevance?.why || "",
    missingEvidence: intel.missingEvidence || [],
    phases: (intel.roadmap || []).map((p) => p.phase),
    nextAction: next.action,
    savedAt: new Date().toISOString(),
  };
}

/** One-shot payload handed to another module (Knowledge, Verify, …) on navigation. */
export interface Handoff {
  module: string;
  topic?: string;
  skill?: string;
  source?: string;
}

export const setHandoff = (h: Handoff) => {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(h));
  } catch {
    /* ignore */
  }
};

export function consumeHandoff(module: string): Handoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as Handoff;
    if (h.module !== module) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    return h;
  } catch {
    return null;
  }
}

/* ------------------------------------------- handoff into Project Studio */

const slug = (s: string, i: number) =>
  `${s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 28) || "task"}-${i}`;

/**
 * Promotes an analysed idea into the EXISTING Project Studio table.
 * Reuses `studio_projects` — no new tables, and no duplicate row for the same title.
 */
export async function startProjectFromIntel(
  userId: string,
  intel: ProjectIntelligence,
  cmp: IntelComparison,
  goal: string,
): Promise<{ id: string; created: boolean }> {
  const { supabase } = await import("@/integrations/supabase/client");

  const { data: existing } = await supabase
    .from("studio_projects")
    .select("id")
    .eq("user_id", userId)
    .eq("title", intel.title)
    .maybeSingle();

  const milestones = (intel.roadmap || []).map((p, pi) => ({
    id: slug(p.phase, pi),
    phase: p.phase,
    goal: p.objective,
    estimatedTime: "",
    dependencies: [],
    skillsPracticed: p.skills || [],
    tasks: (p.tasks || []).map((t, ti) => ({ id: slug(t, pi * 100 + ti), title: t })),
  }));

  const payload = {
    user_id: userId,
    title: intel.title,
    summary: intel.summary,
    project_type: intel.projectType,
    difficulty: intel.difficulty,
    duration: intel.estimatedEffort,
    status: "active",
    source_mode: "custom",
    goal,
    why: intel.careerRelevance?.why || null,
    career_relevance: intel.careerRelevance?.level || null,
    resume_value: (intel.evidence || []).map((e) => e.artifact).join(", ") || null,
    tech_stack: (intel.technologies || []).map((t) => t.tech),
    skills_developed: (intel.requiredSkills || []).map((s) => s.skill),
    skills_addressed: cmp.gaps.map((g) => g.skill),
    prerequisites: intel.prerequisites || [],
    milestones,
    blueprint: {
      overview: intel.summary,
      problemStatement: intel.problem,
      targetUsers: intel.targetUsers || [],
      features: { mvp: intel.coreFeatures || [], important: [], advanced: [], optional: [] },
      techStack: intel.technologies || [],
      milestones,
      knowledgeGaps: cmp.gaps.slice(0, 6).map((g) => ({ topic: g.skill, why: g.why })),
    },
  } as any;

  if (existing?.id) {
    const { error } = await supabase.from("studio_projects").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id, created: false };
  }

  const { data, error } = await supabase.from("studio_projects").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: (data as any).id, created: true };
}
