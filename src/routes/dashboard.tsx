import { createFileRoute } from "@tanstack/react-router";
import { Search, User, LogOut, Menu, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DashboardSidebar, navItems } from "@/components/dashboard-sidebar";
import { ApiKeysPage } from "@/components/api-keys-page";
import { EnvironmentsPage } from "@/components/environments-page";
import { ApiTesterPage } from "@/components/api-tester-page";
import { OverviewPage } from "@/components/overview-page";
import { RequestLogsPage } from "@/components/request-logs-page";
import { WebhookTesterPage } from "@/components/webhook-tester-page";
import { ApiGeneratorPage } from "@/components/api-generator-page";
import { DocsPage } from "@/components/docs-page";
import { SettingsPage } from "@/components/settings-page";
import { ProfilePage } from "@/components/profile-page";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Developer Dashboard — Woolley-Tech" },
      { name: "description", content: "API keys, wallet, usage analytics, webhooks and live deployments in one console." },
    ],
  }),
  component: Dashboard,
});

function MobileSidebar({ active, onChange, open, onOpenChange }: {
  active: string;
  onChange: (v: string) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <SheetDescription className="sr-only">Dashboard navigation sidebar</SheetDescription>
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
            <img src="/wolx-logo.png" alt="Wolx" className="h-8 w-auto object-contain" />
            <span className="truncate text-sm font-bold">Wolx</span>
            <span className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              Console
            </span>
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {navItems.map((item) => {
                const isActive = active === item.value;
                return (
                  <li key={item.value}>
                    <button
                      onClick={() => { onChange(item.value); onOpenChange(false); }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span>{item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t border-border p-3">
            <button
              onClick={() => { onChange("settings"); onOpenChange(false); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active === "settings"
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Settings className="h-[18px] w-[18px] shrink-0" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Dashboard() {
  const [active, setActive] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar - fixed */}
      <div className="hidden md:block fixed top-0 left-0 z-40 h-full transition-[width] duration-300" style={{ width: sidebarCollapsed ? "4rem" : "16rem" }}>
        <DashboardSidebar
          active={active}
          onChange={setActive}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile sidebar - sheet */}
      <MobileSidebar active={active} onChange={setActive} open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      {/* Main area */}
      <div className={`flex flex-1 flex-col transition-[margin] duration-300 ${sidebarCollapsed ? "ml-[4rem]" : "ml-[16rem]"} max-md:!ml-0`}>
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 md:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
              title="Open menu"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            <h1 className="text-base md:text-lg font-bold tracking-tight">
              {active === "overview" && "Developer Console"}
              {active === "keys" && "API Keys"}
              {active === "envs" && "Environments & Base URLs"}
              {active === "tester" && "API Tester"}
              {active === "logs" && "Request Logs"}
              {active === "webhooks" && "Webhook Tester"}
              {active === "generator" && "API Generator"}
              {active === "docs" && "Documentation"}
              {active === "settings" && "Settings"}
              {active === "profile" && "Profile"}
            </h1>
            <Badge variant="secondary" className="hidden sm:flex gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              All systems operational
            </Badge>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." className="h-9 w-56 rounded-lg pl-9 text-sm" />
            </div>
            <button
              onClick={() => setActive("profile")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Profile"
            >
              <User className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {active === "overview" && <OverviewPage onNavigate={setActive} />}
          {active === "keys" && <ApiKeysPage />}
          {active === "envs" && <EnvironmentsPage />}
          {active === "tester" && <ApiTesterPage />}
          {active === "logs" && <RequestLogsPage />}
          {active === "webhooks" && <WebhookTesterPage />}
          {active === "generator" && <ApiGeneratorPage onNavigate={setActive} />}
          {active === "docs" && <DocsPage />}
          {active === "settings" && <SettingsPage />}
          {active === "profile" && <ProfilePage />}
        </main>
      </div>
    </div>
  );
}
