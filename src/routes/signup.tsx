import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, User, ArrowRight, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import heroImg from "@/assets/login-hero.jpg";
import { signupUser } from "@/lib/api/db.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Woolley-Tech" },
      { description: "Create your Woolley-Tech staging workspace in seconds." },
    ],
  }),
  component: SignupPage,
});

const perks = [
  "14-day free trial, no credit card",
  "Unlimited branch previews",
  "SSO and audit logs included",
  "Cancel any time",
];

function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("All fields are required");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signupUser({ data: { name, email, password } });
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
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, oklch(0.18 0.08 260 / 0.88), oklch(0.32 0.18 250 / 0.65))" }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <img src="/wolx-logo.png" alt="Woolley-Tech crest" width={36} height={36} className="h-9 w-9 object-contain drop-shadow" />
            <span className="text-sm font-bold tracking-tight">Woolley-Tech</span>
          </Link>
          <div className="max-w-md space-y-6">
            <h2 className="text-4xl font-bold leading-tight">Start staging in under 60 seconds.</h2>
            <ul className="space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3 text-primary-foreground/90">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/15"><Check className="h-3.5 w-3.5" /></span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-primary-foreground/70">Trusted by teams at Stripe, Linear, Vercel and 12k+ others.</div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Create your workspace</h1>
            <p className="text-sm text-muted-foreground">Start your 14-day trial. No card required.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Ada Lovelace"
                  className="pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
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
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full text-base shadow-md" style={{ background: "var(--gradient-brand)" }} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? "Creating account..." : "Create account"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground">By continuing you agree to our Terms and Privacy Policy.</p>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
