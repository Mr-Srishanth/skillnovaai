import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are SkillNova Notebook Architect — you convert an already-generated knowledge pack into the page-by-page plan of a real student's handwritten study notebook.

RULES
- You are NOT summarising again. You are LAYING OUT teaching content into notebook pages.
- Ground everything strictly in the supplied knowledge pack. Never invent statistics, citations or facts that are not implied by it.
- Each page must hold a coherent chunk: roughly 5-9 blocks, never more than 11. A page with a diagram holds fewer text blocks.
- Write in the compact voice of good handwritten notes: short lines, concrete examples, arrows, "i.e.", "e.g.".
- Add a "diagram" block ONLY when a visual genuinely teaches the concept (architectures, flows, hierarchies, data structures, ER models, comparisons, timelines, networks, cycles, layered stacks). Never decorate.
- Use "formula" blocks for maths/notation and "code" blocks for programming. Never fake handwriting inside code.
- highlight[] holds SHORT fragments (2-6 words) that appear verbatim inside that block's text/items and deserve marker emphasis. Never highlight a whole sentence.
- EVERY block must carry its own content: a "callout"/"text"/"example" block MUST have a non-empty "text" (and optional items); a "definition" needs term+meaning; never emit a block that only has "highlight".
- Heading hierarchy is strict: one "heading" per page maximum, "subheading" for sections.
- Page 1 is always the cover (a single "cover" block). If the notebook is 8 pages or more, page 2 is a "toc" block.
- The final page is an exam/revision page built from the pack's revision sheet.
- Do not restate the same content on two pages.`;

const DIAGRAM = {
  type: "object",
  description: "A teaching diagram specification rendered as hand-drawn SVG",
  properties: {
    kind: {
      type: "string",
      enum: ["flow", "hierarchy", "tree", "er", "network", "comparison", "timeline", "cycle", "stack"],
      description: "flow=process/pipeline steps, hierarchy/tree=parent-child, er=entities with attributes, network=hub and spokes, comparison=side-by-side columns, timeline=ordered stages, cycle=repeating loop, stack=layered architecture (top layer first)",
    },
    title: { type: "string", description: "Short diagram caption" },
    nodes: {
      type: "array",
      description: "3-8 nodes. For 'er', detail holds comma-separated attributes. Omit for 'comparison'.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "short slug id" },
          label: { type: "string", description: "max 28 chars" },
          detail: { type: "string", description: "optional max 42 chars" },
        },
        required: ["id", "label"],
      },
    },
    edges: {
      type: "array",
      description: "Connections between node ids. Required for flow/hierarchy/tree/er/network/cycle.",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          label: { type: "string", description: "optional max 18 chars" },
        },
        required: ["from", "to"],
      },
    },
    columns: {
      type: "array",
      description: "Only for kind='comparison': 2-3 columns of 3-5 short rows each",
      items: {
        type: "object",
        properties: {
          header: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["header", "items"],
      },
    },
  },
  required: ["kind", "title"],
};

const BLOCK = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["cover", "toc", "heading", "subheading", "text", "bullets", "definition", "formula", "code", "callout", "example", "keyterms", "diagram"],
    },
    text: { type: "string", description: "For heading/subheading/text/callout/example/cover title/formula caption" },
    items: { type: "array", items: { type: "string" }, description: "For bullets / toc entries / exam points" },
    term: { type: "string", description: "For definition blocks" },
    meaning: { type: "string", description: "For definition blocks" },
    formula: { type: "string", description: "Plain-text math, e.g. O(log n) or E = mc^2 or (a+b)/2" },
    code: { type: "string", description: "Real, runnable, correctly indented code" },
    language: { type: "string", description: "Code language, e.g. java, python" },
    tone: { type: "string", enum: ["info", "warning", "exam"], description: "For callout blocks" },
    highlight: { type: "array", items: { type: "string" }, description: "Short verbatim fragments to marker-highlight" },
    keyTerms: {
      type: "array",
      description: "For keyterms blocks",
      items: {
        type: "object",
        properties: { term: { type: "string" }, meaning: { type: "string" } },
        required: ["term", "meaning"],
      },
    },
    diagram: DIAGRAM,
  },
  required: ["type"],
};

const PAGE = {
  type: "object",
  properties: {
    title: { type: "string", description: "Running header for the page (short)" },
    blocks: { type: "array", items: BLOCK },
  },
  required: ["title", "blocks"],
};

const NOTEBOOK_SCHEMA = {
  name: "notebook_plan",
  description: "Complete page-by-page plan of a handwritten study notebook",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      subtitle: { type: "string", description: "One short line under the cover title" },
      pages: { type: "array", items: PAGE },
    },
    required: ["title", "subtitle", "pages"],
  },
};

const PAGE_SCHEMA = {
  name: "notebook_page",
  description: "A single regenerated notebook page",
  parameters: { type: "object", properties: { page: PAGE }, required: ["page"] },
};

const DIAGRAM_SCHEMA = {
  name: "notebook_diagram",
  description: "A single regenerated teaching diagram",
  parameters: { type: "object", properties: { diagram: DIAGRAM }, required: ["diagram"] },
};

const DEPTH_HINT: Record<string, string> = {
  short: "SHORT notebook: 6-8 pages total (including cover and final revision page).",
  medium: "MEDIUM notebook: 10-14 pages total (including cover, contents, and final revision page).",
  detailed: "DETAILED notebook: 16-22 pages total (including cover, contents, and final revision page).",
};

const DIAGRAM_HINT: Record<string, string> = {
  minimal: "DIAGRAM LEVEL minimal: at most 1-2 diagrams in the whole notebook, only where indispensable.",
  balanced: "DIAGRAM LEVEL balanced: a diagram roughly every 3-4 pages, only where it truly teaches.",
  heavy: "DIAGRAM LEVEL visual-heavy: aim for a diagram on nearly every content page, but still only where it teaches something real.",
};

function packDigest(pack: any) {
  return `KNOWLEDGE PACK
Title: ${pack?.title || ""}
Topic: ${pack?.topic || ""}
Difficulty: ${pack?.difficulty || ""}
Summary: ${pack?.summary || ""}
Career link: ${pack?.careerLink || ""}

KEY TERMS
${(pack?.keyTerms || []).map((k: any) => `- ${k.term}: ${k.meaning}`).join("\n")}

SMART NOTES (markdown)
${String(pack?.notes || "").slice(0, 24000)}

MIND MAP
${pack?.mindMap?.root || ""}
${(pack?.mindMap?.branches || []).map((b: any) => `- ${b.label}: ${(b.children || []).join(", ")}`).join("\n")}

REVISION SHEET
Must know: ${(pack?.revisionSheet?.mustKnow || []).join(" | ")}
Formulas/facts: ${(pack?.revisionSheet?.formulasOrFacts || []).join(" | ")}
Common mistakes: ${(pack?.revisionSheet?.commonMistakes || []).join(" | ")}
Exam tips: ${(pack?.revisionSheet?.examTips || []).join(" | ")}

FLASHCARDS
${(pack?.flashcards || []).slice(0, 10).map((f: any) => `- Q: ${f.question} / A: ${f.answer}`).join("\n")}`;
}

async function callAI(body: unknown) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 429) throw Object.assign(new Error("Rate limited. Please try again shortly."), { status: 429 });
    if (res.status === 402) throw Object.assign(new Error("Credits exhausted. Please add funds."), { status: 402 });
    const t = await res.text();
    console.error("AI gateway error", res.status, t);
    throw new Error(`AI gateway error: ${res.status}`);
  }
  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No structured response from AI");
  return JSON.parse(call.function.arguments);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode = "notebook", pack, options = {}, profile, page, pageTitle, context, instruction } = await req.json();
    if (!pack || !pack.notes) {
      return new Response(JSON.stringify({ error: "No knowledge pack supplied." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = profile || {};
    const learner = `LEARNER CONTEXT
- Career goal: ${p.goal || "not set"}
- Current skills: ${p.skills || "not recorded"}
- Skill gaps: ${(p.missingSkills || []).join(", ") || "none recorded"}
- Level: ${p.level || "Beginner"}
Use this only to choose examples, emphasis and difficulty. Never invent personal details.`;

    const styleLine = `NOTE STYLE: ${options.noteStyle || "detailed"}
${DEPTH_HINT[options.depth as string] || DEPTH_HINT.medium}
${DIAGRAM_HINT[options.diagramLevel as string] || DIAGRAM_HINT.balanced}`;

    let schema = NOTEBOOK_SCHEMA;
    let user = "";

    if (mode === "page") {
      schema = PAGE_SCHEMA;
      user = `${learner}\n\n${styleLine}\n\n${packDigest(pack)}\n\nExisting notebook outline:\n${(context || []).map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\nRegenerate ONLY the page titled "${pageTitle}". Keep it on the same subject, do not duplicate other pages.${instruction ? `\nUser instruction: ${instruction}` : ""}`;
    } else if (mode === "diagram") {
      schema = DIAGRAM_SCHEMA;
      user = `${learner}\n\n${packDigest(pack)}\n\nPage context: ${pageTitle}\nNearby notes: ${(context || []).join(" | ")}\n\nProduce ONE clear teaching diagram for this page. Prefer a different, clearer structure than before.${instruction ? `\nUser instruction: ${instruction}` : ""}`;
    } else {
      user = `${learner}\n\n${styleLine}\n\n${packDigest(pack)}\n\nPlan the complete handwritten notebook now.`;
    }

    const result = await callAI({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      tools: [{ type: "function", function: schema }],
      tool_choice: { type: "function", function: { name: schema.name } },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = (e as any)?.status || 500;
    console.error("notebook-planner error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
