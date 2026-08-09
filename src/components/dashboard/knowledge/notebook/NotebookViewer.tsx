import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Grid3x3, Maximize2, Minimize2, ZoomIn, ZoomOut,
  RefreshCw, Download, Printer, Image as ImageIcon, Trash2, ArrowUp, ArrowDown,
  Plus, Pencil, Save, Sparkles,
} from "lucide-react";
import NotebookPageView from "./NotebookPageView";
import NotebookOptions from "./NotebookOptions";
import {
  PAGE_DIMS, exportNotebookPdf, exportPagePng, regenerateDiagram, regeneratePage,
  type Notebook, type NotebookStyle,
} from "@/lib/notebook";
import type { KnowledgePack } from "@/lib/knowledge";
import type { CareerProfile } from "@/hooks/useCareerProfile";

interface Props {
  notebook: Notebook;
  pack: KnowledgePack;
  profile: CareerProfile;
  noteStyle: string;
  onChange: (next: Notebook) => void;
}

const NotebookViewer = ({ notebook, pack, profile, noteStyle, onChange }: Props) => {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(0.8);
  const [grid, setGrid] = useState(false);
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [exportInfo, setExportInfo] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const hiddenRef = useRef<HTMLDivElement>(null);

  const total = notebook.pages.length;
  const current = notebook.pages[Math.min(page, total - 1)];
  const dims = PAGE_DIMS[notebook.style.pageSize];

  useEffect(() => { if (page > total - 1) setPage(Math.max(total - 1, 0)); }, [total, page]);

  // Fit-to-width on mount / resize so A4 proportions are never stretched.
  useEffect(() => {
    const fit = () => {
      const w = stageRef.current?.clientWidth || 0;
      if (w) setZoom(Math.min(1.1, Math.max(0.32, (w - 24) / dims.w)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [dims.w, full]);

  const go = useCallback((d: number) => setPage((p) => Math.min(total - 1, Math.max(0, p + d))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const setStyle = (style: NotebookStyle) => onChange({ ...notebook, style });

  const updatePages = (pages: Notebook["pages"]) => onChange({ ...notebook, pages });

  const doRegeneratePage = async () => {
    setBusy("page");
    try {
      const next = await regeneratePage({ pack, notebook, pageIndex: page, profile, noteStyle });
      const pages = [...notebook.pages];
      pages[page] = next;
      updatePages(pages);
      toast.success("Page regenerated");
    } catch (e) {
      toast.error(`${(e as Error).message} — your notes are safe.`);
    } finally { setBusy(null); }
  };

  const doRegenerateDiagram = async () => {
    setBusy("diagram");
    try {
      const spec = await regenerateDiagram({ pack, notebook, pageIndex: page, profile });
      const pages = notebook.pages.map((p, i) => {
        if (i !== page) return p;
        const idx = p.blocks.findIndex((b) => b.type === "diagram");
        const blocks = [...p.blocks];
        if (idx >= 0) blocks[idx] = { ...blocks[idx], diagram: spec };
        else blocks.push({ type: "diagram", diagram: spec });
        return { ...p, blocks };
      });
      updatePages(pages);
      toast.success("Diagram redrawn");
    } catch (e) {
      toast.error(`Diagram failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  };

  const editBlock = (blockIndex: number, value: string) => {
    const pages = notebook.pages.map((p, i) => {
      if (i !== page) return p;
      const blocks = p.blocks.map((b, j) => (j === blockIndex ? { ...b, text: value } : b));
      return { ...p, blocks };
    });
    updatePages(pages);
  };

  const movePage = (dir: number) => {
    const target = page + dir;
    if (target < 0 || target >= total) return;
    const pages = [...notebook.pages];
    [pages[page], pages[target]] = [pages[target], pages[page]];
    updatePages(pages);
    setPage(target);
  };

  const addPage = () => {
    const pages = [...notebook.pages];
    pages.splice(page + 1, 0, {
      id: Math.random().toString(36).slice(2, 10),
      title: "New page",
      blocks: [{ type: "heading", text: "New page" }, { type: "text", text: "Write here, or regenerate this page with AI." }],
    });
    updatePages(pages);
    setPage(page + 1);
  };

  const deletePage = () => {
    if (total <= 1) return toast.error("A notebook needs at least one page.");
    updatePages(notebook.pages.filter((_, i) => i !== page));
    setPage(Math.max(0, page - 1));
  };

  const exportPdf = async () => {
    setBusy("pdf");
    setExportInfo("Preparing pages…");
    try {
      // Render every page off-screen at full size so nothing is clipped or scaled.
      const nodes = Array.from(hiddenRef.current?.querySelectorAll<HTMLElement>("[data-notebook-page]") || []);
      if (!nodes.length) throw new Error("Nothing to export");
      await exportNotebookPdf(
        nodes,
        `${(notebook.title || "notebook").replace(/[^\w\s-]/g, "").slice(0, 60)}.pdf`,
        notebook.style.pageSize,
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
      await exportPagePng(el, `${(notebook.title || "page").slice(0, 40)}-p${page + 1}.png`);
      toast.success("Page saved as PNG");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const doPrint = () => {
    const nodes = Array.from(hiddenRef.current?.querySelectorAll<HTMLElement>("[data-notebook-page]") || []);
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(`<html><head><title>${notebook.title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Caveat&family=Patrick+Hand&family=Kalam&family=Architects+Daughter&family=Shadows+Into+Light+Two&display=swap" rel="stylesheet">
      <style>@page{size:${notebook.style.pageSize === "a4" ? "A4" : "letter"};margin:0}
      body{margin:0}
      .pg{page-break-after:always;overflow:hidden}</style></head><body>
      ${nodes.map((n) => `<div class="pg">${n.outerHTML}</div>`).join("")}
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 700);
  };

  const thumbScale = useMemo(() => 150 / dims.w, [dims.w]);

  const toolBtn = "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg glass-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40";

  const stage = (
    <div className={full ? "fixed inset-0 z-[80] bg-background/98 flex flex-col p-4" : "space-y-3"}>
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
        <button className={toolBtn} onClick={() => setEditing((e) => !e)} aria-label="Toggle text editing">
          {editing ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />} {editing ? "Done" : "Edit"}
        </button>
        <button className={toolBtn} onClick={doRegeneratePage} disabled={!!busy} aria-label="Regenerate this page">
          <RefreshCw className={`w-3.5 h-3.5 ${busy === "page" ? "animate-spin" : ""}`} /> Page
        </button>
        <button className={toolBtn} onClick={doRegenerateDiagram} disabled={!!busy} aria-label="Regenerate the diagram on this page">
          <RefreshCw className={`w-3.5 h-3.5 ${busy === "diagram" ? "animate-spin" : ""}`} /> Diagram
        </button>
        <button className={toolBtn} onClick={exportPdf} disabled={!!busy} aria-label="Export notebook as PDF">
          <Download className={`w-3.5 h-3.5 ${busy === "pdf" ? "animate-pulse" : ""}`} /> PDF
        </button>
        <button className={toolBtn} onClick={exportPng} disabled={!!busy} aria-label="Export current page as PNG">
          <ImageIcon className="w-3.5 h-3.5" /> PNG
        </button>
        <button className={toolBtn} onClick={doPrint} aria-label="Print notebook"><Printer className="w-3.5 h-3.5" /> Print</button>
      </div>

      {exportInfo && <p className="text-xs text-primary">{exportInfo}</p>}

      {showStyle && (
        <div className="glass-card p-4">
          <NotebookOptions style={notebook.style} onChange={setStyle} compact />
          <p className="text-[11px] text-muted-foreground mt-3">
            Style changes re-render instantly — no AI call, no cost.
          </p>
        </div>
      )}

      {/* page actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button className={toolBtn} onClick={addPage} aria-label="Add page"><Plus className="w-3.5 h-3.5" /> Add</button>
        <button className={toolBtn} onClick={() => movePage(-1)} disabled={page === 0} aria-label="Move page up"><ArrowUp className="w-3.5 h-3.5" /></button>
        <button className={toolBtn} onClick={() => movePage(1)} disabled={page >= total - 1} aria-label="Move page down"><ArrowDown className="w-3.5 h-3.5" /></button>
        <button className={toolBtn} onClick={deletePage} aria-label="Delete page"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
      </div>

      <div ref={stageRef} className={`overflow-auto rounded-xl bg-muted/10 p-3 ${full ? "flex-1" : ""}`}>
        {grid ? (
          <div className="flex flex-wrap gap-4 justify-center">
            {notebook.pages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setPage(i); setGrid(false); }}
                aria-label={`Go to page ${i + 1}`}
                className={`rounded-md overflow-hidden border transition-all ${i === page ? "border-primary" : "border-border hover:border-primary/50"}`}
                style={{ width: 150, height: dims.h * thumbScale }}
              >
                <div style={{ transform: `scale(${thumbScale})`, transformOrigin: "top left", pointerEvents: "none" }}>
                  <NotebookPageView page={p} index={i} total={total} style={notebook.style} notebookTitle={notebook.title} />
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
                  style={notebook.style}
                  notebookTitle={notebook.title}
                  editable={editing}
                  onEditBlock={editBlock}
                />
              )}
            </motion.div>
          </div>
        )}
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
        {notebook.pages.map((p, i) => (
          <NotebookPageView key={`x-${p.id}`} page={p} index={i} total={total} style={notebook.style} notebookTitle={notebook.title} />
        ))}
      </div>
    </>
  );
};

export default NotebookViewer;
