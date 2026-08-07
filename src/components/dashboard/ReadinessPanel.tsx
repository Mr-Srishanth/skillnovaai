import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useCareerProfile } from "@/hooks/useCareerProfile";
import { runIntelligence, readCache, writeCache } from "@/lib/careerAI";
import { PanelHeader, EmptyGoalState, ThinkingState, MeterBar, ScoreRing } from "./intelligence/IntelligenceUI";

interface Dimension { name: string; score: number; insight: string; action: string }
interface Readiness {
  overall: number;
  verdict: string;
  dimensions: Dimension[];
  strongest: string;
  weakest: string;
}

const ReadinessPanel = ({ userId }: { userId: string }) => {
  const { profile, loading: profileLoading } = useCareerProfile(userId);
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile.goal) return;
    const cached = readCache<Readiness>("readiness", profile);
    if (cached) setData(cached);
    else generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.goal]);

  const generate = async () => {
    if (!profile.goal) return;
    setLoading(true);
    try {
      const res = await runIntelligence<Readiness>("readiness", profile);
      setData(res);
      writeCache("readiness", profile, res);
    } catch (e: any) {
      toast.error(e.message || "Could not compute readiness");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) return <ThinkingState steps={["Loading your career profile..."]} />;
  if (!profile.goal) return <EmptyGoalState what="your readiness breakdown" />;

  return (
    <div className="max-w-5xl">
      <PanelHeader
        title="Career Readiness"
        subtitle={`How close you are to being hired as a ${profile.goal}, broken down across six dimensions.`}
        onRefresh={generate}
        refreshing={loading}
      />

      {loading && !data && (
        <ThinkingState steps={["Reading your activity history...", "Scoring each readiness dimension...", "Finding your strongest edge...", "Writing your action plan..."]} />
      )}

      {data && (
        <>
          <div className="glass-card p-6 md:p-8 mb-6 flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={data.overall} size={150} label="ready" />
            <div className="flex-1 text-center md:text-left">
              <p className="font-display font-bold text-lg text-foreground">{data.verdict}</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-lg border border-green-500/25 bg-green-500/5 p-3">
                  <div className="flex items-center gap-2 text-xs text-green-400 font-display font-bold mb-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Strongest
                  </div>
                  <p className="text-xs text-muted-foreground">{data.strongest}</p>
                </div>
                <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2 text-xs text-destructive font-display font-bold mb-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Weakest
                  </div>
                  <p className="text-xs text-muted-foreground">{data.weakest}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {data.dimensions.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass-card p-5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-sm text-foreground">{d.name}</h3>
                  <span className="font-display font-bold text-primary">{d.score}</span>
                </div>
                <MeterBar value={d.score} delay={i * 0.07} />
                <p className="text-xs text-muted-foreground mt-3">{d.insight}</p>
                <p className="text-xs text-foreground mt-2">
                  <span className="text-primary font-display font-bold">Next: </span>{d.action}
                </p>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ReadinessPanel;
