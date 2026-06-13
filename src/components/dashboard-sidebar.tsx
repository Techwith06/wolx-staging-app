import { useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  KeyRound,
  Globe,
  Radio,
  Activity,
  Webhook,
  Zap,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";


export const navItems = [
  { title: "Overview", value: "overview", icon: LayoutDashboard },
  { title: "API Keys", value: "keys", icon: KeyRound },
  { title: "Environments", value: "envs", icon: Globe },
  { title: "API Tester", value: "tester", icon: Radio },
  { title: "Request Logs", value: "logs", icon: Activity },
  { title: "Webhook Tester", value: "webhooks", icon: Webhook },
  { title: "API Generator", value: "generator", icon: Zap },
  { title: "Docs", value: "docs", icon: BookOpen },
];

export function DashboardSidebar({ active, onChange, collapsed, onToggleCollapse }: {
  active: string;
  onChange: (v: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside
      className="flex h-full flex-col border-r border-border bg-card"
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
        <img src="/wolx-logo.png" alt="Wolx" className="h-8 w-auto object-contain" />
        {!collapsed && (
          <>
            <span className="truncate text-sm font-bold">Wolx</span>
            <span className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              Console
            </span>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = active === item.value;
            return (
              <li key={item.value}>
                <button
                  onClick={() => onChange(item.value)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </button>
              </li>
            );
          })}
        </ul>

      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
        <button
          onClick={() => onChange("settings")}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
            active === "settings"
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex w-full items-center justify-center rounded-lg border border-border py-1.5 text-muted-foreground transition-all hover:bg-muted/60"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
