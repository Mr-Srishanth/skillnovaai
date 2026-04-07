import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

export interface MissingSkill {
  skill: string;
  priority: "critical" | "important" | "nice-to-have";
  difficulty: "beginner" | "intermediate" | "advanced";
  reason: string;
}

export interface WeeklyPlanItem {
  week: string;
  focus: string;
  tasks: string[];
}

export interface ScoreImpactTip {
  action: string;
  impact: string;
}

export interface AnalysisResult {
  skillScore: number;
  reasoning: string;
  missingSkills: MissingSkill[];
  recommendedLearning: string[];
  roadmap: string[];
  weeklyPlan: WeeklyPlanItem[];
  nextBestStep: string;
  scoreImpactTips: ScoreImpactTip[];
}

const priorityTag: Record<string, string> = {
  critical: "tag-high",
  important: "tag-medium",
  "nice-to-have": "tag-low",
};

const difficultyTag: Record<string, string> = {
  beginner: "tag-low",
  intermediate: "tag-medium",
  advanced: "tag-high",
};

const AnimatedScore = ({ score }: { score: number }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCurrent(Math.min(Math.round(increment * step), score));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [score]);

  const color = score < 40 ? "text-destructive" : score < 70 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="text-center space-y-4">
      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Readiness Score</p>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        className={`text-6xl md:text-8xl font-display font-black ${color}`}
      >
        {current}%
      </motion.div>
      <Progress value={current} className="h-3 max-w-xs mx-auto" />
    </div>
  );
};

const ResultSection = ({ result }: { result: AnalysisResult | null }) => {
  if (!result) return null;

  return (
    <section className="scene-section !min-h-0 py-24">
      <div className="relative z-10 w-full max-w-5xl px-6 space-y-10">
        {/* Score — 0.5s */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="glass-card box-glow-cyan"
        >
          <AnimatedScore score={result.skillScore} />
        </motion.div>

        {/* Missing skills — 1.2s */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          viewport={{ once: true }}
          className="glass-card box-glow-cyan"
        >
          <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">Missing Skills</h4>
          <div className="space-y-4">
            {result.missingSkills.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-muted/20 border border-border/30"
              >
                <div className="flex-1">
                  <span className="font-display font-bold text-foreground">{item.skill}</span>
                  <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <span className={priorityTag[item.priority]}>{item.priority}</span>
                  <span className={difficultyTag[item.difficulty]}>{item.difficulty}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Next step — 2s */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.5 }}
          viewport={{ once: true }}
          className="glass-card border-primary/30 box-glow-cyan"
        >
          <h4 className="text-lg md:text-xl font-display font-bold text-primary mb-3 flex items-center gap-3">
            <span>🎯</span> Your Next Best Step
          </h4>
          <p className="text-foreground text-lg font-medium">{result.nextBestStep}</p>
        </motion.div>

        {/* Reasoning */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          viewport={{ once: true }}
          className="glass-card box-glow-purple"
        >
          <h4 className="text-lg md:text-xl font-display font-bold gradient-text mb-4 flex items-center gap-3">
            <span>🧠</span> AI Reasoning
          </h4>
          <p className="text-foreground/90 leading-relaxed">{result.reasoning}</p>
        </motion.div>

        {/* Recommended Learning */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
          className="glass-card box-glow-purple"
        >
          <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">Recommended Learning</h4>
          <ul className="space-y-3">
            {result.recommendedLearning.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-start gap-3 text-foreground/90"
              >
                <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0 bg-accent" />
                <span>{item}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Roadmap Timeline */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
          className="glass-card box-glow-cyan"
        >
          <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">Your Roadmap</h4>
          <div className="relative pl-6 border-l-2 border-primary/30 space-y-6">
            {result.roadmap.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="absolute -left-[1.85rem] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                <p className="text-foreground/90">
                  <span className="text-primary font-display font-bold mr-2">Step {i + 1}:</span>
                  {step}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Weekly Plan */}
        {result.weeklyPlan?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.2 }}
            className="glass-card box-glow-purple"
          >
            <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">Weekly Plan</h4>
            <div className="space-y-6">
              {result.weeklyPlan.map((week, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="p-4 rounded-xl bg-muted/20 border border-border/30"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="tag-low">{week.week}</span>
                    <span className="font-medium text-foreground">{week.focus}</span>
                  </div>
                  <ul className="space-y-1 ml-1">
                    {week.tasks.map((task, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-accent">→</span> {task}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Score Impact Tips */}
        {result.scoreImpactTips?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="glass-card box-glow-cyan"
          >
            <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">
              Boost Your Score
            </h4>
            <div className="space-y-3">
              {result.scoreImpactTips.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/30"
                >
                  <span className="text-foreground/90">{tip.action}</span>
                  <span className="text-sm font-display font-bold text-green-400 flex-shrink-0 ml-4">
                    {tip.impact}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ResultSection;
