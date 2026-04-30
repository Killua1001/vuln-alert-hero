// Shared utilities for CVE Pulse edge functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 500, extra: Record<string, unknown> = {}) {
  return json({ error: message, ...extra }, status);
}

// Severity from CVSS
export function severityFromCvss(score: number | null): string {
  if (score == null) return "NONE";
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  if (score > 0) return "LOW";
  return "NONE";
}

// CVE Pulse risk engine
// risk = cvss*0.5 + exploit_existente*2 + presente_no_kev*3
export function computeRisk(cvss: number | null, hasExploit: boolean, isKev: boolean) {
  const base = (cvss ?? 0) * 0.5;
  const score = Math.min(10, base + (hasExploit ? 2 : 0) + (isKev ? 3 : 0));
  let level = "LOW";
  if (score >= 9) level = "CRITICAL";
  else if (score >= 7) level = "HIGH";
  else if (score >= 4) level = "MEDIUM";
  return { score: Number(score.toFixed(2)), level };
}

// Tiny in-memory cache (per-isolate). TTL ms.
const cache = new Map<string, { v: unknown; exp: number }>();
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.exp > now) return hit.v as T;
  const v = await fn();
  cache.set(key, { v, exp: now + ttlMs });
  return v;
}

export async function fetchWithRetry(url: string, init: RequestInit = {}, retries = 2, timeoutMs = 15000): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 429 || res.status >= 500) {
        if (i < retries) { await new Promise(r => setTimeout(r, 600 * (i + 1))); continue; }
      }
      return res;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr ?? new Error("fetchWithRetry failed");
}

export function parseNvdItem(item: any) {
  const c = item.cve;
  const cvss3 = c.metrics?.cvssMetricV31?.[0]?.cvssData ?? c.metrics?.cvssMetricV30?.[0]?.cvssData;
  const cvssScore = cvss3?.baseScore ?? null;
  const cvssVector = cvss3?.vectorString ?? null;
  const description = c.descriptions?.find((d: any) => d.lang === "en")?.value ?? "";
  const products: string[] = [];
  for (const cfg of c.configurations ?? []) {
    for (const node of cfg.nodes ?? []) {
      for (const m of node.cpeMatch ?? []) {
        if (m.criteria) products.push(m.criteria);
      }
    }
  }
  return {
    cve_id: c.id,
    description,
    cvss_score: cvssScore,
    cvss_vector: cvssVector,
    severity: severityFromCvss(cvssScore),
    published_at: c.published,
    last_modified_at: c.lastModified,
    affected_products: products.slice(0, 50),
    references_data: (c.references ?? []).slice(0, 20).map((r: any) => ({ url: r.url, tags: r.tags ?? [] })),
    raw: c,
  };
}
