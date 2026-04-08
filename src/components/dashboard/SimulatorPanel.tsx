import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateSkills, validateRole } from "@/lib/validation";
import { Progress } from "@/components/ui/progress";

interface SimResult {
  currentReadiness: number;
  milestones: {
    period: string;
    readiness: number;
    skillsGained: string[];
    milestone: string;
    jobReady: boolean;
  }[];
  salaryRange: { entry: string; mid: string; senior: string };
  insight: string;
  recommendation: string;
}

const SimulatorPanel = ({ userId }: { userId: string }) => {
  const [skills, setSkills] = useState("");
  const [role, setRole] = useState("");
  const [hours, setHours] = useState("2");
  const [skillsError, setSkillsError] = useState("");
  const [roleError, setRoleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  const handleSimulate = async () => {
    const sv = validateSkills(skills);
    const rv = validateRole(role);
    setSkillsError(sv.valid ? "" : sv.error || "");
    setRoleError(rv.valid ? "" : rv.error || "");
    if (!sv.valid || !rv.valid) return;

    const h = Number(hours);
    if (!h || h < 0.5 || h > 16) { toast.error("Study hours must be between 0.5 and 16"); return; }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("simulate-career", {
        body: { skills, targetRole: role, studyHoursPerDay: h },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success("Simulation complete!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

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

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-6 mb-8 text-center space-y-4">
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} className="w-3 h-3 rounded-full bg-primary" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-medium animate-pulse">Predicting your future trajectory...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Current readiness */}
          <div className="glass-card p-8 box-glow-blue text-center">
            <p className="text-sm text-muted-foreground mb-2 font-medium uppercase tracking-wider">Current Readiness</p>
            <div className={`text-5xl font-display font-black ${
              result.currentReadiness < 40 ? "text-destructive" : result.currentReadiness < 70 ? "text-yellow-400" : "text-green-400"
            }`}>
              {result.currentReadiness}%
            </div>
            <Progress value={result.currentReadiness} className="h-2 max-w-xs mx-auto mt-4" />
          </div>

          {/* Timeline milestones */}
          <div className="glass-card p-6 box-glow-purple">
            <h4 className="text-lg font-display font-bold gradient-text mb-6">Growth Timeline</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.milestones.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className={`glass-card p-5 relative overflow-hidden ${m.jobReady ? "border-green-500/40" : ""}`}
                >
                  {m.jobReady && (
                    <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium">
                      Job Ready ✓
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">{m.period}</div>
                  <div className={`text-3xl font-display font-black mb-3 ${
                    m.readiness < 40 ? "text-destructive" : m.readiness < 70 ? "text-yellow-400" : "text-green-400"
                  }`}>
                    {m.readiness}%
                  </div>
                  <Progress value={m.readiness} className="h-1.5 mb-3" />
                  <p className="text-xs text-foreground/80 font-medium mb-2">{m.milestone}</p>
                  <div className="flex flex-wrap gap-1">
                    {m.skillsGained.map((s, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Salary */}
          <div className="glass-card p-6 box-glow-blue">
            <h4 className="text-lg font-display font-bold gradient-text mb-4">💰 Salary Trajectory</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              {(["entry", "mid", "senior"] as const).map((level, i) => (
                <motion.div key={level} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {level === "entry" ? "Entry Level" : level === "mid" ? "Mid Level" : "Senior"}
                  </div>
                  <div className="text-lg font-display font-bold text-foreground">{result.salaryRange[level]}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Insight */}
          <div className="glass-card p-6 box-glow-purple">
            <h4 className="text-sm font-display font-bold gradient-text mb-3 flex items-center gap-2">
              <span>🧠</span> AI Insight
            </h4>
            <p className="text-sm text-foreground/90 leading-relaxed">{result.insight}</p>
          </div>

          {/* Recommendation */}
          <div className="glass-card p-6 border-primary/40 box-glow-blue">
            <h4 className="text-sm font-display font-bold text-primary mb-2 flex items-center gap-2">
              <span>🚀</span> Recommendation
            </h4>
            <p className="text-foreground font-medium">{result.recommendation}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SimulatorPanel;
