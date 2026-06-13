import { useState, useEffect, useCallback } from "react";
import {
  Activity, KeyRound, Globe, Radio, Webhook, ArrowUpRight, Clock,
  AlertTriangle, Zap, ExternalLink, Loader2, Plus, Server, WifiOff, RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

import { getOverviewData } from "@/lib/api/overview.functions";
import { useAuth } from "@/lib/auth-context";

const CHART_COLORS = {
  success: "oklch(0.65 0.17 155)",
  failure: "oklch(0.58 0.2 20)",
  primary: "oklch(0.55 0.15 255)",
  muted: "oklch(0.4 0.02 255)",
  webhookSuccess: "oklch(0.6 0.15 195)",
  webhookFail: "oklch(0.55 0.2 30)",
};

const ENV_COLORS: Record<string, string> = {
  local: "oklch(0.6 0.15 300)",
  development: "oklch(0.65 0.17 85)",
  staging: "oklch(0.6 0.18 55)",
  production: "oklch(0.55 0.17 160)",
  external: "oklch(0.55 0.15 230)",
};

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

type OverviewData = {
  stats: {
    totalKeys: number; activeKeys: number; expiredKeys: number;
    totalEnvs: number; requestsToday: number; requestChange: number;
    successfulToday: number; failedToday: number;
    webhooksToday: number; webhooksSent: number;
    webhooksDelivered: number; webhooksFailed: number;
    webhookSuccessRate: number; totalRequests: number;
    totalSuccessful: number; totalFailed: number;
    avgResponseTime: number; slowestRequest: number;
    mostUsedKeys: { name: string; prefix: string; environment: string }[];
  };
  activityChart: {
    label: string; requests: number; successes: number; failures: number;
    avgResponseTime: number; webhooks: number;
    webhookDelivered: number; webhookFailed: number;
  }[];
  envTypeDistribution: Record<string, number>;
  keyStatusDistribution: Record<string, number>;
  recentActivity: (
    | { time: string; type: "request"; method: string; endpoint: string; statusCode: number }
    | { time: string; type: "webhook"; eventType: string; status: string; statusCode: number | null }
  )[];
  recentErrors: (
    | { time: string; type: "request"; method: string; endpoint: string; statusCode: number }
    | { time: string; type: "webhook"; targetUrl: string; statusCode: number | null }
  )[];
  isNewUser: boolean;
};

export function OverviewPage({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { token } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const d = await getOverviewData({ data: { token } });
      setData(d as unknown as OverviewData);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load overview data. Database may be unreachable.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">Real-time dashboard of your staging platform.</p>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
          <WifiOff className="h-12 w-12 text-destructive/60" />
          <div>
            <h3 className="text-base font-bold">Connection Error</h3>
            <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (data?.isNewUser) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">Monitor your API environments, requests, webhooks, and integrations from a single place.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Activity className="h-12 w-12 text-primary/40" />
            <h3 className="text-lg font-bold">Welcome to Wolx Staging</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Get started by completing the following steps:
            </p>
            <ul className="space-y-2 text-sm">
              {[
                "Create your first API Key",
                "Add an Environment",
                "Send your first Request",
                "Test a Webhook",
                "Explore Documentation",
              ].map((step) => (
                <li key={step} className="flex items-center gap-2 text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded border border-border text-[10px]">☐</span>
                  {step}
                </li>
              ))}
            </ul>
            <Button className="mt-2" onClick={() => onNavigate?.("docs")}>Get Started</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = data!.stats;
  const chartData = data!.activityChart;

  const requestPie = [
    { name: "Successful", value: s.totalSuccessful, color: CHART_COLORS.success },
    { name: "Failed", value: s.totalFailed, color: CHART_COLORS.failure },
  ].filter((d) => d.value > 0);

  const webhookPie = [
    { name: "Delivered", value: s.webhooksDelivered, color: CHART_COLORS.webhookSuccess },
    { name: "Failed", value: s.webhooksFailed, color: CHART_COLORS.webhookFail },
  ].filter((d) => d.value > 0);

  const envTypes = Object.entries(data!.envTypeDistribution).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
    color: ENV_COLORS[k] || CHART_COLORS.muted,
  }));

  const keyStatuses = Object.entries(data!.keyStatusDistribution).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
    color: k === "active" ? CHART_COLORS.success : k === "expired" ? CHART_COLORS.failure : CHART_COLORS.muted,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">Real-time dashboard of your staging platform.</p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="mt-3 text-xl font-bold tracking-tight">{s.activeKeys}<span className="text-sm font-normal text-muted-foreground"> / {s.totalKeys}</span></div>
            <div className="mt-0.5 text-xs text-muted-foreground">Active API Keys</div>
            {s.expiredKeys > 0 && <div className="mt-1 text-[10px] font-medium text-destructive">{s.expiredKeys} expired</div>}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="mt-3 text-xl font-bold tracking-tight">{s.totalEnvs}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Environments</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Radio className="h-4 w-4" />
              </div>
              <span className={`text-xs font-medium ${s.requestChange >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {s.requestChange >= 0 ? "+" : ""}{s.requestChange}%
              </span>
            </div>
            <div className="mt-3 text-xl font-bold tracking-tight">{s.requestsToday.toLocaleString()}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Requests Today</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Webhook className="h-4 w-4" />
              </div>
              <span className={`text-xs font-medium ${s.webhookSuccessRate >= 90 ? "text-emerald-600" : "text-amber-600"}`}>
                {s.webhookSuccessRate}%
              </span>
            </div>
            <div className="mt-3 text-xl font-bold tracking-tight">{s.webhooksToday.toLocaleString()}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Webhooks Today</div>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Activity Chart + Request Breakdown */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" /> API Activity (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 255 / 0.3)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="successes" name="Success" stackId="a" fill={CHART_COLORS.success} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="failures" name="Failed" stackId="a" fill={CHART_COLORS.failure} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS.success }} /> Success</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS.failure }} /> Failed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Radio className="h-4 w-4 text-primary" /> Request Breakdown
            </CardTitle>
            <CardDescription className="text-xs">{s.totalRequests.toLocaleString()} total requests</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {requestPie.length > 0 ? (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={requestPie} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                        {requestPie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {requestPie.map((entry) => (
                    <span key={entry.name} className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                      {entry.name} <strong>{entry.value.toLocaleString()}</strong>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-44 text-xs text-muted-foreground">No request data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Response Time + Webhook Performance */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" /> Response Time Trend
            </CardTitle>
            <CardDescription className="text-xs">Avg: {s.avgResponseTime}ms · Slowest: {s.slowestRequest}ms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 255 / 0.3)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} unit="ms" />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="avgResponseTime" name="Avg Time" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.primary }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Webhook className="h-4 w-4 text-primary" /> Webhook Delivery
            </CardTitle>
            <CardDescription className="text-xs">{s.webhooksSent.toLocaleString()} total · {s.webhookSuccessRate}% success</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {webhookPie.length > 0 ? (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={webhookPie} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                        {webhookPie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {webhookPie.map((entry) => (
                    <span key={entry.name} className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                      {entry.name} <strong>{entry.value.toLocaleString()}</strong>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-44 text-xs text-muted-foreground">No webhook data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Key Status, Environment Types, Recent Errors */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <KeyRound className="h-4 w-4 text-primary" /> API Key Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {keyStatuses.length > 0 ? (
              <div className="space-y-3">
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={keyStatuses} layout="vertical" barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 255 / 0.3)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Keys" radius={[0, 3, 3, 0]}>
                        {keyStatuses.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <button onClick={() => onNavigate?.("keys")} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                  Manage Keys <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">No keys</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-primary" /> Environment Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {envTypes.length > 0 ? (
              <div className="space-y-3">
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={envTypes} layout="vertical" barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 255 / 0.3)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Envs" radius={[0, 3, 3, 0]}>
                        {envTypes.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <button onClick={() => onNavigate?.("envs")} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                  Manage Environments <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">No environments</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-primary" /> Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data!.recentErrors.length === 0 ? (
              <div className="px-6 pb-6 text-center text-xs text-muted-foreground">No recent errors.</div>
            ) : (
              <div className="divide-y divide-border">
                {data!.recentErrors.map((e, i) => (
                  <div key={i} className="px-6 py-2.5">
                    <div className="flex items-center gap-2">
                      {e.type === "request" ? (
                        <>
                          <span className="font-mono text-[11px] font-bold text-destructive">{e.statusCode}</span>
                          <span className="truncate font-mono text-[10px] text-muted-foreground">{e.endpoint}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] font-medium text-destructive">Webhook</span>
                          <span className="truncate font-mono text-[10px] text-muted-foreground">{e.targetUrl}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(e.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-border px-6 py-2.5">
              <button onClick={() => onNavigate?.("logs")} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                View All Logs <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Activity Sparkline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Webhook className="h-4 w-4 text-primary" /> Webhook Activity (7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 255 / 0.3)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.02 255)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="webhookDelivered" name="Delivered" stackId="w" fill={CHART_COLORS.webhookSuccess} radius={[2, 2, 0, 0]} />
                <Bar dataKey="webhookFailed" name="Failed" stackId="w" fill={CHART_COLORS.webhookFail} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS.webhookSuccess }} /> Delivered</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS.webhookFail }} /> Failed</span>
            <button onClick={() => onNavigate?.("webhooks")} className="text-primary hover:underline flex items-center gap-0.5">
              Simulate <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-primary" /> Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onNavigate?.("keys")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create API Key
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.("envs")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Environment
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.("tester")}>
              <Radio className="mr-1.5 h-3.5 w-3.5" /> Send Test Request
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.("webhooks")}>
              <Webhook className="mr-1.5 h-3.5 w-3.5" /> Test Webhook
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.("docs")}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Documentation
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.("settings")}>
              <Server className="mr-1.5 h-3.5 w-3.5" /> Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
