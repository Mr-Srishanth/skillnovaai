import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Target, BarChart3, Lightbulb } from "lucide-react";

interface Props {
  userId: string;
  displayName: string;
}

interface HistoryItem {
  skill_score: number | null;
  target_role: string;
  created_at: string;
  missing_skills: any;
  recommended_learning: any;
}

const useCountUp = (target: number, duration = 1200) => {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return value;
};

const CircularProgress = ({ value, size = 120 }: { value: number; size?: number }) => {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const color = value < 40 ? "hsl(0,72%,51%)" : value < 70 ? "hsl(48,96%,53%)" : "hsl(142,71%,45%)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#progressGrad)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(186,94%,55%)" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fill="white" fontSize="24" fontWeight="900" fontFamily="Orbitron">
        {value}%
      </text>
    </svg>
  );
};

const OverviewPanel = ({ userId, displayName }: Props) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("analysis_history")
      .select("skill_score, target_role, created_at, missing_skills, recommended_learning")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setHistory((data as HistoryItem[]) || []);
        setLoading(false);
      });
  }, [userId]);

  const latestScore = history.find((h) => h.skill_score != null)?.skill_score ?? null;
  const previousScore = history.length >= 2 ? history.slice(1).find((h) => h.skill_score != null)?.skill_score ?? null : null;
  const scoreDelta = latestScore != null && previousScore != null ? latestScore - previousScore : null;
  const totalAnalyses = history.length;
  const uniqueRoles = new Set(history.map((h) => h.target_role)).size;

  const animatedScore = useCountUp(latestScore ?? 0);
  const animatedTotal = useCountUp(totalAnalyses);
  const animatedRoles = useCountUp(uniqueRoles);

  const latest = history[0];
  const nextStep = latest?.missing_skills && Array.isArray(latest.missing_skills) && latest.missing_skills.length > 0
    ? (typeof latest.missing_skills[0] === "string" ? latest.missing_skills[0] : (latest.missing_skills[0]?.skill ?? null)) : null;

  const greeting = latestScore != null ? "Welcome back" : "Welcome";
  const motivational = latestScore != null
    ? latestScore < 40 ? "Every expert was once a beginner. Let's build your path."
      : latestScore < 70 ? "You're making solid progress. Keep pushing forward."
      : "You're ahead of 78% of learners. Time to specialize."
    : "Start your first analysis to unlock insights.";

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card h-24 animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text">
          {greeting}, {displayName || "Explorer"}
        </h2>
        <p className="text-muted-foreground mt-2">{motivational}</p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card-hover card-shine p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Target className="w-4 h-4 text-neon-cyan" />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Readiness</p>
          </div>
          <CircularProgress value={latestScore ?? 0} />
          {scoreDelta != null && (
            <p className={`text-xs mt-3 font-medium ${scoreDelta >= 0 ? "text-green-400" : "text-destructive"}`}>
              {scoreDelta >= 0 ? "↑" : "↓"} {Math.abs(scoreDelta)}% from last
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card-hover card-shine p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-neon-purple" />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Analyses</p>
          </div>
          <div className="text-4xl font-display font-black text-foreground">{animatedTotal}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card-hover card-shine p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Roles Explored</p>
          </div>
          <div className="text-4xl font-display font-black text-foreground">{animatedRoles}</div>
        </motion.div>
      </div>

      {/* Next best step */}
      {nextStep && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card-hover card-shine p-5 flex items-start gap-4"
        >
          <div className="p-2 rounded-lg" style={{ background: 'rgba(34,211,238,0.1)' }}>
            <Lightbulb className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-foreground mb-1">Your Next Best Step</p>
            <p className="text-sm text-muted-foreground">Focus on learning <span className="text-neon-cyan font-medium">{String(nextStep)}</span> — it's the highest-impact skill gap for your target role.</p>
          </div>
        </motion.div>
      )}

      {/* Recent activity */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h3 className="text-base font-display font-bold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {history.slice(0, 5).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.06 }}
                className="glass-card-hover p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-display font-bold text-sm text-foreground">{item.target_role}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                {item.skill_score != null && (
                  <span className={`font-display font-bold text-lg ${
                    item.skill_score < 40 ? "text-destructive" : item.skill_score < 70 ? "text-yellow-400" : "text-green-400"
                  }`}>
                    {item.skill_score}%
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OverviewPanel;
