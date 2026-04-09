import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Code2, RefreshCw, ChevronDown, ChevronUp, Layers, Clock, Gauge } from "lucide-react";

interface Props {
  userId: string;
}

const domains = [
  { id: "ai-ml", label: "AI / Machine Learning", icon: "🤖" },
  { id: "web", label: "Web Development", icon: "🌐" },
  { id: "data", label: "Data Science", icon: "📊" },
  { id: "mobile", label: "Mobile Development", icon: "📱" },
  { id: "devops", label: "DevOps / Cloud", icon: "☁️" },
];

interface Project {
  title: string;
  description: string;
  tech_stack: string[];
  difficulty: string;
  estimated_time: string;
  steps: string[];
}

const ProjectPanel = ({ userId }: Props) => {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [expanded, setExpanded] = useState(false);

  const generate = async () => {
    if (!domain) { toast.error("Select a domain first"); return; }
    setLoading(true);
    setProject(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-project", {
        body: { domain, userId },
      });
      if (error) throw error;
      setProject(data);
      setExpanded(false);

      await supabase.rpc("add_xp" as any, { _user_id: userId, _amount: 15 });
      toast.success("You gained +15 XP! 🧩");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate project");
    } finally {
      setLoading(false);
    }
  };

  const diffColor = project?.difficulty === "Beginner" ? "text-green-400" : project?.difficulty === "Advanced" ? "text-destructive" : "text-yellow-400";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold gradient-text">AI Project Generator</h2>
        <p className="text-sm text-muted-foreground mt-1">Get AI-generated project ideas with tech stacks and step-by-step plans.</p>
      </div>

      {/* Domain selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => setDomain(d.id)}
            className={`glass-card-hover card-shine p-4 text-center transition-all ${
              domain === d.id ? "box-glow-cyan border-neon-cyan/30" : ""
            }`}
            style={domain === d.id ? { borderColor: 'rgba(34,211,238,0.3)' } : {}}
          >
            <span className="text-2xl block mb-1">{d.icon}</span>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </button>
        ))}
      </div>

      <button onClick={generate} disabled={loading || !domain} className="neon-btn text-sm !py-2.5 flex items-center gap-2 disabled:opacity-50">
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
        {loading ? "Generating..." : "Generate Project"}
      </button>

      {/* Project result */}
      <AnimatePresence>
        {project && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="glass-card-hover card-shine p-6">
              <h3 className="font-display font-bold text-lg text-foreground mb-2">{project.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{project.description}</p>

              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span className={`font-medium ${diffColor}`}>{project.difficulty}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{project.estimated_time}</span>
                </div>
              </div>
            </div>

            {/* Tech stack */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-neon-purple" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tech Stack</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.tech_stack.map((tech, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-medium glass-card text-foreground">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Steps - expandable */}
            <div className="glass-card-hover p-5">
              <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Step-by-Step Plan</p>
                {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ol className="mt-4 space-y-3">
                      {project.steps.map((step, i) => (
                        <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-3 text-sm text-muted-foreground"
                        >
                          <span className="font-display font-bold text-neon-cyan text-xs mt-0.5">{i + 1}</span>
                          <span>{step}</span>
                        </motion.li>
                      ))}
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={generate} className="glass-card px-4 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectPanel;
