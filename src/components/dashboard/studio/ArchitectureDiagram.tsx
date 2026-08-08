import { motion } from "framer-motion";
import type { ArchNode } from "@/lib/projectStudio";

const KIND_COLOR: Record<string, string> = {
  client: "hsl(186,94%,55%)",
  frontend: "hsl(186,94%,55%)",
  api: "hsl(210,90%,62%)",
  backend: "hsl(270,60%,62%)",
  ai: "hsl(320,70%,62%)",
  database: "hsl(150,60%,50%)",
  storage: "hsl(40,90%,60%)",
  external: "hsl(0,0%,65%)",
  auth: "hsl(280,70%,65%)",
  deployment: "hsl(200,60%,60%)",
};

interface Props {
  nodes: ArchNode[];
  edges: { from: string; to: string; label: string }[];
}

/** SVG flow diagram of the generated architecture — no static images. */
const ArchitectureDiagram = ({ nodes, edges }: Props) => {
  if (!nodes?.length) return null;

  const W = 640;
  const boxW = 260;
  const boxH = 58;
  const gapY = 44;
  const x = (W - boxW) / 2;
  const H = nodes.length * boxH + (nodes.length - 1) * gapY + 24;

  const yOf = (i: number) => 12 + i * (boxH + gapY);
  const indexOf = (id: string) => nodes.findIndex((n) => n.id === id);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, minWidth: 420 }} role="img" aria-label="System architecture diagram">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="hsl(186,60%,55%)" />
          </marker>
        </defs>

        {edges?.map((e, i) => {
          const a = indexOf(e.from);
          const b = indexOf(e.to);
          if (a < 0 || b < 0) return null;
          const y1 = yOf(a) + boxH;
          const y2 = yOf(b);
          const straight = Math.abs(b - a) === 1 && b > a;
          const midX = W / 2;
          const path = straight
            ? `M ${midX} ${y1} L ${midX} ${y2}`
            : `M ${x + boxW} ${yOf(a) + boxH / 2} C ${W - 8} ${yOf(a) + boxH / 2}, ${W - 8} ${yOf(b) + boxH / 2}, ${x + boxW} ${yOf(b) + boxH / 2}`;
          return (
            <g key={i}>
              <motion.path
                d={path}
                fill="none"
                stroke="hsl(186,60%,55%)"
                strokeOpacity={0.45}
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
              />
              {straight && e.label && (
                <text x={midX + 8} y={(y1 + y2) / 2 + 3} fontSize="9" fill="hsl(0,0%,62%)">
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((n, i) => {
          const color = KIND_COLOR[n.kind] || "hsl(186,94%,55%)";
          return (
            <motion.g
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <rect
                x={x}
                y={yOf(i)}
                width={boxW}
                height={boxH}
                rx={12}
                fill="hsl(240,10%,8%)"
                stroke={color}
                strokeOpacity={0.5}
              />
              <rect x={x} y={yOf(i)} width={4} height={boxH} rx={2} fill={color} />
              <text x={x + 16} y={yOf(i) + 23} fontSize="12" fontWeight="600" fill="hsl(0,0%,92%)">
                {n.label}
              </text>
              <text x={x + 16} y={yOf(i) + 41} fontSize="9.5" fill="hsl(0,0%,60%)">
                {n.detail.length > 52 ? `${n.detail.slice(0, 52)}…` : n.detail}
              </text>
              <text x={x + boxW - 12} y={yOf(i) + 23} fontSize="8.5" textAnchor="end" fill={color} opacity={0.9}>
                {n.kind.toUpperCase()}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};

export default ArchitectureDiagram;
