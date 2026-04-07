import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ParticleField from "../ParticleField";
import { useAuth } from "@/contexts/AuthContext";

const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="scene-section">
      <ParticleField />

      {/* Depth mid-layer glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-cyan/5 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-neon-purple/5 blur-[100px]"
        />
      </div>

      {/* Top nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-10 py-4"
        style={{ background: "linear-gradient(to bottom, hsl(240 15% 3% / 0.8), transparent)" }}
      >
        <span className="font-display font-bold text-sm gradient-text">SkillNova AI</span>
        <div className="flex gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="text-sm px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold hover:scale-105 transition-transform"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="text-sm px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-bold hover:scale-105 transition-transform"
            >
              Sign In
            </Link>
          )}
        </div>
      </motion.nav>

      <div className="relative z-10 text-center px-6 max-w-4xl">
        {/* Title — 0s delay, 0.8s fade */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-xl md:text-3xl font-light text-muted-foreground mb-6"
        >
          You are learning every day...
        </motion.p>

        {/* Main heading — 0.3s delay, fade + subtle zoom */}
        <motion.h1
          initial={{ opacity: 0, y: 30, scale: 1 }}
          whileInView={{ opacity: 1, y: 0, scale: 1.05 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-3xl md:text-6xl lg:text-7xl font-display font-black neon-glow-cyan leading-tight"
        >
          ...but are you learning the right things?
        </motion.h1>
      </div>
    </section>
  );
};

export default HeroSection;
