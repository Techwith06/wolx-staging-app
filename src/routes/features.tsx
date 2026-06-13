import { createFileRoute } from "@tanstack/react-router";
import { GitBranch, Shield, Zap, Activity, Lock, Cpu, Users, Workflow, Globe } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Woolley-Tech" },
      { name: "description", content: "Every capability Woolley-Tech ships for modern engineering teams." },
    ],
  }),
  component: FeaturesPage,
});

const groups = [
  {
    title: "Preview environments",
    items: [
      { icon: GitBranch, title: "Branch previews", body: "Spin up production parity environments for every pull request." },
      { icon: Workflow, title: "Pipeline orchestration", body: "Chain build, test, and deploy steps with smart parallelization." },
      { icon: Globe, title: "Custom domains", body: "Map any preview to a memorable subdomain instantly." },
    ],
  },
  {
    title: "Security & compliance",
    items: [
      { icon: Shield, title: "SOC 2 Type II", body: "Independently audited controls covering security and availability." },
      { icon: Lock, title: "Secret management", body: "Encrypted variables synced across every environment tier." },
      { icon: Users, title: "SSO & RBAC", body: "SAML, SCIM and granular role permissions out of the box." },
    ],
  },
  {
    title: "Performance",
    items: [
      { icon: Zap, title: "Edge-fast deploys", body: "Anycast routing pushes builds to 200+ regions in seconds." },
      { icon: Cpu, title: "Auto-scale compute", body: "Match staging traffic to production patterns automatically." },
      { icon: Activity, title: "Observability", body: "Live logs, metrics and traces wired into every environment." },
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="flex-1">
        <section className="container mx-auto px-6 pb-12 pt-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Platform</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">Every feature your release team needs.</h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">A complete platform replacing your CI runners, secrets vault, and staging cluster.</p>
        </section>
        {groups.map((g) => (
          <section key={g.title} className="container mx-auto px-6 py-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{g.title}</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {g.items.map((i) => (
                <div key={i.title} className="rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><i.icon className="h-5 w-5" /></div>
                  <h3 className="font-semibold">{i.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{i.body}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
        <div className="h-16" />
      </main>
      <SiteFooter />
    </div>
  );
}