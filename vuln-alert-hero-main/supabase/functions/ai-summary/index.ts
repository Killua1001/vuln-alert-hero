// POST /functions/v1/ai-summary  { cve_id, description, cvss, is_kev }
// Uses Lovable AI Gateway to produce a Portuguese technical brief + mitigation steps.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json, errorResponse } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { cve_id, description, cvss, is_kev } = await req.json();
    if (!cve_id || !description) return errorResponse("cve_id and description required", 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return errorResponse("AI gateway not configured", 500);

    const prompt = `Você é um analista de segurança sênior. Resuma a vulnerabilidade ${cve_id} em português técnico, de forma clara e objetiva.

Descrição original: ${description}
CVSS: ${cvss ?? "N/A"}
Listada em CISA KEV: ${is_kev ? "SIM (explorada ativamente)" : "não"}

Produza em Markdown com seções:
## Resumo executivo (2-3 linhas)
## Vetor de ataque
## Impacto técnico
## Mitigação recomendada (lista de ações concretas e priorizadas)
Seja conciso. No máximo 250 palavras no total.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista de cibersegurança que explica CVEs em português técnico, conciso." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (r.status === 429) return errorResponse("Limite de uso da IA atingido. Tente em instantes.", 429);
    if (r.status === 402) return errorResponse("Créditos de IA esgotados. Adicione créditos em Lovable Cloud.", 402);
    if (!r.ok) return errorResponse(`AI ${r.status}`, 502);
    const data = await r.json();
    const summary = data.choices?.[0]?.message?.content ?? "";

    // Persist
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("cves").update({ ai_summary: summary }).eq("cve_id", cve_id);

    return json({ cve_id, summary });
  } catch (e) {
    console.error("ai-summary", e);
    return errorResponse((e as Error).message, 502);
  }
});
