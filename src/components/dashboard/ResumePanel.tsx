import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { validateRole } from "@/lib/validation";
import { bumpLocalCount, setLocalNumber } from "@/hooks/useCareerProfile";

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
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [extractionNote, setExtractionNote] = useState("");

  /** Real PDF parsing via pdf.js, with accurate diagnosis when it fails. */
  const extractText = async (pdfFile: File): Promise<string> => {
    const buffer = await pdfFile.arrayBuffer();
    const pdfjs: any = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    let doc: any;
    try {
      doc = await pdfjs.getDocument({ data: buffer }).promise;
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "PasswordException") {
        throw new Error("This PDF is password protected. Remove the password, or paste your resume text instead.");
      }
      if (name === "InvalidPDFException") {
        throw new Error("This file isn't a readable PDF — it may be damaged. Re-export it from your editor, or paste your resume text.");
      }
      throw new Error("We couldn't open this PDF. Try re-exporting it, or paste your resume text instead.");
    }

    const maxPages = Math.min(doc.numPages, 10);
    let text = "";
    let imageOnlyPages = 0;

    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => it.str).join(" ").trim();
      if (pageText.replace(/\s/g, "").length < 20) imageOnlyPages++;
      text += pageText + "\n";
    }

    const clean = text.replace(/\s+/g, " ").trim();

    if (clean.length < 50) {
      if (imageOnlyPages === maxPages) {
        throw new Error("This looks like a scanned or image-only PDF — there's no selectable text to read. Paste your resume text below and we'll analyse it instantly.");
      }
      throw new Error("We could only read a few characters from this PDF (it may be metadata-only). Paste your resume text below instead.");
    }

    setExtractionNote(`Read ${clean.length.toLocaleString()} characters across ${maxPages} page${maxPages > 1 ? "s" : ""}.`);
    return clean.slice(0, 8000);
  };

  const handleAnalyze = async () => {
    const rv = validateRole(targetRole);
    setRoleError(rv.valid ? "" : rv.error || "");
    if (!rv.valid) return;

    if (pasteMode) {
      if (pastedText.trim().length < 200) {
        toast.error("Paste at least a few hundred characters of your resume.");
        return;
      }
    } else if (!file) {
      toast.error("Please upload a resume PDF");
      return;
    }

    setLoading(true);
    setResult(null);
    setThinkingStep(0);
    setExtractionNote("");

    const stepInterval = setInterval(() => {
      setThinkingStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1));
    }, 2000);

    try {
      const resumeText = pasteMode ? pastedText.trim().slice(0, 8000) : await extractText(file!);


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
      bumpLocalCount(userId, "resumes");
      if (typeof data.atsScore === "number") setLocalNumber(userId, "resumeScore", data.atsScore);
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
        {/* Source toggle */}
        <div className="flex gap-2">
          {[
            { key: false, label: "Upload PDF" },
            { key: true, label: "Paste text" },
          ].map((opt) => (
            <button
              key={String(opt.key)}
              onClick={() => setPasteMode(opt.key)}
              className={`px-4 py-2 rounded-lg text-xs font-display font-bold border transition-colors ${
                pasteMode === opt.key
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {!pasteMode ? (
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
                  setExtractionNote("");
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
            <p className="text-[11px] text-muted-foreground mt-2">
              Text-based PDFs are read directly. Scanned or password-protected files can be pasted as text instead.
            </p>
            {extractionNote && <p className="text-[11px] text-green-400 mt-1">{extractionNote}</p>}
          </div>
        ) : (
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Paste your resume text</label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={10}
              placeholder="Paste the full text of your resume here..."
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y"
            />
            <p className="text-[11px] text-muted-foreground mt-1">{pastedText.trim().length.toLocaleString()} characters</p>
          </div>
        )}


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
          disabled={loading || (pasteMode ? pastedText.trim().length < 200 : !file)}
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
