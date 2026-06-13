import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";


export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/wolx-logo.png" alt="Woolley-Tech" className="h-10 w-auto object-contain" />
          <span className="hidden rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:inline">Staging</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground">Home</Link>
          <Link to="/features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground">Features</Link>
          <Link to="/pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground">Pricing</Link>
          <Link to="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground">Dashboard</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
          <Button asChild size="sm" className="shadow-md" style={{ background: "var(--gradient-brand)" }}>
            <Link to="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="container mx-auto px-6 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Woolley-Tech. Staging environment.</div>
          <div className="flex gap-6">
            <span>v2.4.1-staging</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> All systems normal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}