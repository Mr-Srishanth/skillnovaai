import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Banknote, Globe2, Zap } from "lucide-react";
import { useCareerProfile } from "@/hooks/useCareerProfile";
import { runIntelligence, readCache, writeCache } from "@/lib/careerAI";
import { PanelHeader, EmptyGoalState, ThinkingState, MeterBar } from "./intelligence/IntelligenceUI";

interface Salary {
  currency: string;
  currentRange: string;
  futureRange: string;
  currentPotential: number;
  futurePotential: number;
  reasoning: string;
  growthTimeline: { period: string; range: string; note: string }[];
  regions: { region: string; range: string; note: string }[];
  boosters: string[];
}

const SalaryInsightsPanel = ({ userId }: { userId: string }) => {
  const { profile, loading: profileLoading } = useCareerProfile(userId);
  const [data, setData] = useState<Salary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile.goal) return;
    const cached = readCache<Salary>("salary", profile);
    if (cached) setData(cached);
    else generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.goal]);

  const generate = async () => {
    if (!profile.goal) return;
    setLoading(true);
    try {
      const res = await runIntelligence<Salary>("salary", profile);
      setData(res);
      writeCache("salary", profile, res);
    } catch (e: any) {
      toast.error(e.message || "Could not estimate salary");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) return <ThinkingState steps={["Loading your career profile..."]} />;
  if (!profile.goal) return <EmptyGoalState what="salary insights" />;

  return (
    <div className="max-w-5xl">
      <PanelHeader
        title="Salary Insights"
        subtitle={`Realistic earning potential for a ${profile.goal} with your exact skill set — and what it becomes after your roadmap.`}
        onRefresh={generate}
        refreshing={loading}
      />

      {loading && !data && (
        <ThinkingState steps={["Benchmarking your skill set...", "Mapping salary bands...", "Projecting growth over 3 years...", "Comparing regions..."]} />
      )}

      {data && (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[
              { label: "Today", range: data.currentRange, potential: data.currentPotential },
              { label: "After roadmap", range: data.futureRange, potential: data.futurePotential },
            ].map((b, i) => (
              <motion.div key={b.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="w-4 h-4 text-primary" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{b.label}</span>
                </div>
                <p className="text-2xl font-display font-bold gradient-text mb-3">{b.range}</p>
                <MeterBar value={b.potential} delay={i * 0.1} />
                <p className="text-[11px] text-muted-foreground mt-2">{b.potential}% of the role's pay ceiling</p>
              </motion.div>
            ))}
          </div>

          <div className="glass-card p-6 mb-6">
            <p className="text-sm text-muted-foreground">{data.reasoning}</p>
          </div>

          <div className="glass-card p-6 mb-6">
            <h3 className="font-display font-bold text-foreground mb-4">Growth timeline</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.growthTimeline.map((g, i) => (
                <motion.div key={g.period} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-lg border border-border p-4">
                  <p className="text-[10px] uppercase tracking-wide text-primary font-display font-bold">{g.period}</p>
                  <p className="text-lg font-display font-bold text-foreground mt-1">{g.range}</p>
                  <p className="text-xs text-muted-foreground mt-1">{g.note}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-primary" /> Region comparison
              </h3>
              <div className="space-y-3">
                {data.regions.map((r) => (
                  <div key={r.region} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-foreground">{r.region}</p>
                      <p className="text-[11px] text-muted-foreground">{r.note}</p>
                    </div>
                    <span className="text-sm font-display font-bold text-primary shrink-0">{r.range}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Raise your band
              </h3>
              <ul className="space-y-2">
                {data.boosters.map((b) => (
                  <li key={b} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary">→</span>{b}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mt-4">
            Estimates are AI-generated market approximations in {data.currency}, not guarantees.
          </p>
        </>
      )}
    </div>
  );
};

export default SalaryInsightsPanel;
