import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { severityClass } from "@/lib/cve";
import { ArrowLeft, Brain, Flame, ShieldAlert, FileText, Play, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

const CveDetail = () => {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams();
  const [cve, setCve] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [pentest, setPentest] = useState<any>(null);
  const [pentestLoading, setPentestLoading] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke(`cve-detail?id=${id}`, { method: "GET" });
      if (error) { toast.error("Erro: " + error.message); }
      else setCve(data);
      setLoading(false);
    })();
  }, [user, id]);

  const runAi = async () => {
    if (!cve) return;
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-summary", {
      body: { cve_id: cve.cve_id, description: cve.description, cvss: cve.cvss_score, is_kev: cve.is_kev },
    });
    setAiLoading(false);
    if (error) toast.error("IA: " + error.message);
    else { setAiSummary(data.summary); toast.success("Resumo gerado"); }
  };

  const runPentest = async () => {
    if (!cve) return;
    setPentestLoading(true);
    setPentest(null);
    const { data, error } = await supabase.functions.invoke("pentest-simulate", {
      body: { cve_id: cve.cve_id },
    });
    setPentestLoading(false);
    if (error) toast.error("Pentest: " + error.message);
    else setPentest(data);
  };

  const exportPdf = () => {
    if (!cve) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 60;
    doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text(`CVE Pulse — ${cve.cve_id}`, 40, y); y += 28;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, y); y += 24;
    doc.setTextColor(0); doc.setFontSize(12); doc.setFont("helvetica","bold");
    doc.text("Resumo de risco", 40, y); y += 18;
    doc.setFont("helvetica","normal"); doc.setFontSize(11);
    [
      `Severidade: ${cve.severity}`,
      `CVSS: ${cve.cvss_score ?? "—"}  (${cve.cvss_vector ?? "—"})`,
      `Risk score CVE Pulse: ${cve.risk_score} (${cve.risk_level})`,
      `CISA KEV: ${cve.is_kev ? "SIM" : "Não"}`,
      `Exploit conhecido: ${cve.has_exploit ? "SIM" : "Não"}`,
      `Publicado: ${cve.published_at ?? "—"}`,
    ].forEach(l => { doc.text(l, 40, y); y += 16; });
    y += 8;
    doc.setFont("helvetica","bold"); doc.text("Descrição", 40, y); y += 16;
    doc.setFont("helvetica","normal");
    const desc = doc.splitTextToSize(cve.description ?? "—", 515);
    doc.text(desc, 40, y); y += desc.length * 14 + 10;
    if (aiSummary) {
      doc.setFont("helvetica","bold"); doc.text("Análise técnica (IA)", 40, y); y += 16;
      doc.setFont("helvetica","normal");
      const ai = doc.splitTextToSize(aiSummary.replace(/[#*`>]/g, ""), 515);
      doc.text(ai, 40, y); y += ai.length * 13 + 10;
    }
    if (cve.affected_products?.length) {
      doc.setFont("helvetica","bold"); doc.text("Produtos afetados (CPE)", 40, y); y += 16;
      doc.setFont("helvetica","normal"); doc.setFontSize(9);
      cve.affected_products.slice(0, 12).forEach((p: string) => { doc.text(`• ${p}`, 40, y); y += 12; });
    }
    doc.save(`${cve.cve_id}.pdf`);
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="container py-8">
        <Link to="/dashboard"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Voltar</Button></Link>

        {loading || !cve ? (
          <Card className="h-64 animate-pulse bg-card/40" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="border-border/60 bg-card/70 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight">{cve.cve_id}</h1>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${severityClass(cve.risk_level)}`}>
                    {cve.risk_level}
                  </span>
                  {cve.is_kev && <span className="flex items-center gap-1 rounded-full border border-sev-critical/40 bg-sev-critical/10 px-2 py-1 text-[11px] font-semibold uppercase text-sev-critical"><Flame className="h-3 w-3" />KEV</span>}
                  {cve.has_exploit && <span className="flex items-center gap-1 rounded-full border border-sev-high/40 bg-sev-high/10 px-2 py-1 text-[11px] font-semibold uppercase text-sev-high"><ShieldAlert className="h-3 w-3" />Exploit</span>}
                </div>
                <p className="mt-4 leading-relaxed text-muted-foreground">{cve.description}</p>
                {cve.cvss_vector && <p className="mt-3 font-mono text-xs text-muted-foreground/80">CVSS Vector · {cve.cvss_vector}</p>}
              </Card>

              <Card className="border-border/60 bg-card/70 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Análise técnica com IA</h2>
                  <Button size="sm" onClick={runAi} disabled={aiLoading}>{aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Gerar resumo"}</Button>
                </div>
                {aiSummary ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{aiSummary}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground">Use o botão acima para gerar um briefing técnico em PT-BR via Gemini.</p>
                )}
              </Card>

              <Card className="border-border/60 bg-card/70 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Play className="h-4 w-4 text-primary" /> Simulação de pentest (sandbox)</h2>
                  <Button size="sm" variant="outline" onClick={runPentest} disabled={pentestLoading}>{pentestLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Executar"}</Button>
                </div>
                {pentest ? (
                  <div className="space-y-3 font-mono text-xs">
                    <p className="text-muted-foreground">{pentest.disclaimer}</p>
                    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                      {pentest.steps.map((s: any, i: number) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-muted-foreground/60 tabular-nums">[{String(s.t).padStart(4,"0")}ms]</span>
                          <span className={`w-16 ${s.phase === "FAIL" ? "text-sev-critical" : "text-primary"}`}>{s.phase}</span>
                          <span>{s.msg}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`rounded-lg border p-3 ${pentest.success ? "border-sev-high/30 bg-sev-high/5" : "border-border/60 bg-background/60"}`}>
                      {pentest.evidence.map((e: string, i: number) => <div key={i}>{e}</div>)}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Executa simulação determinística e isolada — nunca dispara exploit real.</p>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/60 bg-card/70 p-6">
                <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Risk Engine</h3>
                <div className="text-center">
                  <div className="font-display text-6xl font-bold text-gradient tabular-nums">{cve.risk_score?.toFixed(1)}</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">/ 10.0</div>
                </div>
                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">CVSS base ×0.5</span><span className="font-mono">{((cve.cvss_score ?? 0) * 0.5).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">+ Exploit (×2)</span><span className="font-mono">{cve.has_exploit ? "+2.00" : "0.00"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">+ KEV (×3)</span><span className="font-mono">{cve.is_kev ? "+3.00" : "0.00"}</span></div>
                </div>
              </Card>

              <Card className="border-border/60 bg-card/70 p-6">
                <Button className="w-full" onClick={exportPdf}><FileText className="mr-2 h-4 w-4" />Exportar relatório PDF</Button>
              </Card>

              {cve.affected_products?.length > 0 && (
                <Card className="border-border/60 bg-card/70 p-6">
                  <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Produtos (CPE)</h3>
                  <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
                    {cve.affected_products.slice(0, 10).map((p: string, i: number) => <li key={i} className="truncate">▸ {p}</li>)}
                  </ul>
                </Card>
              )}

              {cve.references_data?.length > 0 && (
                <Card className="border-border/60 bg-card/70 p-6">
                  <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Referências</h3>
                  <ul className="space-y-1.5 text-sm">
                    {cve.references_data.slice(0, 8).map((r: any, i: number) => (
                      <li key={i}><a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate text-primary hover:underline"><ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{r.url}</span></a></li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CveDetail;
