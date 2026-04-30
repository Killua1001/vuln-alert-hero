import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldAlert, Activity, Brain, Gauge, Globe, Radio, FileText, Zap } from "lucide-react";

const features = [
  { icon: Radio, title: "Tempo real", desc: "Realtime via Postgres replication. Novos CVEs aparecem sem refresh." },
  { icon: Gauge, title: "Risk Engine", desc: "CVSS × exploit conhecido × CISA KEV em score único 0-10." },
  { icon: Brain, title: "Resumo com IA", desc: "Gemini gera briefing técnico em PT-BR e plano de mitigação." },
  { icon: Globe, title: "APIs reais", desc: "NVD, OSV.dev, GitHub Advisories e CISA KEV — sem mocks." },
  { icon: ShieldAlert, title: "Pentest seguro", desc: "Simulação determinística e isolada — nunca executa exploit real." },
  { icon: FileText, title: "Relatórios PDF", desc: "Exportação técnica com risco, vetores e mitigação." },
];

const Index = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-[0.07]" />
          <div className="container relative py-20 md:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs">
                <span className="relative flex h-2 w-2"><span className="absolute inset-0 rounded-full bg-primary animate-blink" /></span>
                <span className="font-mono uppercase tracking-widest text-primary">live threat intel</span>
              </div>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
                Vulnerabilidades<br /><span className="text-gradient">em tempo real.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                CVE Pulse agrega NVD, CISA KEV, OSV.dev e GitHub Advisories num só dashboard.
                Pontuação de risco proprietária, simulação de exploit segura e resumo com IA.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link to="/auth"><Button size="lg" className="px-7"><Zap className="mr-2 h-4 w-4" />Acessar console</Button></Link>
                <a href="#features"><Button size="lg" variant="outline" className="px-7">Ver recursos</Button></a>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container py-16">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-primary">// stack</p>
              <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Construído para operadores de SOC</h2>
            </div>
            <Activity className="hidden h-10 w-10 text-primary/30 md:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-border/60 bg-card/60 p-6 transition-colors hover:border-primary/30">
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
          CVE Pulse · Threat intelligence platform · Dados de NVD · CISA KEV · OSV.dev
        </footer>
      </main>
    </div>
  );
};

export default Index;
