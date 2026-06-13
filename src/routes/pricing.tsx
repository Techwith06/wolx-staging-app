import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Woolley-Tech" },
      { name: "description", content: "Simple, transparent pricing for teams of every size." },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Starter", price: "$0", period: "/mo", description: "For indie devs validating ideas.",
    features: ["1 workspace", "3 preview environments", "Community support", "GitHub & GitLab"], cta: "Start free",
  },
  {
    name: "Team", price: "$49", period: "/mo per seat", description: "For shipping teams of 2–50.", featured: true,
    features: ["Unlimited previews", "SSO + RBAC", "Audit logs", "Priority support", "Secret management"], cta: "Start 14-day trial",
  },
  {
    name: "Enterprise", price: "Custom", period: "", description: "For regulated and high-scale orgs.",
    features: ["Dedicated cluster", "SOC 2 reports", "Custom SLAs", "Solution architect", "On-prem option"], cta: "Contact sales",
  },
];

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="flex-1">
        <section className="container mx-auto px-6 pb-16 pt-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Simple, transparent pricing</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Start free. Scale when you're ready. No surprise overages.</p>
        </section>
        <section className="container mx-auto grid gap-6 px-6 pb-24 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border bg-card p-8 ${t.featured ? "border-primary shadow-2xl" : "border-border"}`}
              style={t.featured ? { boxShadow: "var(--shadow-elegant)" } : undefined}
            >
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.period}</span>
              </div>
              <Button asChild className="mt-6 w-full" variant={t.featured ? "default" : "outline"} style={t.featured ? { background: "var(--gradient-brand)" } : undefined}>
                <Link to="/signup">{t.cta}</Link>
              </Button>
              <ul className="mt-8 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /><span>{f}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}