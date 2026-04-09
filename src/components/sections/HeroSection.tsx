import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ParticleField from "../ParticleField";
import { useAuth } from "@/contexts/AuthContext";

const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="scene-section">
      <ParticleField />

      {/* Fixed glass nav */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-10 py-4 backdrop-blur-md"
        style={{ background: 'rgba(5,5,7,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
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

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left side — text */}
        <div className="flex-1 text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-lg md:text-2xl font-light text-muted-foreground mb-3"
          >
            Your career is not random.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="text-lg md:text-2xl font-light text-muted-foreground mb-8"
          >
            It's just <span className="text-neon-cyan font-medium">unoptimized</span>.
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.2, delay: 2.5 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-black neon-glow-cyan mb-4"
          >
            SkillNova AI
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 3.2 }}
            className="text-muted-foreground text-lg md:text-xl mb-8"
          >
            Your Personal Career OS
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 3.8 }}
          >
            <Link to={user ? "/dashboard" : "/auth"} className="neon-btn inline-block animate-neon-pulse">
              Enter System →
            </Link>
          </motion.div>
        </div>

        {/* Right side — floating preview cards */}
        <div className="flex-1 hidden lg:flex items-center justify-center relative h-[400px]">
          {/* Circular progress card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.8, duration: 0.8 }}
            className="absolute top-0 right-8 glass-card p-6 animate-float card-shine"
          >
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-3">Readiness</p>
            <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="url(#heroGrad)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${0.72 * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                transform="rotate(-90 40 40)"
              />
              <defs>
                <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(186,94%,55%)" />
                  <stop offset="100%" stopColor="hsl(270,60%,55%)" />
                </linearGradient>
              </defs>
              <text x="40" y="44" textAnchor="middle" fill="white" fontSize="16" fontWeight="800" fontFamily="Orbitron">72%</text>
            </svg>
          </motion.div>

          {/* Chat preview card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 3.2, duration: 0.8 }}
            className="absolute top-24 left-0 glass-card p-4 max-w-[200px] animate-float-delayed card-shine"
          >
            <p className="text-[10px] text-muted-foreground mb-2 font-medium">AI Mentor</p>
            <div className="rounded-lg p-2 text-xs text-foreground/80" style={{ background: 'rgba(255,255,255,0.04)' }}>
              "Focus on system design next — it's your biggest gap."
            </div>
          </motion.div>

          {/* Stat card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 3.6, duration: 0.8 }}
            className="absolute bottom-0 right-16 glass-card p-4 animate-float-slow card-shine"
          >
            <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">XP Today</p>
            <p className="font-display font-black text-2xl gradient-text">+150</p>
            <p className="text-[10px] text-green-400 mt-1">↑ Level Up: Pro</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
