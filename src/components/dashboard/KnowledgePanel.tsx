import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  BookOpen, Brain, FileText, Youtube, Type, Upload, Sparkles, Search,
  Download, Printer, Trash2, ScrollText, Network, HelpCircle, Layers, Zap, Clock, Target, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCareerProfile, bumpLocalCount } from "@/hooks/useCareerProfile";
import {
  downloadText, extractPdfText, generatePack, packToMarkdown,
  type KnowledgeItem, type KnowledgePack, type NoteStyle, type SourceType,
} from "@/lib/knowledge";
import { PanelHeader, ThinkingState, MeterBar, ScoreRing } from "./intelligence/IntelligenceUI";

const MindMapView = lazy(() => import("./knowledge/MindMapView"));
const QuizRunner = lazy(() => import("./knowledge/QuizRunner"));
const FlashcardDeck = lazy(() => import("./knowledge/FlashcardDeck"));

const SOURCES: { id: SourceType; label: string; icon: typeof Type }[] = [
  { id: "topic", label: "Topic", icon: Type },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "text", label: "Paste text", icon: ScrollText },
];

const STYLES: { id: NoteStyle; label: string }[] = [
  { id: "detailed", label: "Detailed" },
  { id: "short", label: "Short" },
  { id: "exam", label: "Exam" },
  { id: "revision", label: "Revision" },
  { id: "onepage", label: "One page" },
];

const OUTPUTS = [
  { id: "notes", label: "Smart Notes", icon: BookOpen },
  { id: "mindmap", label: "Mind Map", icon: Network },
  { id: "quiz", label: "Quiz", icon: HelpCircle },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "revision", label: "Revision Sheet", icon: Zap },
] as const;

type OutputTab = (typeof OUTPUTS)[number]["id"];

const THINKING = [
  "Reading and structuring the source…",
  "Extracting core concepts and keywords…",
  "Writing smart notes for your level…",
  "Building the concept map…",
  "Designing quiz questions and flashcards…",
  "Compressing everything into a revision sheet…",
];

const KnowledgePanel = ({ userId }: { userId: string }) => {
  const { profile } = useCareerProfile(userId);
  const [sourceType, setSourceType] = useState<SourceType>("topic");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [noteStyle, setNoteStyle] = useState<NoteStyle>("detailed");
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<KnowledgePack | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<OutputTab>("notes");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const loadLibrary = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("knowledge_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as unknown as KnowledgeItem[]) || []);
  }, [userId]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const stats = useMemo(() => {
    const scored = items.filter((i) => typeof i.quiz_score === "number");
    const avgQuiz = scored.length
      ? Math.round(scored.reduce((s, i) => s + (i.quiz_score || 0), 0) / scored.length)
      : 0;
    const flashcards = items.reduce((s, i) => s + (i.output?.flashcards?.length || 0), 0);
    const readingTime = items.reduce((s, i) => s + (i.reading_minutes || 0), 0);
    const mastered = items.filter((i) => i.mastered).length;
    const knowledgeScore = items.length
      ? Math.min(100, Math.round(items.length * 6 + avgQuiz * 0.5 + mastered * 4))
      : 0;
    return {
      topics: items.length,
      avgQuiz,
      flashcards,
      readingTime,
      mastered,
      knowledgeScore,
      completion: items.length ? Math.round((mastered / items.length) * 100) : 0,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const p = i.output || ({} as KnowledgePack);
      const hay = [
        i.title, i.topic, p.summary, p.notes,
        ...(p.keyTerms || []).map((k) => `${k.term} ${k.meaning}`),
        ...(p.flashcards || []).map((f) => `${f.question} ${f.answer}`),
        ...(p.quiz || []).map((x) => x.question),
        ...(p.mindMap?.branches || []).map((b) => `${b.label} ${b.children.join(" ")}`),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      toast.info("Reading PDF…");
      const extracted = await extractPdfText(file);
      if (extracted.length < 40) throw new Error("No readable text found in this PDF.");
      setText(extracted);
      toast.success(`Extracted ${extracted.length.toLocaleString()} characters`);
    } catch (e) {
      toast.error((e as Error).message);
      setFileName("");
    }
  };

  const generate = async () => {
    if (sourceType === "topic" && topic.trim().length < 3) return toast.error("Enter a topic to learn.");
    if (sourceType === "youtube" && !url.includes("youtu")) return toast.error("Enter a valid YouTube URL.");
    if (sourceType === "text" && text.trim().length < 40) return toast.error("Paste at least a paragraph of content.");
    if (sourceType === "pdf" && !text) return toast.error("Upload a PDF first.");

    setLoading(true);
    setPack(null);
    try {
      const result = await generatePack({
        sourceType,
        topic: topic.trim(),
        url: url.trim(),
        text,
        noteStyle,
        profile,
      });
      setPack(result);
      setTab("notes");

      const { data } = await supabase
        .from("knowledge_items")
        .insert({
          user_id: userId,
          title: result.title,
          topic: result.topic,
          source_type: sourceType,
          source_ref: sourceType === "pdf" ? fileName : url || topic,
          note_style: noteStyle,
          output: result as any,
          search_text: `${result.title} ${result.topic} ${result.summary}`,
          reading_minutes: Math.round(result.readingMinutes || 0),
        })
        .select("id")
        .single();

      setActiveId(data?.id ?? null);
      bumpLocalCount(userId, "knowledge");
      await supabase.rpc("add_xp", { _user_id: userId, _amount: 40 } as any).then(
        () => toast.success("Learning pack ready — +40 XP"),
        () => toast.success("Learning pack ready")
      );
      loadLibrary();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openItem = (item: KnowledgeItem) => {
    setPack(item.output);
    setActiveId(item.id);
    setTab("notes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeItem = async (id: string) => {
    await supabase.from("knowledge_items").delete().eq("id", id);
    if (activeId === id) { setPack(null); setActiveId(null); }
    loadLibrary();
    toast.success("Removed from library");
  };

  const saveQuizScore = async (score: number) => {
    if (!activeId) return;
    await supabase
      .from("knowledge_items")
      .update({ quiz_score: score, mastered: score >= 80 })
      .eq("id", activeId);
    loadLibrary();
    toast.success(score >= 80 ? `Mastered at ${score}% — readiness updated` : `Scored ${score}% — revise and retry`);
  };

  const doPrint = () => {
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(
      `<html><head><title>${pack?.title || "SkillNova Notes"}</title>
       <style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;line-height:1.65;color:#111}
       h1,h2,h3{font-family:Helvetica,Arial,sans-serif} code{background:#f2f2f2;padding:2px 4px}</style>
       </head><body>${html}</body></html>`
    );
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Knowledge Engine"
        subtitle="Turn any topic, PDF or video into smart notes, a mind map, a quiz, flashcards and a one-page revision sheet — tuned to your career goal."
      />

      {/* Knowledge dashboard */}
      <div className="grid gap-4 lg:grid-cols-[auto,1fr]">
        <div className="glass-card p-6 flex items-center gap-5">
          <ScoreRing score={stats.knowledgeScore} size={110} label="knowledge" />
          <div className="space-y-1">
            <p className="text-sm font-display font-bold text-foreground">Knowledge Score</p>
            <p className="text-xs text-muted-foreground max-w-[180px]">
              Grows with every topic you learn, quiz you pass and pack you master.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Topics covered", value: stats.topics, icon: BookOpen },
            { label: "Avg quiz score", value: `${stats.avgQuiz}%`, icon: Target },
            { label: "Flashcards", value: stats.flashcards, icon: Layers },
            { label: "Reading time", value: `${stats.readingTime}m`, icon: Clock },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 hover-lift"
            >
              <s.icon className="w-4 h-4 text-primary mb-2" />
              <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
          <div className="glass-card p-4 col-span-2 md:col-span-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Revision completion</span>
              <span className="text-foreground">{stats.mastered}/{stats.topics} mastered</span>
            </div>
            <MeterBar value={stats.completion} />
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => {
            const Icon = s.icon;
            const active = sourceType === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSourceType(s.id)}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all ${
                  active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {s.label}
              </button>
            );
          })}
        </div>

        {sourceType === "topic" && (
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Backpropagation in neural networks"
            className="w-full bg-muted/20 border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors"
          />
        )}

        {sourceType === "youtube" && (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full bg-muted/20 border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors"
          />
        )}

        {sourceType === "pdf" && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-border rounded-lg py-8 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors flex flex-col items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {fileName || "Upload a PDF (lecture slides, notes, papers)"}
            </button>
          </div>
        )}

        {sourceType === "text" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste lecture notes, an article, or any content…"
            className="w-full bg-muted/20 border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors resize-none"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Note style</span>
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setNoteStyle(s.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                noteStyle === s.id ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-opacity"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Building your learning pack…" : "Generate learning pack"}
        </button>
        {profile.goal && (
          <p className="text-[11px] text-muted-foreground text-center">
            Personalised for your goal: <span className="text-foreground">{profile.goal}</span>
          </p>
        )}
      </div>

      {loading && <ThinkingState steps={THINKING} />}

      {/* Output */}
      {pack && !loading && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-display font-bold text-foreground">{pack.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{pack.summary}</p>
                <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                  <span className="px-2 py-1 rounded-full bg-muted/30 text-muted-foreground">{pack.difficulty}</span>
                  <span className="px-2 py-1 rounded-full bg-muted/30 text-muted-foreground">{pack.readingMinutes} min read</span>
                  <span className="px-2 py-1 rounded-full bg-muted/30 text-muted-foreground">{pack.flashcards.length} flashcards</span>
                  <span className="px-2 py-1 rounded-full bg-muted/30 text-muted-foreground">{pack.quiz.length} questions</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadText(`${pack.topic || "skillnova"}-notes.md`, packToMarkdown(pack))}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg glass-card text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Markdown
                </button>
                <button
                  onClick={doPrint}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg glass-card text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
              </div>
            </div>
            {pack.careerLink && (
              <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3 flex gap-2">
                <Brain className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> {pack.careerLink}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {OUTPUTS.map((o) => {
              const Icon = o.icon;
              return (
                <button
                  key={o.id}
                  onClick={() => setTab(o.id)}
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all ${
                    tab === o.id ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {o.label}
                </button>
              );
            })}
          </div>

          <Suspense fallback={<div className="glass-card p-8 h-40 animate-pulse" />}>
            {tab === "notes" && (
              <div className="glass-card p-6">
                <div ref={printRef} className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-strong:text-foreground">
                  <ReactMarkdown>{pack.notes}</ReactMarkdown>
                  <h2>Key Terms</h2>
                  <ul>
                    {pack.keyTerms.map((k) => (
                      <li key={k.term}><strong>{k.term}</strong> — {k.meaning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {tab === "mindmap" && <MindMapView map={pack.mindMap} />}
            {tab === "quiz" && <QuizRunner quiz={pack.quiz} onFinish={saveQuizScore} />}
            {tab === "flashcards" && <FlashcardDeck cards={pack.flashcards} />}
            {tab === "revision" && (
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { title: "Must know", items: pack.revisionSheet.mustKnow },
                  { title: "Formulas & facts", items: pack.revisionSheet.formulasOrFacts },
                  { title: "Common mistakes", items: pack.revisionSheet.commonMistakes },
                  { title: "Exam & interview tips", items: pack.revisionSheet.examTips },
                ].map((block, i) => (
                  <motion.div
                    key={block.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass-card p-5"
                  >
                    <h4 className="text-sm font-display font-bold text-foreground mb-3">{block.title}</h4>
                    <ul className="space-y-2">
                      {block.items.map((s, j) => (
                        <li key={j} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            )}
          </Suspense>
        </motion.div>
      )}

      {/* Library + semantic-ish search */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across notes, flashcards, quizzes and mind maps…"
              className="w-full bg-muted/20 border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} packs</span>
        </div>

        {filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <BookOpen className="w-7 h-7 mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">
              {items.length ? "Nothing matches that search." : "Your knowledge library is empty — generate your first pack above."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="glass-card p-4 hover-lift group"
              >
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => openItem(item)} className="text-left flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 capitalize">
                      {item.source_type} · {item.note_style} notes
                    </p>
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                  {typeof item.quiz_score === "number" && <span>Quiz {item.quiz_score}%</span>}
                  {item.mastered && <span className="text-primary">Mastered</span>}
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgePanel;
