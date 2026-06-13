import { useState, useEffect, useCallback } from "react";
import {
  User, KeyRound, Radio, Webhook, Globe,
  Shield, Download, Trash2, Clock, LogOut, Lock,
  WifiOff, RefreshCw, Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { getProfileData, updateProfile } from "@/lib/api/profile.functions";
import { useAuth } from "@/lib/auth-context";

type ProfileData = {
  user: { id: string; name: string; email: string; emailVerified: string | null; createdAt: string };
  stats: { apiKeys: number; environments: number; requestsSent: number; webhookTests: number };
  activity: {
    lastLogin: string;
    lastRequestAt: string | null;
    lastWebhookAt: string | null;
    lastRequestEndpoint: string | null;
    lastWebhookEvent: string | null;
  };
};

function timeAgo(date: string | null) {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function ProfilePage() {
  const { token, user: authUser, login, logout } = useAuth();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const d = await getProfileData({ data: { token } });
      const pd = d as unknown as ProfileData;
      setData(pd);
      setName(pd.user.name);
      setEmail(pd.user.email);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load profile data. Database may be unreachable.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleUpdate() {
    if (!token || !name.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ data: { token, name, email } });
      login(token, { id: data!.user.id, name, email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Profile</h2>
          <p className="text-sm text-muted-foreground">Manage your personal account information.</p>
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

  const u = data!.user;
  const s = data!.stats;
  const a = data!.activity;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your personal account information.</p>
      </div>

      {toastMsg && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary flex items-center gap-2">
          <Check className="h-4 w-4" /> {toastMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile Header */}
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{u.name}</h3>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  Member since {new Date(u.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
              <Badge variant={u.emailVerified ? "secondary" : "outline"} className="ml-auto">
                {u.emailVerified ? "Verified" : "Unverified"}
              </Badge>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-primary" /> Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => showToast("Password change feature coming soon")}>
                <Lock className="mr-2 h-4 w-4" /> Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => showToast("2FA setup coming soon")}>
                <Shield className="mr-2 h-4 w-4" /> Enable 2FA
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => showToast("Session management coming soon")}>
                <User className="mr-2 h-4 w-4" /> View Active Sessions
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Profile Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Profile Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleUpdate} disabled={saving}>
                {saving ? "Saving..." : saved ? "Saved!" : "Update Profile"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => { const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "wolx-account-data.json"; a.click(); }}>
                <Download className="mr-2 h-4 w-4" /> Download Account Data
              </Button>
              {confirmDelete ? (
                <div className="space-y-2">
                  <p className="text-xs text-destructive">Are you sure? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => { showToast("Account deletion coming soon"); setConfirmDelete(false); }}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Confirm Delete
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Account Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <KeyRound className="h-4 w-4 text-primary" /> Account Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">API Keys Created</span>
                </div>
                <span className="text-sm font-semibold">{s.apiKeys}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Requests Sent</span>
                </div>
                <span className="text-sm font-semibold">{s.requestsSent.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Webhook Tests</span>
                </div>
                <span className="text-sm font-semibold">{s.webhookTests}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Environments</span>
                </div>
                <span className="text-sm font-semibold">{s.environments}</span>
              </div>
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" /> Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Last Login</span>
                </div>
                <span className="text-xs font-medium">{timeAgo(a.lastLogin)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Last API Test</span>
                </div>
                <span className="text-xs font-medium">{timeAgo(a.lastRequestAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Last Webhook Test</span>
                </div>
                <span className="text-xs font-medium">{timeAgo(a.lastWebhookAt)}</span>
              </div>
              {a.lastRequestEndpoint && (
                <div className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">Last endpoint hit:</p>
                  <p className="mt-0.5 truncate font-mono text-[10px]">{a.lastRequestEndpoint}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
