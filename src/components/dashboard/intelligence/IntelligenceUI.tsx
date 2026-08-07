import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

export const useCountUp = (target: number, duration = 1000) => {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(p * target));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return value;
};

export const ScoreRing = ({
  score,
  size = 120,
  label,
}: { score: number; size?: number; label?: string }) => {
  const value = useCountUp(score);
  const stroke = size / 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-muted/40" fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          stroke="url(#ringGrad)"
          initial={{ strokeDasharray: c, strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * score) / 100 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(186,94%,55%)" />
            <stop offset="100%" stopColor="hsl(270,60%,55%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-foreground" style={{ fontSize: size / 4 }}>{value}</span>
        {label && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
};

export const MeterBar = ({ value, delay = 0 }: { value: number; delay?: number }) => (
  <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
    <motion.div
      className="h-full rounded-full"
      style={{ background: "linear-gradient(90deg, hsl(186,94%,55%), hsl(270,60%,55%))" }}
      initial={{ width: 0 }}
      animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      transition={{ duration: 1, delay, ease: "easeOut" }}
    />
  </div>
);

export const PanelHeader = ({
  title,
  subtitle,
  onRefresh,
  refreshing,
}: { title: string; subtitle: string; onRefresh?: () => void; refreshing?: boolean }) => (
  <div className="flex items-start justify-between gap-4 mb-6">
    <div>
      <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>
    </div>
    {onRefresh && (
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="shrink-0 flex items-center gap-2 text-xs px-3 py-2 rounded-lg glass-card text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        Refresh
      </button>
    )}
  </div>
);

export const EmptyGoalState = ({ what }: { what: string }) => (
  <div className="glass-card p-10 text-center">
    <Sparkles className="w-8 h-8 mx-auto text-primary mb-3" />
    <h3 className="font-display font-bold text-foreground">Set your career goal first</h3>
    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
      Run a Skill Analysis with your skills and target role — SkillNova needs it to generate {what}.
    </p>
  </div>
);

export const ThinkingState = ({ steps }: { steps: string[] }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((s) => Math.min(s + 1, steps.length - 1)), 1800);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="glass-card p-8 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-primary"
            />
          ))}
        </div>
        <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-muted-foreground">
          {steps[i]}
        </motion.p>
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((n) => (
          <div key={n} className="h-3 rounded bg-muted/40 animate-pulse" style={{ width: `${90 - n * 18}%` }} />
        ))}
      </div>
    </div>
  );
};
