import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCareerBrain } from "@/hooks/useCareerBrain";
import { callCareerOS, logCareerEvent } from "@/lib/careerBrain";
import { PanelHeader, MeterBar, ThinkingState, EmptyGoalState } from "./intelligence/IntelligenceUI";

const STEPS = ["Reading your evidence...", "Mapping transferable skills...", "Estimating effort per path...", "Comparing trajectories..."];

interface SimPath {
  role: string;
  currentFit: number;
  fitReason: string;
  transferableSkills: string[];
  skillGaps: string[];
  requiredSkills: string[];
  requiredProjects: string[];
  effort: string;
  potentialRoles: string[];
  opportunityLandscape: string;
  risk: string;
}
interface SimResult { assumptions: string[]; paths: SimPath[]; scenarioImpact: string; recommendation: string }

const PathSimulatorPanel = ({ userId }: { userId: string }) => {
  const brain = useCareerBrain(userId);
  const [roles, setRoles] = useState("");
  const [scenario, setScenario] = useState("");
  const [result, setResult] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const list = roles.split(/[,\n]/).map((r) => r.trim()).filter(Boolean);
    if (list.length < 1) return toast.error("Enter at least one path to simulate.");
    setBusy(true);
    try {
      const res = await callCareerOS<SimResult>("simulate", { baseRole: brain.profile.goal, roles: list, scenario }, brain.snapshot);
      setResult(res);
      await supabase.from("career_simulations").insert({
        user_id: userId,
        base_role: brain.profile.goal,
        scenario,
        roles: list as any,
        result: res as any,
      });
      await logCareerEvent(userId, "simulation", `Simulated ${list.join(" vs ")}`, null, { scenario });
    } catch (e: any) {
      toast.error(e.message || "Simulation failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!brain.profile.goal) return <><PanelHeader title="Career Path Simulator" subtitle="Compare real alternative paths using your own evidence." /><EmptyGoalState what="path simulations" /></>;

  return (
    <div>
      <PanelHeader
        title="Career Path Simulator"
        subtitle="Compare where different paths would take you — scored against the skills you can actually prove today."
      />

      <div className="glass-card p-5 mb-6 space-y-3">
        <input
          value={roles}
          onChange={(e) => setRoles(e.target.value)}
          placeholder="Paths to compare, comma separated (e.g. Backend Engineer, ML Engineer, Data Analyst)"
          className="w-full bg-muted/20 rounded-lg px-3 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50"
        />
        <input
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="Optional what-if (e.g. What if I only study 1 hour a day for 6 months?)"
          className="w-full bg-muted/20 rounded-lg px-3 py-2.5 text-sm outline-none border border-border/50 focus:border-primary/50"
        />
        <button onClick={run} disabled={busy} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          {busy ? "Simulating..." : "Run simulation"}
        </button>
      </div>

      {busy && <ThinkingState steps={STEPS} />}

      {result && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {result.paths.map((p) => (
              <div key={p.role} className="glass-card p-5 space-y-3">
                <div>
                  <h3 className="font-display font-bold text-foreground">{p.role}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1"><MeterBar value={p.currentFit} /></div>
                    <span className="text-xs text-muted-foreground">{p.currentFit}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{p.fitReason}</p>
                </div>
                <div className="text-xs space-y-2">
                  <p><span className="text-primary">Transfers:</span> <span className="text-muted-foreground">{p.transferableSkills.join(", ") || "—"}</span></p>
                  <p><span className="text-primary">Gaps:</span> <span className="text-muted-foreground">{p.skillGaps.join(", ") || "—"}</span></p>
                  <p><span className="text-primary">Effort:</span> <span className="text-muted-foreground">{p.effort}</span></p>
                  <p><span className="text-primary">Roles:</span> <span className="text-muted-foreground">{p.potentialRoles.join(", ")}</span></p>
                  <p><span className="text-primary">Market:</span> <span className="text-muted-foreground">{p.opportunityLandscape}</span></p>
                  <p><span className="text-primary">Risk:</span> <span className="text-muted-foreground">{p.risk}</span></p>
                </div>
              </div>
            ))}
          </div>

          {result.scenarioImpact && (
            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-wide text-primary mb-1">Scenario impact</p>
              <p className="text-sm text-muted-foreground">{result.scenarioImpact}</p>
            </div>
          )}

          <div className="glass-card p-5">
            <p className="text-xs uppercase tracking-wide text-primary mb-1">Recommendation</p>
            <p className="text-sm text-foreground">{result.recommendation}</p>
            {result.assumptions?.length > 0 && (
              <ul className="mt-3 text-[11px] text-muted-foreground list-disc pl-4 space-y-1">
                {result.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PathSimulatorPanel;
