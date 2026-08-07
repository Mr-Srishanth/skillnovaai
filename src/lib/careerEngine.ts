/**
 * SkillNova Career Intelligence Engine
 * The single source of truth for readiness, forecasting and money formatting.
 * Every module MUST consume these functions — never hardcode a percentage.
 */

export interface EngineSignals {
  goal: string;
  skills: string;
  /** latest AI skill-gap score, 0-100 (null when never analysed) */
  analysisScore: number | null;
  missingSkills: string[];
  analysesCount: number;
  projectsCount: number;
  knowledgePacks: number;
  knowledgeMastered: number;
  avgQuizScore: number | null;
  resumeScore: number | null;
  interviewScore: number | null;
  completedMilestones: number;
  streak: number;
  xp: number;
  studyHours: number;
}

export interface ReadinessDimension {
  name: "Skills" | "Projects" | "Knowledge" | "Resume" | "Interview" | "Consistency";
  score: number;
  weight: number;
}

export interface ReadinessResult {
  overall: number;
  dimensions: ReadinessDimension[];
  strongest: ReadinessDimension;
  weakest: ReadinessDimension;
  hasData: boolean;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

const countSkills = (skills: string) =>
  skills
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean).length;

/** Skills dimension — anchored on the AI analysis, corrected by breadth and remaining gaps. */
function skillsDimension(s: EngineSignals): number {
  const listed = countSkills(s.skills);
  const breadth = clamp(listed * 9); // ~11 named skills ≈ full breadth
  const gapPenalty = Math.min(s.missingSkills.length * 5, 35);
  if (s.analysisScore == null) return clamp(breadth * 0.7);
  return clamp(s.analysisScore * 0.75 + breadth * 0.25 - gapPenalty * 0.2);
}

function projectsDimension(s: EngineSignals): number {
  // 4 shipped projects ≈ portfolio-ready
  return clamp(s.projectsCount * 22 + Math.min(s.completedMilestones, 8) * 3);
}

function knowledgeDimension(s: EngineSignals): number {
  const volume = Math.min(s.knowledgePacks, 12) * 5;
  const mastery = Math.min(s.knowledgeMastered, 10) * 4;
  const quiz = s.avgQuizScore != null ? s.avgQuizScore * 0.25 : 0;
  return clamp(volume + mastery + quiz);
}

function resumeDimension(s: EngineSignals): number {
  if (s.resumeScore == null) return 0;
  return clamp(s.resumeScore);
}

function interviewDimension(s: EngineSignals): number {
  if (s.interviewScore == null) return 0;
  return clamp(s.interviewScore);
}

function consistencyDimension(s: EngineSignals): number {
  const streak = Math.min(s.streak, 30) * 2; // 30-day streak ≈ 60
  const xp = Math.min(s.xp / 25, 25);
  const hours = Math.min(s.studyHours * 3, 15);
  return clamp(streak + xp + hours);
}

const WEIGHTS: Record<ReadinessDimension["name"], number> = {
  Skills: 0.3,
  Projects: 0.17,
  Knowledge: 0.15,
  Resume: 0.13,
  Interview: 0.13,
  Consistency: 0.12,
};

export function computeReadiness(s: EngineSignals): ReadinessResult {
  const dimensions: ReadinessDimension[] = [
    { name: "Skills", score: skillsDimension(s), weight: WEIGHTS.Skills },
    { name: "Projects", score: projectsDimension(s), weight: WEIGHTS.Projects },
    { name: "Knowledge", score: knowledgeDimension(s), weight: WEIGHTS.Knowledge },
    { name: "Resume", score: resumeDimension(s), weight: WEIGHTS.Resume },
    { name: "Interview", score: interviewDimension(s), weight: WEIGHTS.Interview },
    { name: "Consistency", score: consistencyDimension(s), weight: WEIGHTS.Consistency },
  ];

  const overall = clamp(dimensions.reduce((acc, d) => acc + d.score * d.weight, 0));
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const hasData = Boolean(s.goal) && dimensions.some((d) => d.score > 0);

  return { overall, dimensions, strongest: sorted[0], weakest: sorted[sorted.length - 1], hasData };
}

export function readinessVerdict(overall: number): string {
  if (overall < 25) return "Foundation stage — you're at the very start of this path.";
  if (overall < 45) return "Building stage — real progress, but not yet interview-ready.";
  if (overall < 65) return "Competitive stage — you'd pass screening at smaller companies.";
  if (overall < 82) return "Interview-ready — you can apply broadly with confidence.";
  return "Hire-ready — you're above the bar for most teams in this role.";
}

/* ------------------------------------------------------------------ */
/* Forecasting                                                         */
/* ------------------------------------------------------------------ */

export interface ForecastPoint {
  period: string;
  months: number;
  readiness: number;
  gain: number;
  jobReady: boolean;
}

/**
 * Projected readiness after `months` of `hoursPerDay` study.
 * Diminishing returns toward 100, scaled by effort and current consistency.
 */
export function forecastReadiness(current: number, hoursPerDay: number, months: number, consistency = 50): number {
  const effort = Math.pow(Math.max(hoursPerDay, 0.25), 0.75); // 2h ≈ 1.68, 8h ≈ 4.8
  const discipline = 0.7 + (clamp(consistency) / 100) * 0.6; // 0.7 – 1.3
  const rate = 0.085 * effort * discipline;
  const gap = 100 - current;
  const projected = current + gap * (1 - Math.exp(-rate * months));
  return clamp(projected);
}

export function buildForecast(current: number, hoursPerDay: number, consistency = 50): ForecastPoint[] {
  return [
    { months: 3, period: "3 Months" },
    { months: 6, period: "6 Months" },
    { months: 12, period: "12 Months" },
  ].map(({ months, period }) => {
    const readiness = forecastReadiness(current, hoursPerDay, months, consistency);
    return { period, months, readiness, gain: readiness - current, jobReady: readiness >= 75 };
  });
}

/* ------------------------------------------------------------------ */
/* Localised money                                                     */
/* ------------------------------------------------------------------ */

export interface CurrencyProfile {
  code: string;
  symbol: string;
  unit: string;
  /** e.g. "₹4–7 LPA" */
  format: (from: number, to?: number) => string;
}

const LPA = (from: number, to?: number) =>
  to != null ? `₹${from}–${to} LPA` : `₹${from}+ LPA`;

export const CURRENCIES: Record<string, CurrencyProfile> = {
  India: { code: "INR", symbol: "₹", unit: "LPA", format: LPA },
  "United States": {
    code: "USD",
    symbol: "$",
    unit: "per year",
    format: (f, t) => (t != null ? `$${f}K–$${t}K` : `$${f}K+`),
  },
  "United Kingdom": {
    code: "GBP",
    symbol: "£",
    unit: "per year",
    format: (f, t) => (t != null ? `£${f}K–£${t}K` : `£${f}K+`),
  },
  Europe: {
    code: "EUR",
    symbol: "€",
    unit: "per year",
    format: (f, t) => (t != null ? `€${f}K–€${t}K` : `€${f}K+`),
  },
  Remote: {
    code: "USD",
    symbol: "$",
    unit: "per year",
    format: (f, t) => (t != null ? `$${f}K–$${t}K` : `$${f}K+`),
  },
};

export const currencyFor = (region: string): CurrencyProfile => CURRENCIES[region] || CURRENCIES.India;

/** Best-effort region detection from the browser locale / timezone. */
export function detectRegion(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const locale = navigator.language || "";
    if (tz.includes("Kolkata") || tz.includes("Calcutta") || locale.endsWith("IN")) return "India";
    if (tz.startsWith("America/") || locale.endsWith("US")) return "United States";
    if (tz.includes("London") || locale.endsWith("GB")) return "United Kingdom";
    if (tz.startsWith("Europe/")) return "Europe";
  } catch {
    /* ignore */
  }
  return "India";
}
