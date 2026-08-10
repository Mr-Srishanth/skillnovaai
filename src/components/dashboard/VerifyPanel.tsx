import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCareerBrain, notifyBrainChange } from "@/hooks/useCareerBrain";
import { callCareerOS, logCareerEvent, goToModule } from "@/lib/careerBrain";
import { PanelHeader, ScoreRing, MeterBar, ThinkingState } from "./intelligence/IntelligenceUI";

const STEPS = ["Designing an assessment for this skill...", "Balancing concepts, code and debugging...", "Calibrating difficulty to your level..."];
const GRADE_STEPS = ["Reading your answers...", "Scoring each dimension...", "Deciding your verified level..."];

interface Question {
  id: string;
  dimension: string;
  type: string;
  difficulty: string;
  prompt: string;
  code: string;
  options: string[];
  answerIndex: number;
  expected: string;
}
interface Assessment { skill: string; dimensions: string[]; questions: Question[] }
interface Result {
  dimensionScores: { dimension: string; score: number; comment: string }[];
  overall: number;
  verifiedLevel: string;
  whatWasTested: string[];
  evidence: string[];
  weakAreas: string[];
  nextRecommendation: string;
  nextTopic: string;
}

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const VerifyPanel = ({ userId }: { userId: string }) => {
  const brain = useCareerBrain(userId);
  const [skill, setSkill] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState<"generate" | "grade" | null>(null);

  const suggestions = brain.evidence.slice(0, 8).map((e) => e.skill);

  const start = async (chosen?: string) => {
    const s = (chosen || skill).trim();
    if (s.length < 2) return toast.error("Enter the skill you want to verify.");
    setLoading("generate");
    setResult(null);
    setAnswers({});
    setAssessment(null);
    try {
      const a = await callCareerOS<Assessment>("verify-generate", { skill: s, claimedLevel: level }, brain.snapshot);
      setSkill(s);
      setAssessment(a);
    } catch (e: any) {
      toast.error(e.message || "Could not build the assessment.");
    } finally {
      setLoading(null);
    }
  };

  const submit = async () => {
    if (!assessment) return;
    const answered = assessment.questions.filter((q) => (answers[q.id] || "").trim().length > 0).length;
    if (answered < Math.ceil(assessment.questions.length / 2)) {
      return toast.error("Answer at least half the questions for a fair verification.");
    }
    setLoading("grade");
    try {
      const graded = await callCareerOS<Result>(
        "verify-grade",
        {
          skill: assessment.skill,
          claimedLevel: level,
          questions: assessment.questions.map((q) => ({ id: q.id, dimension: q.dimension, prompt: q.prompt, expected: q.expected, options: q.options, answerIndex: q.answerIndex })),
          answers: assessment.questions.map((q) => ({ id: q.id, answer: answers[q.id] || "" })),
        },
        brain.snapshot,
      );
      setResult(graded);
      await supabase.from("skill_verifications").insert({
        user_id: userId,
        skill: assessment.skill,
        claimed_level: level,
        assessment: assessment as any,
        answers: Object.entries(answers).map(([id, answer]) => ({ id, answer })) as any,
        result: graded as any,
        verified_level: graded.verifiedLevel,
        score: Math.round(graded.overall),
        status: "completed",
      });
      await logCareerEvent(userId, "skill_verified", `Verified ${assessment.skill}`, Math.round(graded.overall), { level: graded.verifiedLevel });
      notifyBrainChange();
      await brain.reload();
      toast.success(`${assessment.skill}: ${graded.verifiedLevel}`);
    } catch (e: any) {
      toast.error(e.message || "Grading failed.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <PanelHeader
        title="Skill Verification"
        subtitle="Claimed skills carry no weight. Take an adaptive assessment and turn a claim into proven evidence that every other module can use."
      />

      <div className="glass-card p-5 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="Skill to verify (e.g. React, SQL, Python)"
            className="flex-1 bg-muted/20 rounded-lg px-3 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50"
          />
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="bg-muted/20 rounded-lg px-3 py-2.5 text-sm border border-border/50 outline-none">
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={() => start()} disabled={!!loading} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {loading === "generate" ? "Building..." : "Start assessment"}
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => start(s)} className="text-xs px-2.5 py-1 rounded-full bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading === "generate" && <ThinkingState steps={STEPS} />}
      {loading === "grade" && <ThinkingState steps={GRADE_STEPS} />}

      {assessment && !result && !loading && (
        <div className="space-y-4">
          {assessment.questions.map((q, i) => (
            <div key={q.id} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span className="text-primary">Q{i + 1}</span> · {q.dimension} · {q.type} · {q.difficulty}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{q.prompt}</p>
              {q.code && <pre className="mt-3 text-xs bg-muted/30 rounded-lg p-3 overflow-x-auto">{q.code}</pre>}
              {q.options?.length === 4 ? (
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(idx) }))}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                        answers[q.id] === String(idx) ? "border-primary bg-primary/10 text-foreground" : "border-border/50 bg-muted/10 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={3}
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Your answer..."
                  className="mt-3 w-full bg-muted/20 rounded-lg p-3 text-sm outline-none border border-border/50 focus:border-primary/50"
                />
              )}
            </div>
          ))}
          <button onClick={submit} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Submit for verification
          </button>
        </div>
      )}

      {result && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-5">
            <ScoreRing score={Math.round(result.overall)} size={110} label="score" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Verified level</p>
              <h3 className="text-2xl font-display font-bold gradient-text">{result.verifiedLevel}</h3>
              <p className="text-sm text-muted-foreground mt-1">{skill}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {result.dimensionScores.map((d) => (
                <div key={d.dimension}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">{d.dimension}</span>
                    <span className="text-muted-foreground">{Math.round(d.score)}%</span>
                  </div>
                  <MeterBar value={d.score} />
                  <p className="text-[11px] text-muted-foreground mt-1">{d.comment}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {result.evidence?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">What you proved</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">{result.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              {result.weakAreas?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Weak areas</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">{result.weakAreas.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-muted/20 p-3">
            <p className="text-sm text-foreground">{result.nextRecommendation}</p>
            {result.nextTopic && (
              <button onClick={() => goToModule("knowledge", { topic: result.nextTopic })} className="mt-2 text-xs text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
                Study {result.nextTopic} <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <button onClick={() => { setResult(null); setAssessment(null); }} className="text-xs text-muted-foreground hover:text-foreground">
            Verify another skill
          </button>
        </div>
      )}

      {!assessment && !result && !loading && brain.verifications.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Verified so far</p>
          <div className="space-y-2">
            {brain.verifications.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-foreground"><BadgeCheck className="w-4 h-4 text-primary" /> {v.skill}</span>
                <span className="text-xs text-muted-foreground">{v.verified_level || v.status} · {v.score ?? 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyPanel;
