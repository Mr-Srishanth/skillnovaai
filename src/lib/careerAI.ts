import { supabase } from "@/integrations/supabase/client";
import type { CareerProfile } from "@/hooks/useCareerProfile";

export type IntelligenceMode = "roadmap" | "readiness" | "company" | "salary" | "trends" | "insights";

const cacheKey = (mode: string, profile: CareerProfile, extra?: string) =>
  `skillnova:ci:${mode}:${profile.goal}:${extra || ""}`;

export function readCache<T>(mode: IntelligenceMode, profile: CareerProfile, extra?: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(mode, profile, extra));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(mode: IntelligenceMode, profile: CareerProfile, data: unknown, extra?: string) {
  try {
    localStorage.setItem(cacheKey(mode, profile, extra), JSON.stringify(data));
  } catch {
    /* storage full — ignore */
  }
}

export async function runIntelligence<T>(
  mode: IntelligenceMode,
  profile: CareerProfile,
  payload?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("career-intelligence", {
    body: { mode, profile, payload },
  });

  if (error) {
    const message = (data as any)?.error || error.message || "Intelligence request failed";
    throw new Error(message);
  }
  if ((data as any)?.error) throw new Error((data as any).error);

  return data as T;
}
