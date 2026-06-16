import { useState } from "react";
import { trpc } from "@/lib/trpc";

type Tool = "osint" | "hash" | "dorks";
type OsintType = "person" | "domain" | "ip" | "email" | "username";

export default function OraculumOsint() {
  const [activeTool, setActiveTool] = useState<Tool>("osint");

  // OSINT state
  const [osintTarget, setOsintTarget] = useState("");
  const [osintType, setOsintType] = useState<OsintType>("domain");
  const [osintResult, setOsintResult] = useState<Record<string, unknown> | null>(null);

  // Hash state
  const [hashValue, setHashValue] = useState("");
  const [hashAlgo, setHashAlgo] = useState<"md5" | "sha1" | "sha256" | "unknown">("unknown");
  const [hashResult, setHashResult] = useState<Record<string, unknown> | null>(null);

  // Dorks state
  const [dorksTarget, setDorksTarget] = useState("");
  const [dorksObjective, setDorksObjective] = useState("");
  const [dorksResult, setDorksResult] = useState<Record<string, unknown> | null>(null);

  const osintSearch = trpc.oraculum.osintSearch.useMutation();
  const crackHash = trpc.oraculum.crackHash.useMutation();
  const generateDorks = trpc.oraculum.generateDorks.useMutation();

  const handleOsint = async () => {
    if (!osintTarget.trim()) return;
    setOsintResult(null);
    const result = await osintSearch.mutateAsync({ target: osintTarget.trim(), type: osintType });
    setOsintResult(result);
  };

  const handleHash = async () => {
    if (!hashValue.trim()) return;
    setHashResult(null);
    const result = await crackHash.mutateAsync({ hash: hashValue.trim(), algorithm: hashAlgo });
    setHashResult(result);
  };

  const handleDorks = async () => {
    if (!dorksTarget.trim()) return;
    setDorksResult(null);
    const result = await generateDorks.mutateAsync({ target: dorksTarget.trim(), objective: dorksObjective || "general reconnaissance" });
    setDorksResult(result);
  };

  const TOOLS = [
    { id: "osint" as Tool, label: "OSINT SEARCH", icon: "◎", desc: "Intelligence Gathering" },
    { id: "hash" as Tool, label: "HASH ANALYSIS", icon: "◈", desc: "Cryptographic Analysis" },
    { id: "dorks" as Tool, label: "GOOGLE DORKS", icon: "◇", desc: "Search Intelligence" },
  ];

  const OSINT_TYPES: { id: OsintType; label: string }[] = [
    { id: "domain", label: "DOMAIN" },
    { id: "ip", label: "IP ADDRESS" },
    { id: "email", label: "EMAIL" },
    { id: "username", label: "USERNAME" },
    { id: "person", label: "PERSON" },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* HUD Header */}
      <div className="cyber-card hud-bracket p-4 relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-30" />
        <div className="relative flex items-center gap-4">
          <div className="text-4xl neon-purple" style={{ filter: "drop-shadow(0 0 12px oklch(0.65 0.20 280))" }}>◎</div>
          <div>
            <div className="font-bold tracking-widest neon-purple text-lg" style={{ fontFamily: "'Orbitron', monospace" }}>
              ORACULUM
            </div>
            <div className="text-xs text-muted-foreground">Open Source Intelligence & Offensive Research Platform</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs neon-green">SYSTEM: ONLINE</div>
            <div className="text-[10px] text-muted-foreground">JARVIS NEURAL LINK ACTIVE</div>
          </div>
        </div>

        {/* HUD decorative elements */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-muted-foreground">
          {["OSINT ENGINE", "HASH MODULE", "DORK GENERATOR", "NEURAL CORE"].map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="status-dot online" />
              <span>{String(item)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tool selector */}
      <div className="flex gap-1 flex-wrap">
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-sm border transition-all ${
              activeTool === tool.id
                ? "border-purple-500/60 bg-purple-950/20 neon-purple"
                : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
            }`}
          >
            <span>{tool.icon}</span>
            <span className="tracking-wider font-bold">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* OSINT Search */}
      {activeTool === "osint" && (
        <div className="space-y-4">
          <div className="cyber-card p-4 space-y-3">
            <div className="text-xs neon-cyan tracking-wider">TARGET CLASSIFICATION</div>
            <div className="flex gap-1 flex-wrap">
              {OSINT_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setOsintType(t.id)}
                  className={`px-3 py-1 text-xs rounded-sm border transition-all ${
                    osintType === t.id
                      ? "border-cyan-500/60 bg-cyan-950/20 neon-cyan"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={osintTarget}
                onChange={e => setOsintTarget(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleOsint()}
                placeholder={`Enter ${osintType} to investigate...`}
                className="cyber-input flex-1 px-3 py-2 text-sm rounded-sm"
              />
              <button
                onClick={handleOsint}
                disabled={osintSearch.isPending || !osintTarget.trim()}
                className="btn-neon px-4 py-2 text-xs rounded-sm disabled:opacity-40"
                style={{ borderColor: "oklch(0.65 0.20 280 / 0.6)", color: "oklch(0.65 0.20 280)" }}
              >
                {osintSearch.isPending ? (
                  <span className="inline-block w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                ) : "SCAN ▶"}
              </button>
            </div>
          </div>

          {osintResult && (
            <div className="cyber-card p-4 space-y-4">
              <div className="text-xs neon-purple tracking-wider">INTELLIGENCE REPORT</div>

              {!!osintResult.summary && (
                <div className="text-sm text-foreground border-l-2 border-purple-500/40 pl-3">
                  {String(osintResult.summary)}
                </div>
              )}

              {!!osintResult.publicInfo && Array.isArray(osintResult.publicInfo) && (osintResult.publicInfo as unknown[]).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">PUBLIC INFORMATION</div>
                  <div className="space-y-1">
                    {(osintResult.publicInfo as unknown[]).map((info, i) => (
                      <div key={i} className="text-xs flex items-start gap-2 text-foreground">
                        <span className="neon-purple mt-0.5">▸</span>
                        <span>{String(info)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!!osintResult.searchVectors && Array.isArray(osintResult.searchVectors) && (osintResult.searchVectors as unknown[]).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">SEARCH VECTORS</div>
                  <div className="flex flex-wrap gap-1">
                    {(osintResult.searchVectors as unknown[]).map((v, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 border border-purple-900/40 neon-purple rounded-sm bg-purple-950/20">
                        {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!!osintResult.relatedEntities && Array.isArray(osintResult.relatedEntities) && (osintResult.relatedEntities as unknown[]).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">RELATED ENTITIES</div>
                  <div className="space-y-1">
                    {(osintResult.relatedEntities as unknown[]).map((e, i) => (
                      <div key={i} className="text-xs text-cyan-400">◈ {String(e)}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hash Analysis */}
      {activeTool === "hash" && (
        <div className="space-y-4">
          <div className="cyber-card p-4 space-y-3">
            <div className="text-xs neon-cyan tracking-wider">CRYPTOGRAPHIC HASH ANALYSIS</div>
            <div className="flex gap-1 flex-wrap">
              {(["unknown", "md5", "sha1", "sha256"] as const).map(algo => (
                <button
                  key={algo}
                  onClick={() => setHashAlgo(algo)}
                  className={`px-3 py-1 text-xs rounded-sm border transition-all ${
                    hashAlgo === algo
                      ? "border-cyan-500/60 bg-cyan-950/20 neon-cyan"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {algo.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={hashValue}
                onChange={e => setHashValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleHash()}
                placeholder="5f4dcc3b5aa765d61d8327deb882cf99"
                className="cyber-input flex-1 px-3 py-2 text-sm font-mono rounded-sm"
              />
              <button
                onClick={handleHash}
                disabled={crackHash.isPending || !hashValue.trim()}
                className="btn-neon px-4 py-2 text-xs rounded-sm disabled:opacity-40"
                style={{ borderColor: "oklch(0.65 0.20 280 / 0.6)", color: "oklch(0.65 0.20 280)" }}
              >
                {crackHash.isPending ? "..." : "ANALYZE ▶"}
              </button>
            </div>
          </div>

          {hashResult && (
            <div className="cyber-card p-4 space-y-3">
              <div className="text-xs neon-purple tracking-wider">ANALYSIS RESULT</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">ALGORITHM: </span>
                  <span className="neon-cyan">{String(hashResult.algorithm || "Unknown")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">CONFIDENCE: </span>
                  <span className={hashResult.confidence === "high" ? "neon-green" : hashResult.confidence === "medium" ? "risk-medium" : "risk-low"}>
                    {String(hashResult.confidence || "low").toUpperCase()}
                  </span>
                </div>
                {!!hashResult.identified && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">POSSIBLE VALUE: </span>
                    <span className="neon-green font-bold">{String(hashResult.possibleValue || "")}</span>
                  </div>
                )}
              </div>
              {!!hashResult.method && (
                <div className="text-xs border border-border/40 rounded-sm p-2 bg-muted/20">
                  <span className="text-muted-foreground">METHOD: </span>{String(hashResult.method)}
                </div>
              )}
              {!!hashResult.notes && (
                <div className="text-xs text-muted-foreground">{String(hashResult.notes)}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Google Dorks */}
      {activeTool === "dorks" && (
        <div className="space-y-4">
          <div className="cyber-card p-4 space-y-3">
            <div className="text-xs neon-cyan tracking-wider">GOOGLE DORK GENERATOR</div>
            <input
              value={dorksTarget}
              onChange={e => setDorksTarget(e.target.value)}
              placeholder="Target domain or organization (e.g. example.com)"
              className="cyber-input w-full px-3 py-2 text-sm rounded-sm"
            />
            <input
              value={dorksObjective}
              onChange={e => setDorksObjective(e.target.value)}
              placeholder="Objective (e.g. find exposed admin panels, leaked credentials)"
              className="cyber-input w-full px-3 py-2 text-sm rounded-sm"
            />
            <button
              onClick={handleDorks}
              disabled={generateDorks.isPending || !dorksTarget.trim()}
              className="btn-neon px-6 py-2 text-xs rounded-sm disabled:opacity-40"
              style={{ borderColor: "oklch(0.65 0.20 280 / 0.6)", color: "oklch(0.65 0.20 280)" }}
            >
              {generateDorks.isPending ? "GENERATING..." : "GENERATE DORKS ▶"}
            </button>
          </div>

          {!!(dorksResult && dorksResult.dorks && Array.isArray(dorksResult.dorks)) && (
            <div className="space-y-2">
              <div className="text-xs neon-purple tracking-wider">
                {String((dorksResult.dorks as unknown[]).length)} DORKS GENERATED
              </div>
              {(dorksResult.dorks as Array<Record<string, unknown>>).map((dork, i) => (
                <div key={i} className="cyber-card p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 border border-purple-900/40 neon-purple rounded-sm bg-purple-950/20">
                      {String(dork.category || "GENERAL")}
                    </span>
                    <span className="text-xs text-muted-foreground">{String(dork.description || "")}</span>
                  </div>
                  <div className="font-mono text-xs neon-green bg-black/30 px-3 py-2 rounded-sm border border-green-900/20 flex items-center justify-between gap-2">
                    <span className="break-all">{String(dork.query || "")}</span>
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/search?q=${encodeURIComponent(String(dork.query || ""))}`;
                        window.open(url, "_blank");
                      }}
                      className="text-[10px] flex-shrink-0 border border-green-900/40 px-2 py-0.5 rounded-sm hover:bg-green-950/20 transition-colors"
                    >
                      SEARCH ↗
                    </button>
                  </div>
                </div>
              ))}
              {!!dorksResult.notes && (
                <div className="text-xs text-muted-foreground p-3 border border-border/40 rounded-sm">
                  {String(dorksResult.notes)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
