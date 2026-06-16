import { useState, useEffect, useRef } from "react";
import { useVip } from "@/contexts/VipContext";
import { useLocation } from "wouter";

const BOOT_LINES = [
  "DIBORACULUM UNIFIED INTELLIGENCE SYSTEM v3.0",
  "Initializing secure enclave...",
  "Loading cryptographic modules... [OK]",
  "Establishing neural link... [OK]",
  "Tauros Sentinel: ACTIVE",
  "Oraculum OSINT: ACTIVE",
  "Ordo-ab-Chao Hub: ACTIVE",
  "Chat AI Gateway: ACTIVE",
  ">> AUTHENTICATION REQUIRED <<",
];

export default function VipLogin() {
  const { login, isAuthenticated, isLoading } = useVip();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [bootDone, setBootDone] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Boot sequence animation
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setBootLines(prev => [...prev, BOOT_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setBootDone(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }, 300);
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    const result = await login(code.trim());

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError("ACCESS DENIED — INVALID VIP CODE");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setCode("");
      inputRef.current?.focus();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background cyber-grid scanlines flex items-center justify-center p-4">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.22 155), transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, oklch(0.70 0.18 200), transparent)" }} />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="text-5xl font-bold tracking-widest neon-green"
              style={{ fontFamily: "'Orbitron', monospace" }}>
              DIB
            </div>
            <div className="text-xs tracking-[0.4em] neon-cyan mt-1 uppercase">
              Oraculum Hub
            </div>
          </div>
        </div>

        {/* Terminal boot sequence */}
        <div className="cyber-card border-neon-green p-4 mb-6 min-h-[220px]">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
            <span className="status-dot online" />
            <span>SYSTEM TERMINAL — SECURE BOOT</span>
          </div>
          <div className="space-y-1">
            {bootLines.filter((l): l is string => typeof l === 'string').map((line, i) => (
              <div
                key={i}
                className={`text-xs font-mono transition-opacity duration-200 ${
                  line.includes(">>") ? "neon-cyan font-bold" :
                  line.includes("[OK]") ? "neon-green" :
                  line.includes("ACTIVE") ? "neon-green" :
                  "text-muted-foreground"
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {line.includes(">>") ? "" : "> "}{line}
              </div>
            ))}
            {!bootDone && (
              <div className="text-xs text-muted-foreground cursor-blink">&nbsp;</div>
            )}
          </div>
        </div>

        {/* Login form */}
        {bootDone && (
          <div
            className={`cyber-card border-neon-cyan p-6 transition-all duration-300 ${shake ? "animate-bounce" : ""}`}
            style={{
              animation: shake ? "shake 0.5s ease-in-out" : undefined,
            }}
          >
            <div className="text-center mb-6">
              <div className="text-sm neon-cyan tracking-widest uppercase mb-1">
                VIP Access Required
              </div>
              <div className="text-xs text-muted-foreground">
                Enter your encrypted access code to proceed
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs neon-green">
                  KEY://
                </div>
                <input
                  ref={inputRef}
                  type="password"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER VIP CODE"
                  className="cyber-input w-full pl-16 pr-4 py-3 text-sm tracking-widest uppercase rounded-sm"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isSubmitting}
                  maxLength={64}
                />
              </div>

              {error && (
                <div className="text-xs neon-red text-center tracking-wider py-2 border border-red-900/40 rounded-sm bg-red-950/20">
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !code.trim()}
                className="btn-neon w-full py-3 text-sm tracking-widest rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    AUTHENTICATING...
                  </span>
                ) : (
                  "[ AUTHENTICATE ]"
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <div className="text-xs text-muted-foreground">
                Unauthorized access attempts are logged and monitored
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground space-y-1">
          <div>DIBORACULUM UNIFIED INTELLIGENCE SYSTEM</div>
          <div className="neon-green opacity-60">© 2026 Anouar Dib — ALL RIGHTS RESERVED</div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
