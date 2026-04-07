import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateSkills, validateRole } from "@/lib/validation";
import { Progress } from "@/components/ui/progress";
import type { AnalysisResult } from "@/components/sections/ResultSection";

const THINKING_STEPS = [
  "Analyzing your skill profile...",
  "Mapping industry requirements...",
  "Computing readiness score...",
  "Building personalized roadmap...",
];

const priorityColors: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  important: "bg-primary/20 text-primary border-primary/30",
  "nice-to-have": "bg-muted text-muted-foreground border-border",
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  advanced: "bg-neon-red/20 text-neon-red border-neon-red/30",
};

const AnalyzePanel = ({ userId }: { userId: string }) => {
  const [skills, setSkills] = useState("");
  const [role, setRole] = useState("");
  const [skillsError, setSkillsError] = useState("");
  const [roleError, setRoleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    const sv = validateSkills(skills);
    const rv = validateRole(role);
    setSkillsError(sv.valid ? "" : sv.error || "");
    setRoleError(rv.valid ? "" : rv.error || "");
    if (!sv.valid || !rv.valid) return;

    setLoading(true);
    setResult(null);
    setThinkingStep(0);

    const stepInterval = setInterval(() => {
      setThinkingStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1));
    }, 2000);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-skills", {
        body: { skills, role },
      });

      if (error) {
        // Check if the response body has validation info
        throw error;
      }

      if (data?.validationFailed) {
        toast.error(data.error);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const analysisResult = data as AnalysisResult;
      setResult(analysisResult);

      // Save to history
      await supabase.from("analysis_history").insert({
        user_id: userId,
        skills,
        target_role: role,
        skill_score: analysisResult.skillScore,
        missing_skills: analysisResult.missingSkills as any,
        recommended_learning: analysisResult.recommendedLearning as any,
        roadmap: analysisResult.roadmap as any,
      });

      toast.success("Analysis complete & saved!");
    } catch (e: any) {
      console.error(e);
      toast.error("Analysis failed. Please try again.");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text mb-8">
        Skill Analysis
      </h2>

      <div className="glass-card p-8 box-glow-blue space-y-6 mb-8">
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Your Current Skills</label>
          <input
            type="text"
            value={skills}
            onChange={(e) => { setSkills(e.target.value); setSkillsError(""); }}
            placeholder="e.g. HTML, CSS, JavaScript, React"
            className={`w-full bg-muted/50 border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
              skillsError ? "border-destructive focus:ring-destructive/50" : "border-border focus:ring-primary/50"
            }`}
          />
          {skillsError && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive mt-2">{skillsError}</motion.p>
          )}
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Your Dream Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => { setRole(e.target.value); setRoleError(""); }}
            placeholder="e.g. Full Stack Developer"
            className={`w-full bg-muted/50 border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
              roleError ? "border-destructive focus:ring-destructive/50" : "border-border focus:ring-primary/50"
            }`}
          />
          {roleError && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive mt-2">{roleError}</motion.p>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-3.5 rounded-lg font-display font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground disabled:opacity-40 transition-all"
        >
          {loading ? "Analyzing..." : "Analyze My Future"}
        </motion.button>
      </div>

      {/* Thinking state */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 mb-8 text-center space-y-4"
          >
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  className="w-3 h-3 rounded-full bg-primary"
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={thinkingStep}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm text-muted-foreground font-medium"
              >
                {THINKING_STEPS[thinkingStep]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Score */}
          <div className="glass-card p-8 box-glow-blue text-center">
            <p className="text-sm text-muted-foreground mb-2 font-medium uppercase tracking-wider">Readiness Score</p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`text-6xl font-display font-black ${
                result.skillScore < 40 ? "text-destructive" : result.skillScore < 70 ? "text-yellow-400" : "text-green-400"
              }`}
            >
              {result.skillScore}%
            </motion.div>
            <Progress value={result.skillScore} className="h-2 max-w-xs mx-auto mt-4" />
          </div>

          {/* Reasoning */}
          <div className="glass-card p-6 box-glow-purple">
            <h4 className="text-sm font-display font-bold gradient-text mb-3 flex items-center gap-2">
              <span>🧠</span> AI Reasoning
            </h4>
            <p className="text-sm text-foreground/90 leading-relaxed">{result.reasoning}</p>
          </div>

          {/* Next Best Step */}
          <div className="glass-card p-6 border-primary/40 box-glow-blue">
            <h4 className="text-sm font-display font-bold text-primary mb-2 flex items-center gap-2">
              <span>🎯</span> Your Next Best Step
            </h4>
            <p className="text-foreground font-medium">{result.nextBestStep}</p>
          </div>

          {/* Missing Skills */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 box-glow-blue">
            <h4 className="text-lg font-display font-bold gradient-text mb-4">Missing Skills</h4>
            <div className="space-y-3">
              {result.missingSkills.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/50"
                >
                  <div className="flex-1">
                    <span className="font-display font-bold text-sm text-foreground">{item.skill}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityColors[item.priority]}`}>{item.priority}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${difficultyColors[item.difficulty]}`}>{item.difficulty}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recommended Learning */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6 box-glow-purple">
            <h4 className="text-lg font-display font-bold gradient-text mb-4">Recommended Learning</h4>
            <ul className="space-y-2">
              {result.recommendedLearning.map((item, j) => (
                <motion.li key={j} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: j * 0.08 }} className="flex items-start gap-3 text-foreground/90 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Roadmap */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 box-glow-blue">
            <h4 className="text-lg font-display font-bold gradient-text mb-4">Your Roadmap</h4>
            <div className="relative pl-6 border-l-2 border-primary/30 space-y-4">
              {result.roadmap.map((step, j) => (
                <motion.div key={j} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: j * 0.1 }} className="relative">
                  <div className="absolute -left-[1.85rem] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  <p className="text-sm text-foreground/90">
                    <span className="text-primary font-display font-bold mr-1">Step {j + 1}:</span> {step}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Weekly Plan */}
          {result.weeklyPlan?.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6 box-glow-purple">
              <h4 className="text-lg font-display font-bold gradient-text mb-4">Weekly Plan</h4>
              <div className="space-y-4">
                {result.weeklyPlan.map((week, i) => (
                  <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-display font-bold">{week.week}</span>
                      <span className="text-sm font-medium text-foreground">{week.focus}</span>
                    </div>
                    <ul className="space-y-1 ml-1">
                      {week.tasks.map((task, j) => (
                        <li key={j} className="text-xs text-muted-foreground flex gap-1.5">
                          <span className="text-accent">→</span> {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Score Impact */}
          {result.scoreImpactTips?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 box-glow-blue">
              <h4 className="text-lg font-display font-bold gradient-text mb-4">Boost Your Score</h4>
              <div className="space-y-2">
                {result.scoreImpactTips.map((tip, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-sm text-foreground/90">{tip.action}</span>
                    <span className="text-xs font-display font-bold text-green-400 flex-shrink-0 ml-3">{tip.impact}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AnalyzePanel;
