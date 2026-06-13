import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Copy, Check, X, Loader2, Plus, Trash2, Clock, History, Terminal, Eye,
  Globe, Wifi, Calendar, DollarSign,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { listEnvironments } from "@/lib/api/environments.functions";
import { logRequest } from "@/lib/api/request-logs.functions";
import { useAuth } from "@/lib/auth-context";

type EnvSummary = {
  id: string; name: string; baseUrl: string; type: string;
  authType: string; apiKeyId: string | null; status: string;
};

type Header = { key: string; value: string };
type HistoryEntry = {
  id: string; method: string; url: string; status: number;
  time: string; duration: number;
};

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function resolveEnvVars(input: string, vars: Record<string, string>) {
  return input.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function buildCurl(method: string, url: string, headers: Header[], body: string) {
  let curl = `curl -X ${method} ${url}`;
  headers.forEach((h) => {
    if (h.key) curl += ` \\\n  -H "${h.key}: ${h.value}"`;
  });
  if (body && method !== "GET") curl += ` \\\n  -d '${body}'`;
  return curl;
}

export function ApiTesterPage() {
  const { token } = useAuth();

  const [envs, setEnvs] = useState<EnvSummary[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string>("");
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<Header[]>([
    { key: "Content-Type", value: "application/json" },
  ]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const [response, setResponse] = useState<{
    status: number; statusText: string; body: string;
    headers: string; duration: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const hasSetDefault = useRef(false);

  const loadEnvs = useCallback(async () => {
    if (!token) return;
    try {
      const result = await listEnvironments({ data: { token } });
      const list = (result as unknown as EnvSummary[]).filter((e) => e.status === "active");
      setEnvs(list);
      if (list.length > 0 && !hasSetDefault.current) {
        hasSetDefault.current = true;
        setActiveEnvId(list[0].id);
      }
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { loadEnvs(); }, [loadEnvs]);

  const activeEnv = envs.find((e) => e.id === activeEnvId);

  useEffect(() => {
    const env = envs.find((e) => e.id === activeEnvId);
    if (env) {
      setUrl("{{BASE_URL}}/");
    }
  }, [activeEnvId, envs]);

  const resolvedUrl = activeEnv
    ? resolveEnvVars(url, { BASE_URL: activeEnv.baseUrl })
    : url;

  function addHeader() {
    setHeaders([...headers, { key: "", value: "" }]);
  }

  function updateHeader(index: number, field: "key" | "value", val: string) {
    const h = [...headers];
    h[index] = { ...h[index], [field]: val };
    setHeaders(h);
  }

  function removeHeader(index: number) {
    setHeaders(headers.filter((_, i) => i !== index));
  }

  async function sendRequest() {
    if (!resolvedUrl) { setError("URL is required"); return; }
    setError("");
    setResponse(null);
    setSending(true);

    const hdrs: Record<string, string> = {};
    headers.forEach((h) => { if (h.key) hdrs[h.key] = h.value; });

    if (token && !hdrs["Cookie"]) {
      hdrs["Cookie"] = `wolx_token=${token}`;
    }

    const fetchOptions: RequestInit = { method, headers: hdrs };
    if (body && method !== "GET") fetchOptions.body = body;

    const start = performance.now();
    try {
      const res = await fetch(resolvedUrl, fetchOptions);
      const duration = performance.now() - start;
      const resBody = await res.text();
      let formattedBody = resBody;
      try { formattedBody = JSON.stringify(JSON.parse(resBody), null, 2); } catch { /* plain text */ }
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        body: formattedBody,
        headers: JSON.stringify(resHeaders, null, 2),
        duration: Math.round(duration),
      });

      const entry: HistoryEntry = {
        id: Date.now().toString(),
        method,
        url: resolvedUrl,
        status: res.status,
        time: new Date().toLocaleTimeString(),
        duration: Math.round(duration),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 20));

      logRequest({ data: {
        token: token!,
        method,
        endpoint: resolvedUrl,
        statusCode: res.status,
        responseTime: Math.round(duration),
        requestBody: body || undefined,
        responseBody: resBody || undefined,
        requestHeaders: Object.keys(hdrs).length > 0 ? hdrs : undefined,
        responseHeaders: Object.keys(resHeaders).length > 0 ? resHeaders : undefined,
      } }).catch(() => {});
    } catch (err) {
      const duration = performance.now() - start;
      setError(err instanceof Error ? err.message : "Request failed");
      setResponse({
        status: 0, statusText: "Error", body: String(err),
        headers: "{}", duration: Math.round(duration),
      });
    }
    setSending(false);
  }

  function loadFromHistory(entry: HistoryEntry) {
    setMethod(entry.method);
    setUrl(entry.url);
  }

  function renderPreview(body: string) {
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { return null; }

    const isProductArray = Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object";
    const isProductObject = !Array.isArray(parsed) && typeof parsed === "object" && parsed !== null && !("error" in (parsed as Record<string, unknown>));

    if (isProductArray) {
      const items = parsed as Record<string, unknown>[];
      return (
        <div className="space-y-2 max-h-[400px] overflow-auto">
          {items.map((item, i) => {
            const name = String(item.name ?? item.plan ?? item.bundle ?? item.label ?? item.product ?? item.title ?? `Item ${i + 1}`);
            const price = item.price ?? item.amount ?? item.cost ?? item.tariff;
            const network = item.network ?? item.provider ?? item.operator ?? item.carrier;
            const size = item.size ?? item.volume ?? item.gb ?? item.mb ?? item.data ?? item.bundle_size ?? item.validity;
            const type = item.type ?? item.category ?? item.kind;
            const validity = item.validity ?? item.duration ?? item.days ?? item.expiry;
            return (
              <div key={i} className="rounded-lg border bg-card p-3 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {network && (
                      <Badge variant="outline" className="mb-1.5 text-[10px] font-normal gap-1">
                        <Globe className="h-2.5 w-2.5" />{network}
                      </Badge>
                    )}
                    <p className="text-sm font-semibold leading-tight">{name}</p>
                    {type && <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-wide">{type}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    {price != null && (
                      <p className="text-sm font-bold text-primary">
                        <DollarSign className="mr-0.5 inline h-3 w-3" />
                        {Number(price).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {(size != null || validity != null) && (
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    {size != null && (
                      <span className="flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        {String(size)}
                      </span>
                    )}
                    {validity != null && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {String(validity)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (isProductObject) {
      const obj = parsed as Record<string, unknown>;
      const entries = Object.entries(obj).filter(([_, v]) => typeof v !== "object" || v === null);
      const nestedArrays = Object.entries(obj).filter(([_, v]) => Array.isArray(v));
      return (
        <div className="space-y-3 max-h-[400px] overflow-auto">
          {entries.length > 0 && (
            <div className="space-y-1.5">
              {entries.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="text-xs font-semibold">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
          {nestedArrays.map(([k, arr]) => {
            const items = arr as Record<string, unknown>[];
            return (
              <div key={k}>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{k.replace(/_/g, " ")}</p>
                <div className="space-y-1.5">
                  {items.map((item, i) => {
                    const name = String(item.name ?? item.plan ?? item.label ?? `Item ${i + 1}`);
                    const price = item.price ?? item.amount;
                    const size = item.size ?? item.volume ?? item.gb ?? item.mb;
                    return (
                      <div key={i} className="flex items-center justify-between rounded-lg border bg-card p-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{name}</p>
                          {size && <p className="text-[10px] text-muted-foreground">{String(size)}</p>}
                        </div>
                        {price != null && (
                          <p className="text-xs font-bold text-primary">GH₵ {Number(price).toLocaleString()}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  }

  const curlCommand = buildCurl(method, resolvedUrl, headers, body);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Left: Request Builder */}
      <div className="space-y-6 xl:col-span-2">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">API Tester</h2>
            <p className="text-sm text-muted-foreground">Test your endpoints in real time.</p>
          </div>
          {envs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Environment:</span>
              <Select value={activeEnvId} onValueChange={setActiveEnvId}>
                <SelectTrigger className="h-8 w-36 md:w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {envs.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {token && (
            <Badge variant="secondary" className="gap-1.5 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Auth cookie attached
            </Badge>
          )}
        </div>

        {/* Method + URL */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex gap-2">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-10 w-28 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="font-mono">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                {activeEnv && url.includes("{{") && (
                  <div className="absolute -top-4 left-0 text-[10px] text-muted-foreground">
                    Resolves to: <span className="font-mono text-primary">{resolvedUrl}</span>
                  </div>
                )}
                <Input
                  className="h-10 font-mono text-sm"
                  placeholder={`${activeEnv ? "{{BASE_URL}}/v1/endpoint" : "https://api.example.com/v1/endpoint"}`}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <Button
                className="h-10 px-6 shadow-md"
                style={{ background: "var(--gradient-brand)" }}
                onClick={sendRequest}
                disabled={sending || !resolvedUrl}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Headers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Headers</CardTitle>
              <CardDescription className="text-xs">HTTP headers sent with the request.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addHeader}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Header
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {headers.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No headers added.</p>
            ) : (
              headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="h-8 w-28 md:w-48 font-mono text-xs"
                    placeholder="Key"
                    value={h.key}
                    onChange={(e) => updateHeader(i, "key", e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">:</span>
                  <Input
                    className="h-8 flex-1 font-mono text-xs"
                    placeholder="Value"
                    value={h.value}
                    onChange={(e) => updateHeader(i, "value", e.target.value)}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeHeader(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Body */}
        {method !== "GET" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Request Body</CardTitle>
              <CardDescription className="text-xs">JSON payload sent with the request.</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="min-h-[200px] w-full rounded-lg border border-input bg-background p-4 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder='{"key": "value"}'
                value={body}
                onChange={(e) => setBody(e.target.value)}
                spellCheck={false}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Response + History */}
      <div className="space-y-6">
        {/* Response Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Response</CardTitle>
              {response && (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(response.body); setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000); }}>
                    {copiedResponse ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                    Copy JSON
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(curlCommand); setCopiedCurl(true); setTimeout(() => setCopiedCurl(false), 2000); }}>
                    {copiedCurl ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Terminal className="h-3 w-3 mr-1" />}
                    Copy cURL
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!response && !error ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Send className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Send a request to see the response.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Status bar */}
                <div className="flex items-center gap-3">
                  <Badge
                    variant={response && response.status < 300 ? "secondary" : response && response.status < 500 ? "outline" : "destructive"}
                    className="gap-1.5 px-3 py-1 text-xs"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${response && response.status < 300 ? "bg-emerald-500" : response && response.status < 500 ? "bg-amber-500" : "bg-destructive"}`} />
                    {response ? `${response.status} ${response.statusText}` : "Error"}
                  </Badge>
                  {response && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {response.duration}ms
                    </span>
                  )}
                </div>

                {/* Response body */}
                <div className="max-h-[400px] overflow-auto rounded-lg border bg-[oklch(0.16_0.04_255)] p-4">
                  <pre className="font-mono text-xs leading-relaxed text-[oklch(0.92_0.02_250)] whitespace-pre-wrap">
                    {response?.body || "No response body"}
                  </pre>
                </div>

                {/* Response headers (collapsed) */}
                {response && (
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                      Response Headers
                    </summary>
                    <pre className="mt-2 max-h-32 overflow-auto rounded border bg-muted/30 p-3 font-mono text-[10px] leading-relaxed">
                      {response.headers}
                    </pre>
                  </details>
                )}

                {/* Preview (rendered products) */}
                {response?.body && renderPreview(response.body) && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </p>
                    <div className="rounded-lg border bg-card">
                      {renderPreview(response.body)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* cURL Preview */}
        {response && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Terminal className="h-4 w-4 text-primary" /> cURL Command
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-[10px] leading-relaxed">
                {curlCommand}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Request History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="h-4 w-4 text-primary" /> Request History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="px-6 pb-6 text-center text-xs text-muted-foreground">
                No requests yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="divide-y divide-border">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      className="flex w-full items-center justify-between px-6 py-2.5 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => loadFromHistory(entry)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-mono shrink-0">
                          {entry.method}
                        </Badge>
                        <span className="truncate font-mono text-xs">{entry.url}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={entry.status < 300 ? "text-emerald-600" : entry.status < 500 ? "text-amber-600" : "text-destructive"}>
                          {entry.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{entry.duration}ms</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
