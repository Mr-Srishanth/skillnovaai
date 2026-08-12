import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Building2, CheckSquare } from "lucide-react";
import { useCareerProfile } from "@/hooks/useCareerProfile";
import { runIntelligence, readCache, writeCache } from "@/lib/careerAI";
import { PanelHeader, EmptyGoalState, ThinkingState, MeterBar } from "./intelligence/IntelligenceUI";

interface Company {
  name: string;
  readiness: number;
  interviewDifficulty: string;
  summary: string;
  missingSkills: string[];
  recommendedProjects: string[];
  checklist: string[];
}

const PRESETS = ["Google", "Amazon", "Microsoft", "Infosys", "TCS", "Deloitte", "Accenture", "Flipkart", "Zoho", "Startup (Seed/Series A)"];

const difficultyColors: Record<string, string> = {
  moderate: "bg-green-500/15 text-green-400 border-green-500/30",
  hard: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "very hard": "bg-destructive/15 text-destructive border-destructive/30",
};

const CompanyReadinessPanel = ({ userId }: { userId: string }) => {
  const { profile, loading: profileLoading } = useCareerProfile(userId);
  const [selected, setSelected] = useState<string[]>(["Google", "Infosys", "Startup (Seed/Series A)"]);
  const [data, setData] = useState<Company[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : prev.length >= 4 ? prev : [...prev, name]
    );
  };

  const selectionKey = [...selected].sort().join("|");

  // READ ≠ ANALYZE: load the persisted analysis for this exact selection, never regenerate on mount.
  useEffect(() => {
    if (!profile.goal) return;
    setData(readCache<Company[]>("company", profile, selectionKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.goal, selectionKey]);

  const generate = async () => {
    if (!selected.length) return toast.error("Pick at least one company");
    setLoading(true);
    try {
      const key = selectionKey;
      const res = await runIntelligence<{ companies: Company[] }>("company", profile, { companies: selected });
      setData(res.companies);
      writeCache("company", profile, res.companies, key);
    } catch (e: any) {
      toast.error(e.message || "Could not analyze companies");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) return <ThinkingState steps={["Loading your career profile..."]} />;
  if (!profile.goal) return <EmptyGoalState what="company readiness analysis" />;

  return (
    <div className="max-w-5xl">
      <PanelHeader
        title="Company Readiness"
        subtitle={`Estimated alignment between your current profile and each company's bar for ${profile.goal} roles — not a hiring probability.`}
      />

      <div className="glass-card p-6 mb-6">
        <p className="text-xs text-muted-foreground mb-3">Select up to 4 target companies</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {PRESETS.map((c) => {
            const active = selected.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggle(c)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  active
                    ? "border-primary/60 bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generate}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg font-display font-bold text-sm bg-gradient-to-r from-primary to-accent text-primary-foreground disabled:opacity-40"
          >
            {loading ? "Analyzing..." : "Analyze Readiness"}
          </motion.button>
          {data && (
            <button onClick={generate} disabled={loading} className="px-4 py-2.5 rounded-lg text-xs glass-card text-muted-foreground hover:text-foreground disabled:opacity-40">
              Regenerate
            </button>
          )}
        </div>
      </div>

      {loading && (
        <ThinkingState steps={["Recalling each company's hiring bar...", "Comparing against your profile...", "Listing missing requirements...", "Building your prep checklist..."]} />
      )}

      {!data && !loading && (
        <div className="glass-card p-8 text-center mb-6">
          <p className="text-sm text-muted-foreground">No readiness analysis yet for this company selection.</p>
        </div>
      )}

      {data && !loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {data.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setOpen(open === c.name ? null : c.name)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-foreground truncate">{c.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${difficultyColors[c.interviewDifficulty] || ""}`}>
                    {c.interviewDifficulty} interview
                  </span>
                </div>
                <span className="font-display font-bold text-lg text-primary" title="Profile alignment score">{c.readiness}%</span>
              </div>
              <MeterBar value={c.readiness} delay={i * 0.08} />
              <p className="text-xs text-muted-foreground mt-3">{c.summary}</p>

              {open === c.name && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-3 overflow-hidden">
                  <div>
                    <p className="text-xs font-display font-bold text-foreground mb-1.5">Missing for this company</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.missingSkills.map((s) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/25">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-display font-bold text-foreground mb-1.5">Projects that impress them</p>
                    <ul className="space-y-1">{c.recommendedProjects.map((p) => <li key={p} className="text-xs text-muted-foreground">• {p}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-display font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                      <CheckSquare className="w-3 h-3" /> Preparation checklist
                    </p>
                    <ul className="space-y-1">{c.checklist.map((p) => <li key={p} className="text-xs text-muted-foreground">• {p}</li>)}</ul>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyReadinessPanel;
