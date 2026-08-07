import { motion } from "framer-motion";
import type { KnowledgePack } from "@/lib/knowledge";

const MindMapView = ({ map }: { map: KnowledgePack["mindMap"] }) => {
  const branches = map.branches || [];
  const width = 900;
  const rowH = 110;
  const height = Math.max(320, branches.length * rowH);
  const cx = 170;
  const cy = height / 2;

  return (
    <div className="glass-card p-4 overflow-x-auto">
      <svg width={width} height={height} className="min-w-[720px]">
        <defs>
          <linearGradient id="mmGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(186,94%,55%)" />
            <stop offset="100%" stopColor="hsl(270,60%,55%)" />
          </linearGradient>
        </defs>

        {branches.map((b, i) => {
          const by = rowH / 2 + i * rowH;
          return (
            <g key={b.label}>
              <motion.path
                d={`M ${cx + 90} ${cy} C ${cx + 180} ${cy}, ${330} ${by}, ${400} ${by}`}
                stroke="url(#mmGrad)"
                strokeWidth={1.5}
                fill="none"
                opacity={0.6}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
              />
              <motion.g
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <rect x={400} y={by - 18} rx={10} width={210} height={36} className="fill-muted/30 stroke-border" />
                <text x={412} y={by + 5} className="fill-foreground text-[13px] font-medium">
                  {b.label.slice(0, 26)}
                </text>
              </motion.g>

              {(b.children || []).map((c, j) => {
                const chY = by - ((b.children.length - 1) * 22) / 2 + j * 22;
                return (
                  <motion.g
                    key={c + j}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.1 + j * 0.05 }}
                  >
                    <path
                      d={`M 610 ${by} C 640 ${by}, 650 ${chY}, 680 ${chY}`}
                      stroke="hsl(186,94%,55%)"
                      strokeWidth={1}
                      fill="none"
                      opacity={0.35}
                    />
                    <circle cx={684} cy={chY} r={3} className="fill-primary" />
                    <text x={694} y={chY + 4} className="fill-muted-foreground text-[11px]">
                      {c.slice(0, 30)}
                    </text>
                  </motion.g>
                );
              })}
            </g>
          );
        })}

        <motion.g initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <rect x={cx - 90} y={cy - 26} rx={14} width={180} height={52} fill="url(#mmGrad)" opacity={0.9} />
          <text x={cx} y={cy + 5} textAnchor="middle" className="fill-background text-[14px] font-semibold">
            {map.root?.slice(0, 22)}
          </text>
        </motion.g>
      </svg>
    </div>
  );
};

export default MindMapView;
