import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, Sparkles, Loader2, ChevronDown, Target, ShieldCheck, BookOpen,
  Hammer, Briefcase, AlertTriangle, ArrowRight, Bot, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useCareerBrain } from "@/hooks/useCareerBrain";
import { goToModule, matchJob } from "@/lib/careerBrain";
import {
  analyzeIdea, compareWithBrain, intelNextAction, intelErrorMessage,
  buildContext, setActiveProjectContext, setHandoff, startProjectFromIntel,
  type IdeaInput, type ProjectIntelligence, type IntelComparison, type GapRow,
} from "@/lib/projectIntel";

const EASE = [0.22, 1, 0.36, 1] as const;

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: EASE },
});

const Section = ({
  title, hint, children, defaultOpen = false,
}: { title: string; hint?: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 p-5 text-left">
        <div className="min-w-0">
          <p className="text-sm font-display font-semibold text-foreground">{title}</p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</p>}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Chip = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "good" | "warn" | "bad" }) => {
  const tones = {
    muted: "text-muted-foreground border-border/60",
    good: "text-emerald-400 border-emerald-400/30",
    warn: "text-amber-400 border-amber-400/30",
    bad: "text-destructive border-destructive/30",
  } as const;
  return <span className={`px-2.5 py-1 rounded-full border text-[11px] bg-muted/20 ${tones[tone]}`}>{children}</span>;
};

const priorityTone = (p: GapRow["priority"]): "bad" | "warn" | "muted" =>
  p === "High" ? "bad" : p === "Medium" ? "warn" : "muted";

const ProjectIntelPanel = ({ userId }: { userId: string }) => {
  const brain = useCareerBrain(userId);
  const [form, setForm] = useState<IdeaInput>({ idea: "" });
  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState<ProjectIntelligence | null>(null);
  const [starting, setStarting] = useState(false);
  const [jobId, setJobId] = useState<string>("");

  const targetRole = form.targetRole?.trim() || brain.profile.goal || "";

  const cmp: IntelComparison | null = useMemo(
    () => (intel ? compareWithBrain(intel, brain.evidence, brain.profile.missingSkills || []) : null),
    [intel, brain.evidence, brain.profile.missingSkills],
  );

  const next = useMemo(
    () => (intel && cmp ? intelNextAction(intel, cmp, brain.profile) : null),
    [intel, cmp, brain.profile],
  );

  const jobCompare = useMemo(() => {
    if (!intel || !jobId) return null;
    const job = brain.jobs.find((j) => j.id === jobId);
    if (!job?.requirements) return null;
    const projectEvidence = (intel.requiredSkills || []).map((s) => ({
      skill: s.skill,
      strength: 70,
      level: "Applied" as const,
      sources: [{ kind: "built" as const, detail: `planned in "${intel.title}"`, strength: 70 }],
    }));
    const merged = [...brain.evidence];
    projectEvidence.forEach((p) => {
      if (!merged.some((m) => m.skill.toLowerCase() === p.skill.toLowerCase())) merged.push(p);
    });
    return {
      job,
      now: matchJob(job.requirements, brain.evidence, {
        resumeScore: brain.profile.resumeScore,
        interviewScore: brain.profile.interviewScore,
        projectsCount: brain.projects.length,
      }),
      after: matchJob(job.requirements, merged, {
        resumeScore: brain.profile.resumeScore,
        interviewScore: brain.profile.interviewScore,
        projectsCount: brain.projects.length + 1,
      }),
    };
  }, [intel, jobId, brain.jobs, brain.evidence, brain.profile, brain.projects.length]);

  /* ------------------------------------------------------------ actions */

  const analyze = async () => {
    if (form.idea.trim().length < 12) {
      toast.error("Describe your idea in a full sentence so the AI has something real to analyse.");
      return;
    }
    setLoading(true);
    setError(null);
    setIntel(null);
    try {
      const result = await analyzeIdea(brain.profile, { ...form, targetRole });
      setIntel(result);
      const comparison = compareWithBrain(result, brain.evidence, brain.profile.missingSkills || []);
      const action = intelNextAction(result, comparison, brain.profile);
      setActiveProjectContext(buildContext(result, comparison, action, targetRole || "not set"));
    } catch (e: any) {
      setError(intelErrorMessage(e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const startProject = async () => {
    if (!intel || !cmp) return;
    setStarting(true);
    try {
      const { created } = await startProjectFromIntel(userId, intel, cmp, targetRole || "Not set");
      toast.success(created ? "Project created in Project Studio" : "Existing project updated in Project Studio");
      goToModule("projects");
    } catch (e: any) {
      toast.error(e?.message || "Could not start the project.");
    } finally {
      setStarting(false);
    }
  };

  const learnGap = (skill: string) => {
    setHandoff({ module: "knowledge", topic: skill, source: intel?.title });
    goToModule("knowledge");
  };

  const verifySkill = (skill: string) => {
    setHandoff({ module: "verify", skill, source: intel?.title });
    goToModule("verify");
  };

  /* --------------------------------------------------------------- view */

  return (
    <div className="max-w-4xl space-y-6 min-w-0">
      <motion.div {...rise()}>
        <h2 className="text-2xl font-display font-bold gradient-text flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-neon-purple" />
          Have a project idea?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Turn your idea into a project that strengthens your career — analysed against your Career Brain.
        </p>
      </motion.div>

      {/* ---------------------------------------------------------- input */}
      <motion.div {...rise(0.05)} className="glass-card p-5 md:p-6 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">What do you want to build?</label>
          <textarea
            value={form.idea}
            onChange={(e) => setForm({ ...form, idea: e.target.value })}
            rows={3}
            placeholder="I want to build an AI-powered campus bus tracking app."
            className="w-full bg-muted/30 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        <button
          onClick={() => setShowOptional(!showOptional)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`} />
          Optional details
        </button>

        <AnimatePresence initial={false}>
          {showOptional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                {([
                  ["targetRole", "Target role", brain.profile.goal || "e.g. Backend Engineer"],
                  ["deadline", "Deadline", "e.g. 6 weeks"],
                  ["hoursPerWeek", "Hours per week", "e.g. 8"],
                  ["preferredTech", "Preferred technology", "e.g. Python, React"],
                  ["stage", "Current stage", "e.g. Just an idea"],
                ] as const).map(([key, label, ph]) => (
                  <div key={key}>
                    <label className="block text-[11px] text-muted-foreground mb-1.5">{label}</label>
                    <input
                      value={(form as any)[key] || ""}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={ph}
                      className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button onClick={analyze} disabled={loading} className="neon-btn text-sm !py-2.5 flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Analyzing your idea…" : "Analyze project"}
          </button>
          {!brain.profile.goal && !form.targetRole && (
            <span className="text-[11px] text-amber-400">Tip: set a target role above — career relevance needs one.</span>
          )}
        </div>
      </motion.div>

      {/* ---------------------------------------------------------- error */}
      {error && (
        <motion.div {...rise()} className="glass-card p-5 border border-destructive/30 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{error}</p>
          </div>
          <button onClick={analyze} className="glass-card-hover px-3 py-1.5 text-xs flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </motion.div>
      )}

      {/* --------------------------------------------------------- result */}
      {intel && cmp && next && (
        <div className="space-y-4 min-w-0">
          {/* headline */}
          <motion.div {...rise(0.05)} className="glass-card p-6 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Project</p>
              <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mt-1 break-words">{intel.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{intel.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip>{intel.projectType}</Chip>
              <Chip>{intel.difficulty}</Chip>
              <Chip>{intel.estimatedEffort}</Chip>
              <Chip tone={cmp.coverage >= 60 ? "good" : cmp.coverage >= 30 ? "warn" : "bad"}>
                {cmp.coverage}% skill coverage
              </Chip>
            </div>
          </motion.div>

          {/* career relevance — visually dominant */}
          <motion.div {...rise(0.1)} className="glass-card p-6 space-y-3 border border-primary/20">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neon-purple" />
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Career relevance</p>
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <span
                className={`text-4xl font-display font-bold ${
                  intel.careerRelevance?.level === "High" ? "text-emerald-400" : intel.careerRelevance?.level === "Medium" ? "text-amber-400" : "text-muted-foreground"
                }`}
              >
                {intel.careerRelevance?.level || "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground">for {targetRole || "your target role (not set)"}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{intel.careerRelevance?.why}</p>
            {!!intel.careerRelevance?.strengthens?.length && (
              <div className="flex flex-wrap gap-2 pt-1">
                {intel.careerRelevance.strengthens.map((s) => <Chip key={s} tone="good">{s}</Chip>)}
              </div>
            )}
          </motion.div>

          {/* next best action */}
          <motion.div {...rise(0.15)} className="glass-card p-6 space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Next best action</p>
            <p className="text-lg font-display font-semibold text-foreground">{next.action}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{next.why}</p>
            <div className="flex flex-wrap gap-2">
              <Chip>{next.time}</Chip>
              {next.skill && <Chip>{next.skill}</Chip>}
              <Chip>Goal: {next.goal}</Chip>
            </div>
            <p className="text-xs text-muted-foreground">{next.impact}</p>
            {next.skill && (
              <button onClick={() => learnGap(next.skill!)} className="neon-btn text-xs !py-2 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" /> Learn this in Knowledge Engine
              </button>
            )}
          </motion.div>

          {/* your match */}
          <motion.div {...rise(0.2)}>
            <Section
              title="Your match"
              hint={`${cmp.matched.length} matched · ${cmp.partial.length} partial · ${cmp.gaps.filter((g) => g.strength === 0).length} missing`}
              defaultOpen
            >
              {cmp.matched.length === 0 && cmp.partial.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Your Career Brain has no recorded evidence for the skills this project needs yet. Everything below is a gap, not a weakness.
                </p>
              )}
              {[...cmp.matched, ...cmp.partial].map((r) => (
                <div key={r.skill} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/40 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{r.skill}</p>
                    <p className="text-[11px] text-muted-foreground break-words">{r.proof}</p>
                  </div>
                  <Chip tone={r.strength >= 68 ? "good" : "warn"}>{r.level}</Chip>
                </div>
              ))}
            </Section>
          </motion.div>

          {/* skill gaps */}
          <motion.div {...rise(0.25)}>
            <Section title="Skill gaps" hint="Ranked by project impact and career impact" defaultOpen>
              {cmp.gaps.length === 0 && <p className="text-sm text-muted-foreground">No gaps — you can start building today.</p>}
              {cmp.gaps.map((g) => (
                <div key={g.skill} className="p-4 rounded-lg bg-muted/15 border border-border/40 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{g.skill}</p>
                    <Chip tone={priorityTone(g.priority)}>{g.priority} priority</Chip>
                    <Chip>{g.level}</Chip>
                    {g.confidence !== "known" && <Chip>{g.confidence}</Chip>}
                  </div>
                  <p className="text-xs text-muted-foreground"><span className="text-foreground/80">Why:</span> {g.why}</p>
                  <p className="text-xs text-muted-foreground"><span className="text-foreground/80">Project impact:</span> {g.projectImpact}</p>
                  <p className="text-xs text-muted-foreground"><span className="text-foreground/80">Career impact:</span> {g.careerImpact}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => learnGap(g.skill)} className="glass-card-hover px-3 py-1.5 text-[11px] flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" /> Learn this
                    </button>
                    <button onClick={() => verifySkill(g.skill)} className="glass-card-hover px-3 py-1.5 text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3" /> Verify skill
                    </button>
                  </div>
                </div>
              ))}
            </Section>
          </motion.div>

          {/* stack */}
          <motion.div {...rise(0.3)}>
            <Section title="Recommended stack" hint={(intel.technologies || []).map((t) => t.tech).join(", ")}>
              {(intel.technologies || []).map((t) => (
                <div key={t.tech} className="py-2 border-b border-border/40 last:border-0">
                  <p className="text-sm text-foreground">{t.tech} <span className="text-[11px] text-muted-foreground">· {t.layer}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.why}</p>
                </div>
              ))}
            </Section>
          </motion.div>

          {/* roadmap */}
          <motion.div {...rise(0.35)}>
            <Section title="Build roadmap" hint={`${(intel.roadmap || []).length} phases`}>
              {(intel.roadmap || []).map((p, i) => (
                <div key={p.phase} className="relative pl-6 pb-4 last:pb-0">
                  <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-neon-purple" />
                  {i < (intel.roadmap.length - 1) && <span className="absolute left-[3px] top-4 bottom-0 w-px bg-border" />}
                  <p className="text-sm font-medium text-foreground">{p.phase}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.objective}</p>
                  <ul className="mt-2 space-y-1">
                    {(p.tasks || []).map((t) => (
                      <li key={t} className="text-xs text-muted-foreground flex gap-2"><span className="text-neon-cyan">·</span><span>{t}</span></li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-muted-foreground mt-2"><span className="text-foreground/80">Output:</span> {p.output}</p>
                  <p className="text-[11px] text-muted-foreground"><span className="text-foreground/80">Evidence:</span> {p.evidence}</p>
                </div>
              ))}
            </Section>
          </motion.div>

          {/* evidence */}
          <motion.div {...rise(0.4)}>
            <Section title="Evidence this project can prove" hint={`${(intel.evidence || []).length} artifacts`}>
              {(intel.evidence || []).map((e) => (
                <div key={e.artifact} className="flex flex-wrap items-start justify-between gap-2 py-2 border-b border-border/40 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{e.artifact}</p>
                    <p className="text-xs text-muted-foreground">{e.proves}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Not yet built</span>
                </div>
              ))}
              {!!intel.missingEvidence?.length && (
                <div className="pt-2">
                  <p className="text-xs text-amber-400 mb-1.5">Missing for {targetRole || "your target role"}:</p>
                  <ul className="space-y-1">
                    {intel.missingEvidence.map((m) => <li key={m} className="text-xs text-muted-foreground">· {m}</li>)}
                  </ul>
                </div>
              )}
              {!!intel.targetRoles?.length && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {intel.targetRoles.map((r) => <Chip key={r}>{r}</Chip>)}
                </div>
              )}
            </Section>
          </motion.div>

          {/* hiring comparison — deterministic, from saved jobs only */}
          <motion.div {...rise(0.45)}>
            <Section title="Compare with a target job" hint={brain.jobs.length ? `${brain.jobs.length} saved job${brain.jobs.length > 1 ? "s" : ""}` : "No jobs saved yet"}>
              {brain.jobs.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No job data in your Career Brain yet. Save a job in Hiring Intelligence and this project will be compared against its real requirements.
                  </p>
                  <button onClick={() => goToModule("hiring")} className="glass-card-hover px-3 py-1.5 text-xs flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" /> Open Hiring Intelligence
                  </button>
                </div>
              ) : (
                <>
                  <select
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Select a saved job…</option>
                    {brain.jobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.title}{j.company ? ` — ${j.company}` : ""}</option>
                    ))}
                  </select>

                  {jobCompare && (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-wrap gap-2">
                        <Chip>Now: {jobCompare.now.match}% match</Chip>
                        <Chip tone={jobCompare.after.match > jobCompare.now.match ? "good" : "muted"}>
                          After this project: {jobCompare.after.match}%
                        </Chip>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {([
                          ["Covered", jobCompare.after.strong, "good"],
                          ["Partial", jobCompare.after.partial, "warn"],
                          ["Missing", jobCompare.after.missing, "bad"],
                        ] as const).map(([label, rows, tone]) => (
                          <div key={label} className="p-3 rounded-lg bg-muted/15 border border-border/40">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {rows.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                              {rows.map((r) => <Chip key={r.skill} tone={tone}>{r.skill}</Chip>)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {jobCompare.after.missing.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Recommended improvement: extend the project to cover{" "}
                          <span className="text-foreground">{jobCompare.after.missing.slice(0, 3).map((r) => r.skill).join(", ")}</span> —
                          this role requires it and neither your evidence nor this project plan demonstrates it.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </Section>
          </motion.div>

          {/* assumptions */}
          {!!intel.assumptions?.length && (
            <motion.div {...rise(0.5)} className="glass-card p-5">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Assumptions made</p>
              <ul className="space-y-1">
                {intel.assumptions.map((a) => <li key={a} className="text-xs text-muted-foreground">· {a}</li>)}
              </ul>
            </motion.div>
          )}

          {/* actions */}
          <motion.div {...rise(0.55)} className="glass-card p-5 flex flex-wrap gap-3">
            <button onClick={startProject} disabled={starting} className="neon-btn text-sm !py-2.5 flex items-center gap-2 disabled:opacity-50">
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
              Start project in Studio
            </button>
            {cmp.gaps[0] && (
              <button onClick={() => learnGap(cmp.gaps[0].skill)} className="glass-card-hover px-4 py-2.5 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Learn top gap
              </button>
            )}
            {cmp.matched[0] && (
              <button onClick={() => verifySkill(cmp.matched[0].skill)} className="glass-card-hover px-4 py-2.5 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Verify a skill
              </button>
            )}
            <button onClick={() => goToModule("mentor")} className="glass-card-hover px-4 py-2.5 text-sm flex items-center gap-2">
              <Bot className="w-4 h-4" /> Ask the Mentor about this
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProjectIntelPanel;
