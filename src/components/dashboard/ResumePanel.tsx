import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { validateRole } from "@/lib/validation";

interface ATSResult {
  atsScore: number;
  verdict: "likely_rejected" | "needs_work" | "competitive" | "strong";
  verdictReason: string;
  strengths: string[];
  weaknesses: { issue: string; fix: string; severity: string }[];
  missingKeywords: string[];
  improvementPlan: string[];
}

const THINKING_STEPS = [
  "Extracting resume content...",
  "Scanning for ATS keywords...",
  "Evaluating structure and formatting...",
  "Generating improvement plan...",
];

const verdictStyles: Record<string, { label: string; color: string }> = {
  likely_rejected: { label: "Likely Rejected", color: "text-destructive" },
  needs_work: { label: "Needs Work", color: "text-yellow-400" },
  competitive: { label: "Competitive", color: "text-primary" },
  strong: { label: "Strong", color: "text-green-400" },
};

const severityStyles: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  major: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  minor: "bg-muted text-muted-foreground border-border",
};

const ResumePanel = ({ userId }: { userId: string }) => {
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [roleError, setRoleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [result, setResult] = useState<ATSResult | null>(null);

  const extractText = async (pdfFile: File): Promise<string> => {
    // Simple text extraction from PDF using browser
    const arrayBuffer = await pdfFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let text = "";
    
    // Basic text extraction: decode readable ASCII/UTF-8 portions
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const fullText = decoder.decode(bytes);
    
    // Extract text between BT/ET operators and parentheses
    const textMatches = fullText.match(/\(([^)]+)\)/g);
    if (textMatches) {
      text = textMatches
        .map((m) => m.slice(1, -1))
        .filter((t) => t.length > 1 && /[a-zA-Z]/.test(t))
        .join(" ");
    }
    
    // Fallback: extract readable strings
    if (text.length < 50) {
      const readable = fullText.match(/[a-zA-Z0-9@.\-_,;:!? ]{4,}/g);
      text = readable ? readable.join(" ") : "";
    }

    return text.slice(0, 5000);
  };

  const handleAnalyze = async () => {
    if (!file) { toast.error("Please upload a resume PDF"); return; }
    const rv = validateRole(targetRole);
    setRoleError(rv.valid ? "" : rv.error || "");
    if (!rv.valid) return;

    setLoading(true);
    setResult(null);
    setThinkingStep(0);

    const stepInterval = setInterval(() => {
      setThinkingStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1));
    }, 2000);

    try {
      const resumeText = await extractText(file);
      
      if (resumeText.length < 50) {
        toast.error("Could not extract enough text from this PDF. Try a text-based PDF (not scanned image).");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ resumeText, targetRole: targetRole.trim() }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      toast.success("Resume analysis complete!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Analysis failed");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text mb-2">
        Resume ATS Analyzer
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        Upload your resume and get brutal, honest ATS feedback powered by AI.
      </p>

      <div className="glass-card p-8 box-glow-purple space-y-6 mb-8">
        {/* File upload */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Upload Resume (PDF)</label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
            <div className="text-center">
              <span className="text-3xl">📄</span>
              <p className="text-sm text-muted-foreground mt-2">
                {file ? file.name : "Click to upload PDF"}
              </p>
              {file && <p className="text-xs text-muted-foreground/50">{(file.size / 1024).toFixed(0)} KB</p>}
            </div>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.type === "application/pdf") {
                  if (f.size > 5 * 1024 * 1024) {
                    toast.error("File too large. Max 5MB.");
                  } else {
                    setFile(f);
                  }
                } else {
                  toast.error("Please upload a PDF file");
                }
              }}
            />
          </label>
        </div>

        {/* Target role */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Target Role</label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => { setTargetRole(e.target.value); setRoleError(""); }}
            placeholder="e.g. Senior Frontend Developer"
            className={`w-full bg-muted/50 border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
              roleError ? "border-destructive focus:ring-destructive/50" : "border-border focus:ring-primary/50"
            }`}
          />
          {roleError && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive mt-2">{roleError}</motion.p>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAnalyze}
          disabled={loading || !file}
          className="w-full py-3.5 rounded-lg font-display font-bold bg-gradient-to-r from-accent to-primary text-primary-foreground disabled:opacity-40 transition-all"
        >
          {loading ? "Analyzing..." : "Analyze Resume"}
        </motion.button>
      </div>

      {/* Thinking */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-6 mb-8 text-center space-y-4">
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} className="w-3 h-3 rounded-full bg-accent" />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p key={thinkingStep} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-sm text-muted-foreground font-medium">
                {THINKING_STEPS[thinkingStep]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Score + Verdict */}
          <div className="glass-card p-8 box-glow-purple text-center">
            <p className="text-sm text-muted-foreground mb-2 font-medium uppercase tracking-wider">ATS Score</p>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className={`text-6xl font-display font-black ${
              result.atsScore < 40 ? "text-destructive" : result.atsScore < 65 ? "text-yellow-400" : "text-green-400"
            }`}>
              {result.atsScore}
            </motion.div>
            <Progress value={result.atsScore} className="h-2 max-w-xs mx-auto mt-4" />
            <div className={`mt-4 text-lg font-display font-bold ${verdictStyles[result.verdict]?.color || "text-foreground"}`}>
              {verdictStyles[result.verdict]?.label}
            </div>
            <p className="text-sm text-foreground/80 mt-2">{result.verdictReason}</p>
          </div>

          {/* Strengths */}
          <div className="glass-card p-6 box-glow-blue">
            <h4 className="text-lg font-display font-bold gradient-text mb-4">✅ Strengths</h4>
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <motion.li key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }} className="flex items-start gap-3 text-sm text-foreground/90">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="glass-card p-6 box-glow-purple">
            <h4 className="text-lg font-display font-bold gradient-text mb-4">⚠️ Weaknesses</h4>
            <div className="space-y-3">
              {result.weaknesses.map((w, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${severityStyles[w.severity]}`}>{w.severity}</span>
                    <span className="text-sm font-medium text-foreground">{w.issue}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-1">💡 {w.fix}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Missing Keywords */}
          <div className="glass-card p-6 box-glow-blue">
            <h4 className="text-lg font-display font-bold gradient-text mb-4">🔑 Missing Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {result.missingKeywords.map((kw, i) => (
                <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="px-3 py-1.5 text-xs rounded-full bg-destructive/15 text-destructive border border-destructive/25 font-medium">
                  {kw}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Improvement Plan */}
          <div className="glass-card p-6 box-glow-purple">
            <h4 className="text-lg font-display font-bold gradient-text mb-4">🎯 Improvement Plan</h4>
            <div className="relative pl-6 border-l-2 border-accent/30 space-y-4">
              {result.improvementPlan.map((step, j) => (
                <motion.div key={j} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: j * 0.1 }} className="relative">
                  <div className="absolute -left-[1.85rem] top-1 w-3 h-3 rounded-full bg-accent border-2 border-background" />
                  <p className="text-sm text-foreground/90">
                    <span className="text-accent font-display font-bold mr-1">{j + 1}.</span> {step}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ResumePanel;
