import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { CareerProfile } from "@/hooks/useCareerProfile";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  userId: string;
  userContext?: Partial<CareerProfile>;
}

interface LearningItem {
  title: string;
  topic: string | null;
  quiz_score: number | null;
  mastered: boolean;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor-chat`;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

/* ---------- contextual briefing, derived only from real state ---------- */
const buildBriefing = (p: Partial<CareerProfile>, recent: LearningItem[]) => {
  const readiness = p.readiness;
  const weakest = readiness?.weakest;
  const focus =
    p.missingSkills?.[0] ||
    (weakest ? `${weakest.name.toLowerCase()} depth` : null);

  const nextMilestone = (() => {
    if (!p.goal) return "Run a skill-gap analysis to unlock your roadmap";
    const done = p.completedMilestones?.length ?? 0;
    const stages = ["Learn", "Practice", "Build", "Deploy", "Portfolio", "Resume", "Interview", "Placement Ready"];
    return done >= stages.length ? "Roadmap complete — start applying" : `${stages[done]} stage milestone`;
  })();

  const fix = (() => {
    if (!p.goal) return "No career goal recorded yet";
    if ((p.projectsCount ?? 0) === 0) return "No projects yet — learning isn't visible without evidence";
    if (p.resumeScore == null) return "Resume never analysed — ATS gaps are unknown";
    if (p.interviewScore == null) return "No mock interview data yet";
    if (weakest) return `${weakest.name} is your weakest dimension (${weakest.score})`;
    return "Keep your streak alive — consistency drives readiness";
  })();

  const action = (() => {
    if (!p.goal) return "Open Analyze and set your target role";
    if ((p.knowledgePacks ?? 0) === 0) return "Create your first knowledge pack on your top skill gap";
    if ((p.projectsCount ?? 0) === 0) return "Generate and start one portfolio project";
    if (p.resumeScore == null) return "Upload your resume for an ATS score";
    if (p.interviewScore == null) return "Run one mock interview";
    return `Push ${weakest?.name ?? "your weakest area"} with one focused session today`;
  })();

  const last = recent[0];

  return { focus, nextMilestone, fix, action, last };
};

const buildQuickActions = (p: Partial<CareerProfile>) => {
  const out: string[] = [];
  if (!p.goal) out.push("Help me choose a career goal");
  else out.push("What should I learn today?");
  out.push("What's my biggest gap?");
  if ((p.projectsCount ?? 0) < 3) out.push("What project should I build next?");
  if (p.resumeScore == null) out.push("How do I improve my resume?");
  else out.push("Fix the weakest part of my resume");
  if (p.interviewScore == null) out.push("Prepare me for an interview");
  else out.push("Where am I weak in interviews?");
  out.push("Am I job-ready?");
  out.push("Plan my week");
  out.push("What should I stop doing?");
  return out.slice(0, 6);
};

const MentorPanel = ({ userId, userContext }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [recent, setRecent] = useState<LearningItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSent = useRef<string>("");

  useEffect(() => {
    let active = true;
    supabase
      .from("knowledge_items")
      .select("title,topic,quiz_score,mastered,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (active && data) setRecent(data as LearningItem[]);
      });
    return () => {
      active = false;
    };
  }, [userId, userContext?.knowledgePacks]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const p = userContext ?? {};
  const briefing = useMemo(() => buildBriefing(p, recent), [p, recent]);
  const quickActions = useMemo(() => buildQuickActions(p), [p]);

  const sendMessage = useCallback(
    async (text: string, history?: Msg[]) => {
      if (!text.trim() || isLoading) return;
      setFailed(null);
      lastSent.current = text.trim();

      const base = history ?? messages;
      const userMsg: Msg = { role: "user", content: text.trim() };
      const allMessages = [...base, userMsg];
      setMessages(allMessages);
      setInput("");
      setIsLoading(true);

      let assistantSoFar = "";

      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            userContext,
            recentLearning: recent,
          }),
        });

        if (!resp.ok || !resp.body) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || "Your mentor is temporarily unavailable. Try again.");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;

        const upsertAssistant = (chunk: string) => {
          assistantSoFar += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
            }
            return [...prev, { role: "assistant", content: assistantSoFar }];
          });
        };

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) upsertAssistant(content);
            } catch {
              /* ignore trailing partial */
            }
          }
        }

        if (!assistantSoFar.trim()) throw new Error("Your mentor is temporarily unavailable. Try again.");
      } catch (e: any) {
        console.error(e);
        const msg = e?.message?.startsWith("Your mentor") || e?.message?.includes("credits") || e?.message?.includes("busy")
          ? e.message
          : "Your mentor is temporarily unavailable. Try again.";
        setFailed(msg);
        toast.error(msg);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
          return prev;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, userContext, recent]
  );

  const retry = () => {
    // drop the failed user turn and resend it
    const idx = messages.map((m) => m.role).lastIndexOf("user");
    const history = idx >= 0 ? messages.slice(0, idx) : messages;
    setMessages(history);
    sendMessage(lastSent.current, history);
  };

  const readiness = p.readiness?.overall;

  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-5rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text">AI Career Mentor</h2>
          <p className="text-sm text-muted-foreground">
            Coaching grounded in your live SkillNova data — not generic advice.
          </p>
        </div>
        {/* Context chips */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          {p.goal && (
            <span className="px-2.5 py-1 rounded-full glass-card text-foreground/80">🎯 {p.goal}</span>
          )}
          {readiness != null && (
            <span className="px-2.5 py-1 rounded-full glass-card text-foreground/80">
              Readiness <span className="text-primary font-bold">{readiness}%</span>
            </span>
          )}
          {(p.streak ?? 0) > 0 && (
            <span className="px-2.5 py-1 rounded-full glass-card text-foreground/80">🔥 {p.streak}d</span>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Personalised briefing */}
            <div className="glass-card p-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{greeting()}</p>
                <h3 className="text-lg font-display font-bold text-foreground mt-1">
                  {p.goal ? `Here's where you stand for ${p.goal}` : "Let's set your career direction"}
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Current focus</p>
                  <p className="text-foreground mt-1">{briefing.focus ?? "Not enough data yet"}</p>
                </div>
                <div className="rounded-xl border border-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Career readiness</p>
                  <p className="text-foreground mt-1">
                    {readiness != null ? (
                      <span className="text-primary font-display font-bold text-xl">{readiness}%</span>
                    ) : (
                      "Not computed yet"
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">This week's priority</p>
                  <p className="text-foreground mt-1">{briefing.nextMilestone}</p>
                </div>
                <div className="rounded-xl border border-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">One thing to fix</p>
                  <p className="text-foreground mt-1">{briefing.fix}</p>
                </div>
              </div>

              {briefing.last && (
                <p className="text-xs text-muted-foreground">
                  Last studied: <span className="text-foreground/80">{briefing.last.title}</span>
                  {briefing.last.quiz_score != null && ` — quiz ${briefing.last.quiz_score}%`}
                </p>
              )}

              {/* Recommended action */}
              <div className="rounded-xl p-3 border border-primary/30 bg-primary/10">
                <p className="text-[11px] uppercase tracking-wider text-primary">Recommended action</p>
                <p className="text-sm text-foreground mt-1">{briefing.action}</p>
              </div>
            </div>

            {/* Contextual quick actions */}
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage(s)}
                  className="glass-card p-3 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all text-left"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary/20 text-foreground border border-primary/30"
                    : "glass-card text-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-2 text-sm leading-relaxed">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h3 className="font-display font-bold text-base text-foreground mt-3 first:mt-0">{children}</h3>
                        ),
                        h2: ({ children }) => (
                          <h3 className="font-display font-bold text-base text-foreground mt-3 first:mt-0">{children}</h3>
                        ),
                        h3: ({ children }) => (
                          <h4 className="font-display font-bold text-sm text-primary mt-3 first:mt-0 tracking-wide">
                            {children}
                          </h4>
                        ),
                        p: ({ children }) => <p className="text-foreground/90">{children}</p>,
                        strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 text-foreground/90">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 text-foreground/90">{children}</ol>,
                        code: ({ children }) => (
                          <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-primary">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="p-3 rounded-lg bg-black/40 border border-white/10 overflow-x-auto text-xs">
                            {children}
                          </pre>
                        ),
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-primary/50 pl-3 text-foreground/80">{children}</blockquote>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card max-w-[85%] px-4 py-3 space-y-2">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="h-2 rounded bg-white/5 w-3/4 animate-pulse" />
              <div className="h-2 rounded bg-white/5 w-1/2 animate-pulse" />
            </div>
          </motion.div>
        )}

        {failed && !isLoading && (
          <div className="glass-card border-destructive/30 p-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{failed}</p>
            <button
              onClick={retry}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-bold"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="glass-card p-3 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask your mentor about skills, projects, resume or interviews..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display font-bold text-xs disabled:opacity-40 transition-all"
        >
          Send
        </motion.button>
      </div>
    </div>
  );
};

export default MentorPanel;
