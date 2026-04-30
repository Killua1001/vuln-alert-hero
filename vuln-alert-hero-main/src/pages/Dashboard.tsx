import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { CveCard, CveItem } from "@/components/CveCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area } from "recharts";
import { Search, RefreshCw, Database, Flame, ShieldAlert, Activity } from "lucide-react";
import { toast } from "sonner";

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "hsl(0 90% 58%)",
  HIGH: "hsl(22 95% 55%)",
  MEDIUM: "hsl(45 95% 55%)",
  LOW: "hsl(200 80% 55%)",
  NONE: "hsl(220 10% 50%)",
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("ALL");
  const [search, setSearch] = useState("");
  const [hours, setHours] = useState(168);
  const [liveCount, setLiveCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severity !== "ALL") params.set("severity", severity);
      if (search.trim()) params.set("search", search.trim());
      params.set("hours", String(hours));
      params.set("limit", "50");
      const { data, error } = await supabase.functions.invoke(`cves-list?${params}`, { method: "GET" });
      if (error) throw error;
      setItems(data.vulnerabilities ?? []);
    } catch (e: any) {
      toast.error("Falha ao carregar CVEs: " + (e.message ?? "erro"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user, severity, hours]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("cves-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cves" }, (payload: any) => {
        setLiveCount(c => c + 1);
        toast.info(`Novo CVE: ${payload.new.cve_id}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const stats = useMemo(() => {
    const byLevel: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 };
    let kev = 0, exploit = 0;
    for (const c of items) {
      byLevel[(c.risk_level ?? "NONE").toUpperCase()] = (byLevel[(c.risk_level ?? "NONE").toUpperCase()] ?? 0) + 1;
      if (c.is_kev) kev++;
      if (c.has_exploit) exploit++;
    }
    return { byLevel, kev, exploit, total: items.length };
  }, [items]);

  const chartData = useMemo(
    () => Object.entries(stats.byLevel).map(([level, count]) => ({ level, count, color: SEV_COLORS[level] })),
    [stats]
  );

  const timelineData = useMemo(() => {
    const buckets: Record<string, number> = {};
    items.forEach(c => {
      if (!c.published_at) return;
      const d = new Date(c.published_at).toISOString().slice(0, 10);
      buckets[d] = (buckets[d] ?? 0) + 1;
    });
    return Object.entries(buckets).sort().map(([date, count]) => ({ date: date.slice(5), count }));
  }, [items]);

  const syncKev = async () => {
    toast.loading("Sincronizando catálogo CISA KEV…", { id: "kev" });
    const { data, error } = await supabase.functions.invoke("sync-kev", { method: "POST" });
    if (error) toast.error("Erro: " + error.message, { id: "kev" });
    else toast.success(`KEV sincronizado: ${data?.count ?? 0} entradas`, { id: "kev" });
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="container py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">// console</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Threat Dashboard</h1>
            <p className="text-sm text-muted-foreground">CVEs publicados nas últimas {hours}h · {stats.total} resultados {liveCount > 0 && <span className="ml-2 text-primary">· {liveCount} ao vivo</span>}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={syncKev}><Database className="mr-1.5 h-3.5 w-3.5" />Sync KEV</Button>
            <Button size="sm" onClick={load} disabled={loading}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Atualizar</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <Card className="border-border/60 bg-card/60 p-4">
            <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span><Activity className="h-4 w-4 text-muted-foreground" /></div>
            <div className="mt-2 font-display text-3xl font-bold tabular-nums">{stats.total}</div>
          </Card>
          <Card className="border-sev-critical/30 bg-sev-critical/5 p-4">
            <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-sev-critical">Critical</span><Flame className="h-4 w-4 text-sev-critical" /></div>
            <div className="mt-2 font-display text-3xl font-bold tabular-nums text-sev-critical">{stats.byLevel.CRITICAL ?? 0}</div>
          </Card>
          <Card className="border-sev-high/30 bg-sev-high/5 p-4">
            <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-sev-high">In KEV</span><ShieldAlert className="h-4 w-4 text-sev-high" /></div>
            <div className="mt-2 font-display text-3xl font-bold tabular-nums text-sev-high">{stats.kev}</div>
          </Card>
          <Card className="border-border/60 bg-card/60 p-4">
            <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-muted-foreground">Com exploit</span><ShieldAlert className="h-4 w-4 text-muted-foreground" /></div>
            <div className="mt-2 font-display text-3xl font-bold tabular-nums">{stats.exploit}</div>
          </Card>
        </div>

        {/* Charts */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <Card className="border-border/60 bg-card/60 p-5 lg:col-span-1">
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider">Por severidade</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="level" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="border-border/60 bg-card/60 p-5 lg:col-span-2">
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider">Linha do tempo de publicação</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="gPrimary" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gPrimary)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-5 flex flex-wrap items-center gap-3 border-border/60 bg-card/60 p-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar tecnologia, vendor, CVE-ID…" className="pl-9" value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} />
          </div>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas severidades</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(hours)} onValueChange={v => setHours(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24">Últimas 24h</SelectItem>
              <SelectItem value="72">Últimas 72h</SelectItem>
              <SelectItem value="168">Últimos 7 dias</SelectItem>
              <SelectItem value="720">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load} disabled={loading}>Aplicar</Button>
        </Card>

        {/* List */}
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-32 animate-pulse border-border/60 bg-card/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">Nenhum CVE encontrado para os filtros atuais.</Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map(c => <CveCard key={c.cve_id} cve={c} />)}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
