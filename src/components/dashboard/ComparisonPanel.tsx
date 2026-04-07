import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateSkills, validateRole } from "@/lib/validation";

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
  reasoning?: string;
  insights: string[];
}

const ComparisonPanel = () => {
  const [mode, setMode] = useState<CompareMode>("current-vs-target");
  const [skills, setSkills] = useState("");
  const [roleA, setRoleA] = useState("");
  const [roleB, setRoleB] = useState("");
  const [skillsError, setSkillsError] = useState("");
  const [roleAError, setRoleAError] = useState("");
  const [roleBError, setRoleBError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const handleCompare = async () => {
    let hasError = false;

    if (mode === "current-vs-target") {
      const sv = validateSkills(skills);
      const rv = validateRole(roleA);
      setSkillsError(sv.valid ? "" : sv.error || "");
      setRoleAError(rv.valid ? "" : rv.error || "");
      if (!sv.valid || !rv.valid) hasError = true;
    } else {
      const rvA = validateRole(roleA);
      const rvB = validateRole(roleB);
      setRoleAError(rvA.valid ? "" : rvA.error || "");
      setRoleBError(rvB.valid ? "" : rvB.error || "");
      if (!rvA.valid || !rvB.valid) hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("compare-careers", {
        body: { mode, skills, roleA, roleB },
      });
      if (error) throw error;
      if (data?.validationFailed) {
        toast.error(data.error);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
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
      <div className="glass-card !p-1.5 inline-flex rounded-xl mb-8">
        {(["current-vs-target", "role-vs-role"] as CompareMode[]).map((m) => (
          <motion.button
            key={m}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setMode(m); setResult(null); setSkillsError(""); setRoleAError(""); setRoleBError(""); }}
            className={`px-5 py-2.5 rounded-lg text-sm font-display font-medium transition-all ${
              mode === m ? "bg-primary/20 text-primary box-glow-cyan" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "current-vs-target" ? "Current vs Target" : "Role vs Role"}
          </motion.button>
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
          className="glass-card box-glow-purple space-y-5 mb-8"
        >
          {mode === "current-vs-target" && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Your Current Skills</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => { setSkills(e.target.value); setSkillsError(""); }}
                placeholder="e.g. HTML, CSS, JavaScript"
                className={`scene-input ${skillsError ? "error" : ""}`}
              />
              {skillsError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive mt-2">{skillsError}</motion.p>}
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
                onChange={(e) => { setRoleA(e.target.value); setRoleAError(""); }}
                placeholder="e.g. Frontend Developer"
                className={`scene-input ${roleAError ? "error" : ""}`}
              />
              {roleAError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive mt-2">{roleAError}</motion.p>}
            </div>
            {mode === "role-vs-role" && (
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Role B</label>
                <input
                  type="text"
                  value={roleB}
                  onChange={(e) => { setRoleB(e.target.value); setRoleBError(""); }}
                  placeholder="e.g. Backend Developer"
                  className={`scene-input ${roleBError ? "error" : ""}`}
                />
                {roleBError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive mt-2">{roleBError}</motion.p>}
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCompare}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-display font-bold bg-primary text-primary-foreground disabled:opacity-40 transition-all animate-btn-pulse"
          >
            {loading ? "Comparing..." : "Compare Now"}
          </motion.button>
        </motion.div>
      </AnimatePresence>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card mb-8 text-center"
          >
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-3 h-3 rounded-full bg-primary"
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">AI is comparing...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Readiness score */}
          {result.readinessScore != null && (
            <div className="glass-card box-glow-cyan text-center">
              <p className="text-sm text-muted-foreground mb-2 font-medium">Readiness Score</p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className={`text-5xl font-display font-black ${
                  (result.readinessScore ?? 0) < 40 ? "text-destructive" : (result.readinessScore ?? 0) < 70 ? "text-yellow-400" : "text-green-400"
                }`}
              >
                {result.readinessScore}%
              </motion.div>
            </div>
          )}

          {/* Reasoning */}
          {result.reasoning && (
            <div className="glass-card box-glow-purple">
              <h4 className="text-sm font-display font-bold gradient-text mb-3 flex items-center gap-2">
                <span>🧠</span> AI Reasoning
              </h4>
              <p className="text-sm text-foreground/90 leading-relaxed">{result.reasoning}</p>
            </div>
          )}

          {/* Side-by-side cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: result.leftLabel, skills: result.leftSkills, difficulty: result.leftDifficulty, time: result.leftTimeToLearn, glow: "box-glow-cyan" },
              { label: result.rightLabel, skills: result.rightSkills, difficulty: result.rightDifficulty, time: result.rightTimeToLearn, glow: "box-glow-purple" },
            ].map((side, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className={`glass-card ${side.glow}`}
              >
                <h4 className="font-display font-bold text-lg text-foreground mb-4">{side.label}</h4>
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Required Skills</p>
                  <ul className="space-y-1.5">
                    {side.skills.map((s, j) => (
                      <motion.li key={j} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + j * 0.08 }} className="text-sm text-foreground/80 flex gap-2">
                        <span className="text-primary">•</span> {s}
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-3 mt-4">
                  <span className="tag-medium">{side.difficulty}</span>
                  <span className="tag-low">{side.time}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* AI Insights */}
          {result.insights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card box-glow-cyan">
              <h4 className="font-display font-bold text-lg gradient-text mb-4">AI Insights</h4>
              <ul className="space-y-3">
                {result.insights.map((insight, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.12 }} className="text-sm text-foreground/90 flex gap-3">
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
