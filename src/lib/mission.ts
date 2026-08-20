/**
 * SkillNova — Autonomous Career Brain (orchestration layer)
 *
 * One goal in → mission, phases, gaps, projects, learning topics, backlog and
 * a daily plan out. Every result here is persisted in Supabase (career_missions,
 * execution_tasks, career_decisions, career_events). Nothing is faked: the AI is
 * called exactly once per (re)plan, everything else is deterministic.
 */

import { supabase } from "@/integrations/supabase/client";
import { callCareerOS, logCareerEvent, type BrainSnapshot } from "@/lib/careerBrain";

export interface MissionPhase { name: string; weeks: number; focus: string; skills: string[]; milestones: string[] }
export interface MissionGap { skill: string; severity: "critical" | "high" | "medium"; why: string; closeBy: "learn" | "build" | "verify" }
export interface MissionProject {
  title: string; why: string; skills: string[]; difficulty: string;
  durationWeeks: number; stack: string[]; milestones: string[]; resumeImpact: string;
}
export interface MissionTopic { topic: string; why: string; phase: number }
export interface MissionTarget { category: string; why: string; readyAfterPhase: number }

export interface MissionPlanResult {
  role: string; timelineMonths: number; outcome: string; summary: string;
  requiredSkills: string[]; gaps: MissionGap[]; phases: MissionPhase[];
  projects: MissionProject[]; learningTopics: MissionTopic[];
  interviewFocus: string[]; resumeFocus: string[]; opportunityTargets: MissionTarget[];
}

export interface Mission {
  id: string;
  goal_text: string;
  role: string;
  timeline_months: number;
  deadline: string | null;
  summary: string | null;
  phases: MissionPhase[];
  gaps: MissionGap[];
  projects: MissionProject[];
  learning_topics: MissionTopic[];
  interview_focus: string[];
  resume_focus: string[];
  opportunity_targets: MissionTarget[];
  status: string;
  progress: number;
  current_phase: number;
  last_planned_at: string | null;
  created_at: string;
}

export interface Decision {
  id: string; kind: string; title: string; reason: string | null;
  impact: string | null; created_at: string;
}

export const PIPELINE_STEPS = [
  "Understanding your goal",
  "Analyzing your current skills",
  "Detecting skill gaps",
  "Building your personalized roadmap",
  "Designing portfolio projects",
  "Preparing interview strategy",
  "Finding opportunity targets",
  "Creating your execution plan",
];

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const rowToMission = (r: any): Mission => ({
  id: r.id,
  goal_text: r.goal_text,
  role: r.role,
  timeline_months: r.timeline_months,
  deadline: r.deadline,
  summary: r.summary,
  phases: arr<MissionPhase>(r.phases),
  gaps: arr<MissionGap>(r.gaps),
  projects: arr<MissionProject>(r.projects),
  learning_topics: arr<MissionTopic>(r.learning_topics),
  interview_focus: arr<string>(r.interview_focus),
  resume_focus: arr<string>(r.resume_focus),
  opportunity_targets: arr<MissionTarget>(r.opportunity_targets),
  status: r.status,
  progress: r.progress,
  current_phase: r.current_phase,
  last_planned_at: r.last_planned_at,
  created_at: r.created_at,
});

export async function loadMission(userId: string): Promise<Mission | null> {
  const { data } = await supabase
    .from("career_missions" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? rowToMission(data) : null;
}

export async function loadDecisions(userId: string, limit = 25): Promise<Decision[]> {
  const { data } = await supabase
    .from("career_decisions" as any)
    .select("id,kind,title,reason,impact,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as any as Decision[]) || [];
}

export async function logDecision(
  userId: string,
  missionId: string | null,
  kind: string,
  title: string,
  reason?: string,
  impact?: string,
) {
  try {
    await supabase.from("career_decisions" as any).insert({
      user_id: userId,
      mission_id: missionId,
      kind,
      title,
      reason: reason ?? null,
      impact: impact ?? null,
    } as any);
  } catch {
    /* the activity log must never break a flow */
  }
}

/* ---------------------------------------------------------------- backlog */

const MODULE_FOR: Record<string, string> = {
  learn: "knowledge",
  practice: "knowledge",
  build: "projects",
  verify: "verify",
  career: "resume",
  interview: "interview",
  apply: "opportunities",
};

interface BacklogRow {
  user_id: string; title: string; task_type: string; horizon: string;
  why: string; effort_minutes: number; source: string; meta: any;
}

function buildBacklog(userId: string, plan: MissionPlanResult): BacklogRow[] {
  const rows: BacklogRow[] = [];

  plan.phases.forEach((phase, pi) => {
    phase.milestones.forEach((m) => {
      rows.push({
        user_id: userId,
        title: m,
        task_type: "milestone",
        horizon: pi === 0 ? "week" : "month",
        why: `${phase.name} — ${phase.focus}`,
        effort_minutes: 90,
        source: "mission",
        meta: { phase: pi, module: "roadmap", kind: "milestone" },
      });
    });
  });

  plan.learningTopics.forEach((t) => {
    rows.push({
      user_id: userId,
      title: `Learn ${t.topic}`,
      task_type: "learn",
      horizon: t.phase === 0 ? "week" : "month",
      why: t.why,
      effort_minutes: 45,
      source: "mission",
      meta: { phase: t.phase ?? 0, module: MODULE_FOR.learn, topic: t.topic, kind: "learn" },
    });
  });

  plan.projects.forEach((p, idx) => {
    const phase = Math.min(plan.phases.length - 1, Math.max(0, Math.floor(plan.phases.length / 2) + idx - 1));
    p.milestones.forEach((m) => {
      rows.push({
        user_id: userId,
        title: `${p.title}: ${m}`,
        task_type: "build",
        horizon: "month",
        why: p.why,
        effort_minutes: 60,
        source: "mission",
        meta: { phase, module: MODULE_FOR.build, project: p.title, kind: "build" },
      });
    });
  });

  plan.gaps
    .filter((g) => g.closeBy === "verify")
    .forEach((g) => {
      rows.push({
        user_id: userId,
        title: `Verify your ${g.skill} level`,
        task_type: "verify",
        horizon: "month",
        why: g.why,
        effort_minutes: 30,
        source: "mission",
        meta: { phase: Math.max(0, plan.phases.length - 2), module: MODULE_FOR.verify, skill: g.skill, kind: "verify" },
      });
    });

  const last = Math.max(0, plan.phases.length - 1);
  plan.resumeFocus.slice(0, 3).forEach((r) =>
    rows.push({
      user_id: userId, title: r, task_type: "career", horizon: "month", why: "Hiring readiness",
      effort_minutes: 25, source: "mission", meta: { phase: last, module: MODULE_FOR.career, kind: "career" },
    }),
  );
  plan.interviewFocus.slice(0, 3).forEach((r) =>
    rows.push({
      user_id: userId, title: `Interview prep: ${r}`, task_type: "interview", horizon: "month", why: "Interview readiness",
      effort_minutes: 30, source: "mission", meta: { phase: last, module: MODULE_FOR.interview, kind: "interview" },
    }),
  );

  return rows;
}

/* -------------------------------------------------------------- creation */

export async function createMission(
  userId: string,
  goalText: string,
  brain: BrainSnapshot,
  onStep?: (index: number) => void,
): Promise<Mission> {
  onStep?.(0);
  const plan = await callCareerOS<MissionPlanResult>("mission-plan", { goal: goalText, studyHours: brain.studyHours }, brain);
  if (!plan?.role || !Array.isArray(plan.phases) || !plan.phases.length) {
    throw new Error("The Career Brain could not build a mission from that goal. Try describing the role and timeline.");
  }
  [1, 2, 3, 4, 5, 6].forEach((i) => onStep?.(i));

  const months = Math.max(1, Math.round(plan.timelineMonths || 6));
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + months);

  // one active mission at a time
  await supabase.from("career_missions" as any).update({ status: "archived" } as any).eq("user_id", userId).eq("status", "active");

  const { data, error } = await supabase
    .from("career_missions" as any)
    .insert({
      user_id: userId,
      goal_text: goalText,
      role: plan.role,
      timeline_months: months,
      deadline: deadline.toISOString().slice(0, 10),
      summary: plan.summary,
      phases: plan.phases as any,
      gaps: plan.gaps as any,
      projects: plan.projects as any,
      learning_topics: plan.learningTopics as any,
      interview_focus: plan.interviewFocus as any,
      resume_focus: plan.resumeFocus as any,
      opportunity_targets: plan.opportunityTargets as any,
      current_phase: 0,
      progress: 0,
      last_planned_at: new Date().toISOString(),
    } as any)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Could not save your mission.");
  const mission = rowToMission(data);

  // keep the classic profile in sync so every existing module inherits the goal
  await supabase.from("profiles").update({ } as any).eq("id", userId); // no-op guard for typed client
  await supabase.from("analysis_history").insert({
    user_id: userId,
    target_role: plan.role,
    skills: brain.skills || "",
    score: null,
    missing_skills: plan.gaps.map((g) => g.skill) as any,
    result: { source: "autonomous-mission", summary: plan.summary } as any,
  } as any).then(() => undefined, () => undefined);

  const backlog = buildBacklog(userId, plan);
  if (backlog.length) await supabase.from("execution_tasks").insert(backlog as any);

  await logDecision(userId, mission.id, "GOAL_CREATED", `Mission created: ${plan.role}`, goalText, `${months}-month plan with ${plan.phases.length} phases`);
  await logDecision(userId, mission.id, "SKILL_GAP_DETECTED", `Detected ${plan.gaps.length} skill gaps`, plan.gaps.slice(0, 3).map((g) => g.skill).join(", "), "Gaps ranked by hiring impact");
  await logDecision(userId, mission.id, "ROADMAP_CREATED", `Roadmap built — ${plan.phases.length} phases`, plan.summary, `${backlog.length} tasks queued`);
  await logCareerEvent(userId, "mission_created", `Autonomous mission: ${plan.role}`, months);

  await generateDailyPlan(userId, mission, brain.studyHours || 2);
  return (await loadMission(userId)) || mission;
}

export async function abandonMission(userId: string, missionId: string) {
  await supabase.from("career_missions" as any).update({ status: "archived" } as any).eq("id", missionId).eq("user_id", userId);
  await logDecision(userId, missionId, "GOAL_CHANGED", "Mission archived", "You started a new goal", "Plan reset");
}

/* --------------------------------------------------------- daily planning */

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Pulls backlog work into today, fitted to the hours the learner actually has. */
export async function generateDailyPlan(userId: string, mission: Mission, studyHours: number): Promise<number> {
  const budget = Math.max(30, Math.round((studyHours || 2) * 60));

  const { data: all } = await supabase
    .from("execution_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("source", "mission")
    .order("created_at", { ascending: true });

  const tasks = (all as any[]) || [];
  const todayStart = startOfToday();

  const todays = tasks.filter((t) => t.horizon === "today" && t.status === "pending" && new Date(t.updated_at || t.created_at) >= todayStart);
  let used = todays.reduce((s, t) => s + (t.effort_minutes || 0), 0);
  if (used >= budget) return todays.length;

  const phase = mission.current_phase;
  const pool = tasks
    .filter((t) => t.status === "pending" && t.horizon !== "today")
    .sort((a, b) => {
      const pa = a.meta?.phase ?? 99;
      const pb = b.meta?.phase ?? 99;
      if (pa !== pb) return pa - pb;
      const order = ["learn", "milestone", "build", "verify", "career", "interview"];
      return order.indexOf(a.task_type) - order.indexOf(b.task_type);
    })
    .filter((t) => (t.meta?.phase ?? 0) <= phase + 1);

  const picked: any[] = [];
  const typesToday = new Set(todays.map((t) => t.task_type));
  for (const t of pool) {
    if (used + (t.effort_minutes || 45) > budget) continue;
    if (picked.length >= 5) break;
    if (typesToday.has(t.task_type) && picked.filter((p) => p.task_type === t.task_type).length >= 1) continue;
    picked.push(t);
    typesToday.add(t.task_type);
    used += t.effort_minutes || 45;
  }

  if (picked.length) {
    await supabase
      .from("execution_tasks")
      .update({ horizon: "today", updated_at: new Date().toISOString() } as any)
      .in("id", picked.map((p) => p.id));
    await logDecision(
      userId,
      mission.id,
      "TASK_CREATED",
      `Today's plan built — ${picked.length} tasks (${Math.round(used)} min)`,
      `Fitted to your ${studyHours}h/day and phase "${mission.phases[phase]?.name || "current"}"`,
      picked.map((p) => p.title).join(" · "),
    );
  }

  await supabase.from("career_missions" as any).update({ last_planned_at: new Date().toISOString() } as any).eq("id", mission.id);
  return todays.length + picked.length;
}

/* ------------------------------------------------------------- adaptation */

export interface SyncResult { progress: number; phase: number; notes: string[] }

/**
 * The autonomous loop: recompute progress, advance phases, rescue missed work
 * and rebuild today's plan. Runs on every dashboard load — no AI credits used.
 */
export async function syncMission(userId: string, mission: Mission, studyHours: number): Promise<SyncResult> {
  const notes: string[] = [];

  const { data: all } = await supabase
    .from("execution_tasks")
    .select("id,status,horizon,task_type,title,effort_minutes,meta,updated_at,created_at,completed_at")
    .eq("user_id", userId)
    .eq("source", "mission");

  const tasks = (all as any[]) || [];
  const total = tasks.length || 1;
  const done = tasks.filter((t) => t.status === "done").length;
  const progress = Math.min(100, Math.round((done / total) * 100));

  // stale "today" work that was never completed → returned to the backlog
  const todayStart = startOfToday();
  const stale = tasks.filter(
    (t) => t.horizon === "today" && t.status === "pending" && new Date(t.updated_at || t.created_at) < todayStart,
  );
  if (stale.length) {
    await supabase
      .from("execution_tasks")
      .update({ horizon: "week", updated_at: new Date().toISOString() } as any)
      .in("id", stale.map((s) => s.id));
    notes.push(`${stale.length} unfinished session${stale.length > 1 ? "s" : ""} rescheduled`);
    await logDecision(
      userId,
      mission.id,
      "TASK_MISSED",
      `Recovered ${stale.length} missed session${stale.length > 1 ? "s" : ""}`,
      "These tasks were scheduled but not completed",
      "Moved back into the backlog and re-prioritised so your deadline stays protected",
    );
    await logCareerEvent(userId, "tasks_missed", `${stale.length} missed sessions replanned`, stale.length);
  }

  // phase advance: current phase complete when its tasks are done
  let phase = mission.current_phase;
  const phaseTasks = (p: number) => tasks.filter((t) => (t.meta?.phase ?? 0) === p);
  while (phase < mission.phases.length - 1) {
    const list = phaseTasks(phase);
    if (list.length && list.every((t) => t.status === "done")) {
      phase += 1;
      notes.push(`Phase advanced to ${mission.phases[phase]?.name}`);
      await logDecision(
        userId,
        mission.id,
        "PHASE_ADVANCED",
        `Moved you into "${mission.phases[phase]?.name}"`,
        "You completed every task in the previous phase",
        "Next phase work pulled forward — timeline protected",
      );
    } else break;
  }

  if (progress !== mission.progress || phase !== mission.current_phase) {
    await supabase.from("career_missions" as any).update({ progress, current_phase: phase } as any).eq("id", mission.id);
  }

  await generateDailyPlan(userId, { ...mission, current_phase: phase, progress }, studyHours);
  return { progress, phase, notes };
}

/** Deterministic highest-impact action for the mission (no AI call). */
export function missionNextAction(
  mission: Mission,
  todays: { title: string; task_type: string; status: string; meta?: any }[],
): { title: string; why: string; module: string } {
  const open = todays.find((t) => t.status === "pending");
  if (open) {
    return {
      title: open.title,
      why: `It is today's highest-priority ${open.task_type} task in phase "${mission.phases[mission.current_phase]?.name || "current"}".`,
      module: open.meta?.module || "plan",
    };
  }
  const gap = mission.gaps[0];
  if (gap) {
    return {
      title: `Close your ${gap.skill} gap`,
      why: gap.why,
      module: gap.closeBy === "build" ? "projects" : gap.closeBy === "verify" ? "verify" : "knowledge",
    };
  }
  return { title: "Review your mission progress", why: "All scheduled work is complete for today.", module: "plan" };
}
