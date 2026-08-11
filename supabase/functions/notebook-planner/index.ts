import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are SkillNova Notebook Architect — you turn an already-generated knowledge pack into the SECTION-BY-SECTION content of a real student's handwritten study notebook.

YOU DO NOT DO PAGE LAYOUT. A separate typesetting engine paginates your output, numbers pages and builds the contents page. Never emit cover pages, contents pages or page numbers.

HOW TO THINK (in order)
1. UNDERSTAND the material and the subject family (programming / database / DSA / theory / systems / maths / business).
2. EXTRACT the real concepts, not the headings of the source.
3. ORDER them into a learning sequence: foundations -> mechanism -> application -> pitfalls -> revision.
4. For each concept decide, on merit, which blocks actually teach it. NEVER apply a fixed template.
5. Detect visual opportunities: only concepts with structure, flow, hierarchy, relationships or comparison get a diagram.

BLOCK CHOICE BY SUBJECT (guidance, not a template)
- Programming: concept -> syntax -> code -> output -> common mistake -> viva.
- Database: definition -> architecture diagram -> example -> comparison -> exam point.
- DSA: concept -> visual (tree/graph) -> steps -> complexity formula -> code -> practice.
- Theory/OS/Networks: definition -> diagram (state/flow) -> key points -> comparison -> exam point -> viva.

CONTENT RULES
- Ground everything strictly in the supplied knowledge pack. Never invent statistics, citations, versions or facts.
- Write in the compact voice of excellent handwritten notes: short lines, concrete examples, "i.e.", "e.g.", arrows.
- Never write filler. Every block must teach something a student could be tested on.
- Code must be short (4-14 lines), correctly indented and syntactically valid.
- Formulas use plain text, e.g. O(log n), T(n) = 2T(n/2) + n.
- highlight[] holds SHORT verbatim fragments (2-6 words) that appear inside that block's own text/items.
- EVERY block must carry its own content. A block with only "highlight" or only "importance" is invalid.
- "callout" blocks MUST set kind. Use them sparingly — at most 2-3 per section, and never two in a row of the same kind.
- Mark importance="critical" on at most 2 blocks per section. Most blocks need no importance at all.
- Never repeat the same explanation in two sections.
- Do not promise that a question will appear in an exam. Say "likely exam focus" / "good revision target".

SECTION RULES
- 5-9 sections for a short notebook, 8-12 for medium, 12-18 for detailed.
- Each section covers ONE coherent concept and holds 4-10 blocks. Long concepts should be split into "X — part 1 / part 2" sections rather than one huge section.
- Section 1 introduces the topic and why it matters. The LAST section is a "5-Minute Revision" section built from the pack's revision sheet: keywords, formulas, comparisons, common mistakes, likely viva areas, quick questions.
- Section titles are short (2-6 words) — they become the contents page.`;

const DIAGRAM = {
  type: "object",
  description: "A teaching diagram specification rendered as hand-drawn SVG",
  properties: {
    kind: {
      type: "string",
      enum: ["flow", "hierarchy", "tree", "er", "network", "comparison", "timeline", "cycle", "stack"],
      description: "flow=process/pipeline steps, hierarchy/tree=parent-child, er=entities with attributes, network=hub and spokes, comparison=side-by-side columns, timeline=ordered stages, cycle=repeating loop, stack=layered architecture (top layer first)",
    },
    title: { type: "string", description: "Short diagram caption that says what the diagram teaches" },
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
      enum: [
        "heading", "subheading", "text", "bullets", "definition", "formula", "code",
        "callout", "example", "keyterms", "diagram", "steps", "viva", "table",
      ],
      description: "heading=section title (the engine adds it automatically, avoid), subheading=sub-topic, steps=ordered process, viva=oral questions, table=small comparison grid",
    },
    text: { type: "string", description: "For subheading/text/callout/example/formula caption/code caption/table caption" },
    items: { type: "array", items: { type: "string" }, description: "For bullets, callout sub-points, steps entries" },
    term: { type: "string", description: "For definition blocks" },
    meaning: { type: "string", description: "For definition blocks" },
    formula: { type: "string", description: "Plain-text maths, e.g. O(log n) or (a+b)/2" },
    code: { type: "string", description: "Real, runnable, correctly indented code, 4-14 lines" },
    language: { type: "string", description: "Code language, e.g. java, python, sql" },
    output: { type: "string", description: "Expected output of the code block, when useful" },
    kind: {
      type: "string",
      enum: ["core", "remember", "exam", "viva", "example", "mistake", "code", "connection", "realworld", "trick"],
      description: "Callout category. core=core idea, remember=must remember, exam=likely exam focus, mistake=common mistake, trick=memory trick/mnemonic, connection=links to another concept, realworld=practical use",
    },
    importance: {
      type: "string",
      enum: ["critical", "high", "medium", "low"],
      description: "Only set when genuinely above normal. Max 2 'critical' per section.",
    },
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
    qa: {
      type: "array",
      description: "For viva blocks: 2-4 oral questions that test understanding, not memorisation",
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          a: { type: "string", description: "One or two lines" },
          followUp: { type: "string", description: "Optional harder follow-up question" },
        },
        required: ["q", "a"],
      },
    },
    columns: {
      type: "array",
      description: "For table blocks: 2-3 columns with equal-length item lists",
      items: {
        type: "object",
        properties: { header: { type: "string" }, items: { type: "array", items: { type: "string" } } },
        required: ["header", "items"],
      },
    },
    diagram: DIAGRAM,
  },
  required: ["type"],
};

const SECTION = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short section title (2-6 words) used in the contents page" },
    blocks: { type: "array", items: BLOCK },
  },
  required: ["title", "blocks"],
};

const NOTEBOOK_SCHEMA = {
  name: "notebook_plan",
  description: "Section-by-section content of a handwritten study notebook",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      subtitle: { type: "string", description: "One short line under the cover title" },
      sections: { type: "array", items: SECTION },
    },
    required: ["title", "subtitle", "sections"],
  },
};

const SECTION_SCHEMA = {
  name: "notebook_section",
  description: "A single regenerated notebook section",
  parameters: { type: "object", properties: { section: SECTION }, required: ["section"] },
};

const BLOCKS_SCHEMA = {
  name: "notebook_blocks",
  description: "Replacement blocks for one edited part of a notebook",
  parameters: {
    type: "object",
    properties: { blocks: { type: "array", items: BLOCK } },
    required: ["blocks"],
  },
};

const DIAGRAM_SCHEMA = {
  name: "notebook_diagram",
  description: "A single regenerated teaching diagram",
  parameters: { type: "object", properties: { diagram: DIAGRAM }, required: ["diagram"] },
};

const DEPTH_HINT: Record<string, string> = {
  short: "SHORT notebook: 5-8 sections.",
  medium: "MEDIUM notebook: 8-12 sections.",
  detailed: "DETAILED notebook: 12-18 sections.",
};

const DIAGRAM_HINT: Record<string, string> = {
  minimal: "DIAGRAM LEVEL minimal: at most 1-2 diagrams in the whole notebook, only where indispensable.",
  balanced: "DIAGRAM LEVEL balanced: a diagram in roughly one section in three, only where it truly teaches.",
  heavy: "DIAGRAM LEVEL visual-heavy: a diagram in most sections, but still only where it teaches something real.",
};

const STYLE_HINT: Record<string, string> = {
  detailed:
    "STYLE = DETAILED. Deep explanations with the reasoning behind each idea, worked examples, code where the subject is technical, connections between concepts, and diagrams for anything structural.",
  short:
    "STYLE = SHORT. Only essential information. Mostly definitions, tight bullets and one example per concept. No long prose, no optional asides.",
  exam:
    "STYLE = EXAM. Definitions verbatim-ready, numbered key points, comparisons, likely exam focus callouts, short-answer phrasing, long-answer skeletons, memory tricks and viva blocks. Every section ends with an exam or viva block.",
  revision:
    "STYLE = REVISION. Ultra-fast recall: keyword bullets, formulas, tiny comparison tables, common mistakes and quick questions. Minimal prose, maximum scannability.",
  onepage:
    "STYLE = ONE PAGE. Maximum information density that is still readable: 3-5 sections only, dense keyword bullets, one table, one diagram at most, no long prose.",
  handwritten:
    "STYLE = HANDWRITTEN. The full visual notebook experience: definitions, examples, diagrams, callouts, memory tricks, code where relevant and a strong revision section.",
};

const ACTION_HINT: Record<string, string> = {
  improve: "Rewrite this content so it explains the idea more clearly and concretely. Keep the same block types unless a different one teaches better.",
  shorter: "Compress this content to the essential signal. Fewer words, same meaning. Prefer bullets.",
  exam: "Rework this content for exam performance: sharp definition, numbered key points, and one 'exam' callout naming the likely exam focus.",
  example: "Keep the existing content and ADD one concrete practical example block (and a short code block if the subject is programming).",
  viva: "Keep the existing content and ADD one viva block with 2-3 oral questions plus answers that test understanding.",
  code: "Keep the existing content and ADD one short, correct code block with its expected output.",
  mistake: "Keep the existing content and ADD one 'mistake' callout describing the mistake students actually make here.",
  trick: "Keep the existing content and ADD one 'trick' callout with a genuinely useful mnemonic or mental model.",
  expand: "Expand this content with more depth: the mechanism behind it, one example, and one practical consequence.",
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

/** Describe existing blocks back to the model so selective edits stay grounded. */
function blocksDigest(blocks: any[]) {
  return (blocks || [])
    .map((b, i) => {
      const bits = [
        b.text, b.term && `${b.term}: ${b.meaning || ""}`, b.formula, b.code,
        (b.items || []).join(" | "),
        (b.qa || []).map((q: any) => `Q ${q.q} / A ${q.a}`).join(" | "),
        b.diagram && `[diagram ${b.diagram.kind}: ${b.diagram.title}]`,
      ].filter(Boolean);
      return `${i + 1}. (${b.type}${b.kind ? `/${b.kind}` : ""}) ${bits.join(" — ")}`;
    })
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      mode = "notebook", pack, options = {}, profile,
      sectionTitle, context, instruction, blocks, action,
    } = await req.json();

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
Use this ONLY to choose examples, emphasis and difficulty. Never distort educational accuracy to personalise, and never invent personal details.`;

    const noteStyle = String(options.noteStyle || "detailed");
    const styleLine = `${STYLE_HINT[noteStyle] || STYLE_HINT.detailed}
${DEPTH_HINT[options.depth as string] || DEPTH_HINT.medium}
${DIAGRAM_HINT[options.diagramLevel as string] || DIAGRAM_HINT.balanced}`;

    let schema: any = NOTEBOOK_SCHEMA;
    let user = "";

    if (mode === "section") {
      schema = SECTION_SCHEMA;
      user = `${learner}\n\n${styleLine}\n\n${packDigest(pack)}\n\nExisting notebook outline:\n${(context || [])
        .map((t: string, i: number) => `${i + 1}. ${t}`)
        .join("\n")}\n\nRegenerate ONLY the section titled "${sectionTitle}". Stay on that exact subject and do not duplicate the other sections.${
        instruction ? `\nUser instruction: ${instruction}` : ""
      }`;
    } else if (mode === "blocks") {
      schema = BLOCKS_SCHEMA;
      user = `${learner}\n\n${styleLine}\n\n${packDigest(pack)}\n\nSECTION: ${sectionTitle}\n\nCURRENT CONTENT OF THIS PART:\n${blocksDigest(
        blocks || []
      )}\n\nTASK: ${ACTION_HINT[action as string] || ACTION_HINT.improve}${
        instruction ? `\nUser instruction: ${instruction}` : ""
      }\n\nReturn the FULL replacement block list for this part only (1-6 blocks). Do not touch anything else in the notebook.`;
    } else if (mode === "diagram") {
      schema = DIAGRAM_SCHEMA;
      user = `${learner}\n\n${packDigest(pack)}\n\nSection: ${sectionTitle}\nNearby notes: ${(context || []).join(
        " | "
      )}\n\nProduce ONE clear teaching diagram for this section. Pick the diagram kind that actually matches the concept (process -> flow, parent/child -> hierarchy, entities -> er, layers -> stack, two options -> comparison). Prefer a clearer structure than before.${
        instruction ? `\nUser instruction: ${instruction}` : ""
      }`;
    } else {
      user = `${learner}\n\n${styleLine}\n\n${packDigest(
        pack
      )}\n\nPlan the complete handwritten notebook content now, section by section.`;
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
