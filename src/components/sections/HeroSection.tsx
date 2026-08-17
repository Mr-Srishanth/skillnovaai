import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ParticleField from "../ParticleField";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Zap, Brain, Target } from "lucide-react";

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
            <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium">
              Dashboard
            </Link>
          ) : (
            <Link to="/auth" className="text-sm px-4 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium">
              Sign In
            </Link>
          )}
        </div>
      </motion.div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left side — text */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs text-neon-cyan font-medium mb-6"
          >
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Career Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-foreground mb-4 leading-tight"
          >
            Your Career.{" "}
            <span className="gradient-text">Optimized by AI.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0"
          >
            Know your gaps. Fix your path. Get job-ready faster.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            <Link to={user ? "/dashboard" : "/auth"} className="neon-btn inline-flex items-center justify-center gap-2 animate-neon-pulse">
              Enter SkillNova <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Capability statements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="flex flex-wrap gap-6 mt-8 justify-center lg:justify-start text-xs text-muted-foreground"
          >
            {[
              "AI-powered career intelligence",
              "Personalized skill-gap analysis",
              "Career-to-project intelligence",
            ].map((stat, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />
                {stat}
              </span>
            ))}
          </motion.div>

          {/* Team attribution */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7, duration: 0.8 }}
            className="mt-10 pt-4 border-t border-white/5 flex justify-center lg:justify-start"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-medium">
              Built by <span className="text-muted-foreground/70">TEAM MARVEL</span>
            </span>
          </motion.div>
        </div>

        {/* Right side — floating preview cards */}
        <div className="flex-1 hidden lg:flex items-center justify-center relative h-[420px]">
          {/* Circular progress card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0, duration: 0.8 }}
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
            transition={{ delay: 1.3, duration: 0.8 }}
            className="absolute top-24 left-0 glass-card p-4 max-w-[220px] animate-float-delayed card-shine"
          >
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-3.5 h-3.5 text-neon-purple" />
              <p className="text-[10px] text-muted-foreground font-medium">AI Mentor</p>
            </div>
            <div className="rounded-lg p-2.5 text-xs text-foreground/80" style={{ background: 'rgba(255,255,255,0.04)' }}>
              "Focus on system design next — it's your biggest gap."
            </div>
          </motion.div>

          {/* Stat card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="absolute bottom-4 right-16 glass-card p-4 animate-float-slow card-shine"
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3.5 h-3.5 text-green-400" />
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Growth Path</p>
            </div>
            <p className="font-display font-black text-lg gradient-text">Track progress</p>
            <p className="text-[10px] text-green-400 mt-0.5">Build momentum</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
