import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Flame, Award, Rocket, LineChart } from "lucide-react";
import { useCareerProfile } from "@/hooks/useCareerProfile";
import { runIntelligence, readCache, writeCache } from "@/lib/careerAI";
import { PanelHeader, EmptyGoalState, ThinkingState, MeterBar } from "./intelligence/IntelligenceUI";

interface Trends {
  headline: string;
  trendingSkills: { skill: string; demand: number; growth: string; relevance: string }[];
  emergingTech: { name: string; why: string; adoption: string }[];
  certifications: { name: string; provider: string; value: string }[];
  fastGrowingCareers: { role: string; growth: string; overlap: string }[];
  hiringDemand: { label: string; value: number }[];
  recommendations: string[];
}

const relevanceColors: Record<string, string> = {
  core: "bg-primary/15 text-primary border-primary/30",
  adjacent: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  future: "bg-accent/15 text-accent border-accent/30",
};

const DemandChart = ({ points }: { points: { label: string; value: number }[] }) => {
  if (!points.length) return null;
  const w = 100;
  const h = 40;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p.value / 100) * h}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-28">
        <defs>
          <linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(186,94%,55%)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(186,94%,55%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={`${path} L ${w} ${h} L 0 ${h} Z`}
          fill="url(#demandFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="hsl(186,94%,55%)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="flex justify-between mt-1">
        {points.map((p) => <span key={p.label} className="text-[10px] text-muted-foreground">{p.label}</span>)}
      </div>
    </div>
  );
};

const TrendsPanel = ({ userId }: { userId: string }) => {
  const { profile, loading: profileLoading } = useCareerProfile(userId);
  const [data, setData] = useState<Trends | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile.goal) return;
    const cached = readCache<Trends>("trends", profile);
    if (cached) setData(cached);
    else generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.goal]);

  const generate = async () => {
    if (!profile.goal) return;
    setLoading(true);
    try {
      const res = await runIntelligence<Trends>("trends", profile);
      setData(res);
      writeCache("trends", profile, res);
    } catch (e: any) {
      toast.error(e.message || "Could not load trends");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) return <ThinkingState steps={["Loading your career profile..."]} />;
  if (!profile.goal) return <EmptyGoalState what="industry trend intelligence" />;

  return (
    <div className="max-w-5xl">
      <PanelHeader
        title="Industry Trends"
        subtitle={`What's rising, cooling and worth learning next in the ${profile.goal} market.`}
        onRefresh={generate}
        refreshing={loading}
      />

      {loading && !data && (
        <ThinkingState steps={["Scanning the hiring market...", "Ranking trending skills...", "Spotting emerging tech...", "Matching trends to your profile..."]} />
      )}

      {data && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <p className="font-display font-bold text-foreground">{data.headline}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" /> Trending skills
              </h3>
              <div className="space-y-4">
                {data.trendingSkills.map((s, i) => (
                  <div key={s.skill}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-foreground truncate">{s.skill}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${relevanceColors[s.relevance] || ""}`}>{s.relevance}</span>
                      </div>
                      <span className="text-xs text-primary font-display font-bold shrink-0">{s.growth}</span>
                    </div>
                    <MeterBar value={s.demand} delay={i * 0.06} />
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <LineChart className="w-4 h-4 text-primary" /> Hiring demand index
              </h3>
              <DemandChart points={data.hiringDemand} />
              <h4 className="font-display font-bold text-foreground mt-6 mb-3 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" /> Fast-growing adjacent roles
              </h4>
              <div className="space-y-2.5">
                {data.fastGrowingCareers.map((c) => (
                  <div key={c.role} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-foreground">{c.role}</p>
                      <p className="text-[11px] text-muted-foreground">{c.overlap}</p>
                    </div>
                    <span className="text-xs font-display font-bold text-primary shrink-0">{c.growth}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-foreground mb-4">Emerging technologies</h3>
              <div className="space-y-3">
                {data.emergingTech.map((t) => (
                  <div key={t.name} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-foreground">{t.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border">{t.adoption}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.why}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Certifications worth it
              </h3>
              <div className="space-y-3">
                {data.certifications.map((c) => (
                  <div key={c.name} className="rounded-lg border border-border p-3">
                    <p className="text-sm text-foreground">{c.name}</p>
                    <p className="text-[11px] text-primary">{c.provider}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-foreground mb-3">What you should learn next</h3>
            <ul className="space-y-2">
              {data.recommendations.map((r) => (
                <li key={r} className="text-sm text-muted-foreground flex gap-2"><span className="text-primary">→</span>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendsPanel;
