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

export type CalloutKind =
  | "core" | "remember" | "exam" | "viva" | "example"
  | "mistake" | "code" | "connection" | "realworld" | "trick";

export type Importance = "critical" | "high" | "medium" | "low";

export type BlockType =
  | "cover" | "toc" | "heading" | "subheading" | "text" | "bullets"
  | "definition" | "formula" | "code" | "callout" | "example" | "keyterms"
  | "diagram" | "steps" | "viva" | "table";

export interface VivaQA { q: string; a: string; followUp?: string }

export interface NotebookBlock {
  type: BlockType;
  text?: string;
  items?: string[];
  term?: string;
  meaning?: string;
  formula?: string;
  code?: string;
  language?: string;
  output?: string;
  /** Callout category. Legacy notebooks used `tone` — it is migrated to `kind`. */
  kind?: CalloutKind;
  tone?: "info" | "warning" | "exam";
  importance?: Importance;
  highlight?: string[];
  keyTerms?: { term: string; meaning: string }[];
  qa?: VivaQA[];
  columns?: { header: string; items: string[] }[];
  diagram?: DiagramSpec;
  /** Contents entries, filled by the layout engine. */
  toc?: { title: string; page: number }[];
}

/** Authored content. Sections are the unit of AI generation and editing. */
export interface NotebookSection {
  id: string;
  title: string;
  blocks: NotebookBlock[];
  /** True once the user has manually edited this section — protects it from bulk regeneration. */
  edited?: boolean;
  updatedAt?: string;
}

/** A block placed on a page, with a pointer back to its source section block. */
export interface PlacedBlock extends NotebookBlock {
  ref?: { sectionId: string; index: number };
}

export interface NotebookPage {
  id: string;
  title: string;
  blocks: PlacedBlock[];
  sectionId?: string;
  continued?: boolean;
}

export interface Notebook {
  title: string;
  subtitle: string;
  /** Source of truth for content. Legacy notebooks are migrated into sections on load. */
  sections: NotebookSection[];
  /** Derived, paginated output — always rebuilt by `composeNotebook`. */
  pages: NotebookPage[];
  style: NotebookStyle;
  generatedAt: string;
  createdAt?: string;
  updatedAt?: string;
  lastGeneratedAt?: string;
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

export const CALLOUT_META: Record<CalloutKind, { label: string; icon: string; color: string; bg: string }> = {
  core:       { label: "CORE IDEA",       icon: "◎", color: "#1c3f94", bg: "rgba(28,63,148,0.07)" },
  remember:   { label: "REMEMBER",        icon: "★", color: "#8a5a00", bg: "rgba(200,140,0,0.09)" },
  exam:       { label: "LIKELY EXAM FOCUS", icon: "✎", color: "#7a5c00", bg: "rgba(220,170,0,0.10)" },
  viva:       { label: "VIVA",            icon: "?", color: "#155e52", bg: "rgba(20,120,100,0.08)" },
  example:    { label: "EXAMPLE",         icon: "e.g.", color: "#1f5130", bg: "rgba(30,110,60,0.07)" },
  mistake:    { label: "COMMON MISTAKE",  icon: "!", color: RED_INK, bg: "rgba(176,32,31,0.07)" },
  code:       { label: "CODE",            icon: "</>", color: "#28324a", bg: "rgba(40,50,74,0.07)" },
  connection: { label: "CONNECTION",      icon: "→", color: "#4a2a70", bg: "rgba(74,42,112,0.07)" },
  realworld:  { label: "REAL-WORLD USE",  icon: "⌂", color: "#1a4f6b", bg: "rgba(26,79,107,0.07)" },
  trick:      { label: "MEMORY TRICK",    icon: "✦", color: "#6b3b00", bg: "rgba(150,90,0,0.08)" },
};

/* ------------------------------ layout engine ----------------------------- */

const uid = () => Math.random().toString(36).slice(2, 10);

export function contentBox(style: NotebookStyle) {
  const dims = PAGE_DIMS[style.pageSize];
  const left =
    style.paper === "cornell" ? PAGE_PADDING.left + 116 :
    style.paper === "margin" ? PAGE_PADDING.left + 18 : PAGE_PADDING.left;
  return {
    width: dims.w - left - PAGE_PADDING.right,
    height: dims.h - PAGE_PADDING.top - PAGE_PADDING.bottom,
    left,
  };
}

function lines(text: string, width: number, fontSize: number) {
  const perLine = Math.max(12, Math.floor(width / (fontSize * 0.47)));
  const paras = String(text || "").split("\n");
  return paras.reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0);
}

export function diagramHeight(spec: DiagramSpec) {
  const n = spec.nodes?.length || 0;
  switch (spec.kind) {
    case "comparison": {
      const rows = Math.max(1, ...(spec.columns || []).map((c) => c.items.length));
      return 54 + rows * 26 + 40;
    }
    case "timeline": return 220;
    case "network": return 360;
    case "stack": return 70 + n * 54;
    case "cycle": return 340;
    case "er": return 110 + Math.ceil(n / 2) * 120;
    case "hierarchy":
    case "tree": return 110 + Math.min(4, Math.ceil(n / 2)) * 96;
    default: return 90 + Math.min(n, 8) * 62;
  }
}

/** Estimated rendered height of a block, mirroring NotebookPageView. */
export function blockHeight(b: NotebookBlock, style: NotebookStyle): number {
  const hand = HAND_PRESETS[style.hand];
  const { width } = contentBox(style);
  const L = 32;
  const body = (t?: string, size = hand.size, w = width) => lines(t || "", w, size) * L;

  switch (b.type) {
    case "cover": return 9999;
    case "toc": return 64 + (b.toc?.length || b.items?.length || 0) * 34;
    case "heading": return 52;
    case "subheading": return body(b.text, hand.size + 5) + 16;
    case "text": return body(b.text) + 6;
    case "bullets": return (b.items || []).reduce((s, i) => s + body(i, hand.size, width - 24), 0) + 8;
    case "steps": return 26 + (b.items || []).reduce((s, i) => s + body(i, hand.size, width - 44), 0) + 12;
    case "definition": return body(`${b.term}: ${b.meaning}`, hand.size, width - 28) + 30;
    case "formula": return 52 + (b.text ? 26 : 0);
    case "code":
      return (b.text ? body(b.text) : 0)
        + Math.max(1, String(b.code || "").split("\n").length) * 18 + 28
        + (b.output ? Math.max(1, String(b.output).split("\n").length) * 18 + 26 : 0);
    case "callout":
      return 30 + body(b.text, hand.size, width - 40)
        + (b.items || []).reduce((s, i) => s + body(i, hand.size, width - 60), 0) + 16;
    case "example":
      return 26 + body(b.text, hand.size, width - 30)
        + (b.items || []).reduce((s, i) => s + body(i, hand.size, width - 50), 0) + 10;
    case "keyterms":
      return 34 + (b.keyTerms || []).reduce((s, k) => s + body(`${k.term} — ${k.meaning}`, hand.size, width - 24), 0) + 10;
    case "viva":
      return 34 + (b.qa || []).reduce(
        (s, q) => s + body(`Q. ${q.q}`, hand.size, width - 30) + body(`A. ${q.a}`, hand.size, width - 30)
          + (q.followUp ? body(`Follow-up: ${q.followUp}`, hand.size - 2, width - 30) : 0) + 12, 0) + 10;
    case "table": {
      const rows = Math.max(1, ...(b.columns || [{ header: "", items: [] }]).map((c) => c.items.length));
      return 40 + rows * 34 + (b.text ? 26 : 0) + 14;
    }
    case "diagram": return b.diagram ? diagramHeight(b.diagram) + 16 : 0;
    default: return 32;
  }
}

/** Blocks that must not be orphaned at the bottom of a page without their body. */
const KEEP_WITH_NEXT: BlockType[] = ["heading", "subheading"];

function isEmptyBlock(b: NotebookBlock) {
  switch (b.type) {
    case "cover": return false;
    case "toc": return !(b.toc?.length || b.items?.length);
    case "bullets":
    case "steps": return !(b.items || []).filter((i) => String(i).trim()).length;
    case "definition": return !String(b.term || "").trim() || !String(b.meaning || "").trim();
    case "formula": return !String(b.formula || "").trim();
    case "code": return !String(b.code || "").trim();
    case "keyterms": return !(b.keyTerms || []).length;
    case "viva": return !(b.qa || []).filter((q) => q?.q).length;
    case "table": return !(b.columns || []).length;
    case "diagram": return !b.diagram || !(b.diagram.nodes?.length || b.diagram.columns?.length);
    default: return !String(b.text || "").trim();
  }
}

const BAD = /^(undefined|null|nan|n\/a|todo)$/i;

function cleanText(t?: string) {
  const s = String(t ?? "").replace(/\bundefined\b|\bnull\b|\bNaN\b/g, "").trim();
  return BAD.test(s) ? "" : s;
}

/** Quality pass: strip junk, empty blocks and duplicate explanations. */
export function sanitiseSection(section: NotebookSection): NotebookSection {
  const seen = new Set<string>();
  const blocks: NotebookBlock[] = [];

  for (const raw of section.blocks || []) {
    if (!raw || !raw.type) continue;
    const b: NotebookBlock = {
      ...raw,
      text: cleanText(raw.text) || undefined,
      term: cleanText(raw.term) || undefined,
      meaning: cleanText(raw.meaning) || undefined,
      items: (raw.items || []).map((i) => cleanText(i)).filter(Boolean),
      highlight: (raw.highlight || []).map((h) => cleanText(h)).filter(Boolean),
      keyTerms: (raw.keyTerms || []).filter((k) => k?.term && k?.meaning),
      qa: (raw.qa || []).filter((q) => q?.q && q?.a),
      columns: (raw.columns || []).filter((c) => c?.header),
    };
    // legacy `tone` -> `kind`
    if (b.type === "callout" && !b.kind) {
      b.kind = b.tone === "warning" ? "mistake" : b.tone === "exam" ? "exam" : "core";
    }
    if (b.type === "cover" || b.type === "toc") continue; // engine-owned
    if (isEmptyBlock(b)) continue;

    const sig = `${b.type}:${(b.text || b.term || b.formula || b.code || (b.items || []).join("|")).slice(0, 90).toLowerCase()}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    blocks.push(b);
  }

  // never two identical-kind callouts back to back
  const pruned = blocks.filter(
    (b, i) => !(b.type === "callout" && i > 0 && blocks[i - 1].type === "callout" && blocks[i - 1].kind === b.kind)
  );

  return { ...section, blocks: pruned };
}

/**
 * Paginate sections into pages: greedy fill with keep-with-next, section
 * continuation, and merging of short sections onto the same page.
 */
export function paginate(
  sections: NotebookSection[],
  style: NotebookStyle,
  opts: { title: string; subtitle: string }
): NotebookPage[] {
  const { height } = contentBox(style);
  const pages: NotebookPage[] = [];

  // cover
  pages.push({
    id: "cover",
    title: opts.title,
    blocks: [{ type: "cover", text: opts.title, meaning: opts.subtitle }],
  });

  let page: NotebookPage | null = null;
  let used = 0;

  const newPage = (section: NotebookSection, continued: boolean) => {
    page = { id: uid(), title: section.title, blocks: [], sectionId: section.id, continued };
    pages.push(page);
    used = 0;
  };

  sections.forEach((section) => {
    const blocks = section.blocks;
    if (!blocks.length) return;

    const remaining = page ? height - used : 0;
    const subH = blockHeight({ type: "subheading", text: section.title }, style) + 8;
    const firstH = blockHeight(blocks[0], style);
    /**
     * Fill the current page whenever the section can start on it meaningfully:
     * either the whole (short) section fits, or its title plus its first block
     * fit with room to spare — the continuation logic below carries the rest to
     * the next page. This removes the half-empty pages caused by only ever
     * sharing a page with sections that fit entirely.
     */
    const canShare =
      !!page &&
      remaining >= height * 0.18 &&
      subH + firstH + 16 <= remaining;

    if (!canShare) newPage(section, false);
    else page!.blocks.push({ type: "subheading", text: section.title });

    if (!canShare) {
      page!.blocks.push({ type: "heading", text: section.title });
      used += blockHeight({ type: "heading", text: section.title }, style);
    } else {
      used += blockHeight({ type: "subheading", text: section.title }, style) + 8;
    }

    blocks.forEach((b, index) => {
      const h = blockHeight(b, style);
      const placed: PlacedBlock = { ...b, ref: { sectionId: section.id, index } };

      if (used + h > height && page!.blocks.length) {
        // pull a trailing heading/subheading onto the next page with its body
        const trailing = page!.blocks[page!.blocks.length - 1];
        const carry = KEEP_WITH_NEXT.includes(trailing.type) ? page!.blocks.pop() : null;
        newPage(section, true);
        page!.blocks.push({ type: "heading", text: `${section.title} (cont.)` });
        used += blockHeight({ type: "heading", text: section.title }, style);
        if (carry) { page!.blocks.push(carry); used += blockHeight(carry, style); }
      }

      // a single block taller than a page still gets its own page rather than clipping
      page!.blocks.push(placed);
      used += h;
    });
  });

  return pages;
}

/** Insert a real contents page whose numbers match the final pagination. */
function withContents(pages: NotebookPage[], style: NotebookStyle): NotebookPage[] {
  const contentPages = pages.length - 1;
  if (contentPages < 5) return pages; // too short to deserve a contents page

  const build = (offset: number) => {
    const entries: { title: string; page: number }[] = [];
    pages.forEach((p, i) => {
      if (i === 0 || p.continued || !p.sectionId) return;
      if (entries.some((e) => e.title === p.title)) return;
      entries.push({ title: p.title, page: i + offset });
    });
    return entries;
  };

  const entries = build(1); // +1 because the contents page itself shifts everything
  if (!entries.length) return pages;

  const toc: NotebookPage = {
    id: "toc",
    title: "Contents",
    blocks: [{ type: "toc", text: "Contents", toc: entries }],
  };

  // If contents overflows one page, keep only what fits and drop the rest gracefully.
  const { height } = contentBox(style);
  const max = Math.floor((height - 64) / 34);
  if (entries.length > max) toc.blocks[0].toc = entries.slice(0, max);

  return [pages[0], toc, ...pages.slice(1)];
}

export interface QualityReport {
  pages: number;
  emptyPages: number;
  sparsePages: number;
  overflowPages: number;
  hasContents: boolean;
  diagrams: number;
  ok: boolean;
}

export function qualityReport(nb: Notebook): QualityReport {
  const { height } = contentBox(nb.style);
  let empty = 0, sparse = 0, over = 0, diagrams = 0;
  nb.pages.forEach((p, i) => {
    if (p.id === "cover") return;
    const h = p.blocks.reduce((s, b) => s + blockHeight(b, nb.style), 0);
    diagrams += p.blocks.filter((b) => b.type === "diagram").length;
    if (!p.blocks.length || h < 60) empty++;
    else if (h < height * 0.34 && i < nb.pages.length - 1) sparse++;
    if (h > height + 12) over++;
  });
  return {
    pages: nb.pages.length,
    emptyPages: empty,
    sparsePages: sparse,
    overflowPages: over,
    hasContents: nb.pages.some((p) => p.id === "toc"),
    diagrams,
    ok: empty === 0 && over === 0,
  };
}

/** Rebuild pages + contents from sections. Pure, no AI, no cost. */
export function composeNotebook(nb: Notebook): Notebook {
  const sections = (nb.sections || [])
    .map(sanitiseSection)
    .filter((s) => s.blocks.length);

  const pages = withContents(
    paginate(sections, nb.style, { title: nb.title, subtitle: nb.subtitle }),
    nb.style
  );

  return { ...nb, sections, pages: pages.filter((p) => p.blocks.length) };
}

/** Migrate legacy page-based notebooks (v1) into the section model. */
export function ensureSections(nb: Notebook): Notebook {
  if (nb.sections?.length) return composeNotebook(nb);

  const sections: NotebookSection[] = [];
  (nb.pages || []).forEach((p) => {
    const blocks = (p.blocks || []).filter((b) => b.type !== "cover" && b.type !== "toc");
    if (!blocks.length) return;
    const heading = blocks.find((b) => b.type === "heading");
    sections.push({
      id: p.id || uid(),
      title: heading?.text || p.title || "Notes",
      blocks: blocks.filter((b) => b.type !== "heading"),
    });
  });

  return composeNotebook({ ...nb, sections });
}

/* -------------------------------- generation ------------------------------ */

function normaliseSection(raw: any): NotebookSection {
  return sanitiseSection({
    id: raw?.id || uid(),
    title: String(raw?.title || "Notes").trim() || "Notes",
    blocks: Array.isArray(raw?.blocks) ? raw.blocks : [],
  });
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

  const sections = (data.sections || data.pages || []).map(normaliseSection).filter((s: NotebookSection) => s.blocks.length);
  if (!sections.length) throw new Error("The notebook came back empty. Try again.");

  const now = new Date().toISOString();
  return composeNotebook({
    title: data.title || input.pack.title,
    subtitle: data.subtitle || input.pack.topic || "",
    sections,
    pages: [],
    style: input.style,
    generatedAt: now,
    createdAt: now,
    updatedAt: now,
    lastGeneratedAt: now,
  });
}

/** Regenerate ONE section. Every other section — including manual edits — is untouched. */
export async function regenerateSection(input: {
  pack: KnowledgePack;
  notebook: Notebook;
  sectionId: string;
  profile: CareerProfile;
  noteStyle: string;
  instruction?: string;
}): Promise<Notebook> {
  const idx = input.notebook.sections.findIndex((s) => s.id === input.sectionId);
  if (idx < 0) throw new Error("That section no longer exists.");
  const section = input.notebook.sections[idx];

  const data = await invoke({
    mode: "section",
    pack: input.pack,
    profile: input.profile,
    sectionTitle: section.title,
    context: input.notebook.sections.map((s) => s.title),
    instruction: input.instruction,
    options: {
      noteStyle: input.noteStyle,
      depth: input.notebook.style.depth,
      diagramLevel: input.notebook.style.diagramLevel,
    },
  });

  const next = normaliseSection(data.section);
  if (!next.blocks.length) throw new Error("The regenerated section came back empty — your notes are unchanged.");

  const sections = [...input.notebook.sections];
  sections[idx] = { ...next, id: section.id, edited: false, updatedAt: new Date().toISOString() };
  return composeNotebook({ ...input.notebook, sections, lastGeneratedAt: new Date().toISOString() });
}

export type BlockAction =
  | "improve" | "shorter" | "exam" | "example" | "viva" | "code" | "mistake" | "trick" | "expand";

/** Selective AI on a single block: replaces only that block's slot in its section. */
export async function transformBlock(input: {
  pack: KnowledgePack;
  notebook: Notebook;
  sectionId: string;
  blockIndex: number;
  action: BlockAction;
  profile: CareerProfile;
  noteStyle: string;
  instruction?: string;
}): Promise<Notebook> {
  const idx = input.notebook.sections.findIndex((s) => s.id === input.sectionId);
  if (idx < 0) throw new Error("That section no longer exists.");
  const section = input.notebook.sections[idx];
  const target = section.blocks[input.blockIndex];
  if (!target) throw new Error("That block no longer exists.");

  const data = await invoke({
    mode: "blocks",
    pack: input.pack,
    profile: input.profile,
    sectionTitle: section.title,
    blocks: [target],
    action: input.action,
    instruction: input.instruction,
    options: {
      noteStyle: input.noteStyle,
      depth: input.notebook.style.depth,
      diagramLevel: input.notebook.style.diagramLevel,
    },
  });

  const replacement = sanitiseSection({ id: section.id, title: section.title, blocks: data.blocks || [] }).blocks;
  if (!replacement.length) throw new Error("The AI returned nothing usable — your content is unchanged.");

  const blocks = [...section.blocks];
  blocks.splice(input.blockIndex, 1, ...replacement);

  const sections = [...input.notebook.sections];
  sections[idx] = { ...section, blocks, updatedAt: new Date().toISOString() };
  return composeNotebook({ ...input.notebook, sections });
}

export async function regenerateDiagram(input: {
  pack: KnowledgePack;
  notebook: Notebook;
  sectionId: string;
  profile: CareerProfile;
  instruction?: string;
}): Promise<Notebook> {
  const idx = input.notebook.sections.findIndex((s) => s.id === input.sectionId);
  if (idx < 0) throw new Error("That section no longer exists.");
  const section = input.notebook.sections[idx];

  const context = section.blocks
    .map((b) => b.text || b.items?.join(", ") || b.term || "")
    .filter(Boolean)
    .slice(0, 6);

  const data = await invoke({
    mode: "diagram",
    pack: input.pack,
    profile: input.profile,
    sectionTitle: section.title,
    context,
    instruction: input.instruction,
  });
  if (!data.diagram) throw new Error("No diagram returned");

  const blocks = [...section.blocks];
  const at = blocks.findIndex((b) => b.type === "diagram");
  if (at >= 0) blocks[at] = { ...blocks[at], diagram: data.diagram };
  else blocks.push({ type: "diagram", diagram: data.diagram });

  const sections = [...input.notebook.sections];
  sections[idx] = { ...section, blocks, updatedAt: new Date().toISOString() };
  return composeNotebook({ ...input.notebook, sections });
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
