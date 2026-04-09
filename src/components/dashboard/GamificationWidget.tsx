import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Trophy } from "lucide-react";

interface Props {
  userId: string;
}

interface GamificationData {
  xp: number;
  level: string;
  streak_days: number;
}

const levelThresholds: Record<string, number> = {
  Beginner: 200,
  Intermediate: 500,
  Pro: 1000,
  Expert: 2000,
};

const GamificationWidget = ({ userId }: Props) => {
  const [data, setData] = useState<GamificationData | null>(null);

  useEffect(() => {
    supabase
      .from("gamification" as any)
      .select("xp, level, streak_days")
      .eq("user_id", userId)
      .single()
      .then(({ data: d }: any) => {
        if (d) setData(d);
      });
  }, [userId]);

  if (!data) return null;

  const nextThreshold = levelThresholds[data.level] || 200;
  const prevThreshold = data.level === "Intermediate" ? 200 : data.level === "Pro" ? 500 : data.level === "Expert" ? 1000 : 0;
  const progress = Math.min(((data.xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100, 100);

  return (
    <div className="px-4 py-3 border-b border-sidebar-border space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-[11px] font-medium gradient-text">{data.level}</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[11px] text-orange-400 font-bold">{data.streak_days}</span>
        </div>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, hsl(186,94%,55%), hsl(270,60%,55%))',
            boxShadow: '0 0 8px rgba(34,211,238,0.4)',
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{data.xp} XP</p>
    </div>
  );
};

export default GamificationWidget;
