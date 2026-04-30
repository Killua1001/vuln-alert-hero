import { ShieldAlert, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export const TopBar = () => {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 font-display">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-secondary glow-border">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-blink" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight">CVE PULSE</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">threat intel</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link to="/dashboard"><Button variant="ghost" size="sm"><Activity className="mr-1.5 h-3.5 w-3.5" />Dashboard</Button></Link>
              <Link to="/watchlist"><Button variant="ghost" size="sm">Watchlist</Button></Link>
              <Button variant="outline" size="sm" onClick={signOut}>Sair</Button>
            </>
          ) : (
            <Link to="/auth"><Button variant="default" size="sm">Entrar</Button></Link>
          )}
        </nav>
      </div>
    </header>
  );
};
