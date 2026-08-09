import { supabase } from "@/integrations/supabase/client";
import type { CareerProfile } from "@/hooks/useCareerProfile";
import type { KnowledgePack } from "@/lib/knowledge";

/* ---------------------------------- types --------------------------------- */

export type HandStyle = "clean" | "college" | "natural" | "exam" | "premium";
export type PaperStyle = "ruled" | "grid" | "plain" | "cornell" | "margin";
export type InkStyle = "blue" | "black" | "duo";
export type Depth = "short" | "medium" | "detailed";
export type DiagramLevel = "minimal" | "balanced" | "heavy";
export type PageSize = "a4" | "letter";

export interface NotebookStyle {
  hand: HandStyle;
  paper: PaperStyle;
  ink: InkStyle;
  depth: Depth;
  diagramLevel: DiagramLevel;
  pageSize: PageSize;
}

export const DEFAULT_STYLE: NotebookStyle = {
  hand: "clean",
  paper: "ruled",
  ink: "blue",
  depth: "medium",
  diagramLevel: "balanced",
  pageSize: "a4",
};

export interface DiagramNode { id: string; label: string; detail?: string }
export interface DiagramEdge { from: string; to: string; label?: string }
export interface DiagramSpec {
  kind: "flow" | "hierarchy" | "tree" | "er" | "network" | "comparison" | "timeline" | "cycle" | "stack";
  title: string;
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  columns?: { header: string; items: string[] }[];
}

export type BlockType =
  | "cover" | "toc" | "heading" | "subheading" | "text" | "bullets"
  | "definition" | "formula" | "code" | "callout" | "example" | "keyterms" | "diagram";

export interface NotebookBlock {
  type: BlockType;
  text?: string;
  items?: string[];
  term?: string;
  meaning?: string;
  formula?: string;
  code?: string;
  language?: string;
  tone?: "info" | "warning" | "exam";
  highlight?: string[];
  keyTerms?: { term: string; meaning: string }[];
  diagram?: DiagramSpec;
}

export interface NotebookPage {
  id: string;
  title: string;
  blocks: NotebookBlock[];
}

export interface Notebook {
  title: string;
  subtitle: string;
  pages: NotebookPage[];
  style: NotebookStyle;
  generatedAt: string;
}

/* ------------------------------ style presets ----------------------------- */

export const HAND_PRESETS: Record<HandStyle, {
  label: string; family: string; size: number; line: number; heading: number; tilt: number;
}> = {
  clean:    { label: "Clean Student",     family: "'Patrick Hand', cursive",           size: 19, line: 32, heading: 30, tilt: 0 },
  college:  { label: "Neat College",      family: "'Kalam', cursive",                  size: 17, line: 32, heading: 28, tilt: 0 },
  natural:  { label: "Natural Notebook",  family: "'Caveat', cursive",                 size: 23, line: 32, heading: 36, tilt: -0.4 },
  exam:     { label: "Exam Preparation",  family: "'Architects Daughter', cursive",    size: 16, line: 32, heading: 25, tilt: 0 },
  premium:  { label: "Premium Academic",  family: "'Shadows Into Light Two', cursive", size: 20, line: 32, heading: 31, tilt: 0.3 },
};

export const PAPER_LABELS: Record<PaperStyle, string> = {
  ruled: "Ruled", grid: "Grid", plain: "Plain", cornell: "Cornell", margin: "Margin",
};

export const INK: Record<InkStyle, { primary: string; secondary: string; label: string }> = {
  blue:  { primary: "#1c3f94", secondary: "#1c3f94", label: "Blue ink" },
  black: { primary: "#1a1a1e", secondary: "#1a1a1e", label: "Black ink" },
  duo:   { primary: "#1c3f94", secondary: "#16181d", label: "Blue + black" },
};

export const RED_INK = "#b0201f";
export const HIGHLIGHT = "rgba(255, 226, 92, 0.62)";

/** Page geometry in CSS px at 96dpi. */
export const PAGE_DIMS: Record<PageSize, { w: number; h: number; pdf: string }> = {
  a4: { w: 794, h: 1123, pdf: "a4" },
  letter: { w: 816, h: 1056, pdf: "letter" },
};

export const PAGE_PADDING = { top: 64, bottom: 72, left: 78, right: 56 };

/* -------------------------------- generation ------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 10);

function normalisePage(raw: any): NotebookPage {
  return {
    id: raw?.id || uid(),
    title: String(raw?.title || "Notes"),
    blocks: Array.isArray(raw?.blocks)
      ? raw.blocks.filter(
          (b: any) =>
            b && b.type &&
            (['cover','toc','divider','diagram'].includes(b.type) ||
            (b.text || b.formula || b.code || b.diagram ||
              (b.items || []).length || (b.keyTerms || []).length || b.term || b.meaning))
        )
      : [],
  };
}

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("notebook-planner", { body });
  if (error) throw new Error((data as any)?.error || error.message || "Notebook generation failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export async function generateNotebook(input: {
  pack: KnowledgePack;
  style: NotebookStyle;
  noteStyle: string;
  profile: CareerProfile;
}): Promise<Notebook> {
  const data = await invoke({
    mode: "notebook",
    pack: input.pack,
    profile: input.profile,
    options: {
      noteStyle: input.noteStyle,
      depth: input.style.depth,
      diagramLevel: input.style.diagramLevel,
    },
  });
  const pages = (data.pages || []).map(normalisePage).filter((p: NotebookPage) => p.blocks.length);
  if (!pages.length) throw new Error("The notebook came back empty. Try again.");
  return {
    title: data.title || input.pack.title,
    subtitle: data.subtitle || input.pack.topic || "",
    pages,
    style: input.style,
    generatedAt: new Date().toISOString(),
  };
}

export async function regeneratePage(input: {
  pack: KnowledgePack;
  notebook: Notebook;
  pageIndex: number;
  profile: CareerProfile;
  noteStyle: string;
  instruction?: string;
}): Promise<NotebookPage> {
  const page = input.notebook.pages[input.pageIndex];
  const data = await invoke({
    mode: "page",
    pack: input.pack,
    profile: input.profile,
    pageTitle: page.title,
    context: input.notebook.pages.map((p) => p.title),
    instruction: input.instruction,
    options: {
      noteStyle: input.noteStyle,
      depth: input.notebook.style.depth,
      diagramLevel: input.notebook.style.diagramLevel,
    },
  });
  const next = normalisePage(data.page);
  return { ...next, id: page.id };
}

export async function regenerateDiagram(input: {
  pack: KnowledgePack;
  notebook: Notebook;
  pageIndex: number;
  profile: CareerProfile;
  instruction?: string;
}): Promise<DiagramSpec> {
  const page = input.notebook.pages[input.pageIndex];
  const context = page.blocks
    .map((b) => b.text || b.items?.join(", ") || b.term || "")
    .filter(Boolean)
    .slice(0, 6);
  const data = await invoke({
    mode: "diagram",
    pack: input.pack,
    profile: input.profile,
    pageTitle: page.title,
    context,
    instruction: input.instruction,
  });
  if (!data.diagram) throw new Error("No diagram returned");
  return data.diagram as DiagramSpec;
}

/* --------------------------------- export --------------------------------- */

async function renderPageCanvas(el: HTMLElement, scale = 2) {
  const html2canvas = (await import("html2canvas")).default;
  return html2canvas(el, {
    scale,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });
}

/** Export every rendered page element into a paginated, print-ready PDF. */
export async function exportNotebookPdf(
  elements: HTMLElement[],
  filename: string,
  pageSize: PageSize,
  onProgress?: (done: number, total: number) => void
) {
  const { jsPDF } = await import("jspdf");
  const dims = PAGE_DIMS[pageSize];
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: dims.pdf });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < elements.length; i++) {
    const canvas = await renderPageCanvas(elements[i]);
    const img = canvas.toDataURL("image/jpeg", 0.94);
    if (i > 0) pdf.addPage(dims.pdf, "portrait");
    pdf.addImage(img, "JPEG", 0, 0, pw, ph, undefined, "FAST");
    onProgress?.(i + 1, elements.length);
  }
  pdf.save(filename);
}

export async function exportPagePng(el: HTMLElement, filename: string) {
  const canvas = await renderPageCanvas(el, 2.5);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
