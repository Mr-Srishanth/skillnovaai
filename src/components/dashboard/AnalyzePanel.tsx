import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AnalysisResult } from "@/components/sections/ResultSection";

const AnalyzePanel = ({ userId }: { userId: string }) => {
  const [skills, setSkills] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!skills.trim() || !role.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-skills", {
        body: { skills, role },
      });
      if (error) throw error;

      const analysisResult = data as AnalysisResult;
      setResult(analysisResult);

      // Save to history
      await supabase.from("analysis_history").insert({
        user_id: userId,
        skills,
        target_role: role,
        missing_skills: analysisResult.missingSkills as any,
        recommended_learning: analysisResult.recommendedLearning as any,
        roadmap: analysisResult.roadmap as any,
      });

      toast.success("Analysis saved to your history!");
    } catch (e: any) {
      console.error(e);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text mb-8">
        Skill Analysis
      </h2>

      <div className="glass-card p-8 box-glow-blue space-y-6 mb-8">
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5 font-medium">
            Your Current Skills
          </label>
          <input
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. HTML, CSS, JavaScript, React"
            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5 font-medium">
            Your Dream Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Full Stack Developer"
            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAnalyze}
          disabled={loading || !skills.trim() || !role.trim()}
          className="w-full py-3.5 rounded-lg font-display font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground disabled:opacity-40 transition-all"
        >
          {loading ? "Analyzing..." : "Analyze My Future"}
        </motion.button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {[
            { title: "Missing Skills", items: result.missingSkills, glow: "box-glow-blue" },
            { title: "Recommended Learning", items: result.recommendedLearning, glow: "box-glow-purple" },
            { title: "Your Roadmap", items: result.roadmap, glow: "box-glow-blue" },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`glass-card p-6 ${card.glow}`}
            >
              <h4 className="text-lg font-display font-bold gradient-text mb-4">{card.title}</h4>
              <ul className="space-y-2">
                {card.items.map((item, j) => (
                  <motion.li
                    key={j}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.15 + j * 0.1 }}
                    className="flex items-start gap-3 text-foreground/90 text-sm"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default AnalyzePanel;
