import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface Props {
  userId: string;
  displayName: string;
}

interface HistoryItem {
  skill_score: number | null;
  target_role: string;
  created_at: string;
}

const OverviewPanel = ({ userId, displayName }: Props) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("analysis_history")
      .select("skill_score, target_role, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setHistory((data as HistoryItem[]) || []);
        setLoading(false);
      });
  }, [userId]);

  const latestScore = history.find((h) => h.skill_score != null)?.skill_score ?? null;
  const previousScore = history.length >= 2
    ? history.slice(1).find((h) => h.skill_score != null)?.skill_score ?? null
    : null;
  const scoreDelta = latestScore != null && previousScore != null ? latestScore - previousScore : null;
  const totalAnalyses = history.length;
  const uniqueRoles = new Set(history.map((h) => h.target_role)).size;

  const scoreColor = latestScore == null
    ? "text-muted-foreground"
    : latestScore < 40
    ? "text-destructive"
    : latestScore < 70
    ? "text-yellow-400"
    : "text-green-400";

  const greeting = latestScore != null ? "Welcome back" : "Welcome";
  const motivational = latestScore != null
    ? latestScore < 40
      ? "Every expert was once a beginner. Let's build your path."
      : latestScore < 70
      ? "You're making solid progress. Keep pushing forward."
      : "You're ahead of the curve. Time to specialize."
    : "Start your first analysis to unlock insights.";

  if (loading) {
    return <div className="text-muted-foreground font-display animate-pulse-glow">Loading...</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text">
          {greeting}, {displayName || "Explorer"}
        </h2>
        <p className="text-muted-foreground mt-2">{motivational}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card box-glow-cyan text-center"
        >
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Latest Score</p>
          <div className={`text-4xl font-display font-black ${scoreColor}`}>
            {latestScore != null ? `${latestScore}%` : "—"}
          </div>
          {latestScore != null && <Progress value={latestScore} className="h-2 mt-3" />}
          {scoreDelta != null && (
            <p className={`text-xs mt-2 font-medium ${scoreDelta >= 0 ? "text-green-400" : "text-destructive"}`}>
              {scoreDelta >= 0 ? "↑" : "↓"} {Math.abs(scoreDelta)}% from last analysis
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card box-glow-purple text-center"
        >
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Total Analyses</p>
          <div className="text-4xl font-display font-black text-foreground">{totalAnalyses}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card box-glow-cyan text-center"
        >
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Roles Explored</p>
          <div className="text-4xl font-display font-black text-foreground">{uniqueRoles}</div>
        </motion.div>
      </div>

      {/* Recent activity */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="text-lg font-display font-bold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {history.slice(0, 5).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="glass-card !p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-display font-bold text-sm text-foreground">{item.target_role}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
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
