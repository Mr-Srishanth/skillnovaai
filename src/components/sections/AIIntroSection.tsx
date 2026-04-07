import { motion } from "framer-motion";

const AIIntroSection = () => (
  <section className="scene-section">
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.2, 0.08] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px]"
      />
    </div>

    <div className="relative z-10 text-center px-6 space-y-6">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-xl md:text-3xl text-muted-foreground font-light"
      >
        Introducing...
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness: 80 }}
        viewport={{ once: true }}
        className="text-4xl md:text-8xl font-display font-black gradient-text"
      >
        SkillNova AI
      </motion.h2>
    </div>
  </section>
);

export default AIIntroSection;
