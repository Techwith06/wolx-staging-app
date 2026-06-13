import { useState, useEffect, useCallback } from "react";
import {
  Globe, Plus, Trash2, Check, X, Loader2, Zap, Play,
  ShieldCheck, Server, ExternalLink, KeyRound, Laptop,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  listEnvironments, createEnvironment, updateEnvironment, deleteEnvironment,
  testEnvironmentConnection,
} from "@/lib/api/environments.functions";
import { listApiKeys } from "@/lib/api/api-keys.functions";
import { useAuth } from "@/lib/auth-context";

type Env = {
  id: string; userId: string; name: string; baseUrl: string;
  type: string; authType: string; apiKeyId: string | null;
  status: string; variables: string[]; globalHeaders: string[];
  createdAt: string;
};
type ApiKeySummary = {
  id: string; keyPrefix: string; name: string; environment: string;
  permissions: string[]; status: string;
  lastUsedAt: string | null; expiresAt: string | null; createdAt: string;
};

const ENV_STYLES: Record<string, { dot: string; label: string; bg: string }> = {
  local: { dot: "bg-purple-400", label: "Local", bg: "bg-purple-500/10 border-purple-500/20" },
  development: { dot: "bg-amber-400", label: "Development", bg: "bg-amber-500/10 border-amber-500/20" },
  staging: { dot: "bg-orange-500", label: "Staging", bg: "bg-orange-500/10 border-orange-500/20" },
  production: { dot: "bg-emerald-500", label: "Production", bg: "bg-emerald-500/10 border-emerald-500/20" },
  external: { dot: "bg-blue-500", label: "External API", bg: "bg-blue-500/10 border-blue-500/20" },
};

export function EnvironmentsPage() {
  const { token } = useAuth();

  const [envs, setEnvs] = useState<Env[]>([]);
  const [apiKeyList, setApiKeyList] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEnv, setActiveEnv] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Env | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; status: number; ok: boolean; ms: number } | null>(null);

  const [formName, setFormName] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formType, setFormType] = useState("development");
  const [formAuth, setFormAuth] = useState("none");
  const [formApiKey, setFormApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [e, k] = await Promise.all([
        listEnvironments({ data: { token } }),
        listApiKeys({ data: { token } }),
      ]);
      const envList = e as unknown as Env[];
      setEnvs(envList);
      setApiKeyList(k as unknown as ApiKeySummary[]);
      if (!activeEnv && envList.length > 0) setActiveEnv(envList[0].id);
    } catch { /* silent */ }
    setLoading(false);
  }, [token, activeEnv]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeEnvironment = envs.find((e) => e.id === activeEnv);

  async function handleCreate() {
    if (!token || !formName.trim() || !formBaseUrl.trim()) return;
    setSubmitting(true);
    try {
      await createEnvironment({
        data: {
          token,
          name: formName,
          baseUrl: formBaseUrl,
          type: formType as "local" | "development" | "staging" | "production" | "external",
          authType: formAuth as "api_key" | "bearer_token" | "none",
        },
      });
      setShowCreate(false);
      resetForm();
      await loadData();
    } catch { /* silent */ }
    setSubmitting(false);
  }

  async function handleSaveEdit() {
    if (!token || !showEdit) return;
    setSubmitting(true);
    try {
      await updateEnvironment({
        data: {
          token,
          envId: showEdit.id,
          name: formName || undefined,
          baseUrl: formBaseUrl || undefined,
        },
      });
      setShowEdit(null);
      await loadData();
    } catch { /* silent */ }
    setSubmitting(false);
  }

  async function handleDelete(envId: string) {
    if (!token || !confirm("Delete this environment?")) return;
    try {
      await deleteEnvironment({ data: { token, envId } });
      if (activeEnv === envId) setActiveEnv(null);
      await loadData();
    } catch { /* silent */ }
  }

  async function handleTest(envId: string) {
    if (!token) return;
    setTestingId(envId);
    setTestResult(null);
    try {
      const result = await testEnvironmentConnection({ data: { token, envId } });
      setTestResult({ id: envId, ...result });
    } catch { /* silent */ }
    setTestingId(null);
  }

  function resetForm() {
    setFormName("");
    setFormBaseUrl("");
    setFormType("development");
    setFormAuth("none");
    setFormApiKey("");
  }

  function openEdit(env: Env) {
    setShowEdit(env);
    setFormName(env.name);
    setFormBaseUrl(env.baseUrl);
    setFormType(env.type);
    setFormAuth(env.authType);
    setFormApiKey(env.apiKeyId || "");
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
      {/* Environment Switcher */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Environments & Base URLs</h2>
            <p className="text-sm text-muted-foreground">Manage API endpoints for testing and integration.</p>
          </div>
          {activeEnvironment && (
            <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
              <span className="text-xs text-muted-foreground">Current:</span>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${ENV_STYLES[activeEnvironment.type as string]?.dot || "bg-gray-400"}`} />
                <span className="text-sm font-semibold">{activeEnvironment.name}</span>
              </div>
              <Select value={activeEnv || ""} onValueChange={setActiveEnv}>
                <SelectTrigger className="h-7 w-36 md:w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {envs.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${ENV_STYLES[e.type as string]?.dot || "bg-gray-400"}`} />
                        {e.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {envs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Globe className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No environments yet. Add your first API endpoint.</p>
              <Button size="sm" style={{ background: "var(--gradient-brand)" }} onClick={() => { setShowCreate(true); resetForm(); }}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Environment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {envs.map((env) => {
              const style = ENV_STYLES[env.type as string] || ENV_STYLES.development;
              const isTesting = testingId === env.id;
              const result = testResult?.id === env.id ? testResult : null;
              return (
                <Card key={env.id} className={`relative overflow-hidden transition-all hover:shadow-md ${style.bg}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${env.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {env.type === "local" ? <Laptop className="h-4 w-4" /> : env.type === "production" ? <ShieldCheck className="h-4 w-4" /> : <Server className="h-4 w-4" />}
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2 text-sm">
                            {env.name}
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{style.label}</span>
                            {env.status === "locked" && <Badge variant="outline" className="h-4 px-1 text-[9px]">LOCKED</Badge>}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1.5 text-[10px]">
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            {style.label}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="activeEnv"
                            checked={activeEnv === env.id}
                            onChange={() => setActiveEnv(env.id)}
                            className="accent-primary"
                          />
                          <span className="text-[10px] text-muted-foreground">Active</span>
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border bg-background/80 px-3 py-2 font-mono text-xs break-all">
                      {env.baseUrl}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px] capitalize">{env.authType === "none" ? "No Auth" : env.authType}</Badge>
                      {env.apiKeyId && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] gap-1"><KeyRound className="h-2.5 w-2.5" /> Key attached</Badge>}
                    </div>
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(env)} disabled={env.status === "locked"}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleTest(env.id)} disabled={isTesting || env.status === "locked"}>
                        {isTesting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                        Test
                      </Button>
                      {result && (
                        <span className={`flex items-center gap-1 text-[10px] ${result.ok ? "text-emerald-600" : "text-destructive"}`}>
                          {result.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {result.status || "ERR"} · {result.ms}ms
                        </span>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(env.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Add card */}
            <Card className="flex cursor-pointer items-center justify-center border-dashed transition-all hover:border-primary/60 hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-2 py-10" onClick={() => { setShowCreate(true); resetForm(); }}>
                <Plus className="h-8 w-8 text-muted-foreground/40" />
                <span className="text-sm text-muted-foreground">Add Environment</span>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <Separator />

      {/* Active Environment Details */}
      {activeEnvironment && (
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight">Environment Details</h2>
            <p className="text-sm text-muted-foreground">Variables and global headers for <span className="font-semibold">{activeEnvironment.name}</span>.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Environment Variables */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Environment Variables</CardTitle>
                </div>
                <CardDescription>Define reusable variables like Postman.</CardDescription>
              </CardHeader>
              <CardContent>
                {(activeEnvironment.variables as unknown as Array<{ key: string; value: string }>).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <p className="text-xs text-muted-foreground">No variables defined.</p>
                    <p className="text-[10px] text-muted-foreground/60">Variables will be injectable as {`{{variable_name}}`} in requests.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(activeEnvironment.variables as unknown as Array<{ key: string; value: string }>).map((v, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                        <code className="flex-1 font-mono text-xs">{v.key}</code>
                        <span className="text-xs text-muted-foreground">=</span>
                        <code className="flex-1 font-mono text-xs text-muted-foreground">{v.value}</code>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Global Headers */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Global Headers</CardTitle>
                </div>
                <CardDescription>Headers sent with every request to this environment.</CardDescription>
              </CardHeader>
              <CardContent>
                {(activeEnvironment.globalHeaders as unknown as Array<{ key: string; value: string }>).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <p className="text-xs text-muted-foreground">No global headers defined.</p>
                    <p className="text-[10px] text-muted-foreground/60">Headers like Authorization, Content-Type will be added automatically.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(activeEnvironment.globalHeaders as unknown as Array<{ key: string; value: string }>).map((h, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                        <code className="flex-1 font-mono text-xs">{h.key}</code>
                        <span className="text-xs text-muted-foreground">:</span>
                        <code className="flex-1 font-mono text-xs text-blue-600">{h.value}</code>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Environment</DialogTitle>
            <DialogDescription>Add a new API endpoint environment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="envName">Name</Label>
              <Input id="envName" placeholder="e.g. Development, Staging, Production" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="envUrl">Base URL</Label>
              <Input id="envUrl" placeholder="https://api.example.com" value={formBaseUrl} onChange={(e) => setFormBaseUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { v: "local", l: "🟣 Local" },
                  { v: "development", l: "🟡 Development" },
                  { v: "staging", l: "🟠 Staging" },
                  { v: "production", l: "🟢 Production" },
                  { v: "external", l: "🔵 External API" },
                ].map((opt) => (
                  <label key={opt.v} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${formType === opt.v ? "border-primary bg-primary/5" : ""}`}>
                    <input type="radio" name="envType" value={opt.v} checked={formType === opt.v} onChange={() => setFormType(opt.v)} className="accent-primary" />
                    {opt.l}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Auth Type</Label>
              <div className="flex gap-3">
                {[
                  { v: "none", l: "None" },
                  { v: "api_key", l: "API Key" },
                  { v: "bearer_token", l: "Bearer Token" },
                ].map((opt) => (
                  <label key={opt.v} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${formAuth === opt.v ? "border-primary bg-primary/5" : ""}`}>
                    <input type="radio" name="authType" value={opt.v} checked={formAuth === opt.v} onChange={() => setFormAuth(opt.v)} className="accent-primary" />
                    {opt.l}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={submitting || !formName.trim() || !formBaseUrl.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!showEdit} onOpenChange={(o) => { if (!o) setShowEdit(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Environment</DialogTitle>
            <DialogDescription>Update your environment settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input id="editName" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUrl">Base URL</Label>
              <Input id="editUrl" value={formBaseUrl} onChange={(e) => setFormBaseUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
