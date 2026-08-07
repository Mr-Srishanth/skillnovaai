import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Lightbulb, TriangleAlert, Trophy, ArrowUpRight, Target } from "lucide-react";
import { useCareerProfile } from "@/hooks/useCareerProfile";
import { runIntelligence, readCache, writeCache } from "@/lib/careerAI";
import { PanelHeader, EmptyGoalState, ThinkingState } from "./intelligence/IntelligenceUI";

interface Insights {
  headline: string;
  focusThisWeek: string;
  insights: { title: string; detail: string; type: string; impact: string }[];
}

const typeMeta: Record<string, { icon: typeof Lightbulb; className: string }> = {
  progress: { icon: ArrowUpRight, className: "text-primary border-primary/30 bg-primary/10" },
  recommendation: { icon: Lightbulb, className: "text-accent border-accent/30 bg-accent/10" },
  warning: { icon: TriangleAlert, className: "text-destructive border-destructive/30 bg-destructive/10" },
  strength: { icon: Trophy, className: "text-green-400 border-green-500/30 bg-green-500/10" },
};

const InsightsPanel = ({ userId }: { userId: string }) => {
  const { profile, loading: profileLoading } = useCareerProfile(userId);
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile.goal) return;
    const cached = readCache<Insights>("insights", profile);
    if (cached) setData(cached);
    else generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.goal]);

  const generate = async () => {
    if (!profile.goal) return;
    setLoading(true);
    try {
      const res = await runIntelligence<Insights>("insights", profile);
      setData(res);
      writeCache("insights", profile, res);
    } catch (e: any) {
      toast.error(e.message || "Could not generate insights");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) return <ThinkingState steps={["Loading your career profile..."]} />;
  if (!profile.goal) return <EmptyGoalState what="personalized insights" />;

  return (
    <div className="max-w-4xl">
      <PanelHeader
        title="Career Insights"
        subtitle="Live intelligence generated from everything you've done in SkillNova so far."
        onRefresh={generate}
        refreshing={loading}
      />

      {loading && !data && (
        <ThinkingState steps={["Reviewing your analyses...", "Checking roadmap progress...", "Detecting patterns...", "Writing your insights..."]} />
      )}

      {data && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <p className="font-display font-bold text-lg text-foreground">{data.headline}</p>
            <div className="flex items-start gap-2 mt-3 text-sm text-muted-foreground">
              <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span><span className="text-primary font-display font-bold">This week: </span>{data.focusThisWeek}</span>
            </div>
          </div>

          {data.insights.map((ins, i) => {
            const meta = typeMeta[ins.type] || typeMeta.recommendation;
            const Icon = meta.icon;
            return (
              <motion.div
                key={ins.title + i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass-card p-5 flex gap-4 hover:border-primary/40 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${meta.className}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold text-sm text-foreground">{ins.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">{ins.impact}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{ins.detail}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
