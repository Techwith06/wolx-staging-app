import { useState, useEffect, useCallback } from "react";
import {
  Activity, Search, Filter, Loader2, Clock, AlertTriangle, Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter,
} from "@/components/ui/dialog";

import { listRequestLogs, getRequestLogStats, deleteRequestLogs } from "@/lib/api/request-logs.functions";
import { useAuth } from "@/lib/auth-context";

type LogEntry = {
  id: string; method: string; endpoint: string;
  statusCode: number; responseTime: number;
  requestBody: string | null; responseBody: string | null;
  requestHeaders: string[] | null; responseHeaders: string[] | null;
  createdAt: string;
};

type LogStats = {
  totalRequests: number; avgResponseTime: number;
  fastestRequest: number; slowestRequest: number; errorRate: number;
};

const FILTERS = [
  { value: "all", label: "All Requests" },
  { value: "2xx", label: "Success (2xx)" },
  { value: "4xx", label: "Client Error (4xx)" },
  { value: "5xx", label: "Server Error (5xx)" },
  { value: "slow", label: "Slow (>2s)" },
];

export function RequestLogsPage() {
  const { token } = useAuth();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        listRequestLogs({ data: { token, filter: filter as "all" | "2xx" | "4xx" | "5xx" | "slow", search: search || undefined } }),
        getRequestLogStats({ data: { token } }),
      ]);
      setLogs(l as unknown as LogEntry[]);
      setStats(s as unknown as LogStats);
    } catch { /* silent */ }
    setLoading(false);
  }, [token, filter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDeleteLogs(retention?: "1day" | "7days" | "30days") {
    if (!token) return;
    try {
      await deleteRequestLogs({ data: { token, retention } });
      setShowDeleteConfirm(false);
      await loadData();
    } catch { /* silent */ }
  }

  function getStatusColor(code: number) {
    if (code === 0) return "text-muted-foreground";
    if (code < 300) return "text-emerald-600";
    if (code < 500) return "text-amber-600";
    return "text-destructive";
  }

  function getStatusBg(code: number) {
    if (code === 0) return "bg-muted/30";
    if (code < 300) return "bg-emerald-500/10";
    if (code < 500) return "bg-amber-500/10";
    return "bg-destructive/10";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Request Logs</h2>
          <p className="text-sm text-muted-foreground">Track, debug, and monitor all API activity.</p>
        </div>
        <Button size="sm" variant="outline" className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear Logs
        </Button>
      </div>

      {/* Stats */}
      {stats && stats.totalRequests > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card><CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <div className="text-xs text-muted-foreground">Total Requests</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
            <div className="text-xs text-muted-foreground">Avg Response Time</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{stats.fastestRequest}ms</div>
            <div className="text-xs text-muted-foreground">Fastest</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.slowestRequest}ms</div>
            <div className="text-xs text-muted-foreground">Slowest</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.errorRate}%</div>
            <div className="text-xs text-muted-foreground">Error Rate</div>
          </CardContent></Card>
        </div>
      )}

      {/* Filter + Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 w-36 md:w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8 text-xs"
            placeholder="Search endpoint or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Activity className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No request logs yet. Start testing APIs to see activity here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="divide-y divide-border">
                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <span className="w-16">Method</span>
                  <span className="flex-1">Endpoint</span>
                  <span className="w-20">Status</span>
                  <span className="w-20 text-right">Time</span>
                  <span className="w-24 text-right">Date</span>
                </div>
                {logs.map((log) => (
                  <button
                    key={log.id}
                    className="flex w-full items-center gap-4 px-6 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <span className="w-16">
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono">
                        {log.method}
                      </Badge>
                    </span>
                    <span className="flex-1 truncate font-mono text-xs">{log.endpoint}</span>
                    <span className={`w-20 font-mono text-xs font-semibold ${getStatusColor(log.statusCode)}`}>
                      {log.statusCode === 0 ? "ERR" : log.statusCode}
                      {log.statusCode >= 400 && log.statusCode < 500 && (
                        <span className="ml-1 inline-flex">{/* warning indicator */}</span>
                      )}
                    </span>
                    <span className="flex w-20 items-center justify-end gap-1 font-mono text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {log.responseTime}ms
                    </span>
                    <span className="w-24 text-right text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                        ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : new Date(log.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })
                      }
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{selectedLog.method}</Badge>
                  <span className="font-mono text-sm font-normal truncate">{selectedLog.endpoint}</span>
                </DialogTitle>
                <DialogDescription>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getStatusBg(selectedLog.statusCode)} ${getStatusColor(selectedLog.statusCode)}`}>
                      {selectedLog.statusCode === 0 ? "Error" : selectedLog.statusCode}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {selectedLog.responseTime}ms
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedLog.requestBody && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Request Body</Label>
                    <pre className="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                      {(() => {
                        try { return JSON.stringify(JSON.parse(selectedLog.requestBody!), null, 2); }
                        catch { return selectedLog.requestBody; }
                      })()}
                    </pre>
                  </div>
                )}

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
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear Logs Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear Request Logs</DialogTitle>
            <DialogDescription>Choose what to keep or remove all logs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => handleDeleteLogs("30days")}>
              Keep last 30 days
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleDeleteLogs("7days")}>
              Keep last 7 days
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleDeleteLogs("1day")}>
              Keep last 24 hours
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => handleDeleteLogs()}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete All Logs
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
