import { motion } from "framer-motion";
import ParticleField from "../ParticleField";

const HeroSection = () => (
  <section className="scene-section">
    <ParticleField />
    <div className="relative z-10 text-center px-6 max-w-4xl">
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        viewport={{ once: true }}
        className="text-2xl md:text-4xl font-light text-muted-foreground mb-6"
      >
        You are learning every day...
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.4, delay: 0.6, ease: "easeOut" }}
        viewport={{ once: true }}
        className="text-3xl md:text-6xl font-display font-bold neon-glow-blue"
      >
        ...but are you learning the right things?
      </motion.h1>
    </div>
  </section>
);

export default HeroSection;
