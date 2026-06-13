import { useState, useEffect, useCallback } from "react";
import {
  Settings, Moon, Sun, Monitor, Bell, Shield, Database,
  Download, Trash2, Clock, Save, Globe, Loader2, Check,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { getSettings, updateSettings, deleteAllLogs } from "@/lib/api/settings.functions";

type SettingsData = {
  appName: string; timezone: string; dateFormat: string; theme: string;
  sidebarExpanded: boolean; showIcons: boolean;
  defaultTimeout: number; autoSaveRequests: boolean; followRedirects: boolean;
  notifyRequestFailed: boolean; notifyWebhookFailure: boolean;
  notifyEnvOffline: boolean; notifyKeyExpired: boolean;
  sessionTimeout: number; requireReauth: boolean; twoFactorAuth: boolean;
  enableLocalhost: boolean; allowedPorts: string;
  allowSelfSignedSsl: boolean; allowPrivateIPs: boolean;
};

export function SettingsPage() {
  const { token } = useAuth();

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
const [confirmClearCache, setConfirmClearCache] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getSettings({ data: { token } });
      setSettings(data);
      applyTheme(data.theme);
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function applyTheme(theme: string) {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }

  function update<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
    if (key === "theme") applyTheme(value as string);
  }

  async function handleSave() {
    if (!token || !settings) return;
    setSaving(true);
    setError("");
    try {
      await updateSettings({ data: { token, ...settings } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    if (!settings) return;
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wolx-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteLogs() {
    if (!token) return;
    try {
      await deleteAllLogs({ data: { token } });
      setConfirmDelete(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to delete logs");
    }
  }

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error || "Could not load settings"}</p>
        <Button variant="outline" size="sm" onClick={loadSettings}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage application-wide preferences.</p>
        </div>
        <Button onClick={handleSave} disabled={saving || saved}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4 text-primary" /> General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Application Name</Label>
              <Input className="mt-1" value={settings.appName} onChange={(e) => update("appName", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Timezone</Label>
              <Select value={settings.timezone} onValueChange={(v) => update("timezone", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GMT+0">GMT +0</SelectItem>
                  <SelectItem value="GMT+1">GMT +1</SelectItem>
                  <SelectItem value="GMT+2">GMT +2</SelectItem>
                  <SelectItem value="GMT+3">GMT +3</SelectItem>
                  <SelectItem value="GMT-1">GMT -1</SelectItem>
                  <SelectItem value="GMT-2">GMT -2</SelectItem>
                  <SelectItem value="GMT-3">GMT -3</SelectItem>
                  <SelectItem value="GMT-4">GMT -4</SelectItem>
                  <SelectItem value="GMT-5">GMT -5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date Format</Label>
              <Select value={settings.dateFormat} onValueChange={(v) => update("dateFormat", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Monitor className="h-4 w-4 text-primary" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Theme</Label>
              <div className="mt-1 flex gap-2">
                {[
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                  { value: "system", icon: Monitor, label: "System" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => update("theme", t.value)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                      settings.theme === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Sidebar Expanded</Label>
                <Toggle checked={settings.sidebarExpanded} onChange={(v) => update("sidebarExpanded", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Show Icons</Label>
                <Toggle checked={settings.showIcons} onChange={(v) => update("showIcons", v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" /> API Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Default Timeout</Label>
              <Select value={String(settings.defaultTimeout)} onValueChange={(v) => update("defaultTimeout", Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">60 seconds</SelectItem>
                  <SelectItem value="120">120 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto Save Requests</Label>
                <Toggle checked={settings.autoSaveRequests} onChange={(v) => update("autoSaveRequests", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Follow Redirects</Label>
                <Toggle checked={settings.followRedirects} onChange={(v) => update("followRedirects", v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-primary" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Request Failed", key: "notifyRequestFailed" as const },
              { label: "Webhook Failure", key: "notifyWebhookFailure" as const },
              { label: "Environment Offline", key: "notifyEnvOffline" as const },
              { label: "API Key Expired", key: "notifyKeyExpired" as const },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between">
                <Label className="text-xs">{n.label}</Label>
                <Toggle checked={settings[n.key]} onChange={(v) => update(n.key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Session Timeout</Label>
              <Select value={String(settings.sessionTimeout)} onValueChange={(v) => update("sessionTimeout", Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Minutes</SelectItem>
                  <SelectItem value="30">30 Minutes</SelectItem>
                  <SelectItem value="60">60 Minutes</SelectItem>
                  <SelectItem value="240">4 Hours</SelectItem>
                  <SelectItem value="480">8 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Require Re-authentication</Label>
                <Toggle checked={settings.requireReauth} onChange={(v) => update("requireReauth", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Two-Factor Authentication</Label>
                <Toggle checked={settings.twoFactorAuth} onChange={(v) => update("twoFactorAuth", v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Local Development */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-primary" /> Local Development
            </CardTitle>
            <CardDescription className="text-xs">Configure how the app interacts with localhost and private network endpoints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Enable Localhost Requests</Label>
                <p className="text-[10px] text-muted-foreground">Allow requests to localhost, 127.0.0.1, and private IPs.</p>
              </div>
              <Toggle checked={settings.enableLocalhost} onChange={(v) => update("enableLocalhost", v)} />
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground">Allowed Ports</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Comma-separated list of permitted local ports.</p>
              <Input className="font-mono text-xs" value={settings.allowedPorts} onChange={(e) => update("allowedPorts", e.target.value)} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Allow Self-Signed SSL</Label>
                <p className="text-[10px] text-muted-foreground">Accept self-signed certificates on local HTTPS servers.</p>
              </div>
              <Toggle checked={settings.allowSelfSignedSsl} onChange={(v) => update("allowSelfSignedSsl", v)} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Allow Private Network IPs</Label>
                <p className="text-[10px] text-muted-foreground">Enable requests to 192.168.x.x, 10.x.x.x, 172.16.x.x.</p>
              </div>
              <Toggle checked={settings.allowPrivateIPs} onChange={(v) => update("allowPrivateIPs", v)} />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-primary" /> Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export Settings
            </Button>
            {confirmClearCache ? (
              <div className="space-y-2">
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Clear all cached data?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setConfirmClearCache(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Confirm Clear
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmClearCache(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full justify-start" onClick={() => setConfirmClearCache(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear Cache
              </Button>
            )}
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Delete all request and webhook logs?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleDeleteLogs}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Confirm Delete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Logs
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
