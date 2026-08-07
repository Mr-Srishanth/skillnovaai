import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, Send, RefreshCw, AlertCircle, CheckCircle, Info } from "lucide-react";
import { bumpLocalCount, localNumber, setLocalNumber } from "@/hooks/useCareerProfile";

interface Props {
  userId: string;
}

const questionBank: Record<string, string[]> = {
  "General": [
    "Tell me about yourself and your career journey.",
    "What is your greatest professional strength?",
    "Where do you see yourself in 5 years?",
    "Describe a challenging project you worked on.",
    "Why should we hire you over other candidates?",
  ],
  "Technical": [
    "Explain a complex technical concept to a non-technical person.",
    "How do you approach debugging a production issue?",
    "Describe your experience with system design.",
    "What's your approach to writing maintainable code?",
    "How do you stay updated with new technologies?",
  ],
  "Behavioral": [
    "Tell me about a time you failed and what you learned.",
    "Describe a conflict with a coworker and how you resolved it.",
    "Give an example of when you took initiative.",
    "How do you handle tight deadlines?",
    "Describe a time you had to learn something quickly.",
  ],
};

interface Feedback {
  confidence_score: number;
  clarity_score: number;
  strengths: string[];
  improvements: string[];
  revised_answer: string;
}

const ScoreMeter = ({ label, score }: { label: string; score: number }) => {
  const color = score < 40 ? "hsl(0,72%,51%)" : score < 70 ? "hsl(48,96%,53%)" : "hsl(142,71%,45%)";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-display font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ background: `linear-gradient(90deg, ${color}, hsl(186,94%,55%))` }}
        />
      </div>
    </div>
  );
};

const InterviewPanel = ({ userId }: Props) => {
  const [category, setCategory] = useState("General");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const pickRandom = (cat: string) => {
    const qs = questionBank[cat];
    const q = qs[Math.floor(Math.random() * qs.length)];
    setQuestion(q);
    setAnswer("");
    setFeedback(null);
  };

  const handleSubmit = async () => {
    if (!answer.trim() || !question) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mock-interview", {
        body: { question, answer, userId },
      });
      if (error) throw error;
      setFeedback(data);

      // Award XP
      await supabase.rpc("add_xp" as any, { _user_id: userId, _amount: 20 });
      bumpLocalCount(userId, "interviews");
      const attemptScore = Math.round(((data?.confidence_score ?? 0) + (data?.clarity_score ?? 0)) / 2);
      if (attemptScore > 0) {
        const prev = localNumber(userId, "interviewScore");
        // rolling average so one strong or weak answer doesn't swing readiness
        setLocalNumber(userId, "interviewScore", prev == null ? attemptScore : Math.round(prev * 0.6 + attemptScore * 0.4));
      }
      toast.success("You gained +20 XP! 🎯");
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold gradient-text">AI Mock Interview</h2>
        <p className="text-sm text-muted-foreground mt-1">Practice answers and get AI feedback on clarity & confidence.</p>
      </div>

      {/* Category selector */}
      <div className="flex gap-2 flex-wrap">
        {Object.keys(questionBank).map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); pickRandom(cat); }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              category === cat ? "neon-btn text-xs !px-4 !py-2" : "glass-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Question */}
      {!question && (
        <button onClick={() => pickRandom(category)} className="glass-card-hover card-shine p-6 w-full text-center">
          <Mic className="w-8 h-8 mx-auto text-neon-cyan mb-3" />
          <p className="text-sm text-muted-foreground">Click to get a {category} interview question</p>
        </button>
      )}

      <AnimatePresence mode="wait">
        {question && (
          <motion.div key={question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass-card p-5 mb-4">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Question</p>
              <p className="text-foreground font-medium">{question}</p>
            </div>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={5}
              className="w-full p-4 rounded-xl text-sm bg-background border border-border focus:border-neon-cyan/50 focus:outline-none transition-colors resize-none"
              style={{ boxShadow: answer ? '0 0 15px rgba(34,211,238,0.08)' : 'none' }}
            />

            <div className="flex gap-3 mt-3">
              <button onClick={handleSubmit} disabled={loading || !answer.trim()} className="neon-btn text-sm !px-6 !py-2.5 flex items-center gap-2 disabled:opacity-50">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "Analyzing..." : "Get Feedback"}
              </button>
              <button onClick={() => pickRandom(category)} className="glass-card px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card-hover p-5">
                <ScoreMeter label="Confidence" score={feedback.confidence_score} />
              </div>
              <div className="glass-card-hover p-5">
                <ScoreMeter label="Clarity" score={feedback.clarity_score} />
              </div>
            </div>

            <div className="glass-card-hover p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-xs font-medium text-green-400 uppercase tracking-wider">Strengths</p>
              </div>
              <ul className="space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                ))}
              </ul>
            </div>

            <div className="glass-card-hover p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <p className="text-xs font-medium text-yellow-400 uppercase tracking-wider">Improvements</p>
              </div>
              <ul className="space-y-1">
                {feedback.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                ))}
              </ul>
            </div>

            {feedback.revised_answer && (
              <div className="glass-card-hover p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-neon-cyan" />
                  <p className="text-xs font-medium text-neon-cyan uppercase tracking-wider">Suggested Answer</p>
                </div>
                <p className="text-sm text-muted-foreground">{feedback.revised_answer}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InterviewPanel;
