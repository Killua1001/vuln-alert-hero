import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ECOSYSTEMS = ["npm", "PyPI", "Go", "Maven", "RubyGems", "crates.io", "Packagist", "NuGet"];

const Watchlist = () => {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [ecosystem, setEcosystem] = useState("npm");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("watchlist").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const add = async () => {
    if (!name.trim() || !user) return;
    const { error } = await supabase.from("watchlist").insert({ user_id: user.id, ecosystem, package_name: name.trim() });
    if (error) toast.error(error.message);
    else { setName(""); toast.success("Pacote adicionado"); load(); }
  };

  const remove = async (id: string) => {
    await supabase.from("watchlist").delete().eq("id", id);
    load();
  };

  const checkAll = async () => {
    setBusy(true);
    const out: Record<string, any> = {};
    for (const item of items) {
      const { data } = await supabase.functions.invoke("package-check", {
        body: { ecosystem: item.ecosystem, name: item.package_name },
      });
      out[item.id] = data;
    }
    setResults(out);
    setBusy(false);
    toast.success("Verificação concluída via OSV.dev");
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="container py-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">// supply chain</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Watchlist de pacotes</h1>
        <p className="text-sm text-muted-foreground">Monitora vulnerabilidades em dependências via OSV.dev (Google).</p>

        <Card className="mt-6 flex flex-wrap items-end gap-2 border-border/60 bg-card/60 p-4">
          <Select value={ecosystem} onValueChange={setEcosystem}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{ECOSYSTEMS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Nome do pacote (ex: react)" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()} className="flex-1 min-w-[200px]" />
          <Button onClick={add}>Adicionar</Button>
          <Button variant="outline" onClick={checkAll} disabled={busy || items.length === 0}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Verificar todos
          </Button>
        </Card>

        <div className="mt-6 grid gap-3">
          {items.length === 0 && <Card className="p-10 text-center text-muted-foreground">Nenhum pacote monitorado ainda.</Card>}
          {items.map(item => {
            const res = results[item.id];
            return (
              <Card key={item.id} className="border-border/60 bg-card/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] uppercase">{item.ecosystem}</span>
                    <span className="ml-2 font-mono font-semibold">{item.package_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {res && (
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${res.count > 0 ? "border-sev-high/40 bg-sev-high/10 text-sev-high" : "border-primary/40 bg-primary/10 text-primary"}`}>
                        {res.count} vuln
                      </span>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {res?.vulnerabilities?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {res.vulnerabilities.slice(0, 5).map((v: any) => (
                      <li key={v.id} className="truncate">▸ <span className="font-mono text-foreground/80">{v.id}</span> · {v.summary}</li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Watchlist;
