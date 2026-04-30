// POST /functions/v1/sync-kev  — pulls CISA KEV catalog into kev_entries
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json, errorResponse, fetchWithRetry } from "../_shared/utils.ts";

const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const r = await fetchWithRetry(KEV_URL, { headers: { "User-Agent": "CVE-Pulse/1.0" } }, 2, 30000);
    if (!r.ok) return errorResponse(`KEV ${r.status}`, 502);
    const data = await r.json();
    const rows = (data.vulnerabilities ?? []).map((v: any) => ({
      cve_id: v.cveID,
      vendor_project: v.vendorProject,
      product: v.product,
      vulnerability_name: v.vulnerabilityName,
      date_added: v.dateAdded,
      short_description: v.shortDescription,
      required_action: v.requiredAction,
      due_date: v.dueDate,
      ransomware_use: v.knownRansomwareCampaignUse,
    }));

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Batch upsert
    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from("kev_entries").upsert(chunk, { onConflict: "cve_id" });
      if (error) throw error;
      inserted += chunk.length;
    }
    return json({ ok: true, count: inserted, catalogVersion: data.catalogVersion });
  } catch (e) {
    console.error("sync-kev", e);
    return errorResponse((e as Error).message, 502);
  }
});
