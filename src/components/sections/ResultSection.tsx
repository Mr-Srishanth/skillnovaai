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
        {/* Score */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="glass-card p-10 box-glow-blue"
        >
          <AnimatedScore score={result.skillScore} />
        </motion.div>

        {/* Reasoning */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          viewport={{ once: true }}
          className="glass-card p-8 box-glow-purple"
        >
          <h4 className="text-lg md:text-xl font-display font-bold gradient-text mb-4 flex items-center gap-3">
            <span>🧠</span> AI Reasoning
          </h4>
          <p className="text-foreground/90 leading-relaxed">{result.reasoning}</p>
        </motion.div>

        {/* Next Best Step */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          viewport={{ once: true }}
          className="glass-card p-8 border-primary/40 box-glow-blue"
        >
          <h4 className="text-lg md:text-xl font-display font-bold text-primary mb-3 flex items-center gap-3">
            <span>🎯</span> Your Next Best Step
          </h4>
          <p className="text-foreground text-lg font-medium">{result.nextBestStep}</p>
        </motion.div>

        {/* Missing Skills */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true, amount: 0.2 }}
          className="glass-card p-8 box-glow-blue"
        >
          <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">Missing Skills</h4>
          <div className="space-y-4">
            {result.missingSkills.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50"
              >
                <div className="flex-1">
                  <span className="font-display font-bold text-foreground">{item.skill}</span>
                  <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <span className={`text-xs px-3 py-1 rounded-full border font-medium ${priorityColors[item.priority]}`}>
                    {item.priority}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full border font-medium ${difficultyColors[item.difficulty]}`}>
                    {item.difficulty}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recommended Learning */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true, amount: 0.2 }}
          className="glass-card p-8 box-glow-purple"
        >
          <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">Recommended Learning</h4>
          <ul className="space-y-3">
            {result.recommendedLearning.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
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
          transition={{ duration: 0.9 }}
          viewport={{ once: true, amount: 0.2 }}
          className="glass-card p-8 box-glow-blue"
        >
          <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">Your Roadmap</h4>
          <div className="relative pl-6 border-l-2 border-primary/30 space-y-6">
            {result.roadmap.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
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
            transition={{ duration: 0.9 }}
            viewport={{ once: true, amount: 0.2 }}
            className="glass-card p-8 box-glow-purple"
          >
            <h4 className="text-xl md:text-2xl font-display font-bold gradient-text mb-6">Weekly Plan</h4>
            <div className="space-y-6">
              {result.weeklyPlan.map((week, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="p-4 rounded-xl bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-display font-bold">
                      {week.week}
                    </span>
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
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="glass-card p-8 box-glow-blue"
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
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50"
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
