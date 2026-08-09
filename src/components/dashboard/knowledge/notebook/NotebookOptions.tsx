import { HAND_PRESETS, INK, PAPER_LABELS, type NotebookStyle, type HandStyle, type PaperStyle, type InkStyle, type Depth, type DiagramLevel, type PageSize } from "@/lib/notebook";

interface Props {
  style: NotebookStyle;
  onChange: (next: NotebookStyle) => void;
  compact?: boolean;
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-[11px] uppercase tracking-wide text-muted-foreground w-24 shrink-0">{label}</span>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

const Chip = ({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
      active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const NotebookOptions = ({ style, onChange, compact }: Props) => {
  const set = (patch: Partial<NotebookStyle>) => onChange({ ...style, ...patch });

  return (
    <div className="space-y-3">
      <Row label="Handwriting">
        {(Object.keys(HAND_PRESETS) as HandStyle[]).map((h) => (
          <Chip key={h} active={style.hand === h} onClick={() => set({ hand: h })} label={`Handwriting ${HAND_PRESETS[h].label}`}>
            <span style={{ fontFamily: HAND_PRESETS[h].family }}>{HAND_PRESETS[h].label}</span>
          </Chip>
        ))}
      </Row>

      <Row label="Paper">
        {(Object.keys(PAPER_LABELS) as PaperStyle[]).map((p) => (
          <Chip key={p} active={style.paper === p} onClick={() => set({ paper: p })} label={`Paper ${PAPER_LABELS[p]}`}>
            {PAPER_LABELS[p]}
          </Chip>
        ))}
      </Row>

      <Row label="Ink">
        {(Object.keys(INK) as InkStyle[]).map((k) => (
          <Chip key={k} active={style.ink === k} onClick={() => set({ ink: k })} label={INK[k].label}>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: INK[k].primary, boxShadow: k === "duo" ? `3px 0 0 ${INK[k].secondary}` : undefined }} />
              {INK[k].label}
            </span>
          </Chip>
        ))}
      </Row>

      {!compact && (
        <>
          <Row label="Depth">
            {(["short", "medium", "detailed"] as Depth[]).map((d) => (
              <Chip key={d} active={style.depth === d} onClick={() => set({ depth: d })} label={`Depth ${d}`}>
                {d === "short" ? "Short (5–8 pages)" : d === "medium" ? "Medium (10–15)" : "Detailed (15–30)"}
              </Chip>
            ))}
          </Row>

          <Row label="Diagrams">
            {(["minimal", "balanced", "heavy"] as DiagramLevel[]).map((d) => (
              <Chip key={d} active={style.diagramLevel === d} onClick={() => set({ diagramLevel: d })} label={`Diagram level ${d}`}>
                {d === "heavy" ? "Visual heavy" : d[0].toUpperCase() + d.slice(1)}
              </Chip>
            ))}
          </Row>
        </>
      )}

      <Row label="Page size">
        {(["a4", "letter"] as PageSize[]).map((s) => (
          <Chip key={s} active={style.pageSize === s} onClick={() => set({ pageSize: s })} label={`Page size ${s}`}>
            {s.toUpperCase()}
          </Chip>
        ))}
      </Row>
    </div>
  );
};

export default NotebookOptions;
