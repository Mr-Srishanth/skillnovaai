import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are SkillNova Knowledge Engine — an elite AI learning scientist.
RULES:
- Teach, don't summarise blandly. Every output must be usable for real exams and interviews.
- Ground everything in the supplied source content. If the source is thin, expand from solid domain knowledge but never invent fake facts, fake citations or fake statistics.
- Simple, clear English. Concrete examples over abstract theory.
- Notes are Markdown: # title, ## sections, ### sub-sections, bullets, **bold keywords**, examples, and a final "## Conclusion".
- Quizzes must have exactly one correct option and plausible distractors.`;

const SCHEMA = {
  name: "knowledge_pack",
  description: "A complete multi-format learning pack generated from source content",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Clean, specific title of the topic" },
      topic: { type: "string", description: "Short canonical topic name (2-5 words)" },
      summary: { type: "string", description: "2-3 sentence overview of what this pack covers" },
      readingMinutes: { type: "number", description: "Estimated minutes to read the notes" },
      difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
      keyTerms: {
        type: "array",
        description: "6-10 important keywords with one-line meanings",
        items: {
          type: "object",
          properties: { term: { type: "string" }, meaning: { type: "string" } },
          required: ["term", "meaning"],
        },
      },
      notes: { type: "string", description: "The full Smart Notes in Markdown, matching the requested note style" },
      mindMap: {
        type: "object",
        description: "Concept map of the topic",
        properties: {
          root: { type: "string" },
          branches: {
            type: "array",
            description: "4-6 main branches",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                children: { type: "array", items: { type: "string" }, description: "2-4 sub-concepts" },
              },
              required: ["label", "children"],
            },
          },
        },
        required: ["root", "branches"],
      },
      quiz: {
        type: "array",
        description: "8 multiple choice questions across easy/medium/hard",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" }, description: "Exactly 4 options" },
            answerIndex: { type: "number", description: "0-3 index of the correct option" },
            explanation: { type: "string" },
            difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          },
          required: ["question", "options", "answerIndex", "explanation", "difficulty"],
        },
      },
      flashcards: {
        type: "array",
        description: "10 flashcards",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
            difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
            category: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["question", "answer", "difficulty", "category", "priority"],
        },
      },
      revisionSheet: {
        type: "object",
        description: "One-page last-minute revision sheet",
        properties: {
          mustKnow: { type: "array", items: { type: "string" }, description: "6-8 one-line must-know points" },
          formulasOrFacts: { type: "array", items: { type: "string" }, description: "4-6 formulas, definitions or hard facts" },
          commonMistakes: { type: "array", items: { type: "string" }, description: "3-5 mistakes learners make" },
          examTips: { type: "array", items: { type: "string" }, description: "3-4 exam / interview tips" },
        },
        required: ["mustKnow", "formulasOrFacts", "commonMistakes", "examTips"],
      },
      careerLink: { type: "string", description: "1-2 sentences on how this topic advances the user's career goal. If no goal, explain its general career value." },
    },
    required: ["title", "topic", "summary", "readingMinutes", "difficulty", "keyTerms", "notes", "mindMap", "quiz", "flashcards", "revisionSheet", "careerLink"],
  },
};

const STYLE_HINT: Record<string, string> = {
  detailed: "DETAILED NOTES: deep, thorough, with worked examples and explanations of why things work.",
  short: "SHORT NOTES: compact, high signal, mostly bullets, no fluff.",
  exam: "EXAM NOTES: structured for scoring marks — definitions, key points, likely questions.",
  revision: "REVISION NOTES: rapid-recall format, very scannable, heavy bolding.",
  onepage: "ONE PAGE SUMMARY: everything essential compressed onto a single page.",
};

async function resolveYouTube(url: string) {
  try {
    const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (oembed.ok) {
      const j = await oembed.json();
      return `YOUTUBE VIDEO\nTitle: ${j.title}\nChannel: ${j.author_name}\nURL: ${url}`;
    }
  } catch (_) { /* ignore */ }
  return `YOUTUBE VIDEO URL: ${url}`;
}

async function resolveUrl(url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 SkillNovaBot" } });
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return `WEB PAGE (${url})\n${text.slice(0, 18000)}`;
  } catch (_) {
    return `WEB PAGE URL: ${url}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sourceType = "topic", topic = "", url = "", text = "", noteStyle = "detailed", profile } =
      await req.json();

    let source = "";
    if (sourceType === "youtube") source = await resolveYouTube(url);
    else if (sourceType === "url") source = await resolveUrl(url);
    else if (sourceType === "pdf" || sourceType === "text") source = String(text).slice(0, 40000);
    else source = `TOPIC TO TEACH: ${topic}`;

    if (!source || source.trim().length < 8) {
      return new Response(JSON.stringify({ error: "Give me something to work with — a topic, a file, or a link." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const p = profile || {};
    const userMessage = `LEARNER CONTEXT
- Career goal: ${p.goal || "not set"}
- Current skills: ${p.skills || "not recorded"}
- Missing skills: ${(p.missingSkills || []).join(", ") || "none recorded"}
- Level: ${p.level || "Beginner"}
- Region: ${p.region || "India"}

NOTE STYLE REQUESTED: ${STYLE_HINT[noteStyle] || STYLE_HINT.detailed}
${topic ? `FOCUS TOPIC: ${topic}\n` : ""}
SOURCE CONTENT
---
${source}
---

Generate the complete learning pack for this exact learner.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMessage },
        ],
        tools: [{ type: "function", function: SCHEMA }],
        tool_choice: { type: "function", function: { name: SCHEMA.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response from AI");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("knowledge-engine error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
