import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useCareerBrain } from "@/hooks/useCareerBrain";
import { PanelHeader, ScoreRing, MeterBar } from "./intelligence/IntelligenceUI";

const AnalyticsPanel = ({ userId }: { userId: string }) => {
  const brain = useCareerBrain(userId);
  const { profile, events, evidence, jobs, tasks, verifications } = brain;

  const weekly = useMemo(() => {
    const buckets: { label: string; count: number }[] = [];
    for (let w = 5; w >= 0; w--) {
      const start = new Date();
      start.setDate(start.getDate() - w * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = events.filter((e) => {
        const d = new Date(e.created_at);
        return d >= new Date(start.toDateString()) && d < end;
      }).length;
      buckets.push({ label: w === 0 ? "This week" : `${w}w ago`, count });
    }
    return buckets;
  }, [events]);

  const max = Math.max(1, ...weekly.map((w) => w.count));
  const proven = evidence.filter((e) => e.strength >= 68).length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  const stats = [
    { label: "Proven skills", value: proven },
    { label: "Verified", value: verifications.filter((v) => v.status === "completed").length },
    { label: "Projects", value: brain.projects.length },
    { label: "Jobs tracked", value: jobs.length },
    { label: "Tasks done", value: doneTasks },
    { label: "Day streak", value: profile.streak },
  ];

  return (
    <div>
      <PanelHeader
        title="Career Analytics"
        subtitle="Your growth over time — evidence built, skills proven and actions completed, all measured from real activity."
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-6 flex items-center gap-5">
          <ScoreRing score={profile.readiness?.overall ?? 0} size={100} label="readiness" />
          <div>
            <p className="text-sm text-foreground font-medium">Career readiness</p>
            <p className="text-xs text-muted-foreground mt-1">
              Strongest: {profile.readiness?.strongest?.name || "—"} · Weakest: {profile.readiness?.weakest?.name || "—"}
            </p>
          </div>
        </div>

        <div className="glass-card p-6 md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Readiness dimensions</p>
          <div className="space-y-2">
            {(profile.readiness?.dimensions || []).map((d) => (
              <div key={d.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">{d.name}</span>
                  <span className="text-muted-foreground">{d.known ? `${d.score}%` : "No evidence yet"}</span>
                </div>
                <MeterBar value={d.known ? d.score : 0} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-2xl font-display font-bold gradient-text">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4">Activity over 6 weeks</p>
          <div className="flex items-end gap-3 h-36">
            {weekly.map((w) => (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(w.count / max) * 100}%` }}
                  transition={{ duration: 0.8 }}
                  className="w-full rounded-t-md min-h-[4px]"
                  style={{ background: "linear-gradient(180deg, hsl(186,94%,55%), hsl(270,60%,55%))" }}
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4">Evidence table</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {evidence.slice(0, 20).map((e) => (
              <div key={e.skill}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground truncate">{e.skill}</span>
                  <span className="text-muted-foreground shrink-0">{e.level}</span>
                </div>
                <MeterBar value={e.strength} />
              </div>
            ))}
            {!evidence.length && <p className="text-xs text-muted-foreground">No evidence yet — run an analysis to begin.</p>}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 mt-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4">Career timeline</p>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-3">
              <Activity className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-foreground">{e.label}{e.value != null ? ` · ${e.value}` : ""}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {!events.length && <p className="text-xs text-muted-foreground">No tracked activity yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
