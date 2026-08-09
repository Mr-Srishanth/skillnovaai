import { useMemo } from "react";
import type { DiagramSpec, DiagramNode } from "@/lib/notebook";

interface Props {
  spec: DiagramSpec;
  ink: string;
  accent: string;
  font: string;
  width?: number;
}

/* deterministic pseudo-random so a diagram never jitters between renders */
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };
}

function hash(str: string) {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
  return h;
}

/** Hand-drawn rounded rectangle path with a light, legible wobble. */
function roughRect(x: number, y: number, w: number, h: number, r: number, jitter: () => number) {
  const j = (m = 1.4) => jitter() * m;
  return [
    `M ${x + r + j()} ${y + j()}`,
    `L ${x + w - r + j()} ${y + j()}`,
    `Q ${x + w + j()} ${y + j()} ${x + w + j()} ${y + r + j()}`,
    `L ${x + w + j()} ${y + h - r + j()}`,
    `Q ${x + w + j()} ${y + h + j()} ${x + w - r + j()} ${y + h + j()}`,
    `L ${x + r + j()} ${y + h + j()}`,
    `Q ${x + j()} ${y + h + j()} ${x + j()} ${y + h - r + j()}`,
    `L ${x + j()} ${y + r + j()}`,
    `Q ${x + j()} ${y + j()} ${x + r + j()} ${y + j()}`,
  ].join(" ");
}

function roughLine(x1: number, y1: number, x2: number, y2: number, jitter: () => number) {
  const mx = (x1 + x2) / 2 + jitter() * 4;
  const my = (y1 + y2) / 2 + jitter() * 4;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

function clamp(text: string, n: number) {
  const t = String(text || "");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Simple word wrap for SVG labels. */
function wrap(text: string, perLine: number, maxLines: number) {
  const words = String(text || "").split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > perLine) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else cur = `${cur} ${w}`;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, maxLines).map((l, i) => (i === maxLines - 1 && lines.length > maxLines ? `${l}…` : l));
}

interface Box { node: DiagramNode; x: number; y: number; w: number; h: number }

const NotebookDiagram = ({ spec, ink, accent, font, width = 600 }: Props) => {
  const layout = useMemo(() => {
    const jitter = rng(hash(spec.title || "d") + (spec.nodes?.length || 0));
    const nodes = spec.nodes || [];
    const edges = spec.edges || [];
    const W = width;
    const boxes: Box[] = [];
    const links: { from: Box; to: Box; label?: string; curve?: boolean }[] = [];
    let H = 120;

    const byId = (id: string) => boxes.find((b) => b.node.id === id);

    if (spec.kind === "comparison" && spec.columns?.length) {
      const cols = spec.columns.slice(0, 3);
      const gap = 16;
      const cw = (W - gap * (cols.length - 1)) / cols.length;
      const rows = Math.max(...cols.map((c) => c.items.length));
      H = 54 + rows * 26 + 20;
      return { kind: "comparison" as const, cols, cw, gap, H, jitter, boxes, links };
    }

    if (spec.kind === "timeline") {
      const n = Math.max(nodes.length, 1);
      const stepW = Math.min(150, (W - 30) / n);
      H = 190;
      nodes.forEach((node, i) => {
        boxes.push({ node, x: 20 + i * stepW, y: i % 2 === 0 ? 26 : 108, w: stepW - 14, h: 52 });
      });
      return { kind: "timeline" as const, H, jitter, boxes, links };
    }

    if (spec.kind === "network") {
      const [hub, ...rest] = nodes;
      if (!hub) return { kind: "flow" as const, H, jitter, boxes, links };
      H = 330;
      const cx = W / 2, cy = H / 2;
      boxes.push({ node: hub, x: cx - 80, y: cy - 26, w: 160, h: 52 });
      const R = Math.min(W / 2 - 90, 190);
      rest.slice(0, 7).forEach((node, i) => {
        const a = (Math.PI * 2 * i) / Math.min(rest.length, 7) - Math.PI / 2;
        boxes.push({ node, x: cx + Math.cos(a) * R - 62, y: cy + Math.sin(a) * (R * 0.62) - 22, w: 124, h: 44 });
      });
      boxes.slice(1).forEach((b) => links.push({ from: boxes[0], to: b }));
      return { kind: "network" as const, H, jitter, boxes, links };
    }

    if (spec.kind === "hierarchy" || spec.kind === "tree") {
      const childIds = new Set(edges.map((e) => e.to));
      const roots = nodes.filter((n) => !childIds.has(n.id));
      const levels: DiagramNode[][] = [];
      const seen = new Set<string>();
      let current = roots.length ? roots : nodes.slice(0, 1);
      while (current.length && levels.length < 5) {
        current.forEach((n) => seen.add(n.id));
        levels.push(current);
        const next = edges
          .filter((e) => current.some((c) => c.id === e.from))
          .map((e) => nodes.find((n) => n.id === e.to))
          .filter((n): n is DiagramNode => !!n && !seen.has(n.id));
        current = Array.from(new Map(next.map((n) => [n.id, n])).values());
      }
      const leftovers = nodes.filter((n) => !seen.has(n.id));
      if (leftovers.length) levels.push(leftovers);

      const rowH = 92;
      H = levels.length * rowH + 24;
      levels.forEach((row, li) => {
        const bw = Math.min(150, (W - 20) / row.length - 14);
        const total = row.length * bw + (row.length - 1) * 14;
        const startX = (W - total) / 2;
        row.forEach((node, i) => {
          boxes.push({ node, x: startX + i * (bw + 14), y: 14 + li * rowH, w: bw, h: 52 });
        });
      });
      edges.forEach((e) => {
        const a = byId(e.from), b = byId(e.to);
        if (a && b) links.push({ from: a, to: b, label: e.label });
      });
      return { kind: "tree" as const, H, jitter, boxes, links };
    }

    if (spec.kind === "er") {
      const perRow = nodes.length > 2 ? 2 : nodes.length || 1;
      const bw = Math.min(250, (W - (perRow - 1) * 34) / perRow);
      const rows = Math.ceil(nodes.length / perRow);
      const heights = nodes.map((n) => 40 + Math.min((n.detail || "").split(",").filter(Boolean).length, 5) * 20);
      const rowH = Math.max(...heights, 70) + 48;
      H = rows * rowH + 16;
      nodes.forEach((node, i) => {
        const r = Math.floor(i / perRow), c = i % perRow;
        const inRow = Math.min(perRow, nodes.length - r * perRow);
        const total = inRow * bw + (inRow - 1) * 34;
        boxes.push({ node, x: (W - total) / 2 + c * (bw + 34), y: 12 + r * rowH, w: bw, h: heights[i] });
      });
      edges.forEach((e) => {
        const a = byId(e.from), b = byId(e.to);
        if (a && b) links.push({ from: a, to: b, label: e.label, curve: true });
      });
      return { kind: "er" as const, H, jitter, boxes, links };
    }

    // flow | cycle | stack — vertical column
    const bw = Math.min(330, W - 90);
    const bh = 56;
    const gap = spec.kind === "stack" ? 10 : 40;
    H = nodes.length * bh + Math.max(nodes.length - 1, 0) * gap + 24;
    nodes.forEach((node, i) => {
      boxes.push({ node, x: (W - bw) / 2, y: 12 + i * (bh + gap), w: bw, h: bh });
    });
    if (spec.kind !== "stack") {
      const chain = edges.length
        ? edges
        : boxes.slice(1).map((b, i) => ({ from: boxes[i].node.id, to: b.node.id }));
      chain.forEach((e) => {
        const a = byId(e.from), b = byId(e.to);
        if (a && b) links.push({ from: a, to: b, label: (e as any).label, curve: Math.abs(boxes.indexOf(b) - boxes.indexOf(a)) > 1 });
      });
      if (spec.kind === "cycle" && boxes.length > 1) {
        links.push({ from: boxes[boxes.length - 1], to: boxes[0], curve: true, label: "repeat" });
      }
    }
    return { kind: spec.kind === "stack" ? ("stack" as const) : ("flow" as const), H, jitter, boxes, links };
  }, [spec, width]);

  const { H, jitter, boxes, links } = layout as any;
  const W = width;
  const mid = `arrow-${hash(spec.title || "d")}`;

  return (
    <figure className="my-1" role="group" aria-label={`Diagram: ${spec.title}`}>
      <svg viewBox={`0 0 ${W} ${H + 26}`} width="100%" style={{ maxWidth: W }} aria-hidden="false">
        <defs>
          <marker id={mid} markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto">
            <path d="M0,0 L7,3.2 L0,6.4 Z" fill={ink} />
          </marker>
        </defs>

        {/* links */}
        {links.map((l: any, i: number) => {
          const vertical = Math.abs(l.from.x - l.to.x) < 60;
          const x1 = vertical ? l.from.x + l.from.w / 2 : l.from.x + l.from.w;
          const y1 = vertical ? l.from.y + l.from.h : l.from.y + l.from.h / 2;
          const x2 = vertical ? l.to.x + l.to.w / 2 : l.to.x;
          const y2 = vertical ? l.to.y : l.to.y + l.to.h / 2;
          const d = l.curve
            ? `M ${l.from.x + l.from.w} ${l.from.y + l.from.h / 2} C ${W - 6} ${l.from.y + l.from.h / 2}, ${W - 6} ${l.to.y + l.to.h / 2}, ${l.to.x + l.to.w} ${l.to.y + l.to.h / 2}`
            : roughLine(x1, y1, x2, y2, jitter);
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={ink} strokeWidth={1.4} strokeOpacity={0.75} markerEnd={`url(#${mid})`} strokeLinecap="round" />
              {l.label && (
                <text
                  x={(x1 + x2) / 2 + 6}
                  y={(y1 + y2) / 2 - 3}
                  fontFamily={font}
                  fontSize={12}
                  fill={ink}
                  opacity={0.85}
                >
                  {clamp(l.label, 18)}
                </text>
              )}
            </g>
          );
        })}

        {/* timeline spine */}
        {layout.kind === "timeline" && (
          <path d={roughLine(14, H / 2, W - 14, H / 2, jitter)} stroke={ink} strokeWidth={1.6} fill="none" markerEnd={`url(#${mid})`} />
        )}

        {/* comparison columns */}
        {layout.kind === "comparison" &&
          layout.cols.map((col: any, ci: number) => {
            const x = ci * (layout.cw + layout.gap);
            return (
              <g key={ci}>
                <path d={roughRect(x, 6, layout.cw, H - 18, 8, jitter)} fill="none" stroke={ink} strokeWidth={1.3} strokeOpacity={0.75} />
                <text x={x + 12} y={30} fontFamily={font} fontSize={15} fill={accent} fontWeight={600}>
                  {clamp(col.header, 22)}
                </text>
                <path d={roughLine(x + 8, 38, x + layout.cw - 8, 38, jitter)} stroke={accent} strokeWidth={1} strokeOpacity={0.5} fill="none" />
                {col.items.slice(0, 6).map((it: string, ii: number) => (
                  <text key={ii} x={x + 12} y={60 + ii * 24} fontFamily={font} fontSize={13.5} fill={ink}>
                    • {clamp(it, Math.floor(layout.cw / 7.4))}
                  </text>
                ))}
              </g>
            );
          })}

        {/* boxes */}
        {boxes.map((b: Box, i: number) => {
          const isEr = layout.kind === "er";
          const attrs = isEr ? (b.node.detail || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5) : [];
          const labelLines = isEr ? [clamp(b.node.label, 26)] : wrap(b.node.label, Math.floor(b.w / 8.2), 2);
          return (
            <g key={`${b.node.id}-${i}`}>
              <path d={roughRect(b.x, b.y, b.w, b.h, 9, jitter)} fill="#ffffff" fillOpacity={0.6} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
              {isEr && <path d={roughLine(b.x + 4, b.y + 30, b.x + b.w - 4, b.y + 30, jitter)} stroke={ink} strokeWidth={1} strokeOpacity={0.55} fill="none" />}
              {labelLines.map((ln, li) => (
                <text
                  key={li}
                  x={b.x + b.w / 2}
                  y={isEr ? b.y + 21 : b.y + (b.node.detail && !isEr ? 24 : b.h / 2 + 5) + li * 17 - (labelLines.length > 1 ? 8 : 0)}
                  textAnchor="middle"
                  fontFamily={font}
                  fontSize={15}
                  fill={accent}
                  fontWeight={600}
                >
                  {ln}
                </text>
              ))}
              {isEr &&
                attrs.map((a, ai) => (
                  <text key={ai} x={b.x + 12} y={b.y + 48 + ai * 19} fontFamily={font} fontSize={13} fill={ink}>
                    · {clamp(a, Math.floor(b.w / 7.2))}
                  </text>
                ))}
              {!isEr && b.node.detail && (
                <text x={b.x + b.w / 2} y={b.y + b.h - 12} textAnchor="middle" fontFamily={font} fontSize={12.5} fill={ink} opacity={0.85}>
                  {clamp(b.node.detail, Math.floor(b.w / 6.4))}
                </text>
              )}
            </g>
          );
        })}

        <text x={W / 2} y={H + 18} textAnchor="middle" fontFamily={font} fontSize={13} fill={ink} opacity={0.8}>
          Fig. {clamp(spec.title, 60)}
        </text>
      </svg>
    </figure>
  );
};

export default NotebookDiagram;
