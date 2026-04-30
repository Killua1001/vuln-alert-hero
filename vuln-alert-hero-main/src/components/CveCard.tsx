import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { severityClass, severityDotClass, formatRelative } from "@/lib/cve";
import { Flame, ShieldAlert, ExternalLink } from "lucide-react";

export interface CveItem {
  cve_id: string;
  description: string;
  cvss_score: number | null;
  severity: string;
  risk_score: number;
  risk_level: string;
  published_at: string | null;
  is_kev: boolean;
  has_exploit: boolean;
  affected_products?: string[];
}

export const CveCard = ({ cve }: { cve: CveItem }) => {
  return (
    <Link to={`/cve/${cve.cve_id}`} className="group block">
      <Card className="relative overflow-hidden border-border/60 bg-card/60 p-5 transition-all hover:border-primary/40 hover:bg-card/80">
        <div className={`absolute inset-y-0 left-0 w-1 ${severityDotClass(cve.risk_level)}`} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold tracking-tight">{cve.cve_id}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityClass(cve.risk_level)}`}>
                {cve.risk_level}
              </span>
              {cve.is_kev && (
                <span className="flex items-center gap-1 rounded-full border border-sev-critical/40 bg-sev-critical/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-sev-critical">
                  <Flame className="h-3 w-3" /> KEV
                </span>
              )}
              {cve.has_exploit && !cve.is_kev && (
                <span className="flex items-center gap-1 rounded-full border border-sev-high/40 bg-sev-high/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-sev-high">
                  <ShieldAlert className="h-3 w-3" /> Exploit
                </span>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{cve.description}</p>
            {cve.affected_products?.[0] && (
              <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground/70">
                ▸ {cve.affected_products[0]}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-right">
              <div className="font-display text-2xl font-bold tabular-nums">{cve.risk_score?.toFixed(1) ?? "—"}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">risk</div>
            </div>
            <div className="text-[10px] text-muted-foreground/70">CVSS {cve.cvss_score?.toFixed(1) ?? "—"}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{formatRelative(cve.published_at)}</span>
          <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            Detalhes <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </Card>
    </Link>
  );
};
