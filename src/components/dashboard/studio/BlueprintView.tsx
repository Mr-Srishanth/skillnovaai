import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Boxes, Database, Route as RouteIcon, Layers, MonitorSmartphone,
  FolderTree, FlaskConical, Rocket, Sparkles, Users, Target, BookOpen,
} from "lucide-react";
import type { Blueprint } from "@/lib/projectStudio";
import ArchitectureDiagram from "./ArchitectureDiagram";
import CopyButton from "./CopyButton";

const Section = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  action,
}: {
  title: string;
  icon: typeof Boxes;
  children: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4">
        <button onClick={() => setOpen((o) => !o)} className="flex-1 flex items-center gap-3 text-left">
          <Icon className="w-4 h-4 text-neon-cyan shrink-0" />
          <span className="font-display font-semibold text-sm text-foreground">{title}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && action}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 text-sm text-muted-foreground">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5">
    {(items || []).map((t, i) => (
      <li key={i} className="flex gap-2">
        <span className="text-neon-cyan mt-1.5 w-1 h-1 rounded-full bg-neon-cyan shrink-0" />
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

const TIER_STYLE: Record<string, string> = {
  MVP: "text-emerald-400 border-emerald-400/30",
  IMPORTANT: "text-neon-cyan border-cyan-400/30",
  ADVANCED: "text-amber-400 border-amber-400/30",
  OPTIONAL: "text-muted-foreground border-border",
};

interface Props {
  blueprint: Blueprint;
  onLearn?: (topic: string) => void;
}

const BlueprintView = ({ blueprint: b, onLearn }: Props) => (
  <div className="space-y-3">
    <Section title="Overview & Problem" icon={Target} defaultOpen>
      <p>{b.overview}</p>
      <div>
        <p className="text-xs uppercase tracking-wider text-foreground/70 mb-1">Problem statement</p>
        <p>{b.problemStatement}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-foreground/70 mb-1">Real-world use case</p>
        <p>{b.realWorldUseCase}</p>
      </div>
      <div className="flex items-start gap-2 flex-wrap">
        <Users className="w-3.5 h-3.5 mt-1" />
        {(b.targetUsers || []).map((u, i) => (
          <span key={i} className="px-2.5 py-1 rounded-full text-[11px] glass-card">{u}</span>
        ))}
      </div>
    </Section>

    <Section title="Feature Breakdown" icon={Layers} defaultOpen>
      <div className="grid sm:grid-cols-2 gap-4">
        {([
          ["MVP", b.features?.mvp],
          ["IMPORTANT", b.features?.important],
          ["ADVANCED", b.features?.advanced],
          ["OPTIONAL", b.features?.optional],
        ] as const).map(([tier, list]) => (
          <div key={tier} className={`rounded-xl border p-4 ${TIER_STYLE[tier]}`}>
            <p className="text-[10px] font-display tracking-widest mb-2">{tier}</p>
            <Bullets items={(list as string[]) || []} />
          </div>
        ))}
      </div>
    </Section>

    <Section title="Tech Stack Intelligence" icon={Boxes}>
      <div className="space-y-2">
        {(b.techStack || []).map((t, i) => (
          <div key={i} className="rounded-lg glass-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.layer}</span>
              <span className="text-sm font-medium text-foreground">{t.tech}</span>
            </div>
            <p className="text-xs">{t.why}</p>
          </div>
        ))}
      </div>
    </Section>

    <Section title="System Architecture" icon={Boxes}>
      <p>{b.architecture?.summary}</p>
      <ArchitectureDiagram nodes={b.architecture?.nodes || []} edges={b.architecture?.edges || []} />
    </Section>

    <Section
      title="Database Design"
      icon={Database}
      action={b.database?.sql ? <CopyButton value={b.database.sql} label="Copy SQL" /> : undefined}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {(b.database?.entities || []).map((e, i) => (
          <div key={i} className="rounded-xl glass-card p-4">
            <p className="font-display text-sm text-foreground">{e.name}</p>
            <p className="text-[11px] mb-2">{e.purpose}</p>
            <div className="space-y-1">
              {(e.fields || []).map((f, j) => (
                <div key={j} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-7 shrink-0 text-[9px] ${f.key === "PK" ? "text-amber-400" : f.key === "FK" ? "text-neon-purple" : "text-transparent"}`}>
                    {f.key !== "none" ? f.key : "—"}
                  </span>
                  <span className="text-foreground/90">{f.name}</span>
                  <span className="text-muted-foreground/70">{f.type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!!b.database?.relationships?.length && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground/70 mb-1">Relationships</p>
          <Bullets items={b.database.relationships} />
        </div>
      )}
      {b.database?.sql && (
        <pre className="rounded-xl bg-black/40 border border-border p-4 overflow-x-auto text-[11px] leading-relaxed text-foreground/80">
          {b.database.sql}
        </pre>
      )}
    </Section>

    <Section title="API Design" icon={RouteIcon}>
      <div className="space-y-2">
        {(b.api || []).map((a, i) => (
          <div key={i} className="rounded-lg glass-card p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-display px-2 py-0.5 rounded bg-muted/40 text-neon-cyan">{a.method}</span>
              <code className="text-xs text-foreground">{a.route}</code>
              <div className="ml-auto"><CopyButton value={`${a.method} ${a.route}\nRequest: ${a.request}\nResponse: ${a.response}`} /></div>
            </div>
            <p className="text-xs mt-1.5">{a.purpose}</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-2 text-[11px]">
              <pre className="rounded bg-black/40 p-2 overflow-x-auto">{a.request}</pre>
              <pre className="rounded bg-black/40 p-2 overflow-x-auto">{a.response}</pre>
            </div>
          </div>
        ))}
      </div>
    </Section>

    <Section title="UI Screens" icon={MonitorSmartphone}>
      <div className="grid sm:grid-cols-2 gap-3">
        {(b.uiScreens || []).map((s, i) => (
          <div key={i} className="rounded-xl glass-card p-4">
            <p className="font-display text-sm text-foreground">{s.name}</p>
            <p className="text-[11px] mb-2">{s.purpose}</p>
            <div className="flex flex-wrap gap-1.5">
              {(s.elements || []).map((el, j) => (
                <span key={j} className="px-2 py-0.5 rounded-full text-[10px] bg-muted/30">{el}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>

    <Section
      title="Folder Structure"
      icon={FolderTree}
      action={b.folderStructure ? <CopyButton value={b.folderStructure} /> : undefined}
    >
      <pre className="rounded-xl bg-black/40 border border-border p-4 overflow-x-auto text-[11px] leading-relaxed text-foreground/80">
        {b.folderStructure}
      </pre>
    </Section>

    <Section title="Testing & Deployment" icon={FlaskConical}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground/70 mb-1">Testing strategy</p>
          <Bullets items={b.testingStrategy || []} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground/70 mb-1 flex items-center gap-1.5">
            <Rocket className="w-3 h-3" /> Deployment
          </p>
          <Bullets items={b.deploymentStrategy || []} />
        </div>
      </div>
    </Section>

    <Section title="Future Improvements" icon={Sparkles}>
      <Bullets items={b.futureImprovements || []} />
    </Section>

    {!!b.knowledgeGaps?.length && (
      <Section title="Learn before you build" icon={BookOpen} defaultOpen>
        <div className="space-y-2">
          {b.knowledgeGaps.map((k, i) => (
            <div key={i} className="rounded-lg glass-card p-3 flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-foreground">{k.topic}</p>
                <p className="text-xs">{k.why}</p>
              </div>
              {onLearn && (
                <button
                  onClick={() => onLearn(k.topic)}
                  className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg glass-card text-neon-cyan hover:text-foreground transition-colors"
                >
                  Learn with Knowledge Engine
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>
    )}
  </div>
);

export default BlueprintView;
