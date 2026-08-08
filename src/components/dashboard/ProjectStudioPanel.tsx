import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Hammer, Sparkles, RefreshCw, Target, TrendingUp, Layers, Search,
  Wand2, GitBranch, Cpu, Compass, PenLine, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useCareerProfile, bumpLocalCount } from "@/hooks/useCareerProfile";
import {
  deleteProject, listProjects, projectProgress, projectValue, readRecCache, runStudio,
  saveRecommendation, updateProject, writeRecCache, difficultyTone,
  type Recommendation, type RecommendationBatch, type SourceMode, type StudioProject,
} from "@/lib/projectStudio";
import { EmptyGoalState, MeterBar, PanelHeader, ScoreRing, ThinkingState } from "./intelligence/IntelligenceUI";
import WorkspaceView from "./studio/WorkspaceView";

type View = "home" | "projects" | "recommendations";

const THINKING = [
  "Reading your career goal and skill gaps…",
  "Scoring project ideas against your readiness…",
  "Matching build difficulty to your study time…",
  "Writing the recommendation rationale…",
];

const MODES: { id: SourceMode; label: string; icon: typeof Wand2; placeholder?: string }[] = [
  { id: "ai", label: "AI Recommended", icon: Wand2 },
  { id: "gap", label: "From Skill Gap", icon: GitBranch, placeholder: "Which gap? e.g. SQL, system design" },
  { id: "goal", label: "From Career Goal", icon: Target, placeholder: "Role focus, e.g. backend engineer" },
  { id: "tech", label: "From Technology", icon: Cpu, placeholder: "Technology, e.g. Python + FastAPI" },
  { id: "custom", label: "Custom Idea", icon: PenLine, placeholder: "Describe what you want to build" },
];

const FILTERS = ["All", "AI", "Web", "Mobile", "Cloud", "Data", "Cybersecurity"];

const matchesFilter = (p: { tech_stack: string[]; project_type: string | null; title: string }, f: string) => {
  if (f === "All") return true;
  const hay = `${p.title} ${p.project_type || ""} ${p.tech_stack.join(" ")}`.toLowerCase();
  const map: Record<string, string[]> = {
    AI: ["ai", "ml", "llm", "gemini", "openai", "pytorch", "tensorflow", "nlp"],
    Web: ["react", "next", "node", "web", "django", "express", "vue", "html"],
    Mobile: ["react native", "flutter", "android", "ios", "swift", "kotlin", "mobile"],
    Cloud: ["aws", "gcp", "azure", "docker", "kubernetes", "devops", "cloud", "terraform"],
    Data: ["data", "sql", "pandas", "spark", "etl", "analytics", "warehouse"],
    Cybersecurity: ["security", "auth", "crypt", "pentest", "cyber", "jwt", "oauth"],
  };
  return (map[f] || []).some((k) => hay.includes(k));
};

const ProjectStudioPanel = ({ userId }: { userId: string }) => {
  const { profile, loading: profileLoading } = useCareerProfile(userId);
  const [view, setView] = useState<View>("home");
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [batch, setBatch] = useState<RecommendationBatch | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [mode, setMode] = useState<SourceMode>("ai");
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setProjects(await listProjects(userId));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const activeProject = projects.find((p) => p.id === activeId) || null;
  const completed = projects.filter((p) => p.status === "completed");
  const active = projects.filter((p) => p.status === "active");
  const saved = projects.filter((p) => p.status === "saved");

  /* Recommendations ------------------------------------------------- */
  const fetchRecs = useCallback(
    async (force = false, count = 3) => {
      if (!profile.goal) return;
      const key = `${mode}:${input.trim()}`;
      if (!force) {
        const cached = readRecCache(profile, mode, input.trim());
        if (cached) { setBatch(cached); return; }
      }
      setLoadingRecs(true);
      try {
        const res = await runStudio<RecommendationBatch>("recommend", profile, {
          count,
          source: mode,
          input: input.trim(),
          existingTitles: projects.map((p) => p.title),
        });
        setBatch(res);
        writeRecCache(profile, mode, input.trim(), res);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoadingRecs(false);
      }
      return key;
    },
    [profile, mode, input, projects]
  );

  // Auto-load the first personalized recommendation once a goal exists.
  useEffect(() => {
    if (profileLoading || !profile.goal || batch || loadingRecs) return;
    fetchRecs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, profile.goal]);

  const topRecommendation = batch?.projects?.[0] || null;

  /* Actions ---------------------------------------------------------- */
  const startProject = async (rec: Recommendation, status: "active" | "saved" = "active") => {
    try {
      const created = await saveRecommendation(userId, profile.goal, rec, mode, status);
      setProjects((p) => [created, ...p]);
      if (status === "active") { setActiveId(created.id); setView("projects"); }
      else toast.success("Saved to your project library");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const patchProject = async (patch: Record<string, unknown>) => {
    if (!activeProject) return;
    const wasCompleted = activeProject.status === "completed";
    try {
      const updated = await updateProject(activeProject.id, patch);
      setProjects((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      if (!wasCompleted && updated.status === "completed") {
        // Contribute to the shared Career Intelligence engine — never a separate score.
        bumpLocalCount(userId, "projects");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const removeProject = async () => {
    if (!activeProject) return;
    try {
      await deleteProject(activeProject.id);
      setProjects((list) => list.filter((p) => p.id !== activeProject.id));
      setActiveId(null);
      toast.success("Project deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openKnowledge = (topic: string) => {
    sessionStorage.setItem("skillnova:knowledge:prefill", topic);
    window.dispatchEvent(new CustomEvent("skillnova:navigate", { detail: { tab: "knowledge" } }));
  };

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) => matchesFilter(p, filter) && (!query || p.title.toLowerCase().includes(query.toLowerCase()))
      ),
    [projects, filter, query]
  );

  /* Render ------------------------------------------------------------ */
  if (!profileLoading && !profile.goal) {
    return (
      <div className="max-w-5xl">
        <PanelHeader title="Project Studio" subtitle="Build your next career move — projects chosen from your real skill gaps." />
        <EmptyGoalState what="project recommendations" />
      </div>
    );
  }

  if (activeProject) {
    return (
      <div className="max-w-5xl">
        <WorkspaceView
          project={activeProject}
          profile={profile}
          onBack={() => setActiveId(null)}
          onUpdate={patchProject}
          onLearn={openKnowledge}
          onDelete={removeProject}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <PanelHeader
        title="Project Studio"
        subtitle="Build your next career move. SkillNova decides what you should build, why, and exactly how."
        onRefresh={() => fetchRecs(true)}
        refreshing={loadingRecs}
      />

      <div className="flex gap-1.5">
        {([
          ["home", "Studio", Hammer],
          ["projects", "My Projects", Layers],
          ["recommendations", "Recommendations", Compass],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setView(id as View)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs transition-colors ${
              view === id ? "glass-card text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {view === "home" && (
        <div className="space-y-5">
          <div className="glass-card card-shine p-6 grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="space-y-4 min-w-0">
              <h3 className="text-lg font-display font-bold text-foreground">Build your next career move.</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Target</p>
                  <p className="text-foreground mt-1">{profile.goal}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Highest impact gap</p>
                  <p className="text-foreground mt-1">
                    {batch?.topGap || profile.missingSkills.slice(0, 2).join(" + ") || profile.readiness.weakest.name}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Projects completed</p>
                  <p className="text-foreground mt-1">{completed.length}</p>
                </div>
              </div>
              {batch?.headline && <p className="text-sm text-muted-foreground">{batch.headline}</p>}
            </div>
            <ScoreRing score={profile.readiness.overall} size={110} label="readiness" />
          </div>

          {loadingRecs && !batch && <ThinkingState steps={THINKING} />}

          {topRecommendation && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card card-shine p-6 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-neon-cyan">Recommended build</p>
                <h3 className="text-xl font-display font-bold gradient-text mt-1">{topRecommendation.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{topRecommendation.summary}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className={difficultyTone(topRecommendation.difficulty)}>{topRecommendation.difficulty}</span>
                <span>· {topRecommendation.projectType}</span>
                <span>· {topRecommendation.duration}</span>
                <span>· Project value {projectValue(topRecommendation.quality)}/100</span>
              </div>
              <div className="rounded-xl bg-muted/10 border border-border p-4 space-y-2 text-xs">
                <p><span className="text-foreground/80">Why this project: </span><span className="text-muted-foreground">{topRecommendation.why}</span></p>
                <p><span className="text-foreground/80">Fixes gap: </span><span className="text-muted-foreground">{topRecommendation.skillsAddressed.join(", ")}</span></p>
                <p><span className="text-foreground/80">Recruiter proof: </span><span className="text-muted-foreground">{topRecommendation.recruiterProof}</span></p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => startProject(topRecommendation)} className="neon-btn text-sm !py-2.5">Build This Project</button>
                <button
                  onClick={() => fetchRecs(true)}
                  disabled={loadingRecs}
                  className="glass-card px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRecs ? "animate-spin" : ""}`} /> Generate Another
                </button>
                <button onClick={() => setView("recommendations")} className="px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                  See all recommendations <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {!!active.length && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Continue building</p>
              {active.map((p) => (
                <button key={p.id} onClick={() => setActiveId(p.id)} className="w-full glass-card-hover p-4 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{p.title}</span>
                    <span className="text-[11px] text-muted-foreground">{projectProgress(p)}%</span>
                  </div>
                  <div className="mt-2"><MeterBar value={projectProgress(p)} /></div>
                </button>
              ))}
            </div>
          )}

          {!projects.length && !loadingRecs && (
            <div className="glass-card p-6 text-center">
              <Sparkles className="w-7 h-7 mx-auto text-primary mb-2" />
              <p className="text-sm text-foreground font-display">Your next project should strengthen your weakest career skill.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Weakest dimension right now: {profile.readiness.weakest.name} ({profile.readiness.weakest.score}/100).
              </p>
            </div>
          )}
        </div>
      )}

      {view === "recommendations" && (
        <div className="space-y-5">
          <div className="glass-card p-5 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Generation mode</p>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-colors ${
                      mode === m.id ? "glass-card text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {m.label}
                  </button>
                );
              })}
            </div>
            {mode !== "ai" && (
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={MODES.find((m) => m.id === mode)?.placeholder}
                className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50"
              />
            )}
            <button onClick={() => fetchRecs(true)} disabled={loadingRecs} className="neon-btn text-xs !py-2 disabled:opacity-50">
              {loadingRecs ? "Thinking…" : "Generate recommendations"}
            </button>
          </div>

          {loadingRecs && <ThinkingState steps={THINKING} />}

          {batch?.projects?.map((rec, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-display font-bold text-foreground">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{rec.summary}</p>
                </div>
                <ScoreRing score={projectValue(rec.quality)} size={72} label="value" />
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className={difficultyTone(rec.difficulty)}>{rec.difficulty}</span>
                <span>· {rec.projectType}</span>
                <span>· {rec.duration}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rec.techStack.map((t, j) => <span key={j} className="px-2.5 py-1 rounded-full text-[10px] glass-card">{t}</span>)}
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <p><span className="text-foreground/80">Why this project? </span><span className="text-muted-foreground">{rec.why}</span></p>
                <p><span className="text-foreground/80">What will I learn? </span><span className="text-muted-foreground">{rec.whatYouLearn}</span></p>
                <p><span className="text-foreground/80">Career impact: </span><span className="text-muted-foreground">{rec.careerRelevance}</span></p>
                <p><span className="text-foreground/80">Gap it fixes: </span><span className="text-muted-foreground">{rec.skillsAddressed.join(", ")}</span></p>
                <p className="sm:col-span-2"><span className="text-foreground/80">Show a recruiter: </span><span className="text-muted-foreground">{rec.recruiterProof}</span></p>
              </div>
              {rec.preparationNote && (
                <p className="text-xs text-amber-400/90 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">⚠ {rec.preparationNote}</p>
              )}
              {!!rec.prerequisites?.length && (
                <div className="space-y-1.5">
                  {rec.prerequisites.map((p, j) => (
                    <div key={j} className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground flex-1">Learn first: <span className="text-foreground">{p.topic}</span> — {p.reason}</span>
                      <button onClick={() => openKnowledge(p.topic)} className="glass-card px-2.5 py-1 text-[10px] text-neon-cyan hover:text-foreground shrink-0">
                        Knowledge Engine
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => startProject(rec)} className="neon-btn text-xs !py-2">Build This Project</button>
                <button onClick={() => startProject(rec, "saved")} className="glass-card px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground">
                  Save idea
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {view === "projects" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 glass-card px-3 py-2 flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your projects…"
                className="bg-transparent text-xs outline-none flex-1"
              />
            </div>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[11px] transition-colors ${
                  filter === f ? "glass-card text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {!filtered.length && (
            <div className="glass-card p-8 text-center space-y-3">
              <Sparkles className="w-7 h-7 mx-auto text-primary" />
              <p className="text-sm text-foreground font-display">Your next project should strengthen your weakest career skill.</p>
              <button onClick={() => setView("recommendations")} className="neon-btn text-xs !py-2">Get a recommendation</button>
            </div>
          )}

          {(["active", "saved", "completed"] as const).map((group) => {
            const list = filtered.filter((p) => p.status === group);
            if (!list.length) return null;
            return (
              <div key={group} className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {group === "active" ? "Active projects" : group === "saved" ? "Saved ideas" : "Completed projects"}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {list.map((p) => (
                    <button key={p.id} onClick={() => setActiveId(p.id)} className="glass-card-hover card-shine p-5 text-left space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-display text-foreground">{p.title}</span>
                        <span className={`text-[10px] ${difficultyTone(p.difficulty)}`}>{p.difficulty}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.tech_stack.slice(0, 4).map((t, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-muted/30">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <TrendingUp className="w-3 h-3" /> Value {projectValue(p.quality)}/100
                        <span className="ml-auto">{projectProgress(p)}%</span>
                      </div>
                      <MeterBar value={projectProgress(p)} />
                      <p className="text-[10px] text-muted-foreground">
                        {p.skills_developed.slice(0, 3).join(", ")} · updated {new Date(p.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectStudioPanel;
