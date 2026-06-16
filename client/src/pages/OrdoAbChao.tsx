import { trpc } from "@/lib/trpc";

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="cyber-card p-4 hud-bracket">
      <div className="text-xs text-muted-foreground tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`} style={{ fontFamily: "'Orbitron', monospace" }}>
        {value}
      </div>
    </div>
  );
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572A5",
  HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051", default: "#6e7681",
};

export default function OrdoAbChao() {
  const { data: status, isLoading: statusLoading } = trpc.hub.getSystemStatus.useQuery(undefined, { refetchInterval: 15000 });
  const { data: repos, isLoading: reposLoading } = trpc.hub.getGithubProjects.useQuery();
  const { data: activity } = trpc.hub.getRecentActivity.useQuery({ limit: 10 });

  const DEPLOYMENTS = [
    { name: "TaurosApp Mistral", url: "tauros-app-mistral-ready.vercel.app", status: "live" },
    { name: "TauroBot", url: "taurobot-lucifer-ai-666s-projects.vercel.app", status: "live" },
    { name: "JarvisDib", url: "jarvisdib.vercel.app", status: "live" },
    { name: "Yoda Sentinel", url: "yoda-drab.vercel.app", status: "live" },
    { name: "Diboraculum Hub", url: "diboraculum.com", status: "live" },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="cyber-card border-neon-cyan p-4 relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-20" />
        <div className="relative flex items-center gap-4">
          <div className="text-4xl neon-cyan">⬡</div>
          <div>
            <div className="font-bold tracking-widest neon-cyan text-lg" style={{ fontFamily: "'Orbitron', monospace" }}>
              ORDO-AB-CHAO
            </div>
            <div className="text-xs text-muted-foreground">Command Hub — System Overview & Intelligence Control Center</div>
          </div>
          <div className="ml-auto text-right text-xs">
            <div className={status?.api ? "neon-green" : "neon-red"}>
              {status?.api ? "● ALL SYSTEMS NOMINAL" : "● DEGRADED"}
            </div>
            <div className="text-muted-foreground text-[10px] mt-0.5">
              {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString("en-US", { hour12: false }) : "--:--:--"}
            </div>
          </div>
        </div>
      </div>

      {/* System status grid */}
      <div>
        <div className="text-xs neon-cyan tracking-wider mb-3">SYSTEM STATUS</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {status?.modules && Object.entries(status.modules).map(([mod, active]) => (
            <div key={mod} className={`cyber-card p-3 border ${active ? "border-green-900/40" : "border-red-900/40"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`status-dot ${active ? "online" : "offline"}`} />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{mod}</span>
              </div>
              <div className={`text-xs font-bold ${active ? "neon-green" : "neon-red"}`}>
                {active ? "ONLINE" : "OFFLINE"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="GITHUB REPOS" value={repos?.length ?? "—"} color="neon-green" />
        <StatCard label="DEPLOYMENTS" value={DEPLOYMENTS.length} color="neon-cyan" />
        <StatCard label="THREAT LOGS" value={activity?.length ?? 0} color="neon-red" />
        <StatCard label="MODULES" value={4} color="neon-purple" />
      </div>

      {/* Two columns: GitHub + Vercel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GitHub Repos */}
        <div>
          <div className="text-xs neon-green tracking-wider mb-3 flex items-center gap-2">
            <span>◈</span> GITHUB REPOSITORIES
            {reposLoading && <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin ml-2" />}
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {repos?.map((repo: { name: unknown; url: unknown; isPrivate: unknown; description: unknown; language: unknown; stars: unknown; openIssues: unknown }) => (
              <a
                key={String(repo.name)}
                href={String(repo.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="cyber-card p-3 flex items-start gap-3 hover:border-green-900/40 transition-all cursor-pointer block"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-foreground truncate">{String(repo.name)}</span>
                    {!!repo.isPrivate && (
                      <span className="text-[10px] px-1 border border-yellow-900/40 text-yellow-500 rounded-sm">PRIVATE</span>
                    )}
                  </div>
                  {!!repo.description && (
                    <div className="text-[10px] text-muted-foreground truncate">{String(repo.description)}</div>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    {!!repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block"
                          style={{ background: LANG_COLORS[String(repo.language)] || LANG_COLORS.default }} />
                        {String(repo.language)}
                      </span>
                    )}
                    <span>★ {String(repo.stars)}</span>
                    {Number(repo.openIssues) > 0 && (
                      <span className="neon-red">⚠ {String(repo.openIssues)} issues</span>
                    )}
                  </div>
                </div>
                <span className="text-muted-foreground text-xs">↗</span>
              </a>
            ))}
            {!reposLoading && (!repos || repos.length === 0) && (
              <div className="text-xs text-muted-foreground text-center py-4">No repos found</div>
            )}
          </div>
        </div>

        {/* Vercel Deployments */}
        <div>
          <div className="text-xs neon-cyan tracking-wider mb-3 flex items-center gap-2">
            <span>◉</span> VERCEL DEPLOYMENTS
          </div>
          <div className="space-y-2">
            {DEPLOYMENTS.map(dep => (
              <a
                key={dep.name}
                href={`https://${dep.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cyber-card p-3 flex items-center gap-3 hover:border-cyan-900/40 transition-all block"
              >
                <span className="status-dot online flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-foreground">{dep.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{dep.url}</div>
                </div>
                <span className="text-[10px] neon-green border border-green-900/40 px-2 py-0.5 rounded-sm">LIVE</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {activity && activity.length > 0 && (
        <div>
          <div className="text-xs neon-red tracking-wider mb-3">RECENT ACTIVITY</div>
          <div className="space-y-1.5">
            {activity.map(log => (
              <div key={log.id} className="flex items-center gap-3 text-xs border border-border/30 rounded-sm px-3 py-2 bg-muted/10">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-bold ${
                  log.riskLevel === "critical" || log.riskLevel === "high" ? "neon-red border-red-900/40 bg-red-950/20" :
                  log.riskLevel === "medium" ? "text-orange-400 border-orange-900/40 bg-orange-950/20" :
                  "neon-green border-green-900/40 bg-green-950/20"
                }`}>
                  {(log.riskLevel || "safe").toUpperCase()}
                </span>
                <span className="text-muted-foreground uppercase text-[10px]">{log.type.replace("_", " ")}</span>
                <span className="font-mono truncate text-foreground">{log.target}</span>
                <span className="ml-auto text-muted-foreground text-[10px] flex-shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString("en-US", { hour12: false })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
