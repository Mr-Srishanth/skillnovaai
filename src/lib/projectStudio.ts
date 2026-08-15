import { supabase } from "@/integrations/supabase/client";
import type { CareerProfile } from "@/hooks/useCareerProfile";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type StudioMode = "recommend" | "blueprint" | "assist" | "resume" | "interview" | "code" | "intelligence";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type ProjectStatus = "saved" | "active" | "completed";
export type SourceMode = "ai" | "gap" | "goal" | "tech" | "custom";

export interface QualityScores {
  careerRelevance: number;
  skillCoverage: number;
  portfolioValue: number;
  technicalDepth: number;
  difficultyFit: number;
  realWorldValue: number;
}

export interface Prerequisite {
  topic: string;
  reason: string;
}

export interface Recommendation {
  title: string;
  summary: string;
  projectType: string;
  difficulty: Difficulty;
  duration: string;
  techStack: string[];
  skillsDeveloped: string[];
  skillsAddressed: string[];
  careerRelevance: string;
  resumeValue: string;
  why: string;
  whatYouLearn: string;
  recruiterProof: string;
  prerequisites: Prerequisite[];
  preparationNote: string;
  quality: QualityScores;
}

export interface RecommendationBatch {
  headline: string;
  topGap: string;
  projects: Recommendation[];
}

export interface MilestoneTask {
  id: string;
  title: string;
}

export interface Milestone {
  id: string;
  phase: string;
  goal: string;
  estimatedTime: string;
  dependencies: string[];
  skillsPracticed: string[];
  tasks: MilestoneTask[];
}

export interface ArchNode {
  id: string;
  label: string;
  kind: string;
  detail: string;
}

export interface Blueprint {
  overview: string;
  problemStatement: string;
  targetUsers: string[];
  realWorldUseCase: string;
  features: { mvp: string[]; important: string[]; advanced: string[]; optional: string[] };
  skillsDeveloped: string[];
  techStack: { layer: string; tech: string; why: string }[];
  architecture: { summary: string; nodes: ArchNode[]; edges: { from: string; to: string; label: string }[] };
  database: {
    entities: { name: string; purpose: string; fields: { name: string; type: string; key: string; note: string }[] }[];
    relationships: string[];
    sql: string;
  };
  api: { method: string; route: string; purpose: string; request: string; response: string }[];
  uiScreens: { name: string; purpose: string; elements: string[] }[];
  folderStructure: string;
  milestones: Milestone[];
  testingStrategy: string[];
  deploymentStrategy: string[];
  futureImprovements: string[];
  knowledgeGaps: { topic: string; why: string }[];
}

export interface ResumeEntry {
  title: string;
  oneLiner: string;
  bullets: string[];
  technologies: string[];
  impact: string;
}

export interface InterviewQuestion {
  category: string;
  question: string;
  whatTheyWant: string;
}

export interface AssistAnswer {
  answer: string;
  code: string;
  codeLanguage: string;
  codeLocation: string;
  dependencies: string[];
  pitfalls: string[];
  nextStep: string;
}

export interface StudioProject {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  project_type: string | null;
  difficulty: Difficulty;
  duration: string | null;
  status: ProjectStatus;
  source_mode: string;
  goal: string | null;
  why: string | null;
  career_relevance: string | null;
  resume_value: string | null;
  tech_stack: string[];
  skills_developed: string[];
  skills_addressed: string[];
  prerequisites: Prerequisite[];
  quality: Partial<QualityScores>;
  blueprint: Partial<Blueprint>;
  milestones: Milestone[];
  completed_tasks: string[];
  extra_tasks: MilestoneTask[];
  resume_entry: ResumeEntry | null;
  interview_questions: InterviewQuestion[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* AI                                                                  */
/* ------------------------------------------------------------------ */

export async function runStudio<T>(
  mode: StudioMode,
  profile: CareerProfile,
  payload?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("project-studio", {
    body: { mode, profile, payload },
  });
  if (error) throw new Error((data as any)?.error || error.message || "Project Studio request failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

/* ------------------------------------------------------------------ */
/* Cache (recommendations only — blueprints persist in the database)   */
/* ------------------------------------------------------------------ */

const recKey = (profile: CareerProfile, source: string, input: string) =>
  `skillnova:studio:rec:${profile.goal}:${source}:${input}`;

export function readRecCache(profile: CareerProfile, source: string, input: string): RecommendationBatch | null {
  try {
    const raw = localStorage.getItem(recKey(profile, source, input));
    return raw ? (JSON.parse(raw) as RecommendationBatch) : null;
  } catch {
    return null;
  }
}

export function writeRecCache(profile: CareerProfile, source: string, input: string, data: RecommendationBatch) {
  try {
    localStorage.setItem(recKey(profile, source, input), JSON.stringify(data));
  } catch {
    /* storage full — ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const normalizeProject = (row: any): StudioProject => ({
  ...row,
  tech_stack: asArray<string>(row.tech_stack),
  skills_developed: asArray<string>(row.skills_developed),
  skills_addressed: asArray<string>(row.skills_addressed),
  prerequisites: asArray<Prerequisite>(row.prerequisites),
  quality: row.quality || {},
  blueprint: row.blueprint || {},
  milestones: asArray<Milestone>(row.milestones),
  completed_tasks: asArray<string>(row.completed_tasks),
  extra_tasks: asArray<MilestoneTask>(row.extra_tasks),
  interview_questions: Array.isArray(row.interview_questions) ? row.interview_questions : null,
});

export async function listProjects(userId: string): Promise<StudioProject[]> {
  const { data, error } = await supabase
    .from("studio_projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(normalizeProject);
}

export async function saveRecommendation(
  userId: string,
  goal: string,
  rec: Recommendation,
  source: SourceMode,
  status: ProjectStatus = "saved"
): Promise<StudioProject> {
  const { data, error } = await supabase
    .from("studio_projects")
    .insert({
      user_id: userId,
      title: rec.title,
      summary: rec.summary,
      project_type: rec.projectType,
      difficulty: rec.difficulty,
      duration: rec.duration,
      status,
      source_mode: source,
      goal,
      why: rec.why,
      career_relevance: rec.careerRelevance,
      resume_value: rec.resumeValue,
      tech_stack: rec.techStack,
      skills_developed: rec.skillsDeveloped,
      skills_addressed: rec.skillsAddressed,
      prerequisites: rec.prerequisites as any,
      quality: rec.quality as any,
    } as any)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeProject(data);
}

export async function updateProject(id: string, patch: Record<string, unknown>): Promise<StudioProject> {
  const { data, error } = await supabase
    .from("studio_projects")
    .update(patch as any)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeProject(data);
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("studio_projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Derived, explainable metrics — no fake values                        */
/* ------------------------------------------------------------------ */

export const allTasks = (p: StudioProject): MilestoneTask[] => [
  ...p.milestones.flatMap((m) => m.tasks || []),
  ...p.extra_tasks,
];

export function projectProgress(p: StudioProject): number {
  const total = allTasks(p).length;
  if (!total) return p.status === "completed" ? 100 : 0;
  const done = allTasks(p).filter((t) => p.completed_tasks.includes(t.id)).length;
  return Math.round((done / total) * 100);
}

export function currentMilestone(p: StudioProject): Milestone | null {
  for (const m of p.milestones) {
    if ((m.tasks || []).some((t) => !p.completed_tasks.includes(t.id))) return m;
  }
  return p.milestones[p.milestones.length - 1] || null;
}

export function nextTasks(p: StudioProject, limit = 3): MilestoneTask[] {
  return allTasks(p).filter((t) => !p.completed_tasks.includes(t.id)).slice(0, limit);
}

const QUALITY_LABELS: { key: keyof QualityScores; label: string }[] = [
  { key: "careerRelevance", label: "Career Relevance" },
  { key: "skillCoverage", label: "Skill Coverage" },
  { key: "portfolioValue", label: "Portfolio Value" },
  { key: "technicalDepth", label: "Technical Depth" },
  { key: "difficultyFit", label: "Difficulty Fit" },
  { key: "realWorldValue", label: "Real-World Value" },
];

export const qualityBreakdown = (q: Partial<QualityScores>) =>
  QUALITY_LABELS.map(({ key, label }) => ({ label, value: Math.max(0, Math.min(100, Math.round(Number(q?.[key] ?? 0)))) }));

/** Weighted, explainable overall Project Value — derived only from supplied sub-scores. */
export function projectValue(q: Partial<QualityScores>): number {
  const b = qualityBreakdown(q);
  if (b.every((x) => x.value === 0)) return 0;
  const weights = [0.25, 0.2, 0.2, 0.15, 0.1, 0.1];
  return Math.round(b.reduce((acc, x, i) => acc + x.value * weights[i], 0));
}

export const difficultyTone = (d: string) =>
  d === "Beginner" ? "text-emerald-400" : d === "Intermediate" ? "text-neon-cyan" : d === "Advanced" ? "text-amber-400" : "text-destructive";
