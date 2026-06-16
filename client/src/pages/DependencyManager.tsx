import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import CyberDashboardLayout from "@/components/CyberDashboardLayout";

interface DepInfo {
  name: string;
  current: string;
  latest: string;
  outdated: boolean;
  type: "dep" | "devDep";
}

interface ScanResult {
  scannedAt: string;
  total: number;
  outdated: number;
  deps: DepInfo[];
}

export default function DependencyManager() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [scanEnabled, setScanEnabled] = useState(false);
  const { data: scanData, refetch: refetchScan } = trpc.deps.scan.useQuery(undefined, {
    enabled: scanEnabled,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (scanData) {
      setScanResult(scanData as ScanResult);
      addLog(`[OK] Scan completato: ${(scanData as ScanResult).outdated} dipendenze obsolete su ${(scanData as ScanResult).total}`);
      setIsScanning(false);
    }
  }, [scanData]);

  const updateMutation = trpc.deps.update.useMutation({
    onSuccess: (data: { updated: string[] }) => {
      addLog(`[OK] Aggiornamento completato: ${data.updated.join(", ")}`);
      // Re-scan after update
      handleScan();
    },
    onError: (err: { message: string }) => {
      addLog(`[ERR] Aggiornamento fallito: ${err.message}`);
    },
  });

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString("it-IT", { hour12: false });
    setLogs(prev => [...prev.slice(-99), `[${ts}] ${msg}`]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Auto-scan on mount
  useEffect(() => {
    addLog("[INIT] Diboraculum Dependency Manager v1.0 avviato");
    addLog("[INFO] Pronto per la scansione delle dipendenze");
  }, []);

  // Auto-update interval
  useEffect(() => {
    if (!autoUpdateEnabled) return;
    addLog("[AUTO] Auto-aggiornamento abilitato — intervallo: 24h");
    const interval = setInterval(() => {
      addLog("[AUTO] Avvio scansione automatica...");
      handleScan();
    }, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoUpdateEnabled]);

  const handleScan = () => {
    setIsScanning(true);
    addLog("[SCAN] Avvio scansione dipendenze in corso...");
    setScanEnabled(true);
    setTimeout(() => refetchScan(), 100);
  };

  const handleUpdateAll = () => {
    if (!scanResult) return;
    const outdatedNames = scanResult.deps.filter(d => d.outdated).map(d => d.name);
    if (outdatedNames.length === 0) {
      addLog("[INFO] Nessuna dipendenza da aggiornare");
      return;
    }
    addLog(`[UPDATE] Aggiornamento di ${outdatedNames.length} pacchetti...`);
    updateMutation.mutate({ packages: outdatedNames });
  };

  const handleUpdateSingle = (name: string) => {
    addLog(`[UPDATE] Aggiornamento di ${name}...`);
    updateMutation.mutate({ packages: [name] });
  };

  return (
    <CyberDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold neon-cyan tracking-widest uppercase"
              style={{ fontFamily: "'Orbitron', monospace" }}>
              ⚙ Dependency Manager
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Monitoraggio e aggiornamento automatico delle dipendenze in tempo reale
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-update toggle */}
            <div className="flex items-center gap-2 cyber-card px-3 py-2">
              <span className="text-xs text-muted-foreground">AUTO-UPDATE</span>
              <button
                onClick={() => {
                  setAutoUpdateEnabled(v => !v);
                  addLog(`[CONFIG] Auto-aggiornamento ${!autoUpdateEnabled ? "abilitato" : "disabilitato"}`);
                }}
                className={`w-10 h-5 rounded-full transition-colors relative ${autoUpdateEnabled ? "bg-green-600" : "bg-gray-700"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoUpdateEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="btn-neon px-4 py-2 text-xs tracking-widest disabled:opacity-40"
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  SCANNING...
                </span>
              ) : "[ SCAN NOW ]"}
            </button>
            {scanResult && scanResult.outdated > 0 && (
              <button
                onClick={handleUpdateAll}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-xs tracking-widest border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 transition-colors rounded-sm disabled:opacity-40"
              >
                {updateMutation.isPending ? "UPDATING..." : `[ UPDATE ALL (${scanResult.outdated}) ]`}
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        {scanResult && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "TOTALE", value: scanResult.total, color: "neon-cyan" },
              { label: "AGGIORNATE", value: scanResult.total - scanResult.outdated, color: "neon-green" },
              { label: "OBSOLETE", value: scanResult.outdated, color: scanResult.outdated > 0 ? "text-yellow-400" : "neon-green" },
              { label: "ULTIMA SCAN", value: new Date(scanResult.scannedAt).toLocaleTimeString("it-IT"), color: "text-muted-foreground" },
            ].map((stat) => (
              <div key={stat.label} className="cyber-card p-4 text-center">
                <div className={`text-2xl font-bold ${stat.color}`}
                  style={{ fontFamily: "'Orbitron', monospace" }}>
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1 tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Dependency list */}
          <div className="cyber-card p-4">
            <div className="text-xs neon-cyan tracking-widest uppercase mb-3 flex items-center gap-2">
              <span className="status-dot online" />
              DIPENDENZE
              {scanResult && <span className="ml-auto text-muted-foreground">{scanResult.total} pacchetti</span>}
            </div>
            {!scanResult ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                <div className="text-4xl mb-3 opacity-30">📦</div>
                <div>Avvia una scansione per vedere le dipendenze</div>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {scanResult.deps.map((dep) => (
                  <div
                    key={dep.name}
                    className={`flex items-center justify-between p-2 rounded-sm text-xs border transition-colors ${
                      dep.outdated
                        ? "border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10"
                        : "border-green-500/20 bg-green-500/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={dep.outdated ? "text-yellow-400" : "neon-green"}>
                        {dep.outdated ? "⚠" : "✓"}
                      </span>
                      <span className="font-mono truncate">{dep.name}</span>
                      <span className="text-muted-foreground shrink-0">{dep.current}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {dep.outdated && (
                        <>
                          <span className="text-yellow-400">→ {dep.latest}</span>
                          <button
                            onClick={() => handleUpdateSingle(dep.name)}
                            disabled={updateMutation.isPending}
                            className="px-2 py-0.5 text-xs border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 rounded-sm disabled:opacity-40"
                          >
                            UPDATE
                          </button>
                        </>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded-sm ${dep.type === "dep" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"}`}>
                        {dep.type === "dep" ? "prod" : "dev"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Terminal log */}
          <div className="cyber-card p-4">
            <div className="text-xs neon-green tracking-widest uppercase mb-3 flex items-center gap-2">
              <span className="status-dot online" />
              TERMINAL LOG
              <button
                onClick={() => setLogs([])}
                className="ml-auto text-muted-foreground hover:text-white text-xs"
              >
                [CLEAR]
              </button>
            </div>
            <div className="bg-black/40 rounded-sm p-3 h-96 overflow-y-auto font-mono text-xs space-y-0.5">
              {logs.length === 0 ? (
                <div className="text-muted-foreground">Nessun log disponibile...</div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.includes("[OK]") ? "neon-green" :
                      log.includes("[ERR]") ? "text-red-400" :
                      log.includes("[WARN]") ? "text-yellow-400" :
                      log.includes("[AUTO]") ? "neon-cyan" :
                      log.includes("[UPDATE]") ? "text-purple-400" :
                      "text-muted-foreground"
                    }
                  >
                    {log}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="cyber-card p-4 border-neon-cyan">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="neon-cyan font-bold tracking-widest mb-2">ℹ SISTEMA DI AUTO-AGGIORNAMENTO</div>
            <div>• La scansione analizza tutte le dipendenze del progetto e le confronta con le versioni più recenti su npm</div>
            <div>• L'aggiornamento automatico può essere abilitato per mantenere le dipendenze sempre aggiornate ogni 24 ore</div>
            <div>• Le dipendenze di produzione (<span className="text-cyan-400">prod</span>) e di sviluppo (<span className="text-purple-400">dev</span>) sono gestite separatamente</div>
            <div>• Tutti gli aggiornamenti vengono registrati nel log del terminale per tracciabilità completa</div>
          </div>
        </div>
      </div>
    </CyberDashboardLayout>
  );
}
