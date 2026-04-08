import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { resumeText, targetRole } = await req.json();

    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Resume text is too short or empty. Please upload a valid resume." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!targetRole || typeof targetRole !== "string" || targetRole.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Please provide a valid target role." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Truncate resume text to ~4000 chars to avoid token limits
    const trimmedResume = resumeText.slice(0, 4000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert ATS (Applicant Tracking System) resume analyzer. Evaluate resumes against specific job roles with harsh but fair feedback. Be specific about what's wrong and how to fix it. Never sugarcoat — be direct and actionable.`,
          },
          {
            role: "user",
            content: `Analyze this resume for the role: "${targetRole}"\n\nRESUME TEXT:\n${trimmedResume}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "ats_analysis",
              description: "Comprehensive ATS resume analysis with scoring and actionable feedback",
              parameters: {
                type: "object",
                properties: {
                  atsScore: {
                    type: "number",
                    description: "ATS compatibility score 0-100. Be strict: most resumes score 40-70.",
                  },
                  verdict: {
                    type: "string",
                    enum: ["likely_rejected", "needs_work", "competitive", "strong"],
                    description: "Overall verdict on the resume's chances",
                  },
                  verdictReason: {
                    type: "string",
                    description: "One sentence explaining the verdict. Start with 'Your resume will likely...' for rejected, or 'Your resume has...' for others.",
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 specific strengths found in the resume",
                  },
                  weaknesses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        issue: { type: "string", description: "What's wrong" },
                        fix: { type: "string", description: "How to fix it" },
                        severity: { type: "string", enum: ["critical", "major", "minor"] },
                      },
                      required: ["issue", "fix", "severity"],
                    },
                    description: "3-6 weaknesses with fixes",
                  },
                  missingKeywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "5-10 keywords/skills missing that ATS systems look for in this role",
                  },
                  improvementPlan: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 ordered action items to improve the resume. Most impactful first.",
                  },
                },
                required: ["atsScore", "verdict", "verdictReason", "strengths", "weaknesses", "missingKeywords", "improvementPlan"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "ats_analysis" } },
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
