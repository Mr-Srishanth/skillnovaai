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
      {/* Background dim */}
      <div className="absolute inset-0 bg-background/60 pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-[400px] h-[400px] rounded-full bg-neon-cyan/10 blur-[100px]"
        />
      </div>

      <div className="relative z-10 text-center space-y-8">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-display font-bold neon-glow-cyan"
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

        {/* Pulse dots — 1s loop */}
        <div className="flex justify-center gap-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-4 h-4 rounded-full bg-primary"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessingSection;
