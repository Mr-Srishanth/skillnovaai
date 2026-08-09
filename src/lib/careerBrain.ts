/**
 * SkillNova — Personal Career Brain
 *
 * One shared, evidence-based model of the learner that every intelligence module
 * reads from. Numbers here are deterministic: the AI explains, the brain scores.
 */

import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ evidence */

export type EvidenceSourceKind =
  | "claimed"
  | "learned"
  | "quizzed"
  | "built"
  | "verified"
  | "interviewed"
  | "resume";

/** 0-100 strength each source type can prove on its own. */
const SOURCE_STRENGTH: Record<EvidenceSourceKind, number> = {
  claimed: 25,
  resume: 32,
  learned: 45,
  quizzed: 55,
  interviewed: 58,
  built: 72,
  verified: 90,
};

export interface EvidenceSource {
  kind: EvidenceSourceKind;
  detail: string;
  strength: number;
}

export interface SkillEvidence {
  skill: string;
  /** 0-100 — how strongly this learner can actually prove the skill */
  strength: number;
  level: "No evidence" | "Claimed" | "Learning" | "Practised" | "Applied" | "Proven";
  sources: EvidenceSource[];
}

export const normalizeSkill = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const CANON: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  "node js": "node.js",
  nodejs: "node.js",
  reactjs: "react",
  "react.js": "react",
  py: "python",
  ml: "machine learning",
  ai: "artificial intelligence",
  "postgres sql": "postgresql",
  postgres: "postgresql",
  "amazon web services": "aws",
  "google cloud platform": "gcp",
  css3: "css",
  html5: "html",
  dsa: "data structures and algorithms",
  "rest apis": "rest api",
  restful: "rest api",
};

export const canonSkill = (s: string) => {
  const n = normalizeSkill(s);
  return CANON[n] || n;
};

export const skillsEqual = (a: string, b: string) => {
  const x = canonSkill(a);
  const y = canonSkill(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // treat "react hooks" / "react" style containment as a match
  return x.length > 2 && y.length > 2 && (x.includes(y) || y.includes(x));
};

export const splitSkills = (raw: string): string[] =>
  String(raw || "")
    .split(/[,;|\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

const levelFor = (strength: number): SkillEvidence["level"] => {
  if (strength >= 85) return "Proven";
  if (strength >= 68) return "Applied";
  if (strength >= 52) return "Practised";
  if (strength >= 35) return "Learning";
  if (strength > 0) return "Claimed";
  return "No evidence";
};

export interface EvidenceInput {
  claimedSkills: string[];
  verifications: { skill: string; score: number | null; verified_level: string | null; status: string }[];
  projects: { title: string; stack: string[]; status: string }[];
  knowledge: { title: string; topic: string | null; quizScore: number | null; mastered: boolean }[];
  resumeSkills?: string[];
}

/** Merge everything the learner has ever done into one evidence table. */
export function buildEvidence(input: EvidenceInput): SkillEvidence[] {
  const map = new Map<string, SkillEvidence>();

  const add = (skillRaw: string, kind: EvidenceSourceKind, detail: string, strengthOverride?: number) => {
    const skill = String(skillRaw || "").trim();
    if (skill.length < 2) return;
    const key = canonSkill(skill);
    const strength = Math.round(strengthOverride ?? SOURCE_STRENGTH[kind]);
    const existing = map.get(key);
    if (existing) {
      existing.sources.push({ kind, detail, strength });
      // strongest source dominates; extra corroboration adds a small bonus
      const best = Math.max(...existing.sources.map((s) => s.strength));
      const bonus = Math.min(8, (existing.sources.length - 1) * 3);
      existing.strength = Math.min(100, Math.round(best + bonus));
      existing.level = levelFor(existing.strength);
      return;
    }
    map.set(key, {
      skill,
      strength,
      level: levelFor(strength),
      sources: [{ kind, detail, strength }],
    });
  };

  input.claimedSkills.forEach((s) => add(s, "claimed", "listed in your skill profile"));
  (input.resumeSkills || []).forEach((s) => add(s, "resume", "appears on your resume"));

  input.knowledge.forEach((k) => {
    const subject = k.topic || k.title;
    if (!subject) return;
    const strength = k.mastered
      ? 62
      : typeof k.quizScore === "number"
        ? 38 + Math.round((k.quizScore / 100) * 20)
        : SOURCE_STRENGTH.learned;
    add(subject, k.quizScore != null ? "quizzed" : "learned", `studied "${k.title}"${k.mastered ? " (mastered)" : ""}`, strength);
  });

  input.projects.forEach((p) => {
    const strength = p.status === "completed" ? 78 : SOURCE_STRENGTH.built;
    (p.stack.length ? p.stack : [p.title]).forEach((tech) =>
      add(tech, "built", `used in project "${p.title}"${p.status === "completed" ? " (completed)" : " (in progress)"}`, strength),
    );
  });

  input.verifications
    .filter((v) => v.status === "completed" && typeof v.score === "number")
    .forEach((v) => {
      const score = v.score || 0;
      add(v.skill, "verified", `verified assessment: ${v.verified_level || "graded"} (${score}%)`, 45 + Math.round(score * 0.5));
    });

  return Array.from(map.values()).sort((a, b) => b.strength - a.strength);
}

export const findEvidence = (evidence: SkillEvidence[], skill: string): SkillEvidence | null =>
  evidence.find((e) => skillsEqual(e.skill, skill)) || null;

/* ------------------------------------------------------------- job matching */

export interface JobRequirement {
  skill: string;
  importance?: "critical" | "high" | "medium";
  aliases?: string[];
}

export interface JobRequirements {
  title?: string;
  company?: string;
  seniority?: string;
  requiredSkills: JobRequirement[];
  preferredSkills?: { skill: string; aliases?: string[] }[];
  technologies?: string[];
  responsibilities?: string[];
  experience?: string;
  education?: string;
  softSkills?: string[];
  domain?: string[];
  keywords?: string[];
}

export interface JobSkillRow {
  skill: string;
  importance: "critical" | "high" | "medium" | "preferred";
  weight: number;
  strength: number;
  level: SkillEvidence["level"];
  evidence: string;
}

export interface JobMatch {
  /** 0-100 — how well the learner's skills overlap the requirements */
  match: number;
  /** 0-100 — overlap adjusted by proof quality, resume and interview readiness */
  readiness: number;
  verdict: "Strong fit" | "Close — worth applying" | "Stretch application" | "Not ready yet";
  rows: JobSkillRow[];
  strong: JobSkillRow[];
  partial: JobSkillRow[];
  missing: JobSkillRow[];
}

const IMPORTANCE_WEIGHT = { critical: 3, high: 2, medium: 1.25, preferred: 0.6 } as const;

export function matchJob(
  req: JobRequirements,
  evidence: SkillEvidence[],
  signals: { resumeScore: number | null; interviewScore: number | null; projectsCount: number },
): JobMatch {
  const rows: JobSkillRow[] = [];

  const push = (skill: string, importance: JobSkillRow["importance"], aliases: string[] = []) => {
    if (!skill || skill.trim().length < 2) return;
    let ev = findEvidence(evidence, skill);
    if (!ev) {
      for (const a of aliases) {
        ev = findEvidence(evidence, a);
        if (ev) break;
      }
    }
    rows.push({
      skill,
      importance,
      weight: IMPORTANCE_WEIGHT[importance],
      strength: ev?.strength ?? 0,
      level: ev?.level ?? "No evidence",
      evidence: ev ? ev.sources.map((s) => s.detail).join("; ") : "No evidence yet",
    });
  };

  (req.requiredSkills || []).forEach((r) => push(r.skill, r.importance || "high", r.aliases || []));
  (req.preferredSkills || []).forEach((r) => push(r.skill, "preferred", r.aliases || []));

  if (!rows.length) {
    return { match: 0, readiness: 0, verdict: "Not ready yet", rows, strong: [], partial: [], missing: [] };
  }

  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);
  const coverage = rows.reduce((s, r) => s + r.weight * Math.min(1, r.strength / 75), 0) / totalWeight;
  const match = Math.round(coverage * 100);

  const proofQuality = rows.reduce((s, r) => s + r.weight * Math.min(1, r.strength / 100), 0) / totalWeight;
  const resume = signals.resumeScore ?? 45;
  const interview = signals.interviewScore ?? 45;
  const projectBoost = Math.min(10, signals.projectsCount * 3);

  const readiness = Math.max(
    0,
    Math.min(100, Math.round(match * 0.55 + proofQuality * 100 * 0.15 + resume * 0.13 + interview * 0.12 + projectBoost * 0.5)),
  );

  const verdict: JobMatch["verdict"] =
    readiness >= 78 ? "Strong fit" : readiness >= 60 ? "Close — worth applying" : readiness >= 40 ? "Stretch application" : "Not ready yet";

  return {
    match,
    readiness,
    verdict,
    rows,
    strong: rows.filter((r) => r.strength >= 68),
    partial: rows.filter((r) => r.strength > 0 && r.strength < 68),
    missing: rows.filter((r) => r.strength === 0),
  };
}

/* -------------------------------------------------------- autonomous coach */

export interface NextAction {
  action: string;
  why: string;
  module: string;
  actionType: string;
  expectedImpact: string;
  estimatedTime: string;
  runnerUp?: string;
}

/** Deterministic fallback used before/while the AI coach responds. */
export function deterministicNextAction(b: {
  goal: string;
  readiness: number;
  projectsCount: number;
  knowledgePacks: number;
  resumeScore: number | null;
  interviewScore: number | null;
  verifiedCount: number;
  missingSkills: string[];
  openTasks: number;
}): NextAction {
  if (!b.goal)
    return {
      action: "Run a Skill Gap Analysis with your target role",
      why: "Every SkillNova module is grounded in your goal — without it nothing can be personalised.",
      module: "analyze",
      actionType: "explore",
      expectedImpact: "Unlocks roadmap, readiness and job matching",
      estimatedTime: "3 min",
    };
  if (b.openTasks > 0)
    return {
      action: "Clear today's plan before starting anything new",
      why: `You have ${b.openTasks} open task${b.openTasks > 1 ? "s" : ""} already scheduled.`,
      module: "plan",
      actionType: "complete",
      expectedImpact: "Keeps momentum and streak intact",
      estimatedTime: "under an hour",
    };
  if (b.knowledgePacks > 0 && b.projectsCount === 0)
    return {
      action: "Turn what you've learned into one real project",
      why: "You have learning but no build evidence — hiring signals come from shipped work.",
      module: "projects",
      actionType: "build",
      expectedImpact: "Biggest single lift to job readiness",
      estimatedTime: "1-2 weeks",
    };
  if (b.missingSkills.length && b.knowledgePacks === 0)
    return {
      action: `Learn ${b.missingSkills[0]} with a Knowledge pack`,
      why: "It is the highest-priority gap in your latest analysis and you have no study evidence for it yet.",
      module: "knowledge",
      actionType: "learn",
      expectedImpact: "Closes your top skill gap",
      estimatedTime: "45 min",
    };
  if (b.verifiedCount === 0)
    return {
      action: "Verify your strongest skill with an assessment",
      why: "Claimed skills carry little weight — verified skills upgrade your evidence quality everywhere.",
      module: "verify",
      actionType: "verify",
      expectedImpact: "Upgrades claimed skills to proven",
      estimatedTime: "15 min",
    };
  if (b.resumeScore == null)
    return {
      action: "Run your resume through the ATS analyser",
      why: "Your work isn't reflected in a scored resume yet.",
      module: "resume",
      actionType: "resume",
      expectedImpact: "Reveals ATS blockers before you apply",
      estimatedTime: "5 min",
    };
  if ((b.interviewScore ?? 0) < 65)
    return {
      action: "Practise a targeted mock interview",
      why: "Your interview signal is the weakest part of your readiness score.",
      module: "interview",
      actionType: "interview",
      expectedImpact: "Raises interview readiness",
      estimatedTime: "15 min",
    };
  return {
    action: "Track a real job and close its top gap",
    why: `At ${b.readiness}% readiness the fastest progress now comes from a specific target role.`,
    module: "hiring",
    actionType: "apply",
    expectedImpact: "Converts readiness into applications",
    estimatedTime: "20 min",
  };
}

/* --------------------------------------------------------------- AI bridge */

export interface BrainSnapshot {
  goal: string;
  skills: string;
  readiness: number;
  strongest?: string;
  weakest?: string;
  missingSkills: string[];
  projectsCount: number;
  projects: { title: string; stack: string[]; status: string }[];
  knowledgePacks: number;
  knowledgeMastered: number;
  avgQuizScore: number | null;
  recentTopics: string[];
  verified: { skill: string; level: string; score: number }[];
  resumeScore: number | null;
  interviewScore: number | null;
  streak: number;
  xp: number;
  studyHours: number;
  region: string;
  jobs: { title: string; company: string | null; match: number | null; status: string }[];
  openTasks: string[];
  evidence: { skill: string; level: string; sources: string[] }[];
}

export async function callCareerOS<T>(mode: string, payload: unknown, brain: BrainSnapshot | null): Promise<T> {
  const { data, error } = await supabase.functions.invoke("career-os", { body: { mode, payload, brain } });
  if (error) {
    const msg = (error as any)?.context?.status === 429
      ? "SkillNova AI is busy right now. Try again in a moment."
      : error.message || "The AI engine failed. Please retry.";
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

/** Longitudinal analytics: every meaningful action becomes a timeline event. */
export async function logCareerEvent(
  userId: string,
  kind: string,
  label: string,
  value?: number | null,
  meta: Record<string, unknown> = {},
) {
  if (!userId) return;
  try {
    await supabase.from("career_events").insert({ user_id: userId, kind, label, value: value ?? null, meta: meta as any });
    window.dispatchEvent(new CustomEvent("skillnova:profile-updated"));
  } catch {
    /* analytics must never break a user flow */
  }
}

export const goToModule = (tab: string, detail: Record<string, unknown> = {}) => {
  window.dispatchEvent(new CustomEvent("skillnova:navigate", { detail: { tab, ...detail } }));
};
