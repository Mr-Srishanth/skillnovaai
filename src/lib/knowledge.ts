import { supabase } from "@/integrations/supabase/client";
import type { CareerProfile } from "@/hooks/useCareerProfile";

export type SourceType = "topic" | "pdf" | "youtube" | "url" | "text";
export type NoteStyle = "detailed" | "short" | "exam" | "revision" | "onepage";

export interface KnowledgePack {
  title: string;
  topic: string;
  summary: string;
  readingMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  keyTerms: { term: string; meaning: string }[];
  notes: string;
  mindMap: { root: string; branches: { label: string; children: string[] }[] };
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
  }[];
  flashcards: {
    question: string;
    answer: string;
    difficulty: "easy" | "medium" | "hard";
    category: string;
    priority: "low" | "medium" | "high";
  }[];
  revisionSheet: {
    mustKnow: string[];
    formulasOrFacts: string[];
    commonMistakes: string[];
    examTips: string[];
  };
  careerLink: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  topic: string | null;
  source_type: string;
  source_ref: string | null;
  note_style: string;
  output: KnowledgePack;
  quiz_score: number | null;
  reading_minutes: number | null;
  mastered: boolean;
  created_at: string;
}

export async function generatePack(input: {
  sourceType: SourceType;
  topic?: string;
  url?: string;
  text?: string;
  noteStyle: NoteStyle;
  profile: CareerProfile;
}): Promise<KnowledgePack> {
  const { data, error } = await supabase.functions.invoke("knowledge-engine", { body: input });
  if (error) throw new Error((data as any)?.error || error.message || "Generation failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as KnowledgePack;
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const maxPages = Math.min(doc.numPages, 40);
  let out = "";
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => it.str).join(" ") + "\n\n";
    if (out.length > 40000) break;
  }
  return out.trim();
}

export function packToMarkdown(pack: KnowledgePack): string {
  const q = pack.quiz
    .map(
      (item, i) =>
        `${i + 1}. ${item.question}\n${item.options
          .map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`)
          .join("\n")}\n   *Answer: ${String.fromCharCode(65 + item.answerIndex)} — ${item.explanation}*`
    )
    .join("\n\n");

  return `${pack.notes}

---

## Key Terms
${pack.keyTerms.map((k) => `- **${k.term}** — ${k.meaning}`).join("\n")}

## Mind Map
- ${pack.mindMap.root}
${pack.mindMap.branches
  .map((b) => `  - ${b.label}\n${b.children.map((c) => `    - ${c}`).join("\n")}`)
  .join("\n")}

## One-Page Revision Sheet
### Must Know
${pack.revisionSheet.mustKnow.map((s) => `- ${s}`).join("\n")}
### Formulas & Facts
${pack.revisionSheet.formulasOrFacts.map((s) => `- ${s}`).join("\n")}
### Common Mistakes
${pack.revisionSheet.commonMistakes.map((s) => `- ${s}`).join("\n")}
### Exam Tips
${pack.revisionSheet.examTips.map((s) => `- ${s}`).join("\n")}

## Flashcards
${pack.flashcards.map((f) => `- **Q:** ${f.question}\n  **A:** ${f.answer}`).join("\n")}

## Quiz
${q}
`;
}

export function downloadText(filename: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
