import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, CheckCircle2, Circle, Plus, RefreshCw, Bot, FileText, Mic,
  Layers, Trash2, Sparkles, Send, Gauge,
} from "lucide-react";
import { toast } from "sonner";
import type { CareerProfile } from "@/hooks/useCareerProfile";
import {
  allTasks, currentMilestone, nextTasks, projectProgress, projectValue, qualityBreakdown,
  runStudio, difficultyTone,
  type AssistAnswer, type Blueprint, type Difficulty, type InterviewQuestion,
  type ResumeEntry, type StudioProject,
} from "@/lib/projectStudio";
import { MeterBar, ScoreRing, ThinkingState } from "../intelligence/IntelligenceUI";
import BlueprintView from "./BlueprintView";
import CopyButton from "./CopyButton";

type Tab = "workspace" | "blueprint" | "assistant" | "resume" | "interview";

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: "workspace", label: "Workspace", icon: Layers },
  { id: "blueprint", label: "Blueprint", icon: FileText },
  { id: "assistant", label: "Project AI", icon: Bot },
  { id: "resume", label: "Resume", icon: Sparkles },
  { id: "interview", label: "Interview", icon: Mic },
];

const DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced", "Expert"];

const BUILD_THINKING = [
  "Reading your career profile and skill gaps…",
  "Designing the system architecture…",
  "Modelling the database and API surface…",
  "Breaking the build into milestones…",
];

interface Props {
  project: StudioProject;
  profile: CareerProfile;
  onBack: () => void;
  onUpdate: (patch: Record<string, unknown>) => Promise<void>;
  onLearn: (topic: string) => void;
  onDelete: () => void;
}

const aiContext = (p: StudioProject) => ({
  title: p.title,
  projectType: p.project_type,
  difficulty: p.difficulty,
  techStack: p.tech_stack,
  skillsDeveloped: p.skills_developed,
  blueprint: p.blueprint,
  currentMilestone: currentMilestone(p)?.phase,
  completedTasks: p.completed_tasks,
  totalTasks: allTasks(p).length,
  nextTasks: nextTasks(p, 3).map((t) => t.title),
});

const WorkspaceView = ({ project, profile, onBack, onUpdate, onLearn, onDelete }: Props) => {
  const [tab, setTab] = useState<Tab>(project.milestones.length ? "workspace" : "blueprint");
  const [building, setBuilding] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answers, setAnswers] = useState<{ q: string; a: AssistAnswer }[]>([]);
  const [genResume, setGenResume] = useState(false);
  const [genInterview, setGenInterview] = useState(false);

  const progress = projectProgress(project);
  const milestone = currentMilestone(project);
  const tasks = allTasks(project);
  const value = projectValue(project.quality);
  const hasBlueprint = Boolean(project.blueprint?.overview);

  const skillsInFlight = useMemo(
    () => milestone?.skillsPracticed || project.skills_developed,
    [milestone, project.skills_developed]
  );

  const remaining = tasks.length - project.completed_tasks.length;
  const eta = useMemo(() => {
    if (!remaining) return "Complete";
    const perDay = Math.max(profile.studyHours || 2, 0.5) / 1.5; // ~1.5h per task
    return `~${Math.max(1, Math.ceil(remaining / perDay))} days at ${profile.studyHours || 2}h/day`;
  }, [remaining, profile.studyHours]);

  const generateBlueprint = async (difficulty = project.difficulty) => {
    setBuilding(true);
    try {
      const bp = await runStudio<Blueprint>("blueprint", profile, {
        project: { ...aiContext(project), difficulty },
      });
      await onUpdate({
        blueprint: bp as any,
        milestones: (bp.milestones || []) as any,
        completed_tasks: [],
        difficulty,
        status: "active",
        skills_developed: bp.skillsDeveloped?.length ? bp.skillsDeveloped : project.skills_developed,
      });
      setTab("workspace");
      toast.success("Blueprint ready — your build plan is live.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBuilding(false);
    }
  };

  const toggleTask = async (id: string) => {
    const done = project.completed_tasks.includes(id);
    const next = done ? project.completed_tasks.filter((t) => t !== id) : [...project.completed_tasks, id];
    const complete = tasks.length > 0 && next.length === tasks.length;
    await onUpdate({
      completed_tasks: next as any,
      status: complete ? "completed" : "active",
    });
    if (complete) toast.success("Project complete — add it to your resume.");
  };

  const addTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    const task = { id: `extra-${Date.now()}`, title };
    await onUpdate({ extra_tasks: [...project.extra_tasks, task] as any });
    setNewTask("");
  };

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setAsking(true);
    setQuestion("");
    try {
      const res = await runStudio<AssistAnswer>("assist", profile, { project: aiContext(project), question: text });
      setAnswers((a) => [{ q: text, a: res }, ...a]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAsking(false);
    }
  };

  const buildResume = async () => {
    setGenResume(true);
    try {
      const entry = await runStudio<ResumeEntry>("resume", profile, { project: aiContext(project) });
      await onUpdate({ resume_entry: entry as any });
      toast.success("Resume entry drafted — review and approve it.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenResume(false);
    }
  };

  const buildInterview = async () => {
    setGenInterview(true);
    try {
      const res = await runStudio<{ questions: InterviewQuestion[] }>("interview", profile, { project: aiContext(project) });
      await onUpdate({ interview_questions: (res.questions || []) as any });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenInterview(false);
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Project Studio
      </button>

      {/* Header */}
      <div className="glass-card card-shine p-6 flex flex-col md:flex-row gap-6 md:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-[11px] mb-2">
            <span className={`font-medium ${difficultyTone(project.difficulty)}`}>{project.difficulty}</span>
            <span className="text-muted-foreground">· {project.project_type}</span>
            {project.duration && <span className="text-muted-foreground">· {project.duration}</span>}
            <span className={`px-2 py-0.5 rounded-full ${project.status === "completed" ? "text-emerald-400 bg-emerald-400/10" : "text-neon-cyan bg-cyan-400/10"}`}>
              {project.status}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-bold gradient-text">{project.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{project.summary}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.tech_stack.map((t, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-[10px] glass-card">{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <ScoreRing score={progress} size={96} label="built" />
          {value > 0 && <ScoreRing score={value} size={96} label="value" />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                tab === t.id ? "glass-card text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {building && <ThinkingState steps={BUILD_THINKING} />}

      {!building && !hasBlueprint && (
        <div className="glass-card p-10 text-center space-y-4">
          <Sparkles className="w-8 h-8 mx-auto text-primary" />
          <div>
            <h3 className="font-display font-bold text-foreground">Generate the build blueprint</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              SkillNova will design the architecture, database, API and milestone plan for this project against your profile.
            </p>
          </div>
          <button onClick={() => generateBlueprint()} className="neon-btn text-sm !py-2.5">Build This Project</button>
        </div>
      )}

      {!building && hasBlueprint && tab === "workspace" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="glass-card p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Current milestone</p>
              <p className="text-sm font-display text-foreground mt-1">{milestone?.phase || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">{milestone?.goal}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Next task</p>
              <p className="text-sm text-foreground mt-1">{nextTasks(project, 1)[0]?.title || "All tasks done"}</p>
              <p className="text-xs text-muted-foreground mt-1">{project.completed_tasks.length}/{tasks.length} completed</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Estimated completion</p>
              <p className="text-sm text-foreground mt-1">{eta}</p>
              <div className="mt-2"><MeterBar value={progress} /></div>
            </div>
          </div>

          <div className="glass-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Skills being practised</p>
            <div className="flex flex-wrap gap-1.5">
              {skillsInFlight.map((s, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-[10px] bg-muted/30 text-foreground/90">{s}</span>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-3">
            {project.milestones.map((m, mi) => {
              const mDone = (m.tasks || []).every((t) => project.completed_tasks.includes(t.id));
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: mi * 0.04 }}
                  className={`glass-card p-5 ${mDone ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm text-foreground">{m.phase}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.goal}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{m.estimatedTime}</span>
                  </div>
                  {!!m.dependencies?.length && (
                    <p className="text-[10px] text-muted-foreground/70 mt-2">Depends on: {m.dependencies.join(", ")}</p>
                  )}
                  <div className="mt-3 space-y-1.5">
                    {(m.tasks || []).map((t) => {
                      const done = project.completed_tasks.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTask(t.id)}
                          className="w-full flex items-start gap-2.5 text-left group"
                        >
                          {done
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            : <Circle className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan shrink-0 mt-0.5" />}
                          <span className={`text-xs ${done ? "line-through text-muted-foreground/60" : "text-foreground/90"}`}>{t.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Extra tasks */}
          {!!project.extra_tasks.length && (
            <div className="glass-card p-5 space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Your tasks</p>
              {project.extra_tasks.map((t) => {
                const done = project.completed_tasks.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleTask(t.id)} className="w-full flex items-start gap-2.5 text-left group">
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      : <Circle className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan shrink-0 mt-0.5" />}
                    <span className={`text-xs ${done ? "line-through text-muted-foreground/60" : "text-foreground/90"}`}>{t.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Controls */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Add your own task…"
                className="flex-1 bg-transparent border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50"
              />
              <button onClick={addTask} className="glass-card px-3 py-2 text-xs flex items-center gap-1.5 hover:text-foreground text-muted-foreground">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Gauge className="w-3 h-3" /> Difficulty
              </span>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => d !== project.difficulty && generateBlueprint(d)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] transition-colors ${
                    d === project.difficulty ? "glass-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => generateBlueprint()}
                className="ml-auto glass-card px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate plan
              </button>
              <button
                onClick={onDelete}
                className="glass-card px-3 py-2 text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>

          {/* Quality breakdown */}
          {value > 0 && (
            <div className="glass-card p-5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Project value breakdown</p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {qualityBreakdown(project.quality).map((q) => (
                  <div key={q.label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">{q.label}</span>
                      <span className="text-foreground">{q.value}</span>
                    </div>
                    <MeterBar value={q.value} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!building && hasBlueprint && tab === "blueprint" && (
        <BlueprintView blueprint={project.blueprint as Blueprint} onLearn={onLearn} />
      )}

      {!building && hasBlueprint && tab === "assistant" && (
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-3">
            <p className="text-sm font-display text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-neon-cyan" /> Ask Project AI
            </p>
            <p className="text-xs text-muted-foreground">
              Grounded in this project's stack, architecture, schema and your current milestone.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                `How do I implement ${project.blueprint?.features?.mvp?.[0] || "the first MVP feature"}?`,
                `Why this tech stack for ${project.title}?`,
                "Explain this architecture",
                "What should I build next?",
              ].map((q) => (
                <button key={q} onClick={() => ask(q)} className="glass-card px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground">
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(question)}
                placeholder="Ask anything about this project…"
                className="flex-1 bg-transparent border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50"
              />
              <button onClick={() => ask(question)} disabled={asking} className="neon-btn !py-2 !px-4 text-xs disabled:opacity-50">
                {asking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {asking && <ThinkingState steps={["Reading your project context…", "Checking the architecture and schema…", "Writing a project-specific answer…"]} />}

          {answers.map((entry, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-3">
              <p className="text-xs text-neon-cyan">{entry.q}</p>
              <div className="prose prose-invert prose-sm max-w-none text-sm text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground">
                <ReactMarkdown>{entry.a.answer}</ReactMarkdown>
              </div>
              {entry.a.code && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{entry.a.codeLanguage}</span>
                    {entry.a.codeLocation && <span>· {entry.a.codeLocation}</span>}
                    <div className="ml-auto"><CopyButton value={entry.a.code} label="Copy code" /></div>
                  </div>
                  <pre className="rounded-xl bg-black/40 border border-border p-4 overflow-x-auto text-[11px] leading-relaxed text-foreground/85">
                    {entry.a.code}
                  </pre>
                </div>
              )}
              {!!entry.a.dependencies?.length && (
                <p className="text-[11px] text-muted-foreground">Dependencies: {entry.a.dependencies.join(", ")}</p>
              )}
              {!!entry.a.pitfalls?.length && (
                <ul className="text-[11px] text-amber-400/90 space-y-1">
                  {entry.a.pitfalls.map((p, j) => <li key={j}>⚠ {p}</li>)}
                </ul>
              )}
              {entry.a.nextStep && <p className="text-xs text-foreground/90">Next: {entry.a.nextStep}</p>}
            </motion.div>
          ))}
        </div>
      )}

      {!building && hasBlueprint && tab === "resume" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <p className="text-sm font-display text-foreground">Add to Resume</p>
            <p className="text-xs text-muted-foreground mt-1">
              {progress < 60
                ? `You're ${progress}% through this build. SkillNova drafts resume entries from work you've actually completed — keep building for a stronger entry.`
                : "Draft a truthful resume entry from the milestones and tasks you completed. No invented metrics."}
            </p>
            <button onClick={buildResume} disabled={genResume} className="neon-btn text-xs !py-2 mt-3 disabled:opacity-50">
              {genResume ? "Drafting…" : project.resume_entry ? "Regenerate entry" : "Generate resume entry"}
            </button>
          </div>

          {project.resume_entry && (
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-foreground">{project.resume_entry.title}</p>
                  <p className="text-xs text-muted-foreground">{project.resume_entry.oneLiner}</p>
                </div>
                <CopyButton
                  value={[
                    project.resume_entry.title,
                    project.resume_entry.oneLiner,
                    ...(project.resume_entry.bullets || []).map((b) => `• ${b}`),
                    `Technologies: ${(project.resume_entry.technologies || []).join(", ")}`,
                    project.resume_entry.impact,
                  ].join("\n")}
                  label="Copy entry"
                />
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {(project.resume_entry.bullets || []).map((b, i) => (
                  <li key={i} className="flex gap-2"><span className="text-neon-cyan">•</span>{b}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-1.5">
                {(project.resume_entry.technologies || []).map((t, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-[10px] glass-card">{t}</span>
                ))}
              </div>
              <p className="text-xs text-foreground/80">{project.resume_entry.impact}</p>
            </div>
          )}
        </div>
      )}

      {!building && hasBlueprint && tab === "interview" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <p className="text-sm font-display text-foreground">Project interview prep</p>
            <p className="text-xs text-muted-foreground mt-1">Questions generated from this project's real architecture and trade-offs.</p>
            <button onClick={buildInterview} disabled={genInterview} className="neon-btn text-xs !py-2 mt-3 disabled:opacity-50">
              {genInterview ? "Generating…" : project.interview_questions ? "Regenerate questions" : "Generate questions"}
            </button>
          </div>
          <div className="space-y-2">
            {(project.interview_questions || []).map((q, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-4">
                <span className="text-[10px] uppercase tracking-widest text-neon-purple">{q.category}</span>
                <p className="text-sm text-foreground mt-1">{q.question}</p>
                <p className="text-xs text-muted-foreground mt-1">{q.whatTheyWant}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceView;
