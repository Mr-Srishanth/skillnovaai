import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Briefcase, Trash2, Target, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCareerBrain, notifyBrainChange } from "@/hooks/useCareerBrain";
import { callCareerOS, matchJob, logCareerEvent, goToModule, type JobRequirements, type JobMatch } from "@/lib/careerBrain";
import { PanelHeader, ScoreRing, MeterBar, ThinkingState } from "./intelligence/IntelligenceUI";

const STEPS = [
  "Reading the job description...",
  "Extracting real requirements...",
  "Matching against your evidence table...",
  "Scoring job readiness...",
  "Building your closing plan...",
];

interface JobPlan {
  verdict: string;
  gaps: { skill: string; impact: string; why: string; currentEvidence: string; action: string; module: string }[];
  today: string;
  thisWeek: string;
  next: string;
  resumeAdvice: string;
  interviewFocus: string[];
}

const HiringPanel = ({ userId }: { userId: string }) => {
  const brain = useCareerBrain(userId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const analyze = async () => {
    if (text.trim().length < 80) {
      toast.error("Paste the full job description (at least a few lines).");
      return;
    }
    setBusy(true);
    try {
      const req = await callCareerOS<JobRequirements>("job-extract", { jobDescription: text.slice(0, 20000) }, brain.snapshot);
      const match: JobMatch = matchJob(req, brain.evidence, {
        resumeScore: brain.profile.resumeScore,
        interviewScore: brain.profile.interviewScore,
        projectsCount: brain.projects.length,
      });
      const plan = await callCareerOS<JobPlan>(
        "job-plan",
        { requirements: req, match: { match: match.match, readiness: match.readiness, verdict: match.verdict, rows: match.rows } },
        brain.snapshot,
      );

      const { data, error } = await supabase
        .from("career_jobs")
        .insert({
          user_id: userId,
          title: req.title || "Untitled role",
          company: req.company || null,
          description: text.slice(0, 20000),
          requirements: req as any,
          analysis: { match, plan } as any,
          match_score: match.match,
          job_readiness: match.readiness,
        })
        .select("id")
        .single();
      if (error) throw error;

      await logCareerEvent(userId, "job_tracked", `Analysed ${req.title || "a role"}`, match.readiness, { company: req.company });
      setText("");
      setOpenId(data.id);
      notifyBrainChange();
      await brain.reload();
      toast.success(`Job readiness: ${match.readiness}%`);
    } catch (e: any) {
      toast.error(e.message || "Job analysis failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("career_jobs").delete().eq("id", id);
    await brain.reload();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("career_jobs").update({ status, applied_at: status === "applied" ? new Date().toISOString() : null }).eq("id", id);
    await brain.reload();
    toast.success(`Marked as ${status}`);
  };

  return (
    <div>
      <PanelHeader
        title="Hiring Intelligence"
        subtitle="Paste any job description. SkillNova extracts the real requirements, matches them against your proven evidence and tells you exactly what stands between you and the offer."
      />

      <div className="glass-card p-5 mb-6 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste the full job description here..."
          className="w-full bg-muted/20 rounded-lg p-3 text-sm outline-none border border-border/50 focus:border-primary/50 resize-y"
        />
        <button
          onClick={analyze}
          disabled={busy}
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {busy ? "Analysing..." : "Analyse this job"}
        </button>
      </div>

      {busy && <ThinkingState steps={STEPS} />}

      <div className="space-y-4">
        {brain.jobs.map((job) => {
          const match = job.analysis?.match as JobMatch | undefined;
          const plan = job.analysis?.plan as JobPlan | undefined;
          const open = openId === job.id;
          return (
            <motion.div key={job.id} layout className="glass-card p-5">
              <div className="flex items-start gap-4">
                <ScoreRing score={job.job_readiness ?? 0} size={84} label="ready" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-foreground truncate">{job.title}</h3>
                  <p className="text-xs text-muted-foreground">{job.company || "Company not stated"} · match {job.match_score ?? 0}%</p>
                  {match && <p className="text-xs mt-1 text-primary">{match.verdict}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => setOpenId(open ? null : job.id)} className="text-xs px-3 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      {open ? "Hide details" : "View plan"}
                    </button>
                    <button onClick={() => setStatus(job.id, "applied")} className="text-xs px-3 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      Mark applied
                    </button>
                    <button onClick={() => remove(job.id)} className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {open && match && (
                <div className="mt-5 space-y-5 border-t border-border/50 pt-5">
                  {plan?.verdict && <p className="text-sm text-muted-foreground">{plan.verdict}</p>}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Requirement coverage</p>
                      {match.rows.slice(0, 10).map((r) => (
                        <div key={r.skill}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-foreground">{r.skill} <span className="text-muted-foreground">· {r.importance}</span></span>
                            <span className="text-muted-foreground">{r.level}</span>
                          </div>
                          <MeterBar value={r.strength} />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Ranked gaps</p>
                      {(plan?.gaps || []).map((g) => (
                        <div key={g.skill} className="rounded-lg bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">{g.skill}</span>
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary">{g.impact}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{g.why}</p>
                          <p className="text-xs text-muted-foreground/80 mt-1">Evidence: {g.currentEvidence}</p>
                          <button
                            onClick={() => goToModule(g.module, { skill: g.skill })}
                            className="mt-2 text-xs text-primary inline-flex items-center gap-1 hover:gap-2 transition-all"
                          >
                            {g.action} <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {plan && (
                    <div className="grid md:grid-cols-3 gap-3">
                      {[
                        { label: "Today", value: plan.today },
                        { label: "This week", value: plan.thisWeek },
                        { label: "Next", value: plan.next },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg bg-muted/20 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-primary mb-1">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {plan?.interviewFocus?.length ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      {plan.interviewFocus.map((f) => (
                        <span key={f} className="text-xs px-2 py-1 rounded-full bg-muted/30 text-muted-foreground">{f}</span>
                      ))}
                    </div>
                  ) : null}

                  {plan?.resumeAdvice && <p className="text-xs text-muted-foreground">Resume: {plan.resumeAdvice}</p>}
                </div>
              )}
            </motion.div>
          );
        })}

        {!brain.jobs.length && !busy && (
          <div className="glass-card p-10 text-center">
            <Briefcase className="w-8 h-8 mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">No jobs tracked yet. Paste a job description above to see your real readiness for it.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HiringPanel;
