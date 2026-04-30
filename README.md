🔴 CVE Pulse — Threat Intelligence em Tempo Real
Plataforma SaaS de monitoramento de vulnerabilidades CVE agregando NVD, CISA KEV, OSV.dev e GitHub Advisories, com motor de risco proprietário (cvss×0.5 + exploit×2 + kev×3), simulação de pentest segura, resumos via Gemini e dashboard realtime.

Stack
React 18 + Vite + TypeScript + Tailwind + shadcn + Recharts (frontend) · Supabase (Postgres + RLS + Realtime + Edge Functions Deno) · Lovable AI Gateway (Gemini 2.5 Flash) · jsPDF.

APIs reais
NVD CVE 2.0 — services.nvd.nist.gov/rest/json/cves/2.0
CISA KEV — cisa.gov/.../known_exploited_vulnerabilities.json
OSV.dev — api.osv.dev/v1/query
GitHub Advisories — api.github.com/advisories?cve_id=...
Como usar
/auth — crie uma conta.
Dashboard → Sync KEV (popula 1500+ vulnerabilidades exploradas).
Filtre, abra um CVE, gere resumo IA, simule pentest e exporte PDF.
Watchlist → monitore pacotes (npm/PyPI/etc) via OSV.dev.
Variáveis opcionais
NVD_API_KEY (Cloud → Secrets) eleva o limite de 5→50 req/30s.
Como pegar o código
GitHub → botão "Connect to GitHub" no topo do editor (sincroniza repo completo).
Ou Download pelo menu do projeto.
