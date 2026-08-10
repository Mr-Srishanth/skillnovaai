import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCareerProfile, type CareerProfile } from "@/hooks/useCareerProfile";
import {
  buildEvidence,
  splitSkills,
  deterministicNextAction,
  type BrainSnapshot,
  type NextAction,
  type SkillEvidence,
} from "@/lib/careerBrain";

export interface BrainJob {
  id: string;
  title: string;
  company: string | null;
  status: string;
  match_score: number | null;
  job_readiness: number | null;
  requirements: any;
  analysis: any;
  description: string | null;
  source_url: string | null;
  created_at: string;
}

export interface BrainTask {
  id: string;
  title: string;
  task_type: string;
  horizon: string;
  why: string | null;
  effort_minutes: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface BrainVerification {
  id: string;
  skill: string;
  claimed_level: string | null;
  verified_level: string | null;
  score: number | null;
  status: string;
  result: any;
  assessment: any;
  created_at: string;
}

export interface CareerBrain {
  profile: CareerProfile;
  loading: boolean;
  evidence: SkillEvidence[];
  jobs: BrainJob[];
  tasks: BrainTask[];
  verifications: BrainVerification[];
  projects: { title: string; stack: string[]; status: string }[];
  events: { id: string; kind: string; label: string; value: number | null; created_at: string }[];
  snapshot: BrainSnapshot;
  nextAction: NextAction;
  reload: () => Promise<void>;
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : (x as any)?.skill || (x as any)?.name || "")).filter(Boolean) : [];

export function useCareerBrain(userId: string): CareerBrain {
  const { profile, loading: profileLoading, reload: reloadProfile } = useCareerProfile(userId);

  const [jobs, setJobs] = useState<BrainJob[]>([]);
  const [tasks, setTasks] = useState<BrainTask[]>([]);
  const [verifications, setVerifications] = useState<BrainVerification[]>([]);
  const [projects, setProjects] = useState<{ title: string; stack: string[]; status: string }[]>([]);
  const [knowledge, setKnowledge] = useState<{ title: string; topic: string | null; quizScore: number | null; mastered: boolean }[]>([]);
  const [events, setEvents] = useState<{ id: string; kind: string; label: string; value: number | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const [j, t, v, p, k, e] = await Promise.all([
      supabase.from("career_jobs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("execution_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
      supabase.from("skill_verifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("studio_projects").select("title,tech_stack,status").eq("user_id", userId).limit(40),
      supabase.from("knowledge_items").select("title,topic,quiz_score,mastered").eq("user_id", userId).limit(60),
      supabase.from("career_events").select("id,kind,label,value,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(120),
    ]);

    setJobs((j.data as any) || []);
    setTasks((t.data as any) || []);
    setVerifications((v.data as any) || []);
    setProjects(((p.data as any[]) || []).map((r) => ({ title: r.title, stack: asArray(r.tech_stack), status: r.status })));
    setKnowledge(((k.data as any[]) || []).map((r) => ({ title: r.title, topic: r.topic, quizScore: r.quiz_score, mastered: !!r.mastered })));
    setEvents((e.data as any) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => {
      load();
      reloadProfile();
    };
    window.addEventListener("skillnova:brain-updated", handler);
    return () => window.removeEventListener("skillnova:brain-updated", handler);
  }, [load, reloadProfile]);

  const evidence = useMemo(
    () =>
      buildEvidence({
        claimedSkills: splitSkills(profile.skills),
        verifications: verifications.map((v) => ({ skill: v.skill, score: v.score, verified_level: v.verified_level, status: v.status })),
        projects,
        knowledge,
      }),
    [profile.skills, verifications, projects, knowledge],
  );

  const openTasks = tasks.filter((t) => t.status === "pending");

  const snapshot: BrainSnapshot = useMemo(
    () => ({
      goal: profile.goal,
      skills: profile.skills,
      readiness: profile.readiness?.score ?? 0,
      strongest: evidence[0]?.skill,
      weakest: profile.missingSkills[0],
      missingSkills: profile.missingSkills,
      projectsCount: projects.length,
      projects,
      knowledgePacks: knowledge.length,
      knowledgeMastered: knowledge.filter((k) => k.mastered).length,
      avgQuizScore: profile.avgQuizScore,
      recentTopics: knowledge.slice(0, 6).map((k) => k.topic || k.title),
      verified: verifications
        .filter((v) => v.status === "completed")
        .map((v) => ({ skill: v.skill, level: v.verified_level || "graded", score: v.score || 0 })),
      resumeScore: profile.resumeScore,
      interviewScore: profile.interviewScore,
      streak: profile.streak,
      xp: profile.xp,
      studyHours: profile.studyHours,
      region: profile.region,
      jobs: jobs.map((j) => ({ title: j.title, company: j.company, match: j.match_score, status: j.status })),
      openTasks: openTasks.map((t) => t.title),
      evidence: evidence.slice(0, 40).map((e) => ({ skill: e.skill, level: e.level, sources: e.sources.map((s) => s.detail) })),
    }),
    [profile, evidence, projects, knowledge, verifications, jobs, openTasks],
  );

  const nextAction = useMemo(
    () =>
      deterministicNextAction({
        goal: profile.goal,
        readiness: profile.readiness?.score ?? 0,
        projectsCount: projects.length,
        knowledgePacks: knowledge.length,
        resumeScore: profile.resumeScore,
        interviewScore: profile.interviewScore,
        verifiedCount: verifications.filter((v) => v.status === "completed").length,
        missingSkills: profile.missingSkills,
        openTasks: openTasks.length,
      }),
    [profile, projects.length, knowledge.length, verifications, openTasks.length],
  );

  return {
    profile,
    loading: loading || profileLoading,
    evidence,
    jobs,
    tasks,
    verifications,
    projects,
    events,
    snapshot,
    nextAction,
    reload: load,
  };
}

export const notifyBrainChange = () => window.dispatchEvent(new CustomEvent("skillnova:brain-updated"));
