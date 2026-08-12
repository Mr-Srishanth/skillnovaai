import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock, Rocket } from "lucide-react";
import { useCareerProfile, getCompletedMilestones, setCompletedMilestones } from "@/hooks/useCareerProfile";
import { runIntelligence, readCache, writeCache } from "@/lib/careerAI";
import { PanelHeader, EmptyGoalState, ThinkingState, MeterBar } from "./intelligence/IntelligenceUI";

interface Milestone {
  stage: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  tasks: string[];
  resources: string[];
  projects: string[];
}

interface Roadmap {
  summary: string;
  totalEstimatedWeeks: number;
  milestones: Milestone[];
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/15 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  advanced: "bg-destructive/15 text-destructive border-destructive/30",
};

const RoadmapPanel = ({ userId }: { userId: string }) => {
  const { profile, loading: profileLoading } = useCareerProfile(userId);
  const [data, setData] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  // READ ≠ ANALYZE: mounting only loads the persisted roadmap, it never generates one.
  useEffect(() => {
    if (!profile.goal) return;
    setDone(getCompletedMilestones(userId, profile.goal));
    setData(readCache<Roadmap>("roadmap", profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.goal]);

  const generate = async () => {
    if (!profile.goal) return;
    setLoading(true);
    try {
      const res = await runIntelligence<Roadmap>("roadmap", profile);
      setData(res);
      writeCache("roadmap", profile, res);
    } catch (e: any) {
      toast.error(e.message || "Could not build your roadmap");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (stage: string) => {
    const next = done.includes(stage) ? done.filter((s) => s !== stage) : [...done, stage];
    setDone(next);
    setCompletedMilestones(userId, profile.goal, next);
    if (!done.includes(stage)) toast.success(`${stage} milestone complete`);
  };

  if (profileLoading) return <ThinkingState steps={["Loading your career profile..."]} />;
  if (!profile.goal) return <EmptyGoalState what="your dynamic roadmap" />;

  const total = data?.milestones.length || 0;
  const progress = total ? Math.round((done.length / total) * 100) : 0;
  const nextMilestone = data?.milestones.find((m) => !done.includes(m.stage)) || null;

  return (
    <div className="max-w-5xl">
      <PanelHeader
        title="Dynamic Career Roadmap"
        subtitle={`A living roadmap to become a ${profile.goal}. It adapts as you complete milestones.`}
        onRefresh={data ? generate : undefined}
        refreshing={loading}
      />

      {!data && !loading && (
        <div className="glass-card p-10 text-center mb-6">
          <Rocket className="w-7 h-7 mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No roadmap yet for <span className="text-foreground">{profile.goal}</span>. Generate one when you're ready — it stays saved until you regenerate it.
          </p>
          <button onClick={generate} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Generate roadmap
          </button>
        </div>
      )}

      {loading && !data && (
        <ThinkingState steps={["Mapping your target role...", "Sequencing milestones...", "Estimating timelines...", "Attaching projects & resources..."]} />
      )}

      {data && (
        <>
          <div className="glass-card p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <p className="text-sm text-muted-foreground max-w-2xl">{data.summary}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <Clock className="w-3.5 h-3.5" /> ~{data.totalEstimatedWeeks} weeks
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1"><MeterBar value={progress} /></div>
              <span className="text-sm font-display font-bold text-foreground">{progress}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{done.length} of {total} milestones complete</p>
          </div>

          <div className="relative pl-6">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {data.milestones.map((m, i) => {
                const complete = done.includes(m.stage);
                const expanded = open === m.stage;
                return (
                  <motion.div
                    key={m.stage + i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="relative"
                  >
                    <button
                      onClick={() => toggle(m.stage)}
                      className="absolute -left-6 top-5 z-10"
                      aria-label={`Toggle ${m.stage} milestone`}
                    >
                      {complete ? (
                        <CheckCircle2 className="w-[19px] h-[19px] text-primary bg-background rounded-full" />
                      ) : (
                        <Circle className="w-[19px] h-[19px] text-muted-foreground bg-background rounded-full" />
                      )}
                    </button>
                    <div
                      className={`glass-card p-5 cursor-pointer transition-all hover:border-primary/40 ${complete ? "opacity-70" : ""}`}
                      onClick={() => setOpen(expanded ? null : m.stage)}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-primary font-display font-bold">{m.stage}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${difficultyColors[m.difficulty] || ""}`}>{m.difficulty}</span>
                        <span className="text-[10px] text-muted-foreground">{m.estimatedTime}</span>
                      </div>
                      <h3 className={`font-display font-bold text-foreground ${complete ? "line-through" : ""}`}>{m.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{m.description}</p>

                      {expanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 grid md:grid-cols-3 gap-4 overflow-hidden">
                          <div>
                            <p className="text-xs font-display font-bold text-foreground mb-1.5">Tasks</p>
                            <ul className="space-y-1">{m.tasks.map((t) => <li key={t} className="text-xs text-muted-foreground">• {t}</li>)}</ul>
                          </div>
                          <div>
                            <p className="text-xs font-display font-bold text-foreground mb-1.5">Resources</p>
                            <ul className="space-y-1">{m.resources.map((t) => <li key={t} className="text-xs text-muted-foreground">• {t}</li>)}</ul>
                          </div>
                          <div>
                            <p className="text-xs font-display font-bold text-foreground mb-1.5">Projects</p>
                            <ul className="space-y-1">{m.projects.map((t) => <li key={t} className="text-xs text-muted-foreground">• {t}</li>)}</ul>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {nextMilestone && done.length > 0 && (
            <div className="glass-card p-5 mt-6">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Milestone completed</p>
              <p className="font-display font-bold text-foreground mt-1">Next: {nextMilestone.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{nextMilestone.description}</p>
              <button
                onClick={() => setOpen(nextMilestone.stage)}
                className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
              >
                Continue learning
              </button>
            </div>
          )}

          {progress === 100 && (
            <div className="glass-card p-6 mt-6 text-center">
              <Rocket className="w-6 h-6 mx-auto text-primary mb-2" />
              <p className="font-display font-bold text-foreground">Every milestone complete. Regenerate only when your goal or skills change.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RoadmapPanel;
