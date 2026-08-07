import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateSkills, validateRole } from "@/lib/validation";
import { Progress } from "@/components/ui/progress";
import { useCareerProfile, setLocalNumber } from "@/hooks/useCareerProfile";
import { buildForecast, type ForecastPoint } from "@/lib/careerEngine";

interface SimNarrative {
  milestones: { period: string; skillsGained: string[]; milestone: string }[];
  salaryRange: { entry: string; mid: string; senior: string };
  insight: string;
  recommendation: string;
}

const SimulatorPanel = ({ userId }: { userId: string }) => {
  const { profile, loading: profileLoading } = useCareerProfile(userId);
  const [skills, setSkills] = useState("");
  const [role, setRole] = useState("");
  const [hours, setHours] = useState("2");
  const [skillsError, setSkillsError] = useState("");
  const [roleError, setRoleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState<SimNarrative | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[] | null>(null);

  useEffect(() => {
    if (profileLoading) return;
    setSkills((s) => s || profile.skills);
    setRole((r) => r || profile.goal);
    setHours((h) => (h === "2" ? String(profile.studyHours) : h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, profile.skills, profile.goal, profile.studyHours]);

  const current = profile.readiness.overall;
  const consistency = profile.readiness.dimensions.find((d) => d.name === "Consistency")?.score ?? 50;

  // Live preview — updates instantly as the slider moves, no AI call needed.
  const livePreview = buildForecast(current, Number(hours) || 2, consistency);

  const handleSimulate = async () => {
    const sv = validateSkills(skills);
    const rv = validateRole(role);
    setSkillsError(sv.valid ? "" : sv.error || "");
    setRoleError(rv.valid ? "" : rv.error || "");
    if (!sv.valid || !rv.valid) return;

    const h = Number(hours);
    if (!h || h < 0.5 || h > 16) { toast.error("Study hours must be between 0.5 and 16"); return; }

    setLocalNumber(userId, "studyHours", h);
    const points = buildForecast(current, h, consistency);
    setForecast(points);
    setLoading(true);
    setNarrative(null);

    try {
      const { data, error } = await supabase.functions.invoke("simulate-career", {
        body: {
          skills,
          targetRole: role,
          studyHoursPerDay: h,
          region: profile.region,
          currentReadiness: current,
          forecast: points,
          signals: {
            projectsCount: profile.projectsCount,
            knowledgePacks: profile.knowledgePacks,
            resumeScore: profile.resumeScore,
            interviewScore: profile.interviewScore,
            streak: profile.streak,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setNarrative(data);
      toast.success("Simulation complete!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const points = forecast || livePreview;
  const tone = (v: number) => (v < 40 ? "text-destructive" : v < 70 ? "text-yellow-400" : "text-green-400");

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text mb-2">
        Career Simulator
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        Predict your career growth trajectory based on your daily commitment.
      </p>

      <div className="glass-card p-8 box-glow-blue space-y-6 mb-8">
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Your Current Skills</label>
          <input
            type="text"
            value={skills}
            onChange={(e) => { setSkills(e.target.value); setSkillsError(""); }}
            placeholder="e.g. HTML, CSS, JavaScript"
            className={`w-full bg-muted/50 border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
              skillsError ? "border-destructive focus:ring-destructive/50" : "border-border focus:ring-primary/50"
            }`}
          />
          {skillsError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive mt-2">{skillsError}</motion.p>}
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Target Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => { setRole(e.target.value); setRoleError(""); }}
            placeholder="e.g. Machine Learning Engineer"
            className={`w-full bg-muted/50 border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
              roleError ? "border-destructive focus:ring-destructive/50" : "border-border focus:ring-primary/50"
            }`}
          />
          {roleError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive mt-2">{roleError}</motion.p>}
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Daily Study Hours: {hours}h</label>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground/50 mt-1">
            <span>0.5h</span>
            <span>5h</span>
            <span>10h</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            At {hours}h/day you reach{" "}
            <span className={tone(livePreview[1].readiness)}>{livePreview[1].readiness}%</span> readiness in 6 months.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSimulate}
          disabled={loading}
          className="w-full py-3.5 rounded-lg font-display font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground disabled:opacity-40 transition-all"
        >
          {loading ? "Simulating..." : "🔮 Simulate My Future"}
        </motion.button>
      </div>

      <div className="space-y-6">
        {/* Current readiness — shared engine value */}
        <div className="glass-card p-8 box-glow-blue text-center">
          <p className="text-sm text-muted-foreground mb-2 font-medium uppercase tracking-wider">Current Readiness</p>
          <div className={`text-5xl font-display font-black ${tone(current)}`}>{current}%</div>
          <Progress value={current} className="h-2 max-w-xs mx-auto mt-4" />
          <p className="text-xs text-muted-foreground mt-3">Same value used across every SkillNova module.</p>
        </div>

        {/* Timeline */}
        <div className="glass-card p-6 box-glow-purple">
          <h4 className="text-lg font-display font-bold gradient-text mb-6">Growth Timeline</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {points.map((m, i) => {
              const text = narrative?.milestones.find((x) => x.period === m.period);
              return (
                <motion.div
                  key={m.period}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className={`glass-card p-5 relative overflow-hidden min-h-[190px] ${m.jobReady ? "border-green-500/40" : ""}`}
                >
                  {m.jobReady && (
                    <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium">
                      Job Ready ✓
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">{m.period}</div>
                  <div className={`text-3xl font-display font-black mb-1 ${tone(m.readiness)}`}>{m.readiness}%</div>
                  <p className="text-[11px] text-primary mb-3">+{Math.round(m.gain)}% vs today</p>
                  <Progress value={m.readiness} className="h-1.5 mb-3" />
                  {text ? (
                    <>
                      <p className="text-xs text-foreground/80 font-medium mb-2">{text.milestone}</p>
                      <div className="flex flex-wrap gap-1">
                        {text.skillsGained.map((s, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {loading ? "Writing this checkpoint..." : "Run the simulation for a detailed checkpoint plan."}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-6 text-center space-y-4">
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} className="w-3 h-3 rounded-full bg-primary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground font-medium animate-pulse">Mapping your trajectory...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {narrative && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="glass-card p-6 box-glow-blue">
              <h4 className="text-lg font-display font-bold gradient-text mb-4">💰 Salary Trajectory</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                {(["entry", "mid", "senior"] as const).map((level, i) => (
                  <motion.div key={level} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {level === "entry" ? "Entry Level" : level === "mid" ? "Mid Level" : "Senior"}
                    </div>
                    <div className="text-lg font-display font-bold text-foreground">{narrative.salaryRange[level]}</div>
                  </motion.div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 text-center">Localised for {profile.region}</p>
            </div>

            <div className="glass-card p-6 box-glow-purple">
              <h4 className="text-sm font-display font-bold gradient-text mb-3 flex items-center gap-2">
                <span>🧠</span> AI Insight
              </h4>
              <p className="text-sm text-foreground/90 leading-relaxed">{narrative.insight}</p>
            </div>

            <div className="glass-card p-6 border-primary/40 box-glow-blue">
              <h4 className="text-sm font-display font-bold text-primary mb-2 flex items-center gap-2">
                <span>🚀</span> Recommendation
              </h4>
              <p className="text-sm text-foreground/90 leading-relaxed">{narrative.recommendation}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SimulatorPanel;
