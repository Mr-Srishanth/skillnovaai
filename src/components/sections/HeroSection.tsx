import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ParticleField from "../ParticleField";
import { useAuth } from "@/contexts/AuthContext";

const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="scene-section">
      <ParticleField />
      <div className="relative z-10 text-center px-6 max-w-4xl">
        {/* Top nav */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-10 py-4"
        >
          <span className="font-display font-bold text-sm gradient-text">SkillNova AI</span>
          <div className="flex gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="text-sm px-4 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/auth"
                className="text-sm px-4 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </motion.div>

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
};

export default HeroSection;
