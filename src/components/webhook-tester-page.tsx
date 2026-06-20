import { useState, useEffect, useCallback } from "react";
import {
  Webhook, Send, RotateCcw, Terminal, Clock, Check, X, AlertTriangle,
  Loader2, History, Shield, Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter,
} from "@/components/ui/dialog";

import {
  sendTestWebhook, listWebhookLogs, getWebhookHealth, replayWebhook, getEventTemplates,
} from "@/lib/api/webhook-logs.functions";
import { useAuth } from "@/lib/auth-context";
import { APP_URL } from "@/lib/constants";

const EVENT_TYPES = [
  { value: "payment.success", label: "Payment Success" },
  { value: "payment.failed", label: "Payment Failed" },
  { value: "video.completed", label: "Video Completed" },
  { value: "video.failed", label: "Video Failed" },
  { value: "wallet.funded", label: "Wallet Funded" },
  { value: "custom", label: "Custom Event" },
];

const DELAY_OPTIONS = [
  { value: 0, label: "0s (Instant)" },
  { value: 5000, label: "5s" },
  { value: 10000, label: "10s" },
  { value: 30000, label: "30s" },
];

type WebhookLogEntry = {
  id: string; eventType: string; targetUrl: string;
  payload: Record<string, unknown>;
  statusCode: number; responseBody: string | null;
  deliveryTime: number; signature: string | null;
  delay: number; status: string; createdAt: string;
};

type HealthStatus = {
  status: "active" | "degraded" | "inactive";
  totalDelivered: number; totalFailed: number;
  lastSuccessAt: string | null; lastFailureAt: string | null;
  recentSuccess24h: number; recentFailed24h: number;
};

export function WebhookTesterPage() {
  const { token } = useAuth();

  const [targetUrl, setTargetUrl] = useState("");
  const [eventType, setEventType] = useState("payment.success");
  const [customPayload, setCustomPayload] = useState("");
  const [useCustomPayload, setUseCustomPayload] = useState(false);
  const [secret, setSecret] = useState("whsec_example_secret_token_123");
  const [delay, setDelay] = useState(0);

  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<{
    statusCode: number; responseBody: string; deliveryTime: number; signature: string | null;
  } | null>(null);

  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logFilter, setLogFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<WebhookLogEntry | null>(null);

  const [error, setError] = useState("");

  const staticPayload = EVENT_TYPES.find((e) => e.value === eventType)?.label ?? "";

  useEffect(() => {
    if (!useCustomPayload) {
      getEventTemplates({ data: { eventType } }).then((tmpl) => {
        if (tmpl) setCustomPayload(JSON.stringify(tmpl, null, 2));
      });
    }
  }, [eventType, useCustomPayload]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const [l, h] = await Promise.all([
        listWebhookLogs({ data: { token, filter: logFilter as "all" | "delivered" | "failed" | "pending" } }),
        getWebhookHealth({ data: { token } }),
      ]);
      setLogs(l as unknown as WebhookLogEntry[]);
      setHealth(h as unknown as HealthStatus);
    } catch { /* silent */ }
    setLoadingLogs(false);
  }, [token, logFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSend() {
    if (!token) return;
    if (!targetUrl) { setError("Webhook URL is required"); return; }
    setError("");
    setSending(true);
    setResponse(null);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(customPayload);
    } catch {
      setError("Invalid JSON payload");
      setSending(false);
      return;
    }

    try {
      const result = await sendTestWebhook({
        data: { token, targetUrl, eventType, payload, delay, secret },
      });
      setResponse(result as unknown as {
        statusCode: number; responseBody: string; deliveryTime: number; signature: string | null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send webhook");
    }
    setSending(false);
  }

  async function handleReplay(logId: string) {
    if (!token) return;
    try {
      await replayWebhook({ data: { token, logId, delay } });
      await loadData();
    } catch { /* silent */ }
  }

  function getHealthColor(s: string) {
    if (s === "active") return "text-emerald-600 bg-emerald-500/10";
    if (s === "degraded") return "text-amber-600 bg-amber-500/10";
    return "text-muted-foreground bg-muted/30";
  }

  function getStatusColor(code: number) {
    if (code === 0) return "text-destructive";
    if (code < 300) return "text-emerald-600";
    if (code < 500) return "text-amber-600";
    return "text-destructive";
  }

  function getStatusBg(code: number) {
    if (code === 0) return "bg-destructive/10";
    if (code < 300) return "bg-emerald-500/10";
    if (code < 500) return "bg-amber-500/10";
    return "bg-destructive/10";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Webhook Simulator</h2>
          <p className="text-sm text-muted-foreground">Test how your system handles external events.</p>
        </div>
        {health && (
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${getHealthColor(health.status)}`}>
            <span className={`h-2 w-2 rounded-full ${health.status === "active" ? "bg-emerald-500" : health.status === "degraded" ? "bg-amber-500" : "bg-muted-foreground"}`} />
            {health.status === "active" ? "Active" : health.status === "degraded" ? "Degraded" : "No activity"}
          </div>
        )}
      </div>

      {/* Tunnel info banner */}
      <Card className="border border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Testing webhooks on localhost?</strong> Use a tunnel service to expose your local server:
            {" "}<code className="rounded bg-muted px-1 py-0.5 text-[10px]">ngrok http 3000</code>
            {" → "}<code className="rounded bg-muted px-1 py-0.5 text-[10px]">https://abc123.ngrok.app/webhook</code>
            {" "}or {" "}<code className="rounded bg-muted px-1 py-0.5 text-[10px]">cloudflared tunnel --url {APP_URL}</code>.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left: Simulator */}
        <div className="space-y-6 xl:col-span-2">
          {/* Endpoint Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Webhook Endpoint</CardTitle>
              <CardDescription className="text-xs">Your server URL that receives webhook events.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="text-xs text-muted-foreground">Your Webhook URL</Label>
              <Input
                className="mt-1 font-mono text-xs"
                placeholder={`${APP_URL}/api/webhooks`}
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Event + Payload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Event & Payload</CardTitle>
              <CardDescription className="text-xs">Choose an event type and customize the payload.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customPayload"
                  checked={useCustomPayload}
                  onChange={(e) => setUseCustomPayload(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="customPayload" className="text-xs">Custom Payload Editor</Label>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Payload</Label>
                <Textarea
                  className="mt-1 min-h-[200px] font-mono text-xs leading-relaxed"
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  placeholder='{"event": "custom.event", "data": {}}'
                />
              </div>
            </CardContent>
          </Card>

          {/* Options + Send */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Delivery Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Delay</Label>
                  <Select value={String(delay)} onValueChange={(v) => setDelay(Number(v))}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELAY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Secret Token (for signature)</Label>
                  <Input
                    className="mt-1 font-mono text-xs"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="whsec_..."
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
              )}

              <Button
                className="w-full"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Send Test Webhook</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Response Panel */}
          {response && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Response</CardTitle>
                </div>
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getStatusBg(response.statusCode)} ${getStatusColor(response.statusCode)}`}>
                  {response.statusCode === 0 ? "Error" : response.statusCode}
                  {response.statusCode >= 200 && response.statusCode < 300 ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {response.deliveryTime}ms</span>
                  {response.signature && (
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Signed</span>
                  )}
                </div>
                <pre className="max-h-60 overflow-auto rounded-lg border bg-[oklch(0.16_0.04_255)] p-3 font-mono text-xs leading-relaxed text-[oklch(0.92_0.02_250)]">
                  {(() => {
                    try { return JSON.stringify(JSON.parse(response.responseBody), null, 2); }
                    catch { return response.responseBody; }
                  })()}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Health + History */}
        <div className="space-y-6">
          {/* Health */}
          {health && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Endpoint Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${getHealthColor(health.status)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${health.status === "active" ? "bg-emerald-500" : health.status === "degraded" ? "bg-amber-500" : "bg-muted-foreground"}`} />
                    {health.status === "active" ? "Active" : health.status === "degraded" ? "Degraded" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Delivered (24h)</span>
                  <span className="font-medium text-emerald-600">{health.recentSuccess24h}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Failed (24h)</span>
                  <span className="font-medium text-destructive">{health.recentFailed24h}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Success</span>
                  <span className="font-medium">
                    {health.lastSuccessAt
                      ? new Date(health.lastSuccessAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Failure</span>
                  <span className="font-medium">
                    {health.lastFailureAt
                      ? new Date(health.lastFailureAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4" /> Webhook History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <Webhook className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No webhook events yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="divide-y divide-border">
                    <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <span className="flex-1">Event</span>
                      <span className="w-14 text-center">Status</span>
                      <span className="w-14 text-right">Time</span>
                      <span className="w-10" />
                    </div>
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2 px-4 py-2.5">
                        <button
                          className="flex-1 truncate text-left hover:underline cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <span className="font-mono text-xs">{log.eventType}</span>
                        </button>
                        <span className={`w-14 text-center font-mono text-[11px] font-semibold ${getStatusColor(log.statusCode)}`}>
                          {log.statusCode || "ERR"}
                        </span>
                        <span className="w-14 text-right font-mono text-[11px] text-muted-foreground">
                          {log.deliveryTime}ms
                        </span>
                        <button
                          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          title="Replay"
                          onClick={() => handleReplay(log.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{selectedLog.eventType}</Badge>
                  <span className="font-mono text-xs font-normal truncate">{selectedLog.targetUrl}</span>
                </DialogTitle>
                <DialogDescription>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getStatusBg(selectedLog.statusCode)} ${getStatusColor(selectedLog.statusCode)}`}>
                      {selectedLog.statusCode === 0 ? "Error" : selectedLog.statusCode}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {selectedLog.deliveryTime}ms
                    </span>
                    {selectedLog.delay > 0 && (
                      <span className="text-[11px] text-muted-foreground">Delay: {selectedLog.delay / 1000}s</span>
                    )}
                    {selectedLog.signature && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Shield className="h-3 w-3" /> Signed
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payload Sent</Label>
                  <pre className="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>

                {selectedLog.responseBody && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Response</Label>
                    <pre className="max-h-48 overflow-auto rounded-lg border bg-[oklch(0.16_0.04_255)] p-3 font-mono text-xs leading-relaxed text-[oklch(0.92_0.02_250)]">
                      {(() => {
                        try { return JSON.stringify(JSON.parse(selectedLog.responseBody!), null, 2); }
                        catch { return selectedLog.responseBody; }
                      })()}
                    </pre>
                  </div>
                )}

                {selectedLog.signature && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Signature</Label>
                    <pre className="rounded-lg border bg-muted/30 p-2 font-mono text-[11px] text-muted-foreground">
                      X-Wolx-Signature: {selectedLog.signature}
                    </pre>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleReplay(selectedLog.id)}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Replay
                </Button>
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
