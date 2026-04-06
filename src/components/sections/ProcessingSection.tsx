import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const THINKING_STEPS = [
  "Analyzing your skill profile...",
  "Mapping industry requirements...",
  "Computing readiness score...",
  "Building personalized roadmap...",
  "Generating weekly plan...",
  "Preparing AI insights...",
];

const ProcessingSection = ({ visible }: { visible: boolean }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!visible) { setStep(0); return; }
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % THINKING_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <section className="scene-section">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] animate-pulse-glow" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-accent/10 blur-[80px] animate-pulse-glow" style={{ animationDelay: "0.5s" }} />
      </div>
      <div className="relative z-10 text-center space-y-8">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-3xl md:text-5xl font-display font-bold neon-glow-blue"
        >
          SkillNova is thinking...
        </motion.h3>
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-muted-foreground text-lg font-medium"
          >
            {THINKING_STEPS[step]}
          </motion.p>
        </AnimatePresence>
        <div className="flex justify-center gap-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              className="w-4 h-4 rounded-full bg-primary"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessingSection;
