import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCareerBrain, notifyBrainChange } from "@/hooks/useCareerBrain";
import { callCareerOS, logCareerEvent, goToModule } from "@/lib/careerBrain";
import { PanelHeader, MeterBar, ThinkingState, EmptyGoalState } from "./intelligence/IntelligenceUI";

const STEPS = ["Checking unfinished work...", "Ranking gaps by impact...", "Fitting tasks to your available hours...", "Sequencing today, this week, this month..."];

interface PlanTask { title: string; type: string; horizon: string; why: string; effortMinutes: number; module: string }
interface PlanResult { rationale: string; tasks: PlanTask[] }

const HORIZONS: { id: string; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

const PlanPanel = ({ userId }: { userId: string }) => {
  const brain = useCareerBrain(userId);
  const [busy, setBusy] = useState(false);
  const [rationale, setRationale] = useState("");

  const generate = async () => {
    setBusy(true);
    try {
      const res = await callCareerOS<PlanResult>(
        "plan",
        { studyHours: brain.profile.studyHours, openTasks: brain.tasks.filter((t) => t.status === "pending").map((t) => t.title) },
        brain.snapshot,
      );
      setRationale(res.rationale);
      const rows = (res.tasks || []).map((t) => ({
        user_id: userId,
        title: t.title,
        task_type: t.type,
        horizon: t.horizon,
        why: t.why,
        effort_minutes: Math.max(10, Math.round(t.effortMinutes || 45)),
        source: "ai-plan",
        meta: { module: t.module } as any,
      }));
      if (rows.length) await supabase.from("execution_tasks").insert(rows);
      await logCareerEvent(userId, "plan_generated", `Planned ${rows.length} tasks`, rows.length);
      notifyBrainChange();
      await brain.reload();
      toast.success("Your plan is ready");
    } catch (e: any) {
      toast.error(e.message || "Planning failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, done: boolean) => {
    await supabase
      .from("execution_tasks")
      .update({ status: done ? "pending" : "done", completed_at: done ? null : new Date().toISOString() })
      .eq("id", id);
    if (!done) {
      await supabase.rpc("add_xp", { _user_id: userId, _amount: 15 });
      await logCareerEvent(userId, "task_completed", "Completed a planned task", 15);
    }
    notifyBrainChange();
    await brain.reload();
  };

  if (!brain.profile.goal)
    return <><PanelHeader title="Execution Plan" subtitle="Turn intelligence into daily action." /><EmptyGoalState what="an execution plan" /></>;

  const today = brain.tasks.filter((t) => t.horizon === "today");
  const doneToday = today.filter((t) => t.status === "done").length;
  const progress = today.length ? Math.round((doneToday / today.length) * 100) : 0;

  return (
    <div>
      <PanelHeader
        title="Execution Plan"
        subtitle="A realistic plan fitted to the hours you actually have — rebuilt from your gaps, unfinished work and target jobs."
        onRefresh={generate}
        refreshing={busy}
      />

      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-foreground">Today's completion</p>
          <span className="text-xs text-muted-foreground">{doneToday}/{today.length} · {brain.profile.studyHours}h available</span>
        </div>
        <MeterBar value={progress} />
        {rationale && <p className="text-xs text-muted-foreground mt-3">{rationale}</p>}
        {!brain.tasks.length && !busy && (
          <button onClick={generate} className="mt-4 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Generate my plan
          </button>
        )}
      </div>

      {busy && <ThinkingState steps={STEPS} />}

      <div className="grid md:grid-cols-3 gap-4">
        {HORIZONS.map((h) => {
          const list = brain.tasks.filter((t) => t.horizon === h.id);
          return (
            <div key={h.id} className="glass-card p-5">
              <p className="text-xs uppercase tracking-wide text-primary mb-3">{h.label}</p>
              <div className="space-y-3">
                {list.map((t) => {
                  const done = t.status === "done";
                  return (
                    <div key={t.id} className="flex gap-2">
                      <button onClick={() => toggle(t.id, done)} className="mt-0.5 shrink-0 text-primary">
                        {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-sm ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                        {t.why && <p className="text-[11px] text-muted-foreground mt-0.5">{t.why}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] uppercase text-muted-foreground/70">{t.task_type} · {t.effort_minutes}m</span>
                          {(t as any).meta?.module && (
                            <button onClick={() => goToModule((t as any).meta.module)} className="text-[10px] text-primary inline-flex items-center gap-1">
                              Open <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!list.length && <p className="text-xs text-muted-foreground">Nothing scheduled.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanPanel;
