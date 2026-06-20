import { useState } from "react";
import {
  Search, Copy, Check, Terminal, Globe, Shield,
  AlertTriangle, Webhook,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { APP_URL } from "@/lib/constants";

const DOC_SECTIONS = [
  { id: "getting-started", title: "Getting Started", icon: Terminal },
  { id: "authentication", title: "Authentication", icon: Shield },
  { id: "env-vars", title: "Environment Variables", icon: Globe },
  { id: "api-guide", title: "API Testing Guide", icon: Terminal },
  { id: "webhooks", title: "Webhook Documentation", icon: Webhook },
  { id: "errors", title: "Error Codes", icon: AlertTriangle },
];

const SAMPLE_CODE = `curl -X GET ${APP_URL}/api/users \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

const SAMPLE_FETCH = `fetch('${APP_URL}/api/users', {
  headers: { Authorization: 'Bearer YOUR_API_KEY' }
})`;

const SAMPLE_PYTHON = `import requests
requests.get('${APP_URL}/api/users',
  headers={'Authorization': 'Bearer YOUR_API_KEY'})`;

const ERROR_CODES = [
  { code: 200, meaning: "Success" },
  { code: 400, meaning: "Bad Request" },
  { code: 401, meaning: "Unauthorized" },
  { code: 403, meaning: "Forbidden" },
  { code: 404, meaning: "Not Found" },
  { code: 500, meaning: "Server Error" },
];

const WEBHOOK_PAYLOAD = `{
  "event": "payment.success",
  "data": {
    "reference": "REF123",
    "amount": 10,
    "currency": "GHS",
    "status": "success"
  }
}`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="absolute right-2 top-2 rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/60"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border bg-[oklch(0.16_0.04_255)] p-4 text-xs leading-relaxed text-[oklch(0.92_0.02_250)]">
        {code}
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

export function DocsPage() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const filteredSections = DOC_SECTIONS.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Documentation</h2>
        <p className="text-sm text-muted-foreground">Everything you need to use and test your APIs.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search docs, endpoints, variables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="space-y-1 lg:col-span-1">
          {filteredSections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                activeSection === s.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <s.icon className="h-4 w-4 shrink-0" />
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6 lg:col-span-3">
          {(!activeSection || activeSection === "getting-started") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Terminal className="h-4 w-4 text-primary" /> Getting Started
                </CardTitle>
                <CardDescription>Follow these steps to start using the platform.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  {[
                    "Create an API Key — generate credentials for authentication",
                    "Configure an Environment — set your base URL and variables",
                    "Send your first request — use the API Tester to hit an endpoint",
                    "Review logs — inspect request/response details in the Activity Monitor",
                    "Test webhooks — simulate incoming events with the Webhook Simulator",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {(!activeSection || activeSection === "authentication") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-primary" /> Authentication
                </CardTitle>
                <CardDescription>All API requests require authentication via Bearer token.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock code={SAMPLE_CODE} />
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Supported Methods</h4>
                  <div className="flex flex-wrap gap-2">
                    {["API Key", "Bearer Token", "Basic Auth", "Custom Headers"].map((m) => (
                      <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(!activeSection || activeSection === "env-vars") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-primary" /> Environment Variables
                </CardTitle>
                <CardDescription>Use variables to switch between environments without changing your code.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["{{BASE_URL}}", "{{API_KEY}}", "{{ACCESS_TOKEN}}"].map((v) => (
                    <div key={v} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                      <code className="font-mono text-xs text-primary">{v}</code>
                      <Badge variant="outline" className="text-[9px]">variable</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(!activeSection || activeSection === "api-guide") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Terminal className="h-4 w-4 text-primary" /> API Testing Guide
                </CardTitle>
                <CardDescription>Examples in multiple languages to help you integrate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">cURL</h4>
                  <CodeBlock code={SAMPLE_CODE} />
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">JavaScript (fetch)</h4>
                  <CodeBlock code={SAMPLE_FETCH} />
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Python (requests)</h4>
                  <CodeBlock code={SAMPLE_PYTHON} />
                </div>
              </CardContent>
            </Card>
          )}

          {(!activeSection || activeSection === "webhooks") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Webhook className="h-4 w-4 text-primary" /> Webhook Documentation
                </CardTitle>
                <CardDescription>Example payloads your server should expect from Woolley-Tech events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Example Payload</h4>
                  <CodeBlock code={WEBHOOK_PAYLOAD} />
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1 font-medium text-foreground">
                    <Shield className="h-3 w-3" /> Signature Verification
                  </p>
                  <p className="mt-1">Every webhook includes an <code className="font-mono text-[10px]">X-Wolx-Signature</code> header. Verify it using your secret token with HMAC-SHA256 to ensure the payload is genuine.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {(!activeSection || activeSection === "errors") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-primary" /> Error Codes
                </CardTitle>
                <CardDescription>Standard HTTP status codes used by the API.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border rounded-lg border">
                  {ERROR_CODES.map((e) => (
                    <div key={e.code} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="font-mono font-semibold">{e.code}</span>
                      <span className="text-muted-foreground">{e.meaning}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
