const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { question, answer } = await req.json();
    if (!question || !answer) {
      return new Response(JSON.stringify({ error: "question and answer required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const res = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach. Analyze the candidate's answer to the interview question. Return ONLY valid JSON with this exact structure:
{"confidence_score": <0-100>, "clarity_score": <0-100>, "strengths": ["..."], "improvements": ["..."], "revised_answer": "..."}`
          },
          { role: "user", content: `Interview Question: "${question}"\n\nCandidate's Answer: "${answer}"\n\nAnalyze this answer.` }
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("mock-interview gateway error", res.status, detail.slice(0, 500));
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: `AI gateway error: ${res.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const completion = await res.json();
    let content = completion.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
