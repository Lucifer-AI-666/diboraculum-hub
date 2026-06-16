import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useVip } from "@/contexts/VipContext";
import { trpc } from "@/lib/trpc";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  color: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "hub", label: "ORDO-AB-CHAO", icon: "⬡", path: "/dashboard", color: "neon-cyan", description: "Command Hub" },
  { id: "chat", label: "CHAT AI", icon: "◈", path: "/dashboard/chat", color: "neon-green", description: "Multi-Model AI" },
  { id: "sentinel", label: "TAUROS SENTINEL", icon: "◉", path: "/dashboard/sentinel", color: "neon-red", description: "CyberSec" },
  { id: "oraculum", label: "ORACULUM", icon: "◎", path: "/dashboard/oraculum", color: "neon-purple", description: "OSINT/CTF" },
  { id: "agent", label: "AI AGENT", icon: "◆", path: "/dashboard/agent", color: "neon-green", description: "Filesystem Operator" },
  { id: "deps", label: "DEP MANAGER", icon: "⚙", path: "/dashboard/deps", color: "text-orange-400", description: "Auto-Update Deps" },
];

export default function CyberDashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useVip();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: status } = trpc.hub.getSystemStatus.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const activeModule = NAV_ITEMS.find(item =>
    item.path === location || (item.path !== "/dashboard" && location.startsWith(item.path))
  ) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border transition-all duration-300 ${
          sidebarCollapsed ? "w-14" : "w-56"
        }`}
        style={{
          background: "oklch(0.07 0.012 240)",
          borderColor: "oklch(0.18 0.04 200)",
        }}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{
              background: "oklch(0.75 0.22 155 / 0.1)",
              border: "1px solid oklch(0.75 0.22 155 / 0.5)",
              fontFamily: "'Orbitron', monospace",
              color: "oklch(0.75 0.22 155)",
            }}
          >
            D
          </div>
          {!sidebarCollapsed && (
            <div>
              <div className="text-xs font-bold neon-green tracking-widest" style={{ fontFamily: "'Orbitron', monospace" }}>
                DIB
              </div>
              <div className="text-[10px] text-muted-foreground tracking-wider">UNIFIED HUB</div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>

        {/* Status indicator */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2 border-b border-border">
            <div className="flex items-center gap-2 text-xs">
              <span className={`status-dot ${status?.api ? "online" : "offline"}`} />
              <span className="text-muted-foreground">
                {status?.api ? "ALL SYSTEMS NOMINAL" : "DEGRADED"}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(item => {
            const isActive = item.path === location ||
              (item.path !== "/dashboard" && location.startsWith(item.path));

            return (
              <Link key={item.id} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm cursor-pointer transition-all duration-200 group ${
                    isActive
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <span
                    className={`text-base flex-shrink-0 transition-all ${
                      isActive ? item.color : "text-muted-foreground group-hover:text-foreground"
                    }`}
                    style={isActive ? {
                      filter: item.color === "neon-green"
                        ? "drop-shadow(0 0 6px oklch(0.75 0.22 155))"
                        : item.color === "neon-cyan"
                        ? "drop-shadow(0 0 6px oklch(0.70 0.18 200))"
                        : item.color === "neon-red"
                        ? "drop-shadow(0 0 6px oklch(0.65 0.25 25))"
                        : "drop-shadow(0 0 6px oklch(0.65 0.20 280))"
                    } : {}}
                  >
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <div className="min-w-0">
                      <div className={`text-xs font-bold tracking-wider truncate ${
                        isActive ? item.color : "text-muted-foreground group-hover:text-foreground"
                      }`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                    </div>
                  )}
                  {isActive && !sidebarCollapsed && (
                    <div className="ml-auto w-1 h-4 rounded-full"
                      style={{
                        background: item.color === "neon-green" ? "oklch(0.75 0.22 155)" :
                          item.color === "neon-cyan" ? "oklch(0.70 0.18 200)" :
                          item.color === "neon-red" ? "oklch(0.65 0.25 25)" :
                          "oklch(0.65 0.20 280)",
                        boxShadow: `0 0 6px currentColor`,
                      }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: logout */}
        <div className="p-2 border-t border-border">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-sm text-muted-foreground hover:text-red-400 hover:bg-red-950/20 transition-all duration-200 text-xs`}
          >
            <span className="text-base flex-shrink-0">⏻</span>
            {!sidebarCollapsed && (
              <span className="tracking-wider">DISCONNECT</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-6 py-3 border-b border-border"
          style={{ background: "oklch(0.07 0.012 240)" }}
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold tracking-widest ${activeModule.color}`}>
              {activeModule.icon} {activeModule.label}
            </span>
            <span className="text-muted-foreground text-xs">/ {activeModule.description}</span>
          </div>

          <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
            {/* Module status indicators */}
            {status && (
              <div className="hidden md:flex items-center gap-3">
                {Object.entries(status.modules || {}).map(([mod, active]) => (
                  <div key={mod} className="flex items-center gap-1">
                    <span className={`status-dot ${active ? "online" : "offline"}`} />
                    <span className="uppercase text-[10px]">{mod}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] font-mono opacity-60">
              {new Date().toLocaleTimeString("en-US", { hour12: false })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
