import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

type Tab = "url" | "apk" | "feed" | "intel";

const RISK_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  safe:     { color: "risk-safe",     label: "SAFE",     bg: "bg-green-950/20" },
  low:      { color: "risk-low",      label: "LOW",      bg: "bg-yellow-950/20" },
  medium:   { color: "risk-medium",   label: "MEDIUM",   bg: "bg-orange-950/20" },
  high:     { color: "risk-high",     label: "HIGH",     bg: "bg-red-950/30" },
  critical: { color: "risk-critical", label: "CRITICAL", bg: "bg-red-950/50" },
};

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.medium;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-sm border font-bold tracking-wider ${cfg.color} ${cfg.bg}`}
      style={{ borderColor: "currentColor" }}>
      {cfg.label}
    </span>
  );
}

export default function TaurosSentinel() {
  const [activeTab, setActiveTab] = useState<Tab>("url");
  const [urlInput, setUrlInput] = useState("");
  const [urlResult, setUrlResult] = useState<Record<string, unknown> | null>(null);
  const [apkPackage, setApkPackage] = useState("");
  const [apkManifest, setApkManifest] = useState("");
  const [apkResult, setApkResult] = useState<Record<string, unknown> | null>(null);
  const [intelTopic, setIntelTopic] = useState("");
  const [intelResult, setIntelResult] = useState("");

  const scanUrl = trpc.sentinel.scanUrl.useMutation();
  const analyzeApk = trpc.sentinel.analyzeApk.useMutation();
  const { data: threatFeed, refetch: refetchFeed } = trpc.sentinel.getThreatFeed.useQuery({ limit: 20 });
  const generateIntel = trpc.sentinel.generateThreatIntel.useMutation();

  const handleScanUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlResult(null);
    const result = await scanUrl.mutateAsync({ url: urlInput.trim() });
    setUrlResult(result);
  };

  const handleAnalyzeApk = async () => {
    if (!apkPackage.trim()) return;
    setApkResult(null);
    const result = await analyzeApk.mutateAsync({
      packageName: apkPackage.trim(),
      manifest: apkManifest || undefined,
    });
    setApkResult(result);
  };

  const handleGenerateIntel = async () => {
    if (!intelTopic.trim()) return;
    setIntelResult("");
    const result = await generateIntel.mutateAsync({ topic: intelTopic.trim() });
    setIntelResult(result.content);
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "url", label: "URL SCANNER", icon: "⬡" },
    { id: "apk", label: "APK FORENSICS", icon: "◉" },
    { id: "feed", label: "THREAT FEED", icon: "◎" },
    { id: "intel", label: "THREAT INTEL", icon: "◈" },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="cyber-card border-neon-red p-4 flex items-center gap-4">
        <div className="text-3xl neon-red">◉</div>
        <div>
          <div className="font-bold tracking-widest neon-red" style={{ fontFamily: "'Orbitron', monospace" }}>
            TAUROS SENTINEL
          </div>
          <div className="text-xs text-muted-foreground">Cybersecurity Intelligence & Threat Analysis Platform</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="status-dot online" />
          <span className="text-xs neon-green">ACTIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-sm border transition-all ${
              activeTab === tab.id
                ? "border-red-500/60 bg-red-950/20 neon-red"
                : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="tracking-wider font-bold">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* URL Scanner */}
      {activeTab === "url" && (
        <div className="space-y-4">
          <div className="cyber-card p-4 space-y-3">
            <div className="text-xs neon-cyan tracking-wider">TARGET URL</div>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScanUrl()}
                placeholder="https://suspicious-domain.com/path"
                className="cyber-input flex-1 px-3 py-2 text-sm rounded-sm"
              />
              <button
                onClick={handleScanUrl}
                disabled={scanUrl.isPending || !urlInput.trim()}
                className="btn-neon px-4 py-2 text-xs rounded-sm disabled:opacity-40"
                style={{ borderColor: "oklch(0.65 0.25 25 / 0.6)", color: "oklch(0.65 0.25 25)" }}
              >
                {scanUrl.isPending ? (
                  <span className="inline-block w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                ) : "SCAN ▶"}
              </button>
            </div>
          </div>

          {urlResult && (
            <div className="cyber-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs neon-cyan tracking-wider">SCAN RESULT</span>
                <RiskBadge level={String(urlResult.riskLevel || "medium")} />
              </div>

              {!!urlResult.threats && Array.isArray(urlResult.threats) && urlResult.threats.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">THREATS DETECTED</div>
                  <div className="space-y-1">
                    {(urlResult.threats as string[]).map((t, i) => (
                      <div key={i} className="text-xs neon-red flex items-center gap-2">
                        <span>⚠</span><span>{String(t)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!!urlResult.indicators && Array.isArray(urlResult.indicators) && urlResult.indicators.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">INDICATORS OF COMPROMISE</div>
                  <div className="flex flex-wrap gap-1">
                    {(urlResult.indicators as string[]).map((ind, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 border border-yellow-900/40 text-yellow-400 rounded-sm bg-yellow-950/20">
                        {String(ind)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!!urlResult.recommendation && (
                <div className="text-xs border border-border/40 rounded-sm p-3 bg-muted/20">
                  <span className="text-muted-foreground">RECOMMENDATION: </span>
                  <span className="text-foreground">{String(urlResult.recommendation)}</span>
                </div>
              )}

              {!!urlResult.details && (
                <div className="text-xs text-muted-foreground border-t border-border/40 pt-3">
                  {String(urlResult.details)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* APK Forensics */}
      {activeTab === "apk" && (
        <div className="space-y-4">
          <div className="cyber-card p-4 space-y-3">
            <div className="text-xs neon-cyan tracking-wider">ANDROID PACKAGE ANALYSIS</div>
            <input
              value={apkPackage}
              onChange={e => setApkPackage(e.target.value)}
              placeholder="com.suspicious.app.package"
              className="cyber-input w-full px-3 py-2 text-sm rounded-sm"
            />
            <textarea
              value={apkManifest}
              onChange={e => setApkManifest(e.target.value)}
              placeholder="Paste AndroidManifest.xml content here (optional)..."
              className="cyber-input w-full px-3 py-2 text-sm rounded-sm min-h-[100px] resize-none"
            />
            <button
              onClick={handleAnalyzeApk}
              disabled={analyzeApk.isPending || !apkPackage.trim()}
              className="btn-neon px-6 py-2 text-xs rounded-sm disabled:opacity-40"
              style={{ borderColor: "oklch(0.65 0.25 25 / 0.6)", color: "oklch(0.65 0.25 25)" }}
            >
              {analyzeApk.isPending ? "ANALYZING..." : "ANALYZE APK ▶"}
            </button>
          </div>

          {apkResult && (
            <div className="cyber-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs neon-cyan tracking-wider">FORENSICS REPORT</span>
                <RiskBadge level={String(apkResult.riskLevel || "medium")} />
              </div>

              {!!apkResult.dangerousPermissions && Array.isArray(apkResult.dangerousPermissions) && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">DANGEROUS PERMISSIONS</div>
                  <div className="flex flex-wrap gap-1">
                    {(apkResult.dangerousPermissions as string[]).map((p, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 border border-red-900/40 neon-red rounded-sm bg-red-950/20">
                        {String(p)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!!apkResult.spywareIndicators && Array.isArray(apkResult.spywareIndicators) && (apkResult.spywareIndicators as string[]).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">SPYWARE INDICATORS</div>
                  {(apkResult.spywareIndicators as string[]).map((s, i) => (
                    <div key={i} className="text-xs neon-red">⚠ {String(s)}</div>
                  ))}
                </div>
              )}

              {!!apkResult.recommendation && (
                <div className="text-xs border border-border/40 rounded-sm p-3 bg-muted/20">
                  {String(apkResult.recommendation)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Threat Feed */}
      {activeTab === "feed" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs neon-cyan tracking-wider">LIVE THREAT FEED</div>
            <button onClick={() => refetchFeed()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ↻ REFRESH
            </button>
          </div>
          {(!threatFeed || threatFeed.length === 0) ? (
            <div className="cyber-card p-8 text-center text-muted-foreground text-sm">
              No threat logs yet. Run a scan to populate the feed.
            </div>
          ) : (
            <div className="space-y-2">
              {threatFeed.map(log => (
                <div key={log.id} className="cyber-card p-3 flex items-start gap-3">
                  <RiskBadge level={log.riskLevel || "safe"} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-foreground truncate">{log.target}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {log.type.replace("_", " ").toUpperCase()} — {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Threat Intel */}
      {activeTab === "intel" && (
        <div className="space-y-4">
          <div className="cyber-card p-4 space-y-3">
            <div className="text-xs neon-cyan tracking-wider">THREAT INTELLIGENCE QUERY</div>
            <div className="flex gap-2">
              <input
                value={intelTopic}
                onChange={e => setIntelTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerateIntel()}
                placeholder="e.g. Ransomware LockBit 3.0, CVE-2024-1234, APT28..."
                className="cyber-input flex-1 px-3 py-2 text-sm rounded-sm"
              />
              <button
                onClick={handleGenerateIntel}
                disabled={generateIntel.isPending || !intelTopic.trim()}
                className="btn-neon px-4 py-2 text-xs rounded-sm disabled:opacity-40"
              >
                {generateIntel.isPending ? "..." : "QUERY ▶"}
              </button>
            </div>
          </div>

          {intelResult && (
            <div className="cyber-card p-4">
              <div className="text-xs neon-cyan tracking-wider mb-3">INTELLIGENCE BRIEFING</div>
              <div className="prose prose-invert prose-sm max-w-none text-sm">
                <Streamdown>{String(intelResult)}</Streamdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
