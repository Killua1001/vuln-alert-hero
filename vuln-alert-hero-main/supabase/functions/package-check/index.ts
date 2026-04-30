// POST /functions/v1/package-check  { ecosystem, name, version? }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json, errorResponse, fetchWithRetry } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const ecosystem = String(body.ecosystem ?? "").trim();
    const name = String(body.name ?? "").trim();
    const version = body.version ? String(body.version).trim() : undefined;
    if (!ecosystem || !name) return errorResponse("ecosystem and name required", 400);
    if (name.length > 200 || ecosystem.length > 50) return errorResponse("input too long", 400);

    const payload: Record<string, unknown> = { package: { name, ecosystem } };
    if (version) payload.version = version;

    const r = await fetchWithRetry("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "CVE-Pulse/1.0" },
      body: JSON.stringify(payload),
    }, 2, 15000);
    if (!r.ok) return errorResponse(`OSV ${r.status}`, 502);
    const data = await r.json();
    const vulns = (data.vulns ?? []).map((v: any) => ({
      id: v.id,
      summary: v.summary,
      details: v.details,
      aliases: v.aliases ?? [],
      severity: v.severity ?? [],
      published: v.published,
      modified: v.modified,
      references: (v.references ?? []).slice(0, 8),
      cve_ids: (v.aliases ?? []).filter((a: string) => a.startsWith("CVE-")),
    }));
    return json({ ecosystem, name, version: version ?? null, count: vulns.length, vulnerabilities: vulns });
  } catch (e) {
    console.error("package-check", e);
    return errorResponse((e as Error).message, 502);
  }
});
