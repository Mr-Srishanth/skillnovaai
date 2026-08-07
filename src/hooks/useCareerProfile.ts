import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeReadiness,
  detectRegion,
  type EngineSignals,
  type ReadinessResult,
} from "@/lib/careerEngine";

export interface CareerProfile {
  goal: string;
  skills: string;
  score: number | null;
  missingSkills: string[];
  analysesCount: number;
  projectsCount: number;
  interviewsCount: number;
  resumeAnalyzed: boolean;
  completedMilestones: string[];
  streak: number;
  xp: number;
  level: string;
  region: string;
  /* shared intelligence signals */
  knowledgePacks: number;
  knowledgeMastered: number;
  avgQuizScore: number | null;
  resumeScore: number | null;
  interviewScore: number | null;
  studyHours: number;
  /** single source of truth — computed by the Career Intelligence Engine */
  readiness: ReadinessResult;
}

const PROFILE_EVENT = "skillnova:profile-updated";

const emptyReadiness = computeReadiness({
  goal: "",
  skills: "",
  analysisScore: null,
  missingSkills: [],
  analysesCount: 0,
  projectsCount: 0,
  knowledgePacks: 0,
  knowledgeMastered: 0,
  avgQuizScore: null,
  resumeScore: null,
  interviewScore: null,
  completedMilestones: 0,
  streak: 0,
  xp: 0,
  studyHours: 0,
});

const emptyProfile: CareerProfile = {
  goal: "",
  skills: "",
  score: null,
  missingSkills: [],
  analysesCount: 0,
  projectsCount: 0,
  interviewsCount: 0,
  resumeAnalyzed: false,
  completedMilestones: [],
  streak: 0,
  xp: 0,
  level: "Beginner",
  region: "India",
  knowledgePacks: 0,
  knowledgeMastered: 0,
  avgQuizScore: null,
  resumeScore: null,
  interviewScore: null,
  studyHours: 2,
  readiness: emptyReadiness,
};

const notifyProfileChange = () => {
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
};

export const localCount = (userId: string, key: string) => {
  const raw = localStorage.getItem(`skillnova:${userId}:${key}`);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

export const bumpLocalCount = (userId: string, key: string) => {
  localStorage.setItem(`skillnova:${userId}:${key}`, String(localCount(userId, key) + 1));
  notifyProfileChange();
};

export const localNumber = (userId: string, key: string): number | null => {
  const raw = localStorage.getItem(`skillnova:${userId}:${key}`);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const setLocalNumber = (userId: string, key: string, value: number) => {
  localStorage.setItem(`skillnova:${userId}:${key}`, String(value));
  notifyProfileChange();
};

export const getCompletedMilestones = (userId: string, goal: string): string[] => {
  try {
    const raw = localStorage.getItem(`skillnova:${userId}:milestones:${goal}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setCompletedMilestones = (userId: string, goal: string, list: string[]) => {
  localStorage.setItem(`skillnova:${userId}:milestones:${goal}`, JSON.stringify(list));
  notifyProfileChange();
};

export function useCareerProfile(userId: string) {
  const [profile, setProfile] = useState<CareerProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;

    const [{ data: history }, { data: game }, { data: packs }] = await Promise.all([
      supabase
        .from("analysis_history")
        .select("skills,target_role,skill_score,missing_skills,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("gamification").select("xp,level,streak_days").eq("user_id", userId).maybeSingle(),
      supabase.from("knowledge_items").select("quiz_score,mastered").eq("user_id", userId),
    ]);

    const latest = history?.[0];
    const missing = Array.isArray(latest?.missing_skills)
      ? (latest!.missing_skills as any[]).map((m) => (typeof m === "string" ? m : m?.skill)).filter(Boolean)
      : [];

    const goal = latest?.target_role || "";
    const scoredPacks = (packs || []).filter((p) => typeof p.quiz_score === "number");
    const avgQuizScore = scoredPacks.length
      ? Math.round(scoredPacks.reduce((s, p) => s + (p.quiz_score || 0), 0) / scoredPacks.length)
      : null;

    const storedRegion = localStorage.getItem(`skillnova:${userId}:region`);
    const region = storedRegion || detectRegion();
    const completedMilestones = goal ? getCompletedMilestones(userId, goal) : [];

    const signals: EngineSignals = {
      goal,
      skills: latest?.skills || "",
      analysisScore: latest?.skill_score ?? null,
      missingSkills: missing,
      analysesCount: history?.length ?? 0,
      projectsCount: localCount(userId, "projects"),
      knowledgePacks: packs?.length ?? 0,
      knowledgeMastered: (packs || []).filter((p) => p.mastered).length,
      avgQuizScore,
      resumeScore: localNumber(userId, "resumeScore"),
      interviewScore: localNumber(userId, "interviewScore"),
      completedMilestones: completedMilestones.length,
      streak: game?.streak_days ?? 0,
      xp: game?.xp ?? 0,
      studyHours: localNumber(userId, "studyHours") ?? 2,
    };

    setProfile({
      goal,
      skills: signals.skills,
      score: signals.analysisScore,
      missingSkills: missing,
      analysesCount: signals.analysesCount,
      projectsCount: signals.projectsCount,
      interviewsCount: localCount(userId, "interviews"),
      resumeAnalyzed: signals.resumeScore != null,
      completedMilestones,
      streak: signals.streak,
      xp: signals.xp,
      level: game?.level ?? "Beginner",
      region,
      knowledgePacks: signals.knowledgePacks,
      knowledgeMastered: signals.knowledgeMastered,
      avgQuizScore,
      resumeScore: signals.resumeScore,
      interviewScore: signals.interviewScore,
      studyHours: signals.studyHours,
      readiness: computeReadiness(signals),
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Any module that records progress triggers an immediate recompute.
  useEffect(() => {
    const handler = () => load();
    window.addEventListener(PROFILE_EVENT, handler);
    return () => window.removeEventListener(PROFILE_EVENT, handler);
  }, [load]);

  return { profile, loading, reload: load };
}
