import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import heroImg from "@/assets/login-hero.jpg";
import { loginUser } from "@/lib/api/db.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Woolley-Tech" },
      { description: "Sign in to your Woolley-Tech staging workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setSubmitting(true);
    try {
      const result = await loginUser({ data: { email, password } });
      login(result.token, result.user);
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" width={1024} height={1536} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, oklch(0.18 0.08 260 / 0.85), oklch(0.32 0.18 250 / 0.6))" }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <img src="/wolx-logo.png" alt="Woolley-Tech crest" width={36} height={36} className="h-9 w-9 object-contain drop-shadow" />
            <span className="text-sm font-bold tracking-tight">Woolley-Tech</span>
          </Link>

          <div className="max-w-md space-y-6">
            <h2 className="text-4xl font-bold leading-tight">Ship like the world's best engineering teams.</h2>
            <p className="text-primary-foreground/80">Branch previews, observability and release controls — all in one staging platform trusted by 12,000+ teams.</p>
            <blockquote className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5 backdrop-blur">
              <p className="text-sm leading-relaxed">"Woolley-Tech cut our release incidents by 73%. It's how we ship to production without holding our breath."</p>
              <footer className="mt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary-foreground/20" />
                <div className="text-xs">
                  <div className="font-semibold">Amara Chen</div>
                  <div className="text-primary-foreground/60">VP Engineering, Northwind</div>
                </div>
              </footer>
            </blockquote>
          </div>

          <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
            <ShieldCheck className="h-4 w-4" /> SOC 2 Type II · ISO 27001 · GDPR ready
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your Woolley-Tech workspace to continue.</p>
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">CONTINUE WITH EMAIL</span>
            <Separator className="flex-1" />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/login" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">Keep me signed in for 30 days</Label>
            </div>
            <Button type="submit" className="h-11 w-full text-base shadow-md" style={{ background: "var(--gradient-brand)" }} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? "Signing in..." : "Sign in"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            New to Woolley-Tech?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
