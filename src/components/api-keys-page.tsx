import { useState, useEffect, useCallback } from "react";
import {
  KeyRound, Plus, Copy, RefreshCw, Eye, EyeOff, Trash2, ShieldCheck,
  Globe, Webhook, Activity, Check, X, Loader2, AlertTriangle,
  Zap, TrendingUp, Server, Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  createApiKey, listApiKeys, updateApiKeyStatus, deleteApiKey, regenerateApiKey,
  getWebhookSettings, upsertWebhookSettings, getApiLogs, getApiUsageStats,
} from "@/lib/api/api-keys.functions";
import { useAuth } from "@/lib/auth-context";

type ApiKey = {
  id: string; keyPrefix: string; name: string; environment: string;
  permissions: string[]; status: string; lastUsedAt: string | null;
  expiresAt: string | null; createdAt: string;
};
type WebhookSettings = {
  id: string; userId: string; baseUrl: string; webhookUrl: string;
  callbackUrl: string | null; secretToken: string; createdAt: string;
} | null;
type ApiLog = {
  id: string; userId: string; method: string; endpoint: string;
  statusCode: number; responseTime: number; createdAt: string;
};
type UsageStats = {
  totalRequests: number; successRate: number;
  failedRequests: number; avgResponseTime: number;
};

const ALL_PERMISSIONS = [
  { value: "video:create", label: "Generate Videos" },
  { value: "video:read", label: "Access Dashboard API" },
  { value: "webhook:receive", label: "Webhook Receiver" },
  { value: "analytics:read", label: "Analytics API" },
  { value: "payments:read", label: "Access Payments" },
];

export function ApiKeysPage() {
  const { token } = useAuth();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [webhookSettings, setWebhookSettings] = useState<WebhookSettings>(null as unknown as WebhookSettings);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<ApiKey | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState("sandbox");
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>([]);
  const [newKeyExpiration, setNewKeyExpiration] = useState("never");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [webhookBaseUrl, setWebhookBaseUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookCallbackUrl, setWebhookCallbackUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);

  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [k, w, l, s] = await Promise.all([
        listApiKeys({ data: { token } }),
        getWebhookSettings({ data: { token } }),
        getApiLogs({ data: { token, limit: 20 } }),
        getApiUsageStats({ data: { token } }),
      ]);
      setKeys(k as unknown as ApiKey[]);
      setWebhookSettings(w as unknown as WebhookSettings);
      setLogs(l as unknown as ApiLog[]);
      setUsageStats(s as UsageStats);
      if (w) {
        setWebhookBaseUrl(w.baseUrl);
        setWebhookUrl(w.webhookUrl);
        setWebhookCallbackUrl(w.callbackUrl ?? "");
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreateKey() {
    if (!token || !newKeyName.trim() || newKeyPerms.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await createApiKey({
        data: {
          token,
          name: newKeyName,
          environment: newKeyEnv as "production" | "sandbox",
          permissions: newKeyPerms,
          expiration: newKeyExpiration as "never" | "30days" | "custom",
        },
      });
      setGeneratedKey(result.key);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    }
    setSubmitting(false);
  }

  async function handleToggleStatus(keyId: string, currentStatus: string) {
    if (!token) return;
    try {
      await updateApiKeyStatus({
        data: { token, keyId, status: currentStatus === "active" ? "disabled" : "active" },
      });
      await loadData();
    } catch { /* silent */ }
  }

  async function handleDelete(keyId: string) {
    if (!token || !confirm("Are you sure you want to delete this API key? This cannot be undone.")) return;
    try {
      await deleteApiKey({ data: { token, keyId } });
      await loadData();
    } catch { /* silent */ }
  }

  async function handleRegenerate(keyId: string) {
    if (!token) return;
    try {
      const result = await regenerateApiKey({ data: { token, keyId } });
      setGeneratedKey(result.key);
      await loadData();
    } catch { /* silent */ }
  }

  async function handleSaveWebhooks() {
    if (!token) return;
    setWebhookSaving(true);
    setWebhookSaved(false);
    try {
      await upsertWebhookSettings({
        data: {
          token,
          baseUrl: webhookBaseUrl,
          webhookUrl: webhookUrl,
          callbackUrl: webhookCallbackUrl || undefined,
        },
      });
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 3000);
      await loadData();
    } catch { /* silent */ }
    setWebhookSaving(false);
  }

  function maskKey(keyPrefix: string) {
    return keyPrefix + "•".repeat(32);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: API Keys */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">API Keys</h2>
            <p className="text-sm text-muted-foreground">Manage keys for authentication and integrations.</p>
          </div>
          <Button size="sm" style={{ background: "var(--gradient-brand)" }} onClick={() => { setShowCreateModal(true); setGeneratedKey(null); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Create New Key
          </Button>
        </div>

        {keys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <KeyRound className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No API keys yet. Create your first key to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {keys.map((k) => {
              const isRevealed = revealedKeys.has(k.id);
              const isExpiring = k.expiresAt && new Date(k.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              return (
                <Card key={k.id} className="group relative overflow-hidden transition-all hover:shadow-md">
                  <div className={`absolute inset-x-0 top-0 h-1 ${k.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{k.name}</CardTitle>
                          <CardDescription className="text-[10px]">Created {new Date(k.createdAt).toLocaleDateString()}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={k.environment === "production" ? "default" : "outline"} className="h-5 px-1.5 text-[9px] uppercase">
                        {k.environment}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs tracking-wider">
                      {isRevealed ? k.keyPrefix + "••••••••••••" : maskKey(k.keyPrefix)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant={k.status === "active" ? "secondary" : "outline"} className="h-4 px-1.5 text-[9px] gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${k.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                        {k.status}
                      </Badge>
                      {isExpiring && k.status === "active" && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-3 w-3" /> Expiring
                        </span>
                      )}
                      {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(k.permissions as string[]).map((p: string) => (
                        <Badge key={p} variant="outline" className="h-4 px-1.5 text-[9px]">{p}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowViewModal(k)}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleRegenerate(k.id)}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleToggleStatus(k.id, k.status)}>
                        {k.status === "active" ? <X className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                        {k.status === "active" ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(k.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* Section 2: Integration Settings */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight">Integration Settings</h2>
          <p className="text-sm text-muted-foreground">Configure your base URL, webhook endpoint, and callback URL.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Base URL Configuration</CardTitle>
            </div>
            <CardDescription>Used for API requests, video generation callbacks, and external integrations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://your-app.com/api"
                value={webhookBaseUrl}
                onChange={(e) => setWebhookBaseUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <p className="text-xs text-muted-foreground">Where your system receives events (video.completed, payment.success, etc.)</p>
              <Input
                id="webhookUrl"
                placeholder="https://your-app.com/api/webhooks/wolx"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callbackUrl">Callback URL (optional)</Label>
              <p className="text-xs text-muted-foreground">Used for payment redirects and post-payment success actions.</p>
              <Input
                id="callbackUrl"
                placeholder="https://your-app.com/payment/callback"
                value={webhookCallbackUrl}
                onChange={(e) => setWebhookCallbackUrl(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleSaveWebhooks} disabled={webhookSaving}>
                {webhookSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Save Settings
              </Button>
              {webhookSaved && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Section 3: API Usage Dashboard */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight">API Usage</h2>
          <p className="text-sm text-muted-foreground">Your API usage over the last 30 days.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight">
                {usageStats?.totalRequests?.toLocaleString() ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">Requests Made</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight">{usageStats?.successRate ?? 100}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <X className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight">{usageStats?.failedRequests ?? 0}</div>
              <div className="text-sm text-muted-foreground">Failed Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <Server className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight">{usageStats?.avgResponseTime ?? 0}ms</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Section 4: Event Logs */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight">Event Logs</h2>
          <p className="text-sm text-muted-foreground">Recent API events and activity.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Activity className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No recent API activity.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="divide-y divide-border">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono">
                          {log.method}
                        </Badge>
                        <span className="font-mono text-sm">{log.endpoint}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={log.statusCode < 300 ? "text-emerald-600" : log.statusCode < 500 ? "text-amber-600" : "text-destructive"}>
                          {log.statusCode}
                        </span>
                        <span className="text-xs text-muted-foreground">{log.responseTime}ms</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Create API Key Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => { setShowCreateModal(open); if (!open) setGeneratedKey(null); }}>
        <DialogContent className="sm:max-w-lg">
          {generatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Copy this key now. For security, it will only be shown once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-4 dark:bg-emerald-950/20">
                  <Label className="text-xs text-muted-foreground mb-1 block">Your API Key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded border bg-background px-3 py-2 font-mono text-sm">
                      {generatedKey}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-3 dark:bg-amber-950/20">
                  <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                    <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Make sure to copy your API key now. You will not be able to see it again.</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="default" onClick={() => { setShowCreateModal(false); setGeneratedKey(null); }}>Done</Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>Generate a new API key for your application.</DialogDescription>
              </DialogHeader>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g. Production App, Testing, Mobile App"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Environment</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="env" value="sandbox" checked={newKeyEnv === "sandbox"} onChange={() => setNewKeyEnv("sandbox")} className="accent-primary" />
                      <span className="text-sm">Sandbox</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="env" value="production" checked={newKeyEnv === "production"} onChange={() => setNewKeyEnv("production")} className="accent-primary" />
                      <span className="text-sm">Production</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="space-y-2 rounded-lg border p-3">
                    {ALL_PERMISSIONS.map((perm) => (
                      <label key={perm.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newKeyPerms.includes(perm.value)}
                          onChange={() => {
                            setNewKeyPerms((prev) =>
                              prev.includes(perm.value)
                                ? prev.filter((p) => p !== perm.value)
                                : [...prev, perm.value]
                            );
                          }}
                          className="accent-primary"
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Expiration</Label>
                  <div className="flex gap-4">
                    {["never", "30days"].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="exp" value={opt} checked={newKeyExpiration === opt} onChange={() => setNewKeyExpiration(opt)} className="accent-primary" />
                        <span className="text-sm capitalize">{opt === "never" ? "Never" : "30 Days"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleCreateKey}
                  disabled={submitting || !newKeyName.trim() || newKeyPerms.length === 0}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Generate Key
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Key Details Modal */}
      <Dialog open={!!showViewModal} onOpenChange={(open) => { if (!open) setShowViewModal(null); }}>
        <DialogContent className="sm:max-w-md">
          {showViewModal && (
            <>
              <DialogHeader>
                <DialogTitle>{showViewModal.name}</DialogTitle>
                <DialogDescription className="capitalize">{showViewModal.environment} environment</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={showViewModal.status === "active" ? "secondary" : "outline"} className="gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${showViewModal.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                    {showViewModal.status}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Key Prefix</Label>
                  <div className="font-mono text-sm">{showViewModal.keyPrefix}••••••••••••</div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <div className="text-sm">{new Date(showViewModal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                </div>

                {showViewModal.expiresAt && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Expires</Label>
                    <div className="text-sm">{new Date(showViewModal.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                  </div>
                )}

                {showViewModal.lastUsedAt && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Last Used</Label>
                    <div className="text-sm">{new Date(showViewModal.lastUsedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Permissions</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(showViewModal.permissions as string[]).map((p: string) => (
                      <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button size="sm" variant="outline" onClick={() => handleToggleStatus(showViewModal.id, showViewModal.status)}>
                  {showViewModal.status === "active" ? "Disable Key" : "Enable Key"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRegenerate(showViewModal.id)}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
