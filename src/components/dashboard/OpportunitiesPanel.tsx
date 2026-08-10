import { useState } from "react";
import { toast } from "sonner";
import { Compass, Bookmark, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCareerBrain } from "@/hooks/useCareerBrain";
import { callCareerOS, logCareerEvent } from "@/lib/careerBrain";
import { PanelHeader, ThinkingState, EmptyGoalState } from "./intelligence/IntelligenceUI";

const STEPS = ["Reading your goal and evidence...", "Scanning opportunity categories...", "Matching eligibility...", "Ranking by fit..."];

interface Opp {
  title: string;
  organization: string;
  kind: string;
  matchLevel: "high" | "medium" | "low";
  matchReason: string;
  requiredSkills: string[];
  missingSkills: string[];
  preparation: string[];
  eligibility: string;
  timing: string;
  link: string;
}

const LEVEL_SCORE = { high: 88, medium: 65, low: 42 } as const;

const OpportunitiesPanel = ({ userId }: { userId: string }) => {
  const brain = useCareerBrain(userId);
  const [items, setItems] = useState<Opp[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");

  const discover = async () => {
    setBusy(true);
    try {
      const res = await callCareerOS<{ items: Opp[] }>("opportunities", { region: brain.profile.region }, brain.snapshot);
      setItems(res.items || []);
      await logCareerEvent(userId, "opportunities", `Discovered ${res.items?.length ?? 0} opportunities`, res.items?.length ?? 0);
    } catch (e: any) {
      toast.error(e.message || "Discovery failed.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (o: Opp) => {
    await supabase.from("opportunities").insert({
      user_id: userId,
      title: o.title,
      organization: o.organization,
      kind: o.kind,
      match_score: LEVEL_SCORE[o.matchLevel] ?? 50,
      match_reason: o.matchReason,
      required_skills: o.requiredSkills as any,
      missing_skills: o.missingSkills as any,
      preparation: o.preparation as any,
      eligibility: o.eligibility,
      timing: o.timing,
      link: o.link || null,
      saved: true,
    });
    toast.success("Saved to your opportunities");
  };

  if (!brain.profile.goal)
    return <><PanelHeader title="Opportunity Intelligence" subtitle="Find what you can realistically apply to right now." /><EmptyGoalState what="opportunity matches" /></>;

  const kinds = ["all", ...Array.from(new Set(items.map((i) => i.kind)))];
  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);

  return (
    <div>
      <PanelHeader
        title="Opportunity Intelligence"
        subtitle="Internships, hackathons, open source and programmes matched to what you can prove — with the exact preparation each one needs."
        onRefresh={discover}
        refreshing={busy}
      />

      {!items.length && !busy && (
        <div className="glass-card p-10 text-center">
          <Compass className="w-8 h-8 mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Discover opportunities matched to your goal, region and current evidence.</p>
          <button onClick={discover} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Find opportunities</button>
        </div>
      )}

      {busy && <ThinkingState steps={STEPS} />}

      {items.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {kinds.map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === k ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {shown.map((o, i) => (
              <div key={`${o.title}-${i}`} className="glass-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-foreground">{o.title}</h3>
                    <p className="text-xs text-muted-foreground">{o.organization} · {o.kind}</p>
                  </div>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    o.matchLevel === "high" ? "bg-primary/20 text-primary" : o.matchLevel === "medium" ? "bg-muted/40 text-foreground" : "bg-muted/30 text-muted-foreground"
                  }`}>{o.matchLevel} match</span>
                </div>
                <p className="text-xs text-muted-foreground">{o.matchReason}</p>
                {o.missingSkills?.length > 0 && (
                  <p className="text-xs"><span className="text-primary">Missing:</span> <span className="text-muted-foreground">{o.missingSkills.join(", ")}</span></p>
                )}
                {o.preparation?.length > 0 && (
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">{o.preparation.map((p, x) => <li key={x}>{p}</li>)}</ul>
                )}
                <p className="text-[11px] text-muted-foreground/80">{o.eligibility} · {o.timing}</p>
                <div className="flex items-center gap-3 pt-1">
                  <button onClick={() => save(o)} className="text-xs text-primary inline-flex items-center gap-1"><Bookmark className="w-3 h-3" /> Save</button>
                  {o.link && (
                    <a href={o.link} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Official page
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default OpportunitiesPanel;
