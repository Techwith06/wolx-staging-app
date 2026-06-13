import { useState, useMemo, useEffect } from "react";
import {
  Zap, Send, Copy, Check, Download, BookOpen, Terminal, Globe,
  Shield, Database, Server, Code, Loader2, FileText, ArrowRight,
  Sparkles, ChevronRight, ExternalLink, Save, Trash2, Clock, Play,
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
import { useAuth } from "@/lib/auth-context";
import { saveGeneratedApi, listSavedApis, deleteSavedApi } from "@/lib/api/generator.functions";

type Framework = "express" | "nest" | "laravel" | "django" | "fastapi";
type Database = "postgres" | "mongodb" | "mysql";
type AuthMethod = "apikey" | "jwt" | "cookie" | "oauth";

type Endpoint = {
  method: string; path: string; description: string;
  requestBody?: string; responseBody: string;
};

type GeneratedAPI = {
  name: string; description: string; version: string;
  auth: string; endpoints: Endpoint[];
  schemas: string[];
};

const FRAMEWORKS: { value: Framework; label: string }[] = [
  { value: "express", label: "Express.js" },
  { value: "nest", label: "NestJS" },
  { value: "laravel", label: "Laravel" },
  { value: "django", label: "Django" },
  { value: "fastapi", label: "FastAPI" },
];

const DATABASES: { value: Database; label: string }[] = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mongodb", label: "MongoDB" },
  { value: "mysql", label: "MySQL" },
];

const AUTH_METHODS: { value: AuthMethod; label: string; badge: string }[] = [
  { value: "apikey", label: "API Key", badge: "X-API-Key" },
  { value: "jwt", label: "JWT", badge: "Bearer" },
  { value: "cookie", label: "Session Cookie", badge: "Cookie" },
  { value: "oauth", label: "OAuth 2.0", badge: "OAuth" },
];

const TEMPLATES = [
  { title: "VTU API", desc: "Sell airtime and data bundles", prompt: "Create an API for a VTU platform that sells MTN, Telecel and AirtelTigo data bundles with wallet funding and transaction history" },
  { title: "E-Commerce API", desc: "Products, orders, payments", prompt: "Create an e-commerce API with products, categories, shopping cart, orders, and payment processing" },
  { title: "School Management API", desc: "Students, results, attendance", prompt: "Create a school management API for managing students, classes, attendance records, and exam results" },
  { title: "Susu Collection API", desc: "Collectors, deposits, withdrawals", prompt: "Create a Susu collection API with collectors, members, daily deposits, withdrawals, and balance tracking" },
  { title: "MoMo Payment API", desc: "Mobile money payments", prompt: "Create a mobile money payment API with initiate payment, verify payment, transaction history, and webhook callbacks" },
  { title: "Blog API", desc: "Posts, comments, categories", prompt: "Create a blog API with authors, posts, comments, categories, and tags" },
];

type CodeSamples = Record<string, string>;

function generateAPI(description: string, framework: Framework, db: Database, auth: AuthMethod): { api: GeneratedAPI; samples: CodeSamples } {
  const lower = description.toLowerCase();
  const hasBundle = /bundle|data|vtu|airtime|mtn|telecel|airteltigo/i.test(lower);
  const hasPayment = /payment|pay|momo|mobile money|transaction|wallet/i.test(lower);
  const hasUser = /user|auth|login|register|account/i.test(lower);
  const hasProduct = /product|ecommerce|shop|store|item|order/i.test(lower);
  const hasSchool = /school|student|class|exam|result|attendance/i.test(lower);
  const hasSusu = /susu|collector|deposit|withdrawal|savings/i.test(lower);
  const hasBlog = /blog|post|article|comment/i.test(lower);
  const hasWallet = /wallet|fund|balance|top.up/i.test(lower);

  let name = "API";
  let apiDesc = description.length > 80 ? description.slice(0, 80) + "..." : description;
  let endpoints: Endpoint[] = [];
  let schemas: string[] = [];

  if (hasBundle || hasPayment || hasWallet) {
    name = hasWallet ? "Wallet & Payments API" : "VTU Data Bundle API";
    endpoints = [
      { method: "GET", path: "/api/bundles", description: "Returns available bundles", responseBody: JSON.stringify([{ id: "mtn_1gb", network: "MTN", size: "1GB", price: 10, validity: "30 days" }], null, 2) },
      { method: "POST", path: "/api/bundles/purchase", description: "Purchase a data bundle", requestBody: JSON.stringify({ bundleId: "mtn_1gb", phone: "233501234567" }, null, 2), responseBody: JSON.stringify({ success: true, reference: "TXN123", status: "pending" }, null, 2) },
      { method: "GET", path: "/api/transactions", description: "List all transactions", responseBody: JSON.stringify([{ reference: "TXN123", type: "purchase", amount: 10, status: "success", date: "2025-01-15" }], null, 2) },
    ];
    schemas = ["bundles", "transactions", "wallets"];
  }
  if (hasPayment && !hasBundle) {
    name = "Payments API";
    endpoints = [
      { method: "POST", path: "/api/payments/initiate", description: "Initiate a payment", requestBody: JSON.stringify({ amount: 100, currency: "GHS", phone: "233501234567", provider: "mtn" }, null, 2), responseBody: JSON.stringify({ reference: "PAY123", checkoutUrl: "https://pay.example.com/checkout/PAY123" }, null, 2) },
      { method: "POST", path: "/api/payments/verify", description: "Verify a payment", requestBody: JSON.stringify({ reference: "PAY123" }, null, 2), responseBody: JSON.stringify({ reference: "PAY123", status: "success", amount: 100, fee: 1.5 }, null, 2) },
      { method: "GET", path: "/api/payments/history", description: "Get payment history", responseBody: JSON.stringify([{ reference: "PAY123", amount: 100, status: "success", date: "2025-01-15" }], null, 2) },
    ];
    schemas = ["payments", "transactions"];
  }
  if (hasUser) {
    name = "Authentication API";
    endpoints = [
      { method: "POST", path: "/api/auth/register", description: "Register a new user", requestBody: JSON.stringify({ name: "John Doe", email: "john@example.com", password: "••••••••" }, null, 2), responseBody: JSON.stringify({ user: { id: 1, name: "John Doe", email: "john@example.com" }, token: "eyJ..." }, null, 2) },
      { method: "POST", path: "/api/auth/login", description: "Login", requestBody: JSON.stringify({ email: "john@example.com", password: "••••••••" }, null, 2), responseBody: JSON.stringify({ token: "eyJ...", expiresIn: 3600 }, null, 2) },
      { method: "GET", path: "/api/auth/profile", description: "Get current user profile", responseBody: JSON.stringify({ id: 1, name: "John Doe", email: "john@example.com", createdAt: "2025-01-01" }, null, 2) },
    ];
    schemas = ["users", "sessions"];
  }
  if (hasProduct) {
    name = "E-Commerce API";
    endpoints = [
      { method: "GET", path: "/api/products", description: "List all products", responseBody: JSON.stringify([{ id: 1, name: "Product Name", price: 29.99, category: "Electronics", inStock: true }], null, 2) },
      { method: "POST", path: "/api/orders", description: "Create an order", requestBody: JSON.stringify({ products: [{ productId: 1, quantity: 2 }], shippingAddress: "123 Main St" }, null, 2), responseBody: JSON.stringify({ orderId: "ORD123", total: 59.98, status: "confirmed" }, null, 2) },
      { method: "GET", path: "/api/orders/:id", description: "Get order details", responseBody: JSON.stringify({ orderId: "ORD123", items: [{ productId: 1, quantity: 2, price: 29.99 }], total: 59.98, status: "shipped" }, null, 2) },
    ];
    schemas = ["products", "categories", "orders", "order_items"];
  }
  if (hasSchool) {
    name = "School Management API";
    endpoints = [
      { method: "GET", path: "/api/students", description: "List all students", responseBody: JSON.stringify([{ id: 1, name: "Jane Doe", class: "Form 3", admissionNo: "2024001" }], null, 2) },
      { method: "POST", path: "/api/attendance", description: "Record attendance", requestBody: JSON.stringify({ studentId: 1, date: "2025-01-15", status: "present" }, null, 2), responseBody: JSON.stringify({ success: true, recorded: true }, null, 2) },
      { method: "GET", path: "/api/exams/:id/results", description: "Get exam results", responseBody: JSON.stringify([{ subject: "Mathematics", score: 85, grade: "A" }], null, 2) },
    ];
    schemas = ["students", "classes", "attendance", "exams", "results"];
  }
  if (hasSusu) {
    name = "Susu Collection API";
    endpoints = [
      { method: "GET", path: "/api/collectors", description: "List all collectors", responseBody: JSON.stringify([{ id: 1, name: "Collector A", phone: "233501234567", membersCount: 50 }], null, 2) },
      { method: "POST", path: "/api/deposits", description: "Record a deposit", requestBody: JSON.stringify({ collectorId: 1, memberId: 1, amount: 20, date: "2025-01-15" }, null, 2), responseBody: JSON.stringify({ success: true, balance: 200 }, null, 2) },
      { method: "GET", path: "/api/members/:id/balance", description: "Get member balance", responseBody: JSON.stringify({ memberId: 1, name: "Member A", balance: 500, totalDeposits: 520, totalWithdrawals: 20 }, null, 2) },
    ];
    schemas = ["collectors", "members", "deposits", "withdrawals"];
  }
  if (hasBlog) {
    name = "Blog API";
    endpoints = [
      { method: "GET", path: "/api/posts", description: "List all posts", responseBody: JSON.stringify([{ id: 1, title: "Post Title", excerpt: "Short excerpt...", author: "John Doe", createdAt: "2025-01-15" }], null, 2) },
      { method: "POST", path: "/api/posts", description: "Create a post", requestBody: JSON.stringify({ title: "New Post", content: "Post content here...", categoryId: 1, tags: ["tech", "api"] }, null, 2), responseBody: JSON.stringify({ id: 2, title: "New Post", slug: "new-post", status: "published" }, null, 2) },
      { method: "GET", path: "/api/posts/:id/comments", description: "Get comments for a post", responseBody: JSON.stringify([{ id: 1, author: "Jane", content: "Great post!", createdAt: "2025-01-16" }], null, 2) },
    ];
    schemas = ["posts", "categories", "tags", "comments", "authors"];
  }

  const authLabels: Record<AuthMethod, string> = {
    apikey: "X-API-Key header",
    jwt: "Bearer Token (JWT)",
    cookie: "Session Cookie (wolx_token)",
    oauth: "OAuth 2.0 Bearer Token",
  };

  if (endpoints.length === 0) {
    name = "Custom API";
    endpoints = [
      { method: "GET", path: "/api/resources", description: "List all resources", responseBody: JSON.stringify([{ id: 1, name: "Resource 1" }], null, 2) },
      { method: "POST", path: "/api/resources", description: "Create a resource", requestBody: JSON.stringify({ name: "New Resource" }, null, 2), responseBody: JSON.stringify({ id: 2, name: "New Resource", createdAt: "2025-01-15" }, null, 2) },
      { method: "GET", path: "/api/resources/:id", description: "Get a resource by ID", responseBody: JSON.stringify({ id: 1, name: "Resource 1" }, null, 2) },
    ];
    schemas = ["resources"];
  }

  return {
    api: { name, description: apiDesc, version: "v1", auth: authLabels[auth], endpoints, schemas },
    samples: generateCodeSamples(endpoints, name, auth, framework),
  };
}

function generateCodeSamples(endpoints: Endpoint[], apiName: string, auth: AuthMethod, framework: Framework): CodeSamples {
  const sample = endpoints[0];
  if (!sample) return {};

  const curl = `curl -X ${sample.method} https://api.example.com${sample.path} \\
  -H "Content-Type: application/json"${auth === "apikey" ? ' \\\n  -H "X-API-Key: YOUR_API_KEY"' : auth === "jwt" ? ' \\\n  -H "Authorization: Bearer YOUR_TOKEN"' : auth === "cookie" ? ' \\\n  -H "Cookie: wolx_token=YOUR_SESSION"' : ' \\\n  -H "Authorization: Bearer YOUR_OAUTH_TOKEN"'}${sample.requestBody ? ` \\\n  -d '${sample.requestBody.replace(/\n/g, "")}'` : ""}`;

  const js = `fetch('https://api.example.com${sample.path}', {
  method: '${sample.method}',${auth !== "cookie" ? `\n  headers: {
    'Content-Type': 'application/json',${
      auth === "apikey" ? "\n    'X-API-Key': 'YOUR_API_KEY'" :
      auth === "jwt" ? "\n    'Authorization': 'Bearer YOUR_TOKEN'" :
      "'Authorization': 'Bearer YOUR_OAUTH_TOKEN'"
    }
  },` : `\n  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },`}${sample.requestBody ? `\n  body: JSON.stringify(${sample.requestBody.replace(/\n/g, "").replace(/\s+/g, " ").replace(/"/g, "'")})` : ""}
});`;

  return { curl, javascript: js };
}

function openapiYaml(api: GeneratedAPI): string {
  const paths = api.endpoints.map((e) => `  ${e.path}:
    ${e.method.toLowerCase()}:
      summary: ${e.description}
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object`).join("\n");

  return `openapi: 3.0.0
info:
  title: ${api.name}
  version: ${api.version}
  description: ${api.description}
servers:
  - url: https://api.example.com
paths:
${paths}
components:
  securitySchemes:
    Auth:
      type: ${api.auth.includes("API") ? "apiKey" : "http"}
      ${api.auth.includes("API") ? "in: header\n      name: X-API-Key" : `scheme: bearer\n      bearerFormat: ${api.auth.includes("JWT") ? "JWT" : "token"}`}
security:
  - Auth: []`;
}

function postmanCollection(api: GeneratedAPI): string {
  const items = api.endpoints.map((e) => ({
    name: `${e.method} ${e.path}`,
    request: {
      method: e.method,
      header: [{ key: "Content-Type", value: "application/json" }],
      url: { raw: `https://api.example.com${e.path}`, host: ["api", "example", "com"], path: e.path.split("/").filter(Boolean) },
      ...(e.requestBody ? { body: { mode: "raw", raw: e.requestBody } } : {}),
    },
  }));

  return JSON.stringify({ info: { name: api.name, schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" }, item: items }, null, 2);
}

export function ApiGeneratorPage({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState<Framework>("express");
  const [database, setDatabase] = useState<Database>("postgres");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("jwt");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ api: GeneratedAPI; samples: CodeSamples } | null>(null);
  const [copied, setCopied] = useState("");
  const [activeExport, setActiveExport] = useState("");
  const [savedApisList, setSavedApisList] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.example.com");
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ endpoint: string; method: string; status: number; body: string; duration: number }[] | null>(null);

  useEffect(() => {
    loadSavedApis();
  }, []);

  async function loadSavedApis() {
    if (!token) return;
    setLoadingSaved(true);
    try {
      const apis = await listSavedApis({ data: { token } });
      setSavedApisList(apis);
    } catch {
      // silently fail
    }
    setLoadingSaved(false);
  }

  function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setTestResults(null);
    setTimeout(() => {
      const generated = generateAPI(prompt, framework, database, authMethod);
      setResult(generated);
      setGenerating(false);
    }, 800);
  }

  function handleTemplate(p: string) {
    setPrompt(p);
  }

  function copyText(label: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  function downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleExportJSON() {
    if (!result) return;
    downloadFile(`${result.api.name.replace(/\s+/g, "-").toLowerCase()}.json`, JSON.stringify(result.api, null, 2), "application/json");
    setActiveExport("json");
    setTimeout(() => setActiveExport(""), 2000);
  }

  function handleExportOpenAPI() {
    if (!result) return;
    downloadFile(`${result.api.name.replace(/\s+/g, "-").toLowerCase()}-openapi.yaml`, openapiYaml(result.api), "text/yaml");
    setActiveExport("openapi");
    setTimeout(() => setActiveExport(""), 2000);
  }

  function handleExportPostman() {
    if (!result) return;
    downloadFile(`${result.api.name.replace(/\s+/g, "-").toLowerCase()}-postman.json`, postmanCollection(result.api), "application/json");
    setActiveExport("postman");
    setTimeout(() => setActiveExport(""), 2000);
  }

  async function handleSave() {
    if (!result || !token) return;
    setSaving(true);
    try {
      await saveGeneratedApi({
        data: {
          token,
          name: result.api.name,
          description: result.api.description,
          version: result.api.version,
          framework,
          database,
          auth: result.api.auth,
          endpoints: result.api.endpoints,
          schemas: result.api.schemas,
          codeSamples: result.samples,
        },
      });
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(""), 2000);
      loadSavedApis();
    } catch {
      setSaveMsg("Failed to save");
      setTimeout(() => setSaveMsg(""), 2000);
    }
    setSaving(false);
  }

  async function handleDeleteSaved(id: string) {
    if (!token) return;
    try {
      await deleteSavedApi({ data: { token, id } });
      setSavedApisList((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silently fail
    }
  }

  function handleLoadSaved(api: any) {
    setPrompt(api.description || "");
    setFramework(api.framework || "express");
    setDatabase(api.database || "postgres");
    setAuthMethod(
      api.auth?.includes("X-API-Key") ? "apikey" :
      api.auth?.includes("JWT") ? "jwt" :
      api.auth?.includes("Cookie") ? "cookie" : "jwt"
    );


    const endpoints = Array.isArray(api.endpoints) ? api.endpoints : [];
    const schemas = Array.isArray(api.schemas) ? api.schemas : [];
    const samples = api.codeSamples || {};

    setResult({
      api: {
        name: api.name,
        description: api.description || "",
        version: api.version || "v1",
        auth: api.auth || "",
        endpoints,
        schemas,
      },
      samples,
    });
  }

  async function handleTestAll() {
    if (!result) return;
    setTesting(true);
    setTestResults(null);

    const BASE = baseUrl.replace(/\/+$/, "");
    const results = await Promise.all(
      result.api.endpoints.map(async (ep) => {
        const start = performance.now();
        try {
          const res = await fetch(`${BASE}${ep.path}`, { method: ep.method });
          const duration = Math.round(performance.now() - start);
          const body = await res.text();
          return { endpoint: ep.path, method: ep.method, status: res.status, body, duration };
        } catch (err: any) {
          const duration = Math.round(performance.now() - start);
          const msg = err?.message || "Network error";
          return { endpoint: ep.path, method: ep.method, status: 0, body: msg, duration };
        }
      })
    );

    setTestResults(results);
    setTesting(false);
  }

  const methodColors: Record<string, string> = {
    GET: "text-emerald-500", POST: "text-blue-500", PUT: "text-amber-500", PATCH: "text-orange-500", DELETE: "text-red-500",
  };

  const statusColor = (s: number) => {
    if (s >= 200 && s < 300) return "text-emerald-500";
    if (s >= 300 && s < 400) return "text-amber-500";
    if (s >= 400) return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" /> API Generator
        </h2>
        <p className="text-sm text-muted-foreground">Generate complete API specifications from natural language.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Input */}
        <div className="space-y-6 lg:col-span-2">
          {/* Prompt Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Terminal className="h-4 w-4 text-primary" /> Describe Your API
              </CardTitle>
              <CardDescription>Describe what you want to build in plain English.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-input bg-background p-4 font-medium text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                placeholder='e.g. Create an API for a VTU platform that sells MTN, Telecel and AirtelTigo data bundles with wallet funding'
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                spellCheck={false}
              />
              <div className="flex flex-wrap gap-2">
                <Select value={framework} onValueChange={(v) => setFramework(v as Framework)}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <Code className="h-3 w-3 mr-1.5" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRAMEWORKS.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={database} onValueChange={(v) => setDatabase(v as Database)}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <Database className="h-3 w-3 mr-1.5" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATABASES.map((d) => (
                      <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={authMethod} onValueChange={(v) => setAuthMethod(v as AuthMethod)}>
                  <SelectTrigger className="h-8 w-32 md:w-40 text-xs">
                    <Shield className="h-3 w-3 mr-1.5" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTH_METHODS.map((a) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs">
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  style={{ background: "var(--gradient-brand)" }}
                  className="shadow-md"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Zap className="h-4 w-4 mr-1.5" />}
                  {generating ? "Generating..." : "Generate API"}
                </Button>
                <Button variant="outline" onClick={() => { setPrompt(""); setResult(null); setTestResults(null); }}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* API Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary" /> {result.api.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{result.api.version}</Badge>
                  </div>
                  <CardDescription>{result.api.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Auth:</span>
                      <span className="font-medium">{result.api.auth}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">DB:</span>
                      <span className="font-medium capitalize">{database}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Framework:</span>
                      <span className="font-medium">{FRAMEWORKS.find((f) => f.value === framework)?.label}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Endpoints */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Terminal className="h-4 w-4 text-primary" /> Generated Endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.api.endpoints.map((ep, i) => (
                    <div key={i} className="rounded-lg border bg-card">
                      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold font-mono ${methodColors[ep.method] || "text-foreground"}`}>
                            {ep.method}
                          </span>
                          <code className="text-xs font-mono">{ep.path}</code>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{ep.description}</span>
                      </div>
                      <div className="space-y-2 p-4">
                        {ep.requestBody && (
                          <div>
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Request Body</p>
                            <pre className="overflow-x-auto rounded border bg-muted/30 p-2 font-mono text-[10px] leading-relaxed">{ep.requestBody}</pre>
                          </div>
                        )}
                        <div>
                          <p className="mb-1 text-[10px] font-medium text-muted-foreground">Response</p>
                          <pre className="overflow-x-auto rounded border bg-muted/30 p-2 font-mono text-[10px] leading-relaxed">{ep.responseBody}</pre>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px]"
                          onClick={() => copyText(`endpoint-${i}`, ep.requestBody ? `// ${ep.method} ${ep.path}\n// Request:\n${ep.requestBody}\n// Response:\n${ep.responseBody}` : `// ${ep.method} ${ep.path}\n// Response:\n${ep.responseBody}`)}
                        >
                          {copied === `endpoint-${i}` ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copied === `endpoint-${i}` ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Code Samples */}
              {result.samples.curl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Code className="h-4 w-4 text-primary" /> Sample Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-[10px] font-semibold text-muted-foreground">cURL</h4>
                        <Button size="sm" variant="ghost" className="h-5 text-[9px]" onClick={() => copyText("curl", result.samples.curl)}>
                          {copied === "curl" ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copied === "curl" ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <pre className="overflow-x-auto rounded-lg border bg-[oklch(0.16_0.04_255)] p-3 font-mono text-[10px] leading-relaxed text-[oklch(0.92_0.02_250)]">
                        {result.samples.curl}
                      </pre>
                    </div>
                    {result.samples.javascript && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-[10px] font-semibold text-muted-foreground">JavaScript (fetch)</h4>
                          <Button size="sm" variant="ghost" className="h-5 text-[9px]" onClick={() => copyText("js", result.samples.javascript)}>
                            {copied === "js" ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                            {copied === "js" ? "Copied" : "Copy"}
                          </Button>
                        </div>
                        <pre className="overflow-x-auto rounded-lg border bg-[oklch(0.16_0.04_255)] p-3 font-mono text-[10px] leading-relaxed text-[oklch(0.92_0.02_250)]">
                          {result.samples.javascript}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Database Schema */}
              {result.api.schemas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Database className="h-4 w-4 text-primary" /> Generated Database Schema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.api.schemas.map((s) => (
                        <Badge key={s} variant="outline" className="px-3 py-1.5 text-xs font-mono">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Export + Save + Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Download className="h-4 w-4 text-primary" /> Export & Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={activeExport === "json"}>
                      {activeExport === "json" ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <FileText className="h-3.5 w-3.5 mr-1.5" />}
                      Export JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportOpenAPI} disabled={activeExport === "openapi"}>
                      {activeExport === "openapi" ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <BookOpen className="h-3.5 w-3.5 mr-1.5" />}
                      Export OpenAPI
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPostman} disabled={activeExport === "postman"}>
                      {activeExport === "postman" ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
                      Export Postman
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : saveMsg === "Saved!" ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      {saveMsg || "Save API"}
                    </Button>
                    <Button size="sm" style={{ background: "var(--gradient-brand)" }} className="shadow-sm" onClick={handleTestAll} disabled={testing}>
                      {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                      {testing ? "Testing..." : "Test All Endpoints"}
                    </Button>
                  </div>

                  {/* Base URL input for testing */}
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="http://localhost:3000"
                      className="h-7 text-[10px] font-mono"
                    />
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">Base URL</span>
                  </div>

                  {/* Inline test results */}
                  {testResults && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Terminal className="h-3 w-3" /> Test Results
                        {testResults.every((r) => r.status === 0) && (
                          <span className="text-[9px] font-normal text-amber-500 ml-1">
                            — all failed. Is your server running at <code className="text-[9px] font-mono">{baseUrl}</code>?
                          </span>
                        )}
                      </p>
                      {testResults.map((tr, i) => (
                        <div key={i} className="rounded border bg-card p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold font-mono ${methodColors[tr.method] || "text-foreground"}`}>
                                {tr.method}
                              </span>
                              <code className="text-[10px] font-mono">{tr.endpoint}</code>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-semibold font-mono ${statusColor(tr.status)}`}>
                                {tr.status || "ERR"}
                              </span>
                              <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {tr.duration}ms
                              </span>
                            </div>
                          </div>
                          {tr.body && (
                            <pre className={`mt-2 overflow-x-auto rounded border p-2 font-mono text-[9px] leading-relaxed max-h-24 ${tr.status === 0 ? "border-destructive/30 bg-destructive/5 text-destructive" : "bg-muted/30"}`}>
                              {tr.body.length > 500 ? tr.body.slice(0, 500) + "..." : tr.body}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right: Templates + Saved */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-primary" /> Quick Templates
              </CardTitle>
              <CardDescription>Click a template to get started instantly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  onClick={() => handleTemplate(t.prompt)}
                  className="w-full rounded-lg border border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-muted/30 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Saved APIs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Save className="h-4 w-4 text-primary" /> Saved APIs
              </CardTitle>
              <CardDescription>Previously saved API specifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingSaved ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : savedApisList.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-4">No saved APIs yet.</p>
              ) : (
                savedApisList.map((api) => (
                  <div
                    key={api.id}
                    className="rounded-lg border border-border p-2.5 transition-all hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold truncate">{api.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">
                          {api.endpoints?.length || 0} endpoint{api.endpoints?.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleLoadSaved(api)} title="Load API">
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-600" onClick={() => handleDeleteSaved(api.id)} title="Delete API">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
