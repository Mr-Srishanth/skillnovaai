import { motion } from "framer-motion";

const ProcessingSection = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  return (
    <section className="scene-section">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] animate-pulse-glow" />
      </div>
      <div className="relative z-10 text-center space-y-8">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-3xl md:text-5xl font-display font-bold neon-glow-blue"
        >
          Analyzing your future...
        </motion.h3>
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
