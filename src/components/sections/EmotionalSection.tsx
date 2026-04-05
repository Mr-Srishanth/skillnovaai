import { motion } from "framer-motion";

const EmotionalSection = () => (
  <section className="scene-section">
    {/* Subtle red/purple ambient glow */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-[600px] h-[600px] rounded-full bg-neon-red/10 blur-[120px]" />
    </div>
    <div className="relative z-10 text-center px-6 max-w-3xl space-y-8">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true }}
        className="text-2xl md:text-5xl font-display font-bold text-foreground"
      >
        "What skill am I missing?"
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.5 }}
        viewport={{ once: true }}
        className="text-xl md:text-4xl font-display font-semibold text-neon-red"
      >
        "Why am I not getting selected?"
      </motion.p>
    </div>
  </section>
);

export default EmotionalSection;
