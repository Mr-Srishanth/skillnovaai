import { forwardRef } from "react";
import NotebookDiagram from "./NotebookDiagram";
import {
  HAND_PRESETS, INK, HIGHLIGHT, RED_INK, PAGE_DIMS, PAGE_PADDING,
  type NotebookBlock, type NotebookPage as PageModel, type NotebookStyle,
} from "@/lib/notebook";

interface Props {
  page: PageModel;
  index: number;
  total: number;
  style: NotebookStyle;
  notebookTitle: string;
  onEditBlock?: (blockIndex: number, value: string) => void;
  editable?: boolean;
}

/** Splits a string on highlight fragments and marks them up. */
function Marked({ text, fragments, color }: { text: string; fragments?: string[]; color: string }) {
  const frags = (fragments || []).filter((f) => f && text.toLowerCase().includes(f.toLowerCase()));
  if (!frags.length) return <>{text}</>;
  const pattern = new RegExp(`(${frags.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return (
    <>
      {text.split(pattern).map((part, i) =>
        frags.some((f) => f.toLowerCase() === part.toLowerCase()) ? (
          <span
            key={i}
            style={{
              background: HIGHLIGHT,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
              padding: "0 2px",
              borderRadius: 2,
              color,
            }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function paperBackground(style: NotebookStyle) {
  const line = "rgba(80, 120, 190, 0.28)";
  const grid = "rgba(90, 120, 170, 0.22)";
  switch (style.paper) {
    case "grid":
      return {
        backgroundImage: `linear-gradient(${grid} 1px, transparent 1px), linear-gradient(90deg, ${grid} 1px, transparent 1px)`,
        backgroundSize: "24px 24px, 24px 24px",
      } as const;
    case "plain":
      return {} as const;
    default:
      return {
        backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${line} 31px, ${line} 32px)`,
        backgroundPosition: `0 ${PAGE_PADDING.top}px`,
      } as const;
  }
}

const NotebookPageView = forwardRef<HTMLDivElement, Props>(
  ({ page, index, total, style, notebookTitle, onEditBlock, editable }, ref) => {
    const hand = HAND_PRESETS[style.hand];
    const ink = INK[style.ink];
    const dims = PAGE_DIMS[style.pageSize];
    const primary = ink.primary;
    const heading = style.ink === "duo" ? ink.secondary : ink.primary;
    const isCover = page.blocks.some((b) => b.type === "cover");

    const left =
      style.paper === "cornell" ? PAGE_PADDING.left + 116 :
      style.paper === "margin" ? PAGE_PADDING.left + 18 : PAGE_PADDING.left;

    const body: React.CSSProperties = {
      fontFamily: hand.family,
      fontSize: hand.size,
      lineHeight: "32px",
      color: primary,
      letterSpacing: "0.2px",
    };

    const renderBlock = (b: NotebookBlock, i: number) => {
      const key = `${page.id}-${i}`;
      const edit = editable && onEditBlock
        ? {
            contentEditable: true,
            suppressContentEditableWarning: true,
            onBlur: (e: React.FocusEvent<HTMLElement>) => onEditBlock(i, e.currentTarget.textContent || ""),
          }
        : {};

      switch (b.type) {
        case "cover":
          return (
            <div key={key} className="flex flex-col items-center justify-center text-center" style={{ minHeight: 640 }}>
              <div style={{ fontFamily: hand.family, fontSize: hand.heading + 16, color: heading, lineHeight: 1.15 }}>
                {b.text || notebookTitle}
              </div>
              <div style={{ width: 220, height: 2, background: primary, opacity: 0.5, margin: "26px 0" }} />
              {b.items?.slice(0, 4).map((it, j) => (
                <p key={j} style={{ ...body, fontSize: hand.size + 1, opacity: 0.9, margin: 0 }}>{it}</p>
              ))}
              {b.meaning && <p style={{ ...body, marginTop: 18, opacity: 0.85 }}>{b.meaning}</p>}
            </div>
          );

        case "toc":
          return (
            <div key={key} style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: hand.family, fontSize: hand.heading, color: heading, marginBottom: 10 }}>
                {b.text || "Contents"}
              </div>
              {(b.items || []).map((it, j) => (
                <div key={j} style={{ ...body, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{j + 1}. {it}</span>
                  <span style={{ opacity: 0.55 }}>………</span>
                </div>
              ))}
            </div>
          );

        case "heading":
          return (
            <div key={key} style={{ marginBottom: 8 }}>
              <div {...edit} style={{ fontFamily: hand.family, fontSize: hand.heading, color: heading, lineHeight: "38px" }}>
                {b.text}
              </div>
              <div style={{ height: 2, width: "58%", background: heading, opacity: 0.45, marginTop: 2, borderRadius: 2 }} />
            </div>
          );

        case "subheading":
          return (
            <div
              key={key}
              {...edit}
              style={{
                fontFamily: hand.family,
                fontSize: hand.size + 5,
                color: heading,
                lineHeight: "32px",
                marginTop: 10,
                textDecoration: "underline",
                textDecorationThickness: 1,
                textUnderlineOffset: 5,
              }}
            >
              {b.text}
            </div>
          );

        case "text":
          return (
            <p key={key} {...edit} style={{ ...body, margin: "0 0 4px" }}>
              <Marked text={b.text || ""} fragments={b.highlight} color={primary} />
            </p>
          );

        case "bullets":
          return (
            <ul key={key} style={{ ...body, listStyle: "none", padding: 0, margin: "0 0 4px" }}>
              {(b.items || []).map((it, j) => (
                <li key={j} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: heading }}>→</span>
                  <span><Marked text={it} fragments={b.highlight} color={primary} /></span>
                </li>
              ))}
            </ul>
          );

        case "definition":
          return (
            <div
              key={key}
              style={{
                ...body,
                border: `1.5px solid ${heading}`,
                borderRadius: 8,
                padding: "8px 12px",
                margin: "6px 0",
                background: "rgba(255,255,255,0.55)",
              }}
            >
              <span style={{ color: heading, fontSize: hand.size + 2 }}>{b.term}: </span>
              <span><Marked text={b.meaning || ""} fragments={b.highlight} color={primary} /></span>
            </div>
          );

        case "formula":
          return (
            <div key={key} style={{ margin: "8px 0", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "'Times New Roman', Georgia, serif",
                  fontSize: 20,
                  color: heading,
                  borderBottom: `1.5px dashed ${heading}`,
                  padding: "2px 14px 4px",
                }}
              >
                {b.formula}
              </div>
              {b.text && <div style={{ ...body, fontSize: hand.size - 2, opacity: 0.85, marginTop: 4 }}>{b.text}</div>}
            </div>
          );

        case "code":
          return (
            <div key={key} style={{ margin: "8px 0" }}>
              {b.text && <div style={{ ...body, fontSize: hand.size - 1, opacity: 0.9, marginBottom: 4 }}>{b.text}</div>}
              <pre
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Mono', Menlo, monospace",
                  fontSize: 12.5,
                  lineHeight: "18px",
                  color: "#12151b",
                  background: "rgba(232, 238, 246, 0.9)",
                  border: "1px solid rgba(30,50,90,0.28)",
                  borderRadius: 6,
                  padding: "10px 12px",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {b.code}
              </pre>
              {b.language && (
                <div style={{ ...body, fontSize: hand.size - 4, opacity: 0.7, marginTop: 2 }}>{b.language}</div>
              )}
            </div>
          );

        case "callout": {
          const color = b.tone === "warning" ? RED_INK : b.tone === "exam" ? "#8a6b00" : heading;
          return (
            <div
              key={key}
              style={{
                ...body,
                color,
                borderLeft: `3px solid ${color}`,
                paddingLeft: 10,
                margin: "6px 0",
              }}
            >
              <span style={{ fontSize: hand.size + 1 }}>
                {b.tone === "warning" ? "⚠ " : b.tone === "exam" ? "★ " : "✎ "}
              </span>
              <Marked text={b.text || ""} fragments={b.highlight} color={color} />
              {(b.items || []).map((it, j) => (
                <div key={j} style={{ display: "flex", gap: 8 }}>
                  <span>•</span><span>{it}</span>
                </div>
              ))}
            </div>
          );
        }

        case "example":
          return (
            <div key={key} style={{ ...body, margin: "6px 0" }}>
              <span style={{ color: heading, fontSize: hand.size + 2 }}>Eg. </span>
              <Marked text={b.text || ""} fragments={b.highlight} color={primary} />
              {(b.items || []).map((it, j) => (
                <div key={j} style={{ paddingLeft: 16 }}>– {it}</div>
              ))}
            </div>
          );

        case "keyterms":
          return (
            <div key={key} style={{ ...body, margin: "6px 0" }}>
              <div style={{ color: heading, fontSize: hand.size + 3, marginBottom: 2 }}>Key terms</div>
              {(b.keyTerms || []).map((k, j) => (
                <div key={j} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: heading, minWidth: 4 }}>·</span>
                  <span>
                    <span style={{ background: HIGHLIGHT, padding: "0 2px", borderRadius: 2 }}>{k.term}</span> — {k.meaning}
                  </span>
                </div>
              ))}
            </div>
          );

        case "diagram":
          return b.diagram ? (
            <div key={key} style={{ margin: "6px 0" }}>
              <NotebookDiagram
                spec={b.diagram}
                ink={primary}
                accent={heading}
                font={hand.family}
                width={dims.w - left - PAGE_PADDING.right}
              />
            </div>
          ) : null;

        default:
          return null;
      }
    };

    return (
      <div
        ref={ref}
        data-notebook-page={index}
        aria-label={`Page ${index + 1} of ${total}: ${page.title}`}
        style={{
          width: dims.w,
          height: dims.h,
          background: "#fdfcf7",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
        }}
      >
        {/* paper texture */}
        <div style={{ position: "absolute", inset: 0, ...paperBackground(style) }} />
        {/* margin rules */}
        {(style.paper === "ruled" || style.paper === "margin" || style.paper === "cornell") && (
          <div style={{ position: "absolute", top: 0, bottom: 0, left: PAGE_PADDING.left - 14, width: 1.5, background: "rgba(190, 60, 60, 0.45)" }} />
        )}
        {style.paper === "cornell" && (
          <>
            <div style={{ position: "absolute", top: 0, bottom: 150, left: PAGE_PADDING.left + 100, width: 1.5, background: "rgba(190, 60, 60, 0.32)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, height: 1.5, background: "rgba(190, 60, 60, 0.32)" }} />
          </>
        )}

        {/* running header */}
        {!isCover && (
          <div
            style={{
              position: "absolute",
              top: 22,
              left,
              right: PAGE_PADDING.right,
              display: "flex",
              justifyContent: "space-between",
              fontFamily: hand.family,
              fontSize: 13,
              color: primary,
              opacity: 0.6,
              borderBottom: `1px solid ${primary}33`,
              paddingBottom: 4,
            }}
          >
            <span>{notebookTitle}</span>
            <span>{page.title}</span>
          </div>
        )}

        {/* content */}
        <div
          style={{
            position: "absolute",
            top: PAGE_PADDING.top,
            left,
            right: PAGE_PADDING.right,
            bottom: PAGE_PADDING.bottom,
            overflow: "hidden",
          }}
        >
          {page.blocks.map(renderBlock)}
        </div>

        {/* page number */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: hand.family,
            fontSize: 14,
            color: primary,
            opacity: 0.6,
          }}
        >
          {isCover ? "" : `— ${index + 1} —`}
        </div>
      </div>
    );
  }
);

NotebookPageView.displayName = "NotebookPageView";
export default NotebookPageView;
