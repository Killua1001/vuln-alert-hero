// GET /functions/v1/cves-list?severity=&search=&hours=&limit=
// Fetches from NVD, enriches with KEV + risk, caches in DB.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json, errorResponse, fetchWithRetry, cached, parseNvdItem, computeRisk } from "../_shared/utils.ts";

const NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const severity = url.searchParams.get("severity")?.toUpperCase();
    const search = url.searchParams.get("search")?.trim();
    const hours = Math.min(720, Math.max(1, Number(url.searchParams.get("hours") ?? 168)));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 30)));

    const cacheKey = `list:${severity ?? ""}:${search ?? ""}:${hours}:${limit}`;
    const data = await cached(cacheKey, 5 * 60_000, async () => {
      const params = new URLSearchParams();
      params.set("resultsPerPage", String(limit));
      params.set("startIndex", "0");
      const end = new Date();
      const start = new Date(end.getTime() - hours * 3600_000);
      params.set("pubStartDate", start.toISOString().slice(0, 23));
      params.set("pubEndDate", end.toISOString().slice(0, 23));
      if (severity && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
        params.set("cvssV3Severity", severity);
      }
      if (search) params.set("keywordSearch", search);

      const apiKey = Deno.env.get("NVD_API_KEY");
      const headers: HeadersInit = { "User-Agent": "CVE-Pulse/1.0" };
      if (apiKey) (headers as Record<string, string>)["apiKey"] = apiKey;

      const res = await fetchWithRetry(`${NVD_BASE}?${params.toString()}`, { headers }, 2, 20000);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`NVD ${res.status}: ${text.slice(0, 200)}`);
      }
      const body = await res.json();
      const vulns = (body.vulnerabilities ?? []).map(parseNvdItem);
      return { total: body.totalResults ?? vulns.length, vulnerabilities: vulns };
    });

    // Enrich w/ KEV from DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const ids = data.vulnerabilities.map((v: any) => v.cve_id);
    let kevSet = new Set<string>();
    if (ids.length) {
      const { data: kev } = await supabase.from("kev_entries").select("cve_id").in("cve_id", ids);
      kevSet = new Set((kev ?? []).map((r: any) => r.cve_id));
    }

    const enriched = data.vulnerabilities.map((v: any) => {
      const isKev = kevSet.has(v.cve_id);
      const hasExploit = isKev || (v.references_data ?? []).some((r: any) =>
        (r.tags ?? []).some((t: string) => /Exploit/i.test(t)));
      const risk = computeRisk(v.cvss_score, hasExploit, isKev);
      return { ...v, is_kev: isKev, has_exploit: hasExploit, risk_score: risk.score, risk_level: risk.level };
    });

    // Upsert to cache (best-effort, non-blocking)
    if (enriched.length) {
      supabase.from("cves").upsert(enriched.map((v: any) => ({
        cve_id: v.cve_id,
        description: v.description,
        cvss_score: v.cvss_score,
        cvss_vector: v.cvss_vector,
        severity: v.severity,
        risk_score: v.risk_score,
        risk_level: v.risk_level,
        published_at: v.published_at,
        last_modified_at: v.last_modified_at,
        is_kev: v.is_kev,
        has_exploit: v.has_exploit,
        affected_products: v.affected_products,
        references_data: v.references_data,
      })), { onConflict: "cve_id" }).then(() => {});
    }

    return json({ total: data.total, count: enriched.length, vulnerabilities: enriched });
  } catch (e) {
    console.error("cves-list error", e);
    return errorResponse((e as Error).message ?? "Unknown", 502);
  }
});
