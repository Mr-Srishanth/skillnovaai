import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Code2, RefreshCw, ChevronDown, ChevronUp, Layers, Clock, Gauge, Sparkles } from "lucide-react";
import { getRandomProject, type ProjectIdea } from "@/data/projectDataset";

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

const STATUS_MESSAGES = [
  "Scanning project databases...",
  "Matching your domain expertise...",
  "Generating optimal project...",
  "Building step-by-step roadmap...",
];

const ProjectPanel = ({ userId }: Props) => {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<ProjectIdea | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState(0);
  const [typedTitle, setTypedTitle] = useState("");
  const timerRef = useRef<NodeJS.Timeout>();

  // Status message rotation during loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 800);
    return () => clearInterval(interval);
  }, [loading]);

  // Typing effect for title
  useEffect(() => {
    if (!project) { setTypedTitle(""); return; }
    let i = 0;
    setTypedTitle("");
    const interval = setInterval(() => {
      i++;
      setTypedTitle(project.title.slice(0, i));
      if (i >= project.title.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [project]);

  // Step-by-step reveal when expanded
  useEffect(() => {
    if (!expanded || !project) { setRevealedSteps(0); return; }
    setRevealedSteps(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setRevealedSteps(step);
      if (step >= project.steps.length) clearInterval(interval);
    }, 300);
    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [expanded, project]);

  const generate = async () => {
    if (!domain) { toast.error("Select a domain first"); return; }
    setLoading(true);
    setProject(null);
    setExpanded(false);

    // Simulate AI thinking delay
    await new Promise((r) => setTimeout(r, 1800));

    // Try edge function first, fallback to local dataset
    try {
      const { data, error } = await supabase.functions.invoke("generate-project", {
        body: { domain },
      });
      if (error || !data?.title) throw new Error("AI unavailable");
      setProject(data as ProjectIdea);
    } catch {
      // Fallback to local dataset
      const fallback = getRandomProject(domain);
      setProject(fallback);
    }

    setLoading(false);
    // Award XP
    try {
      await supabase.rpc("add_xp" as any, { _user_id: userId, _amount: 15 });
      toast.success("You gained +15 XP! 🧩");
    } catch {}
  };

  const diffColor = project?.difficulty === "Beginner" ? "text-green-400" : project?.difficulty === "Advanced" ? "text-destructive" : "text-yellow-400";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold gradient-text flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-neon-cyan" />
          AI Project Generator
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Get personalized project ideas with tech stacks and step-by-step plans.</p>
      </div>

      {/* Domain selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => setDomain(d.id)}
            className={`glass-card-hover card-shine p-4 text-center transition-all ${
              domain === d.id ? "box-glow-cyan" : ""
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

      {/* Loading state with status messages */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-8 text-center space-y-4"
          >
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-3 h-3 rounded-full bg-neon-cyan"
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={statusIdx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm text-muted-foreground font-medium"
              >
                {STATUS_MESSAGES[statusIdx]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project result */}
      <AnimatePresence>
        {project && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="glass-card-hover card-shine p-6">
              <h3 className="font-display font-bold text-lg text-foreground mb-2">
                {typedTitle}
                <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="text-neon-cyan">|</motion.span>
              </h3>
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
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="px-3 py-1 rounded-full text-xs font-medium glass-card text-foreground"
                  >
                    {tech}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Steps - expandable with step-by-step reveal */}
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
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -15 }}
                          animate={i < revealedSteps ? { opacity: 1, x: 0 } : { opacity: 0, x: -15 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-start gap-3 text-sm text-muted-foreground"
                        >
                          <span className="font-display font-bold text-neon-cyan text-xs mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center glass-card">{i + 1}</span>
                          <span>{step}</span>
                        </motion.li>
                      ))}
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={generate} className="glass-card-hover px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Generate Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectPanel;
