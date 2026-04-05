import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CompareMode = "current-vs-target" | "role-vs-role";

interface ComparisonResult {
  mode: CompareMode;
  leftLabel: string;
  rightLabel: string;
  leftSkills: string[];
  rightSkills: string[];
  leftDifficulty: string;
  rightDifficulty: string;
  leftTimeToLearn: string;
  rightTimeToLearn: string;
  readinessScore?: number;
  insights: string[];
}

const ComparisonPanel = () => {
  const [mode, setMode] = useState<CompareMode>("current-vs-target");
  const [skills, setSkills] = useState("");
  const [roleA, setRoleA] = useState("");
  const [roleB, setRoleB] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const handleCompare = async () => {
    if (mode === "current-vs-target" && (!skills.trim() || !roleA.trim())) return;
    if (mode === "role-vs-role" && (!roleA.trim() || !roleB.trim())) return;

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("compare-careers", {
        body: { mode, skills, roleA, roleB },
      });
      if (error) throw error;
      setResult(data as ComparisonResult);
    } catch (e: any) {
      console.error(e);
      toast.error("Comparison failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text mb-8">
        Career Comparison
      </h2>

      {/* Mode toggle */}
      <div className="glass-card p-1.5 inline-flex rounded-xl mb-8">
        {(["current-vs-target", "role-vs-role"] as CompareMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResult(null); }}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "current-vs-target" ? "Current vs Target" : "Role vs Role"}
          </button>
        ))}
      </div>

      {/* Input form */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-8 box-glow-purple space-y-5 mb-8"
        >
          {mode === "current-vs-target" && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5 font-medium">
                Your Current Skills
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. HTML, CSS, JavaScript"
                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5 font-medium">
                {mode === "current-vs-target" ? "Target Role" : "Role A"}
              </label>
              <input
                type="text"
                value={roleA}
                onChange={(e) => setRoleA(e.target.value)}
                placeholder="e.g. Frontend Developer"
                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            {mode === "role-vs-role" && (
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5 font-medium">
                  Role B
                </label>
                <input
                  type="text"
                  value={roleB}
                  onChange={(e) => setRoleB(e.target.value)}
                  placeholder="e.g. Backend Developer"
                  className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCompare}
            disabled={loading}
            className="w-full py-3.5 rounded-lg font-display font-bold bg-gradient-to-r from-accent to-primary text-primary-foreground disabled:opacity-40 transition-all"
          >
            {loading ? "Comparing..." : "Compare Now"}
          </motion.button>
        </motion.div>
      </AnimatePresence>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Readiness score */}
          {result.readinessScore != null && (
            <div className="glass-card p-6 box-glow-blue text-center">
              <p className="text-sm text-muted-foreground mb-2 font-medium">Readiness Score</p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="text-5xl font-display font-black gradient-text inline-block"
              >
                {result.readinessScore}%
              </motion.div>
            </div>
          )}

          {/* Side-by-side cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                label: result.leftLabel,
                skills: result.leftSkills,
                difficulty: result.leftDifficulty,
                time: result.leftTimeToLearn,
                glow: "box-glow-blue",
              },
              {
                label: result.rightLabel,
                skills: result.rightSkills,
                difficulty: result.rightDifficulty,
                time: result.rightTimeToLearn,
                glow: "box-glow-purple",
              },
            ].map((side, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className={`glass-card p-6 ${side.glow}`}
              >
                <h4 className="font-display font-bold text-lg text-foreground mb-4">
                  {side.label}
                </h4>

                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Required Skills</p>
                  <ul className="space-y-1.5">
                    {side.skills.map((s, j) => (
                      <motion.li
                        key={j}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + j * 0.08 }}
                        className="text-sm text-foreground/80 flex gap-2"
                      >
                        <span className="text-primary">•</span> {s}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3 mt-4">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-primary/15 text-primary font-medium">
                    {side.difficulty}
                  </span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-accent/15 text-accent font-medium">
                    {side.time}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* AI Insights */}
          {result.insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-6 box-glow-blue"
            >
              <h4 className="font-display font-bold text-lg gradient-text mb-4">
                AI Insights
              </h4>
              <ul className="space-y-3">
                {result.insights.map((insight, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.12 }}
                    className="text-sm text-foreground/90 flex gap-3"
                  >
                    <span className="text-accent mt-0.5">💡</span>
                    <span>{insight}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default ComparisonPanel;
