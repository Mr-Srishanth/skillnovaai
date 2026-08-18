import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Hammer,
  Sparkles, Bot, Briefcase, ShieldQuestion,
} from "lucide-react";
import { useCareerBrain } from "@/hooks/useCareerBrain";
import { goToModule } from "@/lib/careerBrain";
import { setHandoff } from "@/lib/projectIntel";
import { buildCompanyFits, BAND_LABEL, type CompanyFit, type FitBand } from "@/lib/companyFit";
import { PanelHeader, MeterBar } from "./intelligence/IntelligenceUI";

const bandTone: Record<FitBand, string> = {
  strong: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  good: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10",
  improve: "text-amber-300 border-amber-300/30 bg-amber-300/10",
  unknown: "text-muted-foreground border-border bg-muted/20",
};

const Tag = ({ children, tone = "" }: { children: React.ReactNode; tone?: string }) => (
  <span className={`text-[11px] px-2 py-1 rounded-md border ${tone || "border-border bg-muted/20 text-muted-foreground"}`}>{children}</span>
);

const ActionButton = ({ icon: Icon, label, onClick }: { icon: typeof BookOpen; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg glass-card text-muted-foreground hover:text-foreground transition-colors"
  >
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);

const CompanyFitPanel = ({ userId }: { userId: string }) => {
  const brain = useCareerBrain(userId);
  const [role, setRole] = useState("all");
  const [band, setBand] = useState<"all" | FitBand>("all");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const fits = useMemo(
    () =>
      buildCompanyFits(brain.jobs, brain.evidence, {
        resumeScore: brain.profile.resumeScore,
        interviewScore: brain.profile.interviewScore,
        projectsCount: brain.projects.length,
      }),
    [brain.jobs, brain.evidence, brain.profile.resumeScore, brain.profile.interviewScore, brain.projects.length],
  );

  const roles = useMemo(() => {
    const set = new Set<string>();
    fits.forEach((f) => f.jobs.forEach((j) => j.title && set.add(j.title)));
    return Array.from(set).sort();
  }, [fits]);

  const visible = fits.filter(
    (f) => (role === "all" || f.jobs.some((j) => j.title === role)) && (band === "all" || f.band === band),
  );

  const openFit = openKey ? fits.find((f) => f.key === openKey) || null : null;

  const learn = (skill: string) => {
    setHandoff({ module: "knowledge", topic: skill, source: "company-fit" });
    goToModule("knowledge");
  };
  const verify = (skill: string) => {
    setHandoff({ module: "verify", skill, source: "company-fit" });
    goToModule("verify");
  };
  const buildEvidence = (fit: CompanyFit, skill: string) => {
    setHandoff({
      module: "projectintel",
      topic: `A project that demonstrates ${skill} for a ${fit.bestRole || "role"} at ${fit.company}`,
      source: "company-fit",
    });
    goToModule("projectintel");
  };
  const askMentor = (question: string) => {
    try {
      sessionStorage.setItem("skillnova:mentor:prefill", question);
    } catch {
      /* optional */
    }
    goToModule("mentor");
  };

  if (brain.loading) {
    return <div className="glass-card p-10 text-center text-sm text-muted-foreground">Reading your Career Brain…</div>;
  }

  /* ------------------------------------------------------------ empty state */
  if (!fits.length) {
    return (
      <div>
        <PanelHeader
          title="Company Fit Intelligence"
          subtitle="Discover companies where your current skills and career evidence create the strongest opportunities."
        />
        <div className="glass-card p-10 text-center">
          <Building2 className="w-8 h-8 mx-auto text-primary mb-3" />
          <h3 className="font-display font-bold text-foreground">Build your company map</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Save or explore verified job opportunities in Hiring Intelligence to see which companies match your current career profile.
          </p>
          <button
            onClick={() => goToModule("hiring")}
            className="mt-5 inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg glass-card text-foreground hover:text-primary transition-colors"
          >
            <Briefcase className="w-4 h-4" /> Open Hiring Intelligence
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------- detail view */
  if (openFit) {
    const topGaps = [...openFit.missing, ...openFit.partial].slice(0, 5);
    return (
      <div>
        <button
          onClick={() => setOpenKey(null)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All companies
        </button>

        <div className="glass-card p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text">{openFit.company}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {openFit.usableJobs > 0
                  ? `Derived from ${openFit.usableJobs} verified job record${openFit.usableJobs > 1 ? "s" : ""} you saved.`
                  : "No usable job requirement data saved for this company yet."}
              </p>
            </div>
            <div className="text-right">
              {openFit.score != null ? (
                <>
                  <p className="text-4xl md:text-5xl font-display font-black text-foreground">{openFit.score}%</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Your match</p>
                </>
              ) : (
                <Tag tone={bandTone.unknown}>Not enough verified job data</Tag>
              )}
            </div>
          </div>
          {openFit.score != null && <div className="mt-5"><MeterBar value={openFit.score} /></div>}
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-sm mb-4">Best matching opportunities</h3>
            <div className="space-y-4">
              {openFit.jobs.map((j) => (
                <div key={j.id} className="border-b border-border/50 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{j.title}</p>
                    {j.match ? (
                      <span className="text-sm font-display font-bold text-primary">{j.match.match}%</span>
                    ) : (
                      <Tag>Unavailable</Tag>
                    )}
                  </div>
                  {j.match ? (
                    <>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Tag tone={bandTone.strong}>Covered {j.match.strong.length}</Tag>
                        <Tag tone={bandTone.improve}>Partial {j.match.partial.length}</Tag>
                        <Tag tone="text-rose-300 border-rose-300/30 bg-rose-300/10">Missing {j.match.missing.length}</Tag>
                      </div>
                      {(j.match.missing[0] || j.match.partial[0]) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Recommended: strengthen{" "}
                          <span className="text-foreground">{(j.match.missing[0] || j.match.partial[0]).skill}</span> to raise this match.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">This saved record has no extracted requirements.</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-sm mb-3">Why this company fits you</h3>
              {openFit.strong.length ? (
                <div className="space-y-2">
                  {openFit.strong.slice(0, 6).map((r) => (
                    <div key={r.skill} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{r.skill}</span>
                      <Tag tone={bandTone.strong}>{r.level}</Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No requirement is backed by strong evidence yet.</p>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-sm mb-3">What's holding you back</h3>
              {topGaps.length ? (
                <div className="space-y-3">
                  {topGaps.map((r) => (
                    <div key={r.skill} className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{r.skill}</span>
                        <Tag tone={r.strength === 0 ? "text-rose-300 border-rose-300/30 bg-rose-300/10" : bandTone.improve}>
                          {r.strength === 0 ? "Missing" : r.level}
                        </Tag>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ActionButton icon={BookOpen} label="Learn this" onClick={() => learn(r.skill)} />
                        {r.strength > 0 && <ActionButton icon={BadgeCheck} label="Verify skill" onClick={() => verify(r.skill)} />}
                        <ActionButton icon={Sparkles} label="Build evidence" onClick={() => buildEvidence(openFit, r.skill)} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No blocking gaps detected in the saved requirements.</p>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-sm mb-3">What to do next</h3>
              <p className="text-sm text-muted-foreground">
                {openFit.recommendedAction || "Save a job with extracted requirements for this company in Hiring Intelligence."}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <ActionButton icon={Hammer} label="Start project" onClick={() => goToModule("projects")} />
                <ActionButton
                  icon={Bot}
                  label="Ask AI Mentor"
                  onClick={() =>
                    askMentor(
                      openFit.score != null
                        ? `Why is my match for ${openFit.company} only ${openFit.score}%, and how do I become competitive?`
                        : `How can I build a competitive profile for ${openFit.company}?`,
                    )
                  }
                />
                <ActionButton icon={Briefcase} label="Hiring Intelligence" onClick={() => goToModule("hiring")} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- list view */
  return (
    <div>
      <PanelHeader
        title="Company Fit Intelligence"
        subtitle="Discover companies where your current skills and career evidence create the strongest opportunities."
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="text-xs bg-muted/20 border border-border rounded-lg px-3 py-2 text-foreground"
        >
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {(["all", "strong", "good", "improve"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBand(b)}
            className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
              band === b ? "border-primary/40 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {b === "all" ? "All" : BAND_LABEL[b]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visible.map((f, i) => (
          <motion.button
            key={f.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setOpenKey(f.key)}
            className="w-full text-left glass-card p-5 md:p-6 hover:border-primary/30 transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <h3 className="font-display font-bold text-foreground truncate">{f.company}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {f.bestRole ? <>Best matching role: <span className="text-foreground">{f.bestRole}</span></> : "No usable role requirements"}
                </p>
              </div>
              <div className="text-right shrink-0">
                {f.score != null ? (
                  <>
                    <p className="text-3xl font-display font-black text-foreground">{f.score}%</p>
                    <Tag tone={bandTone[f.band]}>{BAND_LABEL[f.band]}</Tag>
                  </>
                ) : (
                  <Tag tone={bandTone.unknown}>
                    <span className="inline-flex items-center gap-1">
                      <ShieldQuestion className="w-3 h-3" /> Not enough verified job data
                    </span>
                  </Tag>
                )}
              </div>
            </div>

            {f.score != null && (
              <>
                <div className="mt-4"><MeterBar value={f.score} /></div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Why you match</p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.strong.slice(0, 4).map((r) => (
                        <Tag key={r.skill} tone={bandTone.strong}>{r.skill} — {r.level}</Tag>
                      ))}
                      {!f.strong.length && <span className="text-xs text-muted-foreground">No strong evidence yet</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Top gap</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[...f.missing, ...f.partial].slice(0, 3).map((r) => (
                        <Tag key={r.skill} tone={r.strength === 0 ? "text-rose-300 border-rose-300/30 bg-rose-300/10" : bandTone.improve}>
                          {r.skill} — {r.strength === 0 ? "Missing" : r.level}
                        </Tag>
                      ))}
                      {![...f.missing, ...f.partial].length && <span className="text-xs text-muted-foreground">No blocking gaps</span>}
                    </div>
                  </div>
                </div>
                {f.recommendedAction && (
                  <p className="text-xs text-muted-foreground mt-4 flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                    {f.recommendedAction}
                  </p>
                )}
              </>
            )}
          </motion.button>
        ))}
        {!visible.length && (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">No companies match these filters.</div>
        )}
      </div>
    </div>
  );
};

export default CompanyFitPanel;
