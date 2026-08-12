import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useCareerProfile } from "@/hooks/useCareerProfile";
import { runIntelligence, readCache, writeCache } from "@/lib/careerAI";
import { readinessVerdict } from "@/lib/careerEngine";
import { PanelHeader, EmptyGoalState, ThinkingState, MeterBar, ScoreRing } from "./intelligence/IntelligenceUI";

interface Narrative {
  verdict: string;
  dimensions: { name: string; insight: string; action: string }[];
  strongest: string;
  weakest: string;
}

const ReadinessPanel = ({ userId }: { userId: string }) => {
  const { profile, loading: profileLoading } = useCareerProfile(userId);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [loading, setLoading] = useState(false);

  const engine = profile.readiness;

  useEffect(() => {
    if (!profile.goal) return;
    const cached = readCache<Narrative>("readiness", profile, String(engine.overall));
    if (cached) setNarrative(cached);
    else generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.goal, engine.overall]);

  const generate = async () => {
    if (!profile.goal) return;
    setLoading(true);
    try {
      const res = await runIntelligence<Narrative>("readiness", profile);
      setNarrative(res);
      writeCache("readiness", profile, res, String(engine.overall));
    } catch (e: any) {
      toast.error(e.message || "Could not compute readiness");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) return <ThinkingState steps={["Loading your career profile..."]} />;
  if (!profile.goal) return <EmptyGoalState what="your readiness breakdown" />;

  const textFor = (name: string) => narrative?.dimensions.find((d) => d.name === name);

  return (
    <div className="max-w-5xl">
      <PanelHeader
        title="Career Readiness"
        subtitle={`How close you are to being hired as a ${profile.goal}, broken down across six dimensions.`}
        onRefresh={generate}
        refreshing={loading}
      />

      <div className="glass-card p-6 md:p-8 mb-6 flex flex-col md:flex-row items-center gap-8">
        <ScoreRing score={engine.overall} size={150} label="ready" />
        <div className="flex-1 text-center md:text-left">
          <p className="font-display font-bold text-lg text-foreground">
            {narrative?.verdict || readinessVerdict(engine.overall)}
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <div className="rounded-lg border border-green-500/25 bg-green-500/5 p-3">
              <div className="flex items-center gap-2 text-xs text-green-400 font-display font-bold mb-1">
                <TrendingUp className="w-3.5 h-3.5" /> Strongest — {engine.strongest.name} ({engine.strongest.score})
              </div>
              <p className="text-xs text-muted-foreground">
                {narrative?.strongest || "This is currently carrying your profile."}
              </p>
            </div>
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-xs text-destructive font-display font-bold mb-1">
                <TrendingDown className="w-3.5 h-3.5" /> Weakest — {engine.weakest.name} ({engine.weakest.score})
              </div>
              <p className="text-xs text-muted-foreground">
                {narrative?.weakest || "This is the biggest drag on your readiness right now."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading && !narrative && (
        <ThinkingState steps={["Reading your activity history...", "Explaining each readiness dimension...", "Finding your strongest edge...", "Writing your action plan..."]} />
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {engine.dimensions.map((d, i) => {
          const text = textFor(d.name);
          return (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass-card p-5 hover:border-primary/40 transition-colors min-h-[150px]"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-sm text-foreground">{d.name}</h3>
                <span className="font-display font-bold text-primary">{d.known ? d.score : "N/A"}</span>
              </div>
              <MeterBar value={d.known ? d.score : 0} delay={i * 0.07} />
              {!d.known && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Not enough evidence yet — this dimension is excluded from your overall score.
                </p>
              )}
              {text ? (
                <>
                  <p className="text-xs text-muted-foreground mt-3">{text.insight}</p>
                  <p className="text-xs text-foreground mt-2">
                    <span className="text-primary font-display font-bold">Next: </span>{text.action}
                  </p>
                </>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="h-3 rounded bg-muted/40 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-muted/30 animate-pulse" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ReadinessPanel;
