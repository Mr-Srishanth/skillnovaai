import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, RotateCcw } from "lucide-react";
import type { KnowledgePack } from "@/lib/knowledge";

const diffColor: Record<string, string> = {
  easy: "text-primary",
  medium: "text-accent",
  hard: "text-destructive",
};

const QuizRunner = ({
  quiz,
  onFinish,
}: {
  quiz: KnowledgePack["quiz"];
  onFinish?: (scorePercent: number) => void;
}) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const correct = quiz.filter((q, i) => answers[i] === q.answerIndex).length;
  const score = quiz.length ? Math.round((correct / quiz.length) * 100) : 0;

  const submit = () => {
    setSubmitted(true);
    onFinish?.(score);
  };

  return (
    <div className="space-y-4">
      {submitted && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Your score</p>
            <p className="text-3xl font-display font-bold gradient-text">{score}%</p>
            <p className="text-xs text-muted-foreground mt-1">{correct} of {quiz.length} correct</p>
          </div>
          <button
            onClick={() => { setAnswers({}); setSubmitted(false); }}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg glass-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retake
          </button>
        </motion.div>
      )}

      {quiz.map((q, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="glass-card p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
            <span className={`text-[10px] uppercase tracking-wide shrink-0 ${diffColor[q.difficulty] || ""}`}>{q.difficulty}</span>
          </div>
          <div className="space-y-2">
            {q.options.map((opt, j) => {
              const chosen = answers[i] === j;
              const isRight = j === q.answerIndex;
              const state = submitted
                ? isRight
                  ? "border-primary/60 bg-primary/10"
                  : chosen
                  ? "border-destructive/60 bg-destructive/10"
                  : "border-border"
                : chosen
                ? "border-primary/60 bg-primary/10"
                : "border-border hover:border-primary/40";
              return (
                <button
                  key={j}
                  disabled={submitted}
                  onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${state}`}
                >
                  <span className="text-xs text-muted-foreground w-4">{String.fromCharCode(65 + j)}</span>
                  <span className="flex-1">{opt}</span>
                  {submitted && isRight && <Check className="w-4 h-4 text-primary" />}
                  {submitted && chosen && !isRight && <X className="w-4 h-4 text-destructive" />}
                </button>
              );
            })}
          </div>
          {submitted && (
            <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-3">{q.explanation}</p>
          )}
        </motion.div>
      ))}

      {!submitted && (
        <button
          onClick={submit}
          disabled={Object.keys(answers).length < quiz.length}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          Submit answers ({Object.keys(answers).length}/{quiz.length})
        </button>
      )}
    </div>
  );
};

export default QuizRunner;
