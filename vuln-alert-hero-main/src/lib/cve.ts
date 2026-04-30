export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export const severityClass = (s?: string | null) => {
  switch ((s ?? "").toUpperCase()) {
    case "CRITICAL": return "text-sev-critical border-sev-critical/40 bg-sev-critical/10";
    case "HIGH": return "text-sev-high border-sev-high/40 bg-sev-high/10";
    case "MEDIUM": return "text-sev-medium border-sev-medium/40 bg-sev-medium/10";
    case "LOW": return "text-sev-low border-sev-low/40 bg-sev-low/10";
    default: return "text-sev-none border-sev-none/40 bg-sev-none/10";
  }
};

export const severityDotClass = (s?: string | null) => {
  switch ((s ?? "").toUpperCase()) {
    case "CRITICAL": return "bg-sev-critical";
    case "HIGH": return "bg-sev-high";
    case "MEDIUM": return "bg-sev-medium";
    case "LOW": return "bg-sev-low";
    default: return "bg-sev-none";
  }
};

export const formatRelative = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
};
