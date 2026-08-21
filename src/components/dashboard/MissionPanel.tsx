import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles, Target, CheckCircle2, Circle, ArrowRight, Brain, AlertTriangle,
  Loader2, CalendarClock, Hammer, BookOpen, Rocket, RefreshCw, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCareerBrain, notifyBrainChange } from "@/hooks/useCareerBrain";
import { goToModule, logCareerEvent } from "@/lib/careerBrain";
import { MeterBar } from "./intelligence/IntelligenceUI";
import {
  PIPELINE_STEPS, createMission, loadMission, loadDecisions, syncMission,
  generateDailyPlan, missionNextAction, abandonMission,
  type Mission, type Decision,
} from "@/lib/mission";

const EXAMPLES = [
  "I want to become an AI/ML Engineer and get an internship within 6 months.",
  "I want to become a full-stack developer and get a job in 5 months.",
  "I want to become a data analyst and land a remote role in 4 months.",
];

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

const DECISION_ICON: Record<string, string> = {
  GOAL_CREATED: "🎯",
  SKILL_GAP_DETECTED: "🧠",
  ROADMAP_CREATED: "🗺️",
  TASK_CREATED: "📅",
  TASK_COMPLETED: "✅",
  TASK_MISSED: "⚠️",
  PHASE_ADVANCED: "🚀",
  GOAL_CHANGED: "🔁",
};

const MissionPanel = ({ userId }: { userId: string }) => {
  const brain = useCareerBrain(userId);
  const [mission, setMission] = useState<Mission | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState("");
  const [building, setBuilding] = useState(false);
  const [step, setStep] = useState(-1);
  const [syncing, setSyncing] = useState(false);
  const synced = useRef(false);

  const refresh = useCallback(async () => {
    const [m, d] = await Promise.all([loadMission(userId), loadDecisions(userId)]);
    setMission(m);
    setDecisions(d);
    setLoading(false);
    return m;
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // autonomous loop: recompute progress, rescue missed work, rebuild today's plan
  useEffect(() => {
    if (loading || !mission || synced.current || brain.loading) return;
    synced.current = true;
    (async () => {
      setSyncing(true);
      try {
        const res = await syncMission(userId, mission, brain.profile.studyHours);
        if (res.notes.length) toast.info(`Career Brain: ${res.notes.join(" · ")}`);
        await refresh();
        await brain.reload();
      } catch {
        /* the loop must never block the dashboard */
      } finally {
        setSyncing(false);
      }
    })();
  }, [loading, mission, brain.loading, brain.profile.studyHours, userId, refresh, brain]);

  const start = async (text: string) => {
    const value = text.trim();
    if (value.length < 12) {
      toast.error("Describe your goal in a sentence, e.g. \"Become an AI/ML Engineer in 6 months\".");
      return;
    }
    setBuilding(true);
    setStep(0);
    const ticker = setInterval(() => setStep((s) => (s < PIPELINE_STEPS.length - 2 ? s + 1 : s)), 900);
    try {
      const m = await createMission(userId, value, brain.snapshot, () => undefined);
      clearInterval(ticker);
      setStep(PIPELINE_STEPS.length);
      setMission(m);
      notifyBrainChange();
      await brain.reload();
      await refresh();
      synced.current = true;
      toast.success("Your autonomous career mission is live");
    } catch (e: any) {
      clearInterval(ticker);
      setStep(-1);
      toast.error(e.message || "The Career Brain could not build your mission.");
    } finally {
      setBuilding(false);
    }
  };

  const toggleTask = async (id: string, done: boolean) => {
    await supabase
      .from("execution_tasks")
      .update({ status: done ? "pending" : "done", completed_at: done ? null : new Date().toISOString() })
      .eq("id", id);
    if (!done && mission) {
      await supabase.rpc("add_xp", { _user_id: userId, _amount: 15 });
      await logCareerEvent(userId, "task_completed", "Completed an autonomous task", 15);
    }
    notifyBrainChange();
    await brain.reload();
    if (mission) {
      const res = await syncMission(userId, mission, brain.profile.studyHours);
      if (res.notes.length) toast.info(`Career Brain: ${res.notes.join(" · ")}`);
    }
    await refresh();
  };

  const replan = async () => {
    if (!mission) return;
    setSyncing(true);
    try {
      await generateDailyPlan(userId, mission, brain.profile.studyHours);
      await syncMission(userId, mission, brain.profile.studyHours);
      await refresh();
      await brain.reload();
      toast.success("Plan rebuilt for today");
    } finally {
      setSyncing(false);
    }
  };

  const newGoal = async () => {
    if (!mission) return;
    await abandonMission(userId, mission.id);
    setMission(null);
    setGoal("");
    synced.current = false;
    await refresh();
  };

  const todays = useMemo(() => brain.tasks.filter((t) => t.horizon === "today"), [brain.tasks]);
  const missionTasks = useMemo(() => brain.tasks.filter((t) => (t as any).source === "mission"), [brain.tasks]);

  if (loading) {
    return <div className="text-muted-foreground text-sm animate-pulse">Loading your mission...</div>;
  }

  /* ------------------------------------------------------ onboarding */
  if (!mission) {
    return (
      <div className="max-w-3xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Autonomous Career Agent</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold gradient-text mb-3">
            Tell SkillNova where you want to go.
          </h2>
          <p className="text-muted-foreground">
            One sentence is enough. The Career Brain analyses your profile, detects gaps, builds the roadmap,
            designs the projects and schedules your daily work — automatically.
          </p>
        </div>

        <div className="glass-card p-6">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            disabled={building}
            placeholder="I want to become an AI/ML Engineer and get an internship within 6 months."
            className="w-full bg-transparent border border-border rounded-lg p-4 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => setGoal(e)}
                disabled={building}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
          <button
            onClick={() => start(goal)}
            disabled={building}
            className="mt-5 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium inline-flex items-center gap-2 disabled:opacity-60"
          >
            {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {building ? "Building your career plan..." : "Start my mission"}
          </button>

          <AnimatePresence>
            {building && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }} className="mt-6 space-y-2 overflow-hidden">
                {PIPELINE_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-3 text-sm">
                    {i < step ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : i === step ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40" />
                    )}
                    <span className={i <= step ? "text-foreground" : "text-muted-foreground/60"}>{s}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------- mission cockpit */
  const phase = mission.phases[mission.current_phase];
  const next = missionNextAction(mission, todays as any);
  const doneToday = todays.filter((t) => t.status === "done").length;
  const budget = Math.round(todays.reduce((s, t) => s + (t.effort_minutes || 0), 0));
  const daysLeft = mission.deadline
    ? Math.max(0, Math.round((new Date(mission.deadline).getTime() - Date.now()) / 86400000))
    : null;
  const behind = missionTasks.length
    ? mission.progress < Math.round(((mission.timeline_months * 30 - (daysLeft ?? 0)) / (mission.timeline_months * 30)) * 100) - 10
    : false;

  return (
    <div className="space-y-6">
      {/* mission header */}
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-1">Autonomous Career Mission</p>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">{mission.role}</h2>
            <p className="text-sm text-muted-foreground mt-1">{mission.summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={replan} disabled={syncing} className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} /> Replan today
            </button>
            <button onClick={newGoal} className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground">
              New goal
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{mission.progress}% mission complete</p>
            <MeterBar value={mission.progress} />
          </div>
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">Current phase</p>
            <p className="text-foreground">{phase?.name || "—"}</p>
          </div>
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">Deadline</p>
            <p className="text-foreground inline-flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-primary" />
              {mission.deadline || "—"}{daysLeft != null && ` · ${daysLeft} days left`}
            </p>
          </div>
        </div>
      </div>

      {/* next best action */}
      <div className="glass-card p-6 border-primary/30">
        <p className="text-xs uppercase tracking-wide text-primary mb-2 inline-flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> Your highest-impact action today
        </p>
        <p className="text-lg text-foreground font-medium">{next.title}</p>
        <p className="text-sm text-muted-foreground mt-1">Why? {next.why}</p>
        <button onClick={() => goToModule(next.module)} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
          Open the right tool <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {behind && (
        <div className="glass-card p-5 border-amber-500/30">
          <p className="text-sm text-foreground inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Career Brain detected a risk
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your completion rate is behind the pace needed for the {mission.timeline_months}-month deadline.
            Today's plan has been re-prioritised toward the highest-impact gaps.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* today */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-foreground font-medium">Today — auto-generated</p>
            <span className="text-xs text-muted-foreground">{doneToday}/{todays.length} done · {budget} min planned</span>
          </div>
          <div className="space-y-3">
            {todays.map((t) => {
              const done = t.status === "done";
              return (
                <div key={t.id} className="flex gap-3">
                  <button onClick={() => toggleTask(t.id, done)} className="mt-0.5 shrink-0 text-primary">
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0">
                    <p className={`text-sm ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                    {t.why && <p className="text-[11px] text-muted-foreground mt-0.5">{t.why}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] uppercase text-muted-foreground/70">{t.task_type} · {t.effort_minutes}m</span>
                      {(t as any).meta?.module && (
                        <button onClick={() => goToModule((t as any).meta.module, { topic: (t as any).meta.topic, skill: (t as any).meta.skill })} className="text-[10px] text-primary inline-flex items-center gap-1">
                          Open <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!todays.length && <p className="text-xs text-muted-foreground">Nothing scheduled right now — the Career Brain will pull work forward on your next visit.</p>}
          </div>
        </div>

        {/* activity log */}
        <div className="glass-card p-5">
          <p className="text-sm text-foreground font-medium mb-4 inline-flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Career Brain activity
          </p>
          <div className="space-y-4 max-h-[420px] overflow-y-auto scroll-dark pr-1">
            {decisions.map((d) => (
              <div key={d.id}>
                <p className="text-[10px] text-muted-foreground/70">{timeAgo(d.created_at)}</p>
                <p className="text-sm text-foreground">{DECISION_ICON[d.kind] || "🧠"} {d.title}</p>
                {d.reason && <p className="text-[11px] text-muted-foreground mt-0.5"><span className="text-muted-foreground/60">Reason:</span> {d.reason}</p>}
                {d.impact && <p className="text-[11px] text-muted-foreground"><span className="text-muted-foreground/60">Impact:</span> {d.impact}</p>}
              </div>
            ))}
            {!decisions.length && <p className="text-xs text-muted-foreground">No decisions recorded yet.</p>}
          </div>
        </div>
      </div>

      {/* phases */}
      <div className="glass-card p-5">
        <p className="text-sm text-foreground font-medium mb-4">Mission phases</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mission.phases.map((p, i) => (
            <div key={p.name + i} className={`rounded-lg border p-4 ${i === mission.current_phase ? "border-primary/50" : "border-border"}`}>
              <p className="text-xs uppercase tracking-wide text-primary">Phase {i + 1} · {p.weeks}w</p>
              <p className="text-sm text-foreground mt-1">{p.name}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{p.focus}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.skills.slice(0, 6).map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* gaps + projects */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <p className="text-sm text-foreground font-medium mb-4">Detected skill gaps</p>
          <div className="space-y-3">
            {mission.gaps.map((g) => (
              <div key={g.skill} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{g.skill} <span className="text-[10px] uppercase text-muted-foreground/70">· {g.severity}</span></p>
                  <p className="text-[11px] text-muted-foreground">{g.why}</p>
                </div>
                <button
                  onClick={() => goToModule(g.closeBy === "build" ? "projects" : g.closeBy === "verify" ? "verify" : "knowledge", { topic: g.skill, skill: g.skill })}
                  className="text-[11px] text-primary shrink-0 inline-flex items-center gap-1"
                >
                  {g.closeBy === "build" ? <Hammer className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                  {g.closeBy === "build" ? "Build" : g.closeBy === "verify" ? "Verify" : "Learn"}
                </button>
              </div>
            ))}
            {!mission.gaps.length && <p className="text-xs text-muted-foreground">No gaps detected for this mission.</p>}
          </div>
        </div>

        <div className="glass-card p-5">
          <p className="text-sm text-foreground font-medium mb-4">Auto-designed projects</p>
          <div className="space-y-4">
            {mission.projects.map((p) => (
              <div key={p.title}>
                <p className="text-sm text-foreground inline-flex items-center gap-2"><Rocket className="w-3.5 h-3.5 text-primary" /> {p.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{p.why}</p>
                <p className="text-[10px] uppercase text-muted-foreground/70 mt-1">{p.difficulty} · {p.durationWeeks}w · {p.stack.slice(0, 4).join(", ")}</p>
              </div>
            ))}
            {!mission.projects.length && <p className="text-xs text-muted-foreground">No projects required for this mission yet.</p>}
          </div>
        </div>
      </div>

      {/* hiring track */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-card p-5">
          <p className="text-sm text-foreground font-medium mb-3">Interview focus</p>
          {mission.interview_focus.map((f) => <p key={f} className="text-[12px] text-muted-foreground">• {f}</p>)}
          <button onClick={() => goToModule("interview")} className="mt-3 text-[11px] text-primary">Open interview practice →</button>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-foreground font-medium mb-3">Resume focus</p>
          {mission.resume_focus.map((f) => <p key={f} className="text-[12px] text-muted-foreground">• {f}</p>)}
          <button onClick={() => goToModule("resume")} className="mt-3 text-[11px] text-primary">Open resume intelligence →</button>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-foreground font-medium mb-3">Opportunity targets</p>
          {mission.opportunity_targets.map((o) => (
            <p key={o.category} className="text-[12px] text-muted-foreground">• {o.category} <span className="text-muted-foreground/60">(from phase {o.readyAfterPhase + 1})</span></p>
          ))}
          {!mission.opportunity_targets.length && <p className="text-xs text-muted-foreground">No categories identified yet.</p>}
          <button onClick={() => goToModule("opportunities")} className="mt-3 text-[11px] text-primary">Open opportunities →</button>
        </div>
      </div>
    </div>
  );
};

export default MissionPanel;
