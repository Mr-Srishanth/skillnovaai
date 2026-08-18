/**
 * SkillNova — Company Fit Intelligence (deterministic, no AI)
 *
 * Aggregates the EXISTING saved job records (career_jobs) by company and reuses
 * the EXISTING matchJob engine against the Career Brain evidence table.
 * Nothing here invents companies, jobs, requirements or percentages.
 */

import { matchJob, type JobMatch, type JobRequirements, type JobSkillRow, type SkillEvidence } from "@/lib/careerBrain";
import type { BrainJob } from "@/hooks/useCareerBrain";

export type FitBand = "strong" | "good" | "improve" | "unknown";

export interface CompanyJobFit {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  /** null when the saved record has no usable requirement data */
  match: JobMatch | null;
  requirements: JobRequirements | null;
}

export interface CompanyFit {
  key: string;
  company: string;
  jobs: CompanyJobFit[];
  /** null = not enough verified job data */
  score: number | null;
  readiness: number | null;
  band: FitBand;
  bestRole: string | null;
  strong: JobSkillRow[];
  partial: JobSkillRow[];
  missing: JobSkillRow[];
  usableJobs: number;
  recommendedAction: string | null;
}

const hasRequirements = (r: any): r is JobRequirements =>
  !!r && Array.isArray(r.requiredSkills) && r.requiredSkills.some((x: any) => x && typeof x.skill === "string" && x.skill.trim().length > 1);

export const bandFor = (score: number | null): FitBand =>
  score == null ? "unknown" : score >= 75 ? "strong" : score >= 55 ? "good" : "improve";

export const BAND_LABEL: Record<FitBand, string> = {
  strong: "Strong match",
  good: "Good match",
  improve: "Needs improvement",
  unknown: "Not enough verified job data",
};

const uniqueRows = (rows: JobSkillRow[]) => {
  const seen = new Map<string, JobSkillRow>();
  rows.forEach((r) => {
    const k = r.skill.toLowerCase();
    const prev = seen.get(k);
    if (!prev || r.strength > prev.strength) seen.set(k, r);
  });
  return Array.from(seen.values());
};

const recommendedActionFor = (fit: Omit<CompanyFit, "recommendedAction">): string | null => {
  if (fit.score == null) return null;
  const topMissing = fit.missing.sort((a, b) => b.weight - a.weight)[0];
  if (topMissing) {
    return `Learn ${topMissing.skill}, then ship one deployed project using it to close the biggest gap at ${fit.company}.`;
  }
  const weakProof = fit.partial.sort((a, b) => b.weight - a.weight)[0];
  if (weakProof) {
    return `You have ${weakProof.skill} at "${weakProof.level}" — verify it or build project evidence to strengthen your ${fit.company} match.`;
  }
  return `Your requirement coverage for ${fit.company} is solid — polish your resume and run a mock interview for ${fit.bestRole || "this role"}.`;
};

export function buildCompanyFits(
  jobs: BrainJob[],
  evidence: SkillEvidence[],
  signals: { resumeScore: number | null; interviewScore: number | null; projectsCount: number },
): CompanyFit[] {
  const groups = new Map<string, BrainJob[]>();

  jobs.forEach((j) => {
    const name = (j.company || "").trim();
    if (!name) return; // never fabricate a company
    const key = name.toLowerCase();
    const arr = groups.get(key) || [];
    arr.push(j);
    groups.set(key, arr);
  });

  const fits: CompanyFit[] = [];

  groups.forEach((list, key) => {
    const company = (list[0].company || "").trim();
    const jobFits: CompanyJobFit[] = list.map((j) => {
      const req = hasRequirements(j.requirements) ? (j.requirements as JobRequirements) : null;
      return {
        id: j.id,
        title: j.title,
        status: j.status,
        createdAt: j.created_at,
        requirements: req,
        match: req ? matchJob(req, evidence, signals) : null,
      };
    });

    const usable = jobFits.filter((j) => j.match && j.match.rows.length > 0);
    usable.sort((a, b) => (b.match!.match || 0) - (a.match!.match || 0));

    if (!usable.length) {
      fits.push({
        key,
        company,
        jobs: jobFits,
        score: null,
        readiness: null,
        band: "unknown",
        bestRole: null,
        strong: [],
        partial: [],
        missing: [],
        usableJobs: 0,
        recommendedAction: null,
      });
      return;
    }

    // Company score = best verified job match, gently lifted by consistency
    // across other roles at the same company. Deterministic and explainable.
    const best = usable[0].match!;
    const avg = Math.round(usable.reduce((s, j) => s + j.match!.match, 0) / usable.length);
    const score = Math.round(best.match * 0.75 + avg * 0.25);
    const readiness = Math.round(best.readiness * 0.75 + (usable.reduce((s, j) => s + j.match!.readiness, 0) / usable.length) * 0.25);

    const base = {
      key,
      company,
      jobs: jobFits,
      score,
      readiness,
      band: bandFor(score),
      bestRole: usable[0].title,
      strong: uniqueRows(usable.flatMap((j) => j.match!.strong)).sort((a, b) => b.strength - a.strength),
      partial: uniqueRows(usable.flatMap((j) => j.match!.partial)).sort((a, b) => b.weight - a.weight),
      missing: uniqueRows(usable.flatMap((j) => j.match!.missing)).sort((a, b) => b.weight - a.weight),
      usableJobs: usable.length,
    };

    fits.push({ ...base, recommendedAction: recommendedActionFor(base) });
  });

  return fits.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
