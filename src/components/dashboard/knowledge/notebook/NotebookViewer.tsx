import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Grid3x3, Maximize2, Minimize2, ZoomIn, ZoomOut,
  RefreshCw, Download, Printer, Image as ImageIcon, Trash2, ArrowUp, ArrowDown,
  Plus, Pencil, Save, Sparkles, X, Wand2,
} from "lucide-react";
import NotebookPageView from "./NotebookPageView";
import NotebookOptions from "./NotebookOptions";
import {
  PAGE_DIMS, composeNotebook, ensureSections, exportNotebookPdf, exportPagePng,
  qualityReport, regenerateDiagram, regenerateSection, transformBlock,
  type BlockAction, type Notebook, type NotebookBlock, type NotebookStyle,
} from "@/lib/notebook";
import type { KnowledgePack } from "@/lib/knowledge";
import type { CareerProfile } from "@/hooks/useCareerProfile";

interface Props {
  notebook: Notebook;
  pack: KnowledgePack;
  profile: CareerProfile;
  noteStyle: string;
  /** Called only when the user saves, or when a cost-free style change happens. */
  onChange: (next: Notebook) => void;
}

const ACTIONS: { id: BlockAction; label: string }[] = [
  { id: "improve", label: "Improve" },
  { id: "shorter", label: "Shorter" },
  { id: "expand", label: "Expand" },
  { id: "exam", label: "Exam focus" },
  { id: "example", label: "Add example" },
  { id: "code", label: "Add code" },
  { id: "viva", label: "Add viva" },
  { id: "mistake", label: "Add mistake" },
  { id: "trick", label: "Memory trick" },
];

/** Short human label for a block in the editor list. */
function blockLabel(b: NotebookBlock) {
  const t = b.text || b.term || b.formula || (b.items || [])[0] || b.code || b.diagram?.title || (b.qa || [])[0]?.q || "";
  return `${b.type}${b.kind ? ` · ${b.kind}` : ""} — ${String(t).slice(0, 60)}`;
}

const NotebookViewer = ({ notebook, pack, profile, noteStyle, onChange }: Props) => {
  const base = useMemo(() => ensureSections(notebook), [notebook]);
  const [draft, setDraft] = useState<Notebook | null>(null);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(0.8);
  const [grid, setGrid] = useState(false);
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showStyle, setShowStyle] = useState(false);
  const [exportInfo, setExportInfo] = useState("");
  const [selected, setSelected] = useState<{ sectionId: string; index: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const hiddenRef = useRef<HTMLDivElement>(null);

  const view = draft ?? base;
  const editing = !!draft;
  const dirty = editing && JSON.stringify(draft?.sections) !== JSON.stringify(base.sections);

  const total = view.pages.length;
  const current = view.pages[Math.min(page, total - 1)];
  const dims = PAGE_DIMS[view.style.pageSize];
  const quality = useMemo(() => qualityReport(view), [view]);
  const currentSection = current?.sectionId
    ? view.sections.find((s) => s.id === current.sectionId) || null
    : null;

  useEffect(() => { if (page > total - 1) setPage(Math.max(total - 1, 0)); }, [total, page]);

  useEffect(() => {
    const fit = () => {
      const w = stageRef.current?.clientWidth || 0;
      if (w) setZoom(Math.min(1.1, Math.max(0.3, (w - 24) / dims.w)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [dims.w, full]);

  // Guard against losing manual edits on refresh / navigation.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const go = useCallback((d: number) => setPage((p) => Math.min(total - 1, Math.max(0, p + d))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.isContentEditable || ["INPUT", "TEXTAREA"].includes(el?.tagName)) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  /* ------------------------------- editing -------------------------------- */

  const startEdit = () => { setDraft(base); setSelected(null); };

  const cancelEdit = () => {
    if (dirty && !window.confirm("Discard your unsaved changes to this notebook?")) return;
    setDraft(null);
    setSelected(null);
  };

  const saveEdit = () => {
    if (!draft) return;
    onChange(composeNotebook({ ...draft, updatedAt: new Date().toISOString() }));
    setDraft(null);
    setSelected(null);
    toast.success("Notebook saved");
  };

  const patchBlock = (sectionId: string, index: number, patch: Partial<NotebookBlock>) => {
    setDraft((d) => {
      const source = d ?? base;
      const sections = source.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              edited: true,
              updatedAt: new Date().toISOString(),
              blocks: s.blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)),
            }
      );
      return composeNotebook({ ...source, sections });
    });
  };

  const removeBlock = (sectionId: string, index: number) => {
    setDraft((d) => {
      const source = d ?? base;
      const sections = source.sections.map((s) =>
        s.id !== sectionId ? s : { ...s, edited: true, blocks: s.blocks.filter((_, i) => i !== index) }
      );
      return composeNotebook({ ...source, sections });
    });
    setSelected(null);
  };

  const renameSection = (sectionId: string, title: string) => {
    setDraft((d) => {
      const source = d ?? base;
      const sections = source.sections.map((s) => (s.id === sectionId ? { ...s, title, edited: true } : s));
      return composeNotebook({ ...source, sections });
    });
  };

  const moveSection = (sectionId: string, dir: number) => {
    setDraft((d) => {
      const source = d ?? base;
      const sections = [...source.sections];
      const i = sections.findIndex((s) => s.id === sectionId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sections.length) return source;
      [sections[i], sections[j]] = [sections[j], sections[i]];
      return composeNotebook({ ...source, sections });
    });
  };

  const deleteSection = (sectionId: string) => {
    setDraft((d) => {
      const source = d ?? base;
      if (source.sections.length <= 1) { toast.error("A notebook needs at least one section."); return source; }
      return composeNotebook({ ...source, sections: source.sections.filter((s) => s.id !== sectionId) });
    });
    setPage((p) => Math.max(0, p - 1));
  };

  const addSection = () => {
    setDraft((d) => {
      const source = d ?? base;
      const at = currentSection ? source.sections.findIndex((s) => s.id === currentSection.id) + 1 : source.sections.length;
      const sections = [...source.sections];
      sections.splice(at, 0, {
        id: Math.random().toString(36).slice(2, 10),
        title: "New section",
        edited: true,
        blocks: [{ type: "text", text: "Write your own notes here, or use an AI action on this block." }],
      });
      return composeNotebook({ ...source, sections });
    });
  };

  const addBlock = (sectionId: string, type: NotebookBlock["type"]) => {
    setDraft((d) => {
      const source = d ?? base;
      const seed: NotebookBlock =
        type === "bullets" ? { type, items: ["New point"] } :
        type === "definition" ? { type, term: "Term", meaning: "Meaning" } :
        type === "code" ? { type, code: "// code", language: "text" } :
        type === "viva" ? { type, qa: [{ q: "Question?", a: "Answer" }] } :
        { type, text: "New note" };
      const sections = source.sections.map((s) =>
        s.id !== sectionId ? s : { ...s, edited: true, blocks: [...s.blocks, seed] }
      );
      return composeNotebook({ ...source, sections });
    });
  };

  /* -------------------------------- AI ops -------------------------------- */

  const applyAI = async (fn: () => Promise<Notebook>, key: string, ok: string) => {
    setBusy(key);
    try {
      const next = await fn();
      if (editing) setDraft(next);
      else onChange({ ...next, updatedAt: new Date().toISOString() });
      toast.success(ok);
    } catch (e) {
      toast.error(`${(e as Error).message} — your notes are safe.`);
    } finally { setBusy(null); }
  };

  const doRegenerateSection = () => {
    if (!currentSection) return toast.error("Pick a content page first.");
    if (currentSection.edited && !window.confirm("This section has manual edits. Regenerating replaces them. Continue?")) return;
    applyAI(
      () => regenerateSection({ pack, notebook: view, sectionId: currentSection.id, profile, noteStyle }),
      "section", "Section regenerated"
    );
  };

  const doRegenerateDiagram = () => {
    if (!currentSection) return toast.error("Pick a content page first.");
    applyAI(
      () => regenerateDiagram({ pack, notebook: view, sectionId: currentSection.id, profile }),
      "diagram", "Diagram redrawn"
    );
  };

  const doBlockAction = (action: BlockAction) => {
    if (!selected) return;
    applyAI(
      () => transformBlock({ pack, notebook: view, sectionId: selected.sectionId, blockIndex: selected.index, action, profile, noteStyle }),
      action, "Updated — only this part changed"
    );
  };

  /* -------------------------------- export -------------------------------- */

  const exportPdf = async () => {
    setBusy("pdf");
    setExportInfo("Preparing pages…");
    try {
      const nodes = Array.from(hiddenRef.current?.querySelectorAll<HTMLElement>("[data-notebook-page]") || []);
      if (!nodes.length) throw new Error("Nothing to export");
      await exportNotebookPdf(
        nodes,
        `${(view.title || "notebook").replace(/[^\w\s-]/g, "").slice(0, 60)}.pdf`,
        view.style.pageSize,
        (d, t) => setExportInfo(`Rendering page ${d} of ${t}…`)
      );
      toast.success("Notebook exported as PDF");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); setExportInfo(""); }
  };

  const exportPng = async () => {
    const el = pageRefs.current[page];
    if (!el) return;
    setBusy("png");
    try {
      await exportPagePng(el, `${(view.title || "page").slice(0, 40)}-p${page + 1}.png`);
      toast.success("Page saved as PNG");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const doPrint = () => {
    const nodes = Array.from(hiddenRef.current?.querySelectorAll<HTMLElement>("[data-notebook-page]") || []);
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(`<html><head><title>${view.title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Caveat&family=Patrick+Hand&family=Kalam&family=Architects+Daughter&family=Shadows+Into+Light+Two&display=swap" rel="stylesheet">
      <style>@page{size:${view.style.pageSize === "a4" ? "A4" : "letter"};margin:0}
      body{margin:0}
      .pg{page-break-after:always;overflow:hidden}</style></head><body>
      ${nodes.map((n) => `<div class="pg">${n.outerHTML}</div>`).join("")}
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 700);
  };

  const thumbScale = useMemo(() => 150 / dims.w, [dims.w]);
  const toolBtn = "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg glass-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40";

  /* ------------------------------- editor UI ------------------------------ */

  const editorPanel = editing && (
    <div className="glass-card p-4 space-y-3 max-h-[70vh] overflow-auto">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Editing page {page + 1}</p>
        {dirty && <span className="text-[11px] text-amber-400">Unsaved changes</span>}
      </div>

      {currentSection ? (
        <>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Section title</span>
            <input
              value={currentSection.title}
              onChange={(e) => renameSection(currentSection.id, e.target.value)}
              className="mt-1 w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button className={toolBtn} onClick={() => moveSection(currentSection.id, -1)}><ArrowUp className="w-3.5 h-3.5" /> Move up</button>
            <button className={toolBtn} onClick={() => moveSection(currentSection.id, 1)}><ArrowDown className="w-3.5 h-3.5" /> Move down</button>
            <button className={toolBtn} onClick={addSection}><Plus className="w-3.5 h-3.5" /> Add section</button>
            <button className={toolBtn} onClick={() => deleteSection(currentSection.id)}><Trash2 className="w-3.5 h-3.5" /> Delete section</button>
          </div>

          <div className="space-y-3">
            {currentSection.blocks.map((b, i) => {
              const active = selected?.sectionId === currentSection.id && selected.index === i;
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 space-y-2 transition-colors ${active ? "border-primary/60 bg-primary/5" : "border-border"}`}
                >
                  <button
                    onClick={() => setSelected(active ? null : { sectionId: currentSection.id, index: i })}
                    className="w-full text-left text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    {blockLabel(b)}
                  </button>

                  {["text", "subheading", "callout", "example", "steps", "formula", "code", "table", "viva", "diagram"].includes(b.type) && (
                    <textarea
                      value={b.text || ""}
                      onChange={(e) => patchBlock(currentSection.id, i, { text: e.target.value })}
                      rows={2}
                      placeholder={b.type === "formula" ? "Caption" : "Text"}
                      className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 resize-y"
                    />
                  )}

                  {b.type === "definition" && (
                    <>
                      <input
                        value={b.term || ""}
                        onChange={(e) => patchBlock(currentSection.id, i, { term: e.target.value })}
                        className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                      />
                      <textarea
                        value={b.meaning || ""}
                        onChange={(e) => patchBlock(currentSection.id, i, { meaning: e.target.value })}
                        rows={2}
                        className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 resize-y"
                      />
                    </>
                  )}

                  {(b.type === "bullets" || b.type === "steps") && (
                    <textarea
                      value={(b.items || []).join("\n")}
                      onChange={(e) => patchBlock(currentSection.id, i, { items: e.target.value.split("\n") })}
                      rows={Math.min(8, Math.max(2, (b.items || []).length))}
                      className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 resize-y"
                    />
                  )}

                  {b.type === "formula" && (
                    <input
                      value={b.formula || ""}
                      onChange={(e) => patchBlock(currentSection.id, i, { formula: e.target.value })}
                      className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-primary/50"
                    />
                  )}

                  {b.type === "code" && (
                    <>
                      <textarea
                        value={b.code || ""}
                        onChange={(e) => patchBlock(currentSection.id, i, { code: e.target.value })}
                        rows={6}
                        spellCheck={false}
                        className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-primary/50 resize-y"
                      />
                      <input
                        value={b.output || ""}
                        onChange={(e) => patchBlock(currentSection.id, i, { output: e.target.value })}
                        placeholder="Expected output (optional)"
                        className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-primary/50"
                      />
                    </>
                  )}

                  {b.type === "viva" && (b.qa || []).map((q, j) => (
                    <div key={j} className="space-y-1">
                      <input
                        value={q.q}
                        onChange={(e) => patchBlock(currentSection.id, i, {
                          qa: (b.qa || []).map((x, k) => (k === j ? { ...x, q: e.target.value } : x)),
                        })}
                        className="w-full bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                      />
                      <input
                        value={q.a}
                        onChange={(e) => patchBlock(currentSection.id, i, {
                          qa: (b.qa || []).map((x, k) => (k === j ? { ...x, a: e.target.value } : x)),
                        })}
                        className="w-full bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                      />
                    </div>
                  ))}

                  {b.type === "diagram" && b.diagram && (
                    <input
                      value={b.diagram.title || ""}
                      onChange={(e) => patchBlock(currentSection.id, i, { diagram: { ...b.diagram!, title: e.target.value } })}
                      placeholder="Diagram caption"
                      className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                    />
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ACTIONS.map((a) => (
                      <button
                        key={a.id}
                        disabled={!!busy}
                        onClick={() => { setSelected({ sectionId: currentSection.id, index: i }); doBlockAction(a.id); }}
                        className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40"
                      >
                        {busy === a.id && active ? "…" : a.label}
                      </button>
                    ))}
                    <button
                      onClick={() => removeBlock(currentSection.id, i)}
                      className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {(["text", "bullets", "definition", "example", "code", "steps", "viva"] as NotebookBlock["type"][]).map((t) => (
              <button key={t} className={toolBtn} onClick={() => addBlock(currentSection.id, t)}>
                <Plus className="w-3 h-3" /> {t}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          This is the cover or contents page — both are generated automatically from your sections and page numbers.
          Move to a content page to edit it.
        </p>
      )}
    </div>
  );

  const stage = (
    <div className={full ? "fixed inset-0 z-[80] bg-background/98 flex flex-col p-4 overflow-auto" : "space-y-3"}>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button className={toolBtn} onClick={() => go(-1)} disabled={page === 0} aria-label="Previous page">
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <span className="text-xs text-muted-foreground px-1" aria-live="polite">Page {page + 1} / {total}</span>
        <button className={toolBtn} onClick={() => go(1)} disabled={page >= total - 1} aria-label="Next page">
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button className={toolBtn} onClick={() => setGrid((g) => !g)} aria-label="Toggle page grid">
          <Grid3x3 className="w-3.5 h-3.5" /> {grid ? "Pages" : "Grid"}
        </button>
        <button className={toolBtn} onClick={() => setZoom((z) => Math.max(0.3, z - 0.12))} aria-label="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
        <button className={toolBtn} onClick={() => setZoom((z) => Math.min(1.8, z + 0.12))} aria-label="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
        <button className={toolBtn} onClick={() => setFull((f) => !f)} aria-label="Toggle fullscreen">
          {full ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <div className="flex-1" />

        <button className={toolBtn} onClick={() => setShowStyle((s) => !s)} aria-label="Change notebook style">
          <Sparkles className="w-3.5 h-3.5" /> Style
        </button>

        {editing ? (
          <>
            <button className={`${toolBtn} !text-foreground border border-primary/50`} onClick={saveEdit} aria-label="Save changes">
              <Save className="w-3.5 h-3.5" /> Save changes
            </button>
            <button className={toolBtn} onClick={cancelEdit} aria-label="Cancel editing">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </>
        ) : (
          <button className={toolBtn} onClick={startEdit} aria-label="Edit notebook">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}

        <button className={toolBtn} onClick={doRegenerateSection} disabled={!!busy || !currentSection} aria-label="Regenerate this section">
          <RefreshCw className={`w-3.5 h-3.5 ${busy === "section" ? "animate-spin" : ""}`} /> Section
        </button>
        <button className={toolBtn} onClick={doRegenerateDiagram} disabled={!!busy || !currentSection} aria-label="Regenerate the diagram">
          <Wand2 className={`w-3.5 h-3.5 ${busy === "diagram" ? "animate-spin" : ""}`} /> Diagram
        </button>
        <button className={toolBtn} onClick={exportPdf} disabled={!!busy} aria-label="Export notebook as PDF">
          <Download className={`w-3.5 h-3.5 ${busy === "pdf" ? "animate-pulse" : ""}`} /> PDF
        </button>
        <button className={toolBtn} onClick={exportPng} disabled={!!busy} aria-label="Export current page as PNG">
          <ImageIcon className="w-3.5 h-3.5" /> PNG
        </button>
        <button className={toolBtn} onClick={doPrint} aria-label="Print notebook"><Printer className="w-3.5 h-3.5" /> Print</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span>{total} pages</span>
        <span>{view.sections.length} sections</span>
        <span>{quality.diagrams} diagrams</span>
        {quality.hasContents && <span>contents ✓</span>}
        {view.updatedAt && <span>updated {new Date(view.updatedAt).toLocaleDateString()}</span>}
        {!quality.ok && <span className="text-amber-400">layout repaired on render</span>}
      </div>

      {exportInfo && <p className="text-xs text-primary">{exportInfo}</p>}

      {showStyle && (
        <div className="glass-card p-4">
          <NotebookOptions
            style={view.style}
            onChange={(style: NotebookStyle) => {
              const next = composeNotebook({ ...view, style });
              if (editing) setDraft(next); else onChange(next);
            }}
            compact
          />
          <p className="text-[11px] text-muted-foreground mt-3">
            Style changes re-typeset the notebook instantly — no AI call, no cost.
          </p>
        </div>
      )}

      <div className={editing ? "grid gap-4 lg:grid-cols-[minmax(0,1fr),380px]" : ""}>
        <div ref={stageRef} className={`overflow-auto rounded-xl bg-muted/10 p-3 ${full ? "flex-1" : ""}`}>
          {grid ? (
            <div className="flex flex-wrap gap-4 justify-center">
              {view.pages.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => { setPage(i); setGrid(false); }}
                  aria-label={`Go to page ${i + 1}`}
                  className={`rounded-md overflow-hidden border transition-all ${i === page ? "border-primary" : "border-border hover:border-primary/50"}`}
                  style={{ width: 150, height: dims.h * thumbScale }}
                >
                  <div style={{ transform: `scale(${thumbScale})`, transformOrigin: "top left", pointerEvents: "none" }}>
                    <NotebookPageView page={p} index={i} total={total} style={view.style} notebookTitle={view.title} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex justify-center" style={{ height: dims.h * zoom }}>
              <motion.div
                key={current?.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center", width: dims.w }}
              >
                {current && (
                  <NotebookPageView
                    ref={(el) => { pageRefs.current[page] = el; }}
                    page={current}
                    index={page}
                    total={total}
                    style={view.style}
                    notebookTitle={view.title}
                    activeRef={editing ? selected : null}
                  />
                )}
              </motion.div>
            </div>
          )}
        </div>
        {editorPanel}
      </div>
    </div>
  );

  return (
    <>
      {stage}
      {/* Off-screen full-size render used for PDF/print so exports never contain UI */}
      <div
        ref={hiddenRef}
        aria-hidden="true"
        style={{ position: "fixed", left: -100000, top: 0, width: dims.w, pointerEvents: "none" }}
      >
        {view.pages.map((p, i) => (
          <NotebookPageView key={`x-${p.id}`} page={p} index={i} total={total} style={view.style} notebookTitle={view.title} />
        ))}
      </div>
    </>
  );
};

export default NotebookViewer;
