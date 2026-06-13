import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, Shield, Zap, GitBranch, Activity, Lock, Database, Cloud, Code2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav, SiteFooter } from "@/components/site-nav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Woolley-Tech — Ship faster, deploy with confidence" },
      { name: "description", content: "Woolley-Tech is the staging and release platform engineers trust to test, preview and ship production-grade software." },
      { property: "og:title", content: "Woolley-Tech — Staging Platform" },
      { property: "og:description", content: "Test, preview and ship production-grade software with confidence." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)",
            }}
          />
          <div className="container mx-auto px-6 pt-24 pb-32 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              New — Branch previews now generally available
            </div>
            <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-bold tracking-tight text-foreground md:text-7xl">
              The staging platform built for{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-brand)" }}>
                modern engineering teams
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Spin up production-grade preview environments for every branch. Catch regressions before they ship. Deploy with the confidence of a Fortune 500 release team.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 text-base shadow-lg" style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-elegant)" }}>
                <Link to="/signup">Start free trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <Link to="/features">Explore features</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No credit card required · 14-day trial · SOC 2 Type II</p>
          </div>
        </section>

        {/* Features grid */}
        <section className="container mx-auto px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything you need to ship safely</h2>
            <p className="mt-3 text-muted-foreground">A complete staging toolkit, replacing five separate tools.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Animated tech features */}
        <section className="relative overflow-hidden border-y border-border/60 bg-card/30 py-24">
          <div
            className="absolute inset-0 -z-10 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live infrastructure
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">A platform that moves with your code</h2>
              <p className="mt-3 text-muted-foreground">Watch your stack come alive — from commit to global edge in seconds.</p>
            </div>

            <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
              {/* Animated orbit visual */}
              <div className="relative mx-auto flex h-[380px] w-[380px] items-center justify-center">
                {/* Pulse rings */}
                <span className="absolute h-32 w-32 rounded-full border border-primary/40 animate-pulse-ring" />
                <span className="absolute h-32 w-32 rounded-full border border-primary/40 animate-pulse-ring" style={{ animationDelay: "1.2s" }} />
                {/* Core */}
                <div
                  className="relative z-10 flex h-28 w-28 items-center justify-center rounded-2xl shadow-2xl"
                  style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-elegant)" }}
                >
                  <Cpu className="h-12 w-12 text-primary-foreground" />
                </div>
                {/* Orbit ring */}
                <div className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-primary/20" />
                {/* Orbiting nodes */}
                {orbitNodes.map((n, i) => (
                  <div
                    key={n.label}
                    className="absolute left-1/2 top-1/2 -ml-6 -mt-6"
                    style={{
                      animation: `orbit 16s linear infinite`,
                      animationDelay: `${(i * -16) / orbitNodes.length}s`,
                      ["--orbit-r" as string]: "150px",
                    }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-lg backdrop-blur">
                      <n.icon className="h-5 w-5" />
                    </div>
                  </div>
                ))}
                {/* Animated SVG data lines */}
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 380 380" fill="none">
                  <circle cx="190" cy="190" r="150" stroke="var(--primary)" strokeOpacity="0.15" strokeDasharray="4 6" />
                  <path d="M40 190 Q 190 60 340 190" stroke="var(--primary)" strokeOpacity="0.5" strokeWidth="1.5" className="animate-data-flow" />
                  <path d="M40 190 Q 190 320 340 190" stroke="var(--primary)" strokeOpacity="0.5" strokeWidth="1.5" className="animate-data-flow" style={{ animationDelay: "1s" }} />
                </svg>
              </div>

              {/* Feature list with staggered animations */}
              <div className="space-y-4">
                {liveFeatures.map((f, i) => (
                  <div
                    key={f.title}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card/80 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg animate-fade-in"
                    style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                          <f.icon className="h-5 w-5" />
                        </div>
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background">
                          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold">{f.title}</h3>
                          <span className="font-mono text-xs text-muted-foreground">{f.metric}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full w-full animate-shimmer rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl p-12 text-center text-primary-foreground md:p-16" style={{ background: "var(--gradient-hero)" }}>
            <h2 className="text-3xl font-bold md:text-4xl">Ready to deploy with confidence?</h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">Join thousands of engineering teams who ship faster with Woolley-Tech.</p>
            <Button asChild size="lg" variant="secondary" className="mt-8 h-12 px-7 text-base">
              <Link to="/signup">Create your workspace <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

const features = [
  { icon: GitBranch, title: "Branch previews", body: "Every pull request gets a unique, shareable preview environment in under 30 seconds." },
  { icon: Shield, title: "Enterprise security", body: "SOC 2 Type II, SSO, audit logs, and role-based access control out of the box." },
  { icon: Zap, title: "Edge-fast deploys", body: "Global anycast infrastructure deploys your changes to 200+ regions in seconds." },
  { icon: Activity, title: "Realtime observability", body: "Live logs, metrics and traces for every environment, with smart alerting." },
  { icon: Lock, title: "Secret management", body: "Encrypted environment variables synced safely across every staging tier." },
  { icon: Cpu, title: "Compute on demand", body: "Auto-scale preview infrastructure to match production traffic patterns." },
];

const orbitNodes = [
  { icon: GitBranch, label: "Git" },
  { icon: Database, label: "DB" },
  { icon: Cloud, label: "Edge" },
  { icon: Code2, label: "Build" },
  { icon: Shield, label: "Vault" },
  { icon: Workflow, label: "CI" },
];

const liveFeatures = [
  { icon: Zap, title: "Cold-start in 280ms", metric: "p95 · 280ms", body: "Boot fresh preview pods on commit — no warm-up, no waiting." },
  { icon: Activity, title: "Streaming telemetry", metric: "12.4k req/s", body: "Live logs, traces and metrics piped to your dashboard the instant they fire." },
  { icon: Cloud, title: "Edge-replicated builds", metric: "211 regions", body: "Your staging artifact lands on every edge node before the PR review starts." },
  { icon: Shield, title: "Continuous compliance", metric: "SOC 2 · ISO 27001", body: "Policy checks run on every commit, every deploy, every secret rotation." },
];
