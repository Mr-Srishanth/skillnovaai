import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HistoryItem {
  id: string;
  skills: string;
  target_role: string;
  missing_skills: string[];
  recommended_learning: string[];
  roadmap: string[];
  skill_score: number | null;
  created_at: string;
}

const HistoryPanel = ({ userId }: { userId: string }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("analysis_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load history");
    } else {
      setHistory((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("analysis_history").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setHistory((h) => h.filter((item) => item.id !== id));
      toast.success("Deleted");
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground font-display animate-pulse-glow">Loading history...</div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text mb-8">
        Analysis History
      </h2>

      {history.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <p>No analyses yet. Start by running your first skill analysis!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/20 transition-colors"
              >
                <div>
                  <p className="font-display font-bold text-foreground">{item.target_role}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {item.skills.substring(0, 60)}
                    {item.skills.length > 60 ? "..." : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                  <span className="text-muted-foreground text-lg">
                    {expandedId === item.id ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              <AnimatePresence>
                {expandedId === item.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-border"
                  >
                    <div className="p-5 space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-primary mb-2">Missing Skills</h5>
                        <ul className="space-y-1">
                          {item.missing_skills.map((s, j) => (
                            <li key={j} className="text-sm text-foreground/80 flex gap-2">
                              <span className="text-accent">•</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-primary mb-2">Recommended Learning</h5>
                        <ul className="space-y-1">
                          {item.recommended_learning.map((s, j) => (
                            <li key={j} className="text-sm text-foreground/80 flex gap-2">
                              <span className="text-accent">•</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-primary mb-2">Roadmap</h5>
                        <ul className="space-y-1">
                          {item.roadmap.map((s, j) => (
                            <li key={j} className="text-sm text-foreground/80 flex gap-2">
                              <span className="text-primary">Step {j + 1}:</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                      >
                        Delete this analysis
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
