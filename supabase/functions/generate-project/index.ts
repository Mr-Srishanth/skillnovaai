const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { domain } = await req.json();
    if (!domain) {
      return new Response(JSON.stringify({ error: "domain required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const domainMap: Record<string, string> = {
      "ai-ml": "AI / Machine Learning",
      "web": "Web Development",
      "data": "Data Science",
      "mobile": "Mobile Development",
      "devops": "DevOps / Cloud",
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const res = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a project idea generator for developers. Generate a creative, practical project idea. Return ONLY valid JSON:
{"title": "...", "description": "...", "tech_stack": ["..."], "difficulty": "Beginner|Intermediate|Advanced", "estimated_time": "...", "steps": ["step1", "step2", "step3", "step4", "step5"]}`
          },
          { role: "user", content: `Generate a unique project idea in the domain: ${domainMap[domain] || domain}` }
        ],
      }),
    });

    const rawText = await res.text();
    console.log("API response status:", res.status, "body:", rawText.substring(0, 500));
    const completion = JSON.parse(rawText);
    let content = completion.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
