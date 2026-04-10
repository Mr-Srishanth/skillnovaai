import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const stats = [
  { value: 10000, suffix: "+", label: "Active Users" },
  { value: 70, suffix: "%", label: "Faster Career Growth" },
  { value: 50000, suffix: "+", label: "Skills Analyzed" },
  { value: 95, suffix: "%", label: "User Satisfaction" },
];

const CountUp = ({ target, suffix }: { target: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    const duration = 1500;
    const steps = 50;
    const increment = target / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCount(Math.min(Math.round(increment * step), target));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);

  return (
    <motion.div
      onViewportEnter={() => setStarted(true)}
      viewport={{ once: true }}
    >
      <span className="text-3xl md:text-5xl font-display font-black gradient-text">
        {count.toLocaleString()}{suffix}
      </span>
    </motion.div>
  );
};

const SocialProofSection = () => (
  <section className="py-24 px-6 relative">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-neon-purple/5 blur-[120px] rounded-full" />
    </div>
    <div className="max-w-5xl mx-auto">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center text-xs font-display font-bold uppercase tracking-[0.3em] text-neon-cyan mb-12"
      >
        Trusted By Learners Worldwide
      </motion.p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <CountUp target={stat.value} suffix={stat.suffix} />
            <p className="text-xs text-muted-foreground mt-2 font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default SocialProofSection;
