import { motion } from "framer-motion";

const TurningPointSection = () => (
  <section className="scene-section">
    {/* Light expansion effect */}
    <motion.div
      initial={{ scale: 0, opacity: 0.8 }}
      whileInView={{ scale: 3, opacity: 0 }}
      transition={{ duration: 3, ease: "easeOut" }}
      viewport={{ once: true }}
      className="absolute w-40 h-40 rounded-full bg-primary blur-[80px]"
    />
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.5, delay: 0.3 }}
      viewport={{ once: true }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div className="w-[800px] h-[800px] rounded-full bg-primary/5 blur-[100px]" />
    </motion.div>
    <motion.h2
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.5, delay: 0.5 }}
      viewport={{ once: true }}
      className="relative z-10 text-3xl md:text-6xl font-display font-bold neon-glow-blue text-center px-6"
    >
      What if AI could guide you?
    </motion.h2>
  </section>
);

export default TurningPointSection;
