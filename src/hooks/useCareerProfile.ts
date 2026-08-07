import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

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
};

export const localCount = (userId: string, key: string) => {
  const raw = localStorage.getItem(`skillnova:${userId}:${key}`);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

export const bumpLocalCount = (userId: string, key: string) => {
  localStorage.setItem(`skillnova:${userId}:${key}`, String(localCount(userId, key) + 1));
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
};

export function useCareerProfile(userId: string) {
  const [profile, setProfile] = useState<CareerProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [{ data: history }, { data: game }] = await Promise.all([
      supabase
        .from("analysis_history")
        .select("skills,target_role,skill_score,missing_skills,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("gamification").select("xp,level,streak_days").eq("user_id", userId).maybeSingle(),
    ]);

    const latest = history?.[0];
    const missing = Array.isArray(latest?.missing_skills)
      ? (latest!.missing_skills as any[]).map((m) => (typeof m === "string" ? m : m?.skill)).filter(Boolean)
      : [];

    const goal = latest?.target_role || "";

    setProfile({
      goal,
      skills: latest?.skills || "",
      score: latest?.skill_score ?? null,
      missingSkills: missing,
      analysesCount: history?.length ?? 0,
      projectsCount: localCount(userId, "projects"),
      interviewsCount: localCount(userId, "interviews"),
      resumeAnalyzed: localCount(userId, "resumes") > 0,
      completedMilestones: goal ? getCompletedMilestones(userId, goal) : [],
      streak: game?.streak_days ?? 0,
      xp: game?.xp ?? 0,
      level: game?.level ?? "Beginner",
      region: localStorage.getItem(`skillnova:${userId}:region`) || "India",
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, reload: load };
}
