import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function VipLogin() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-2xl animate-pulse" style={{ color: "oklch(0.85 0.01 0)" }}>◈</div>
          <div className="text-xs text-muted-foreground tracking-widest font-mono">LOADING...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "radial-gradient(circle at 50% 50%, oklch(0.9 0.01 0), transparent 70%)" }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-widest mb-2"
            style={{ fontFamily: "'Orbitron', monospace", color: "oklch(0.92 0.01 0)" }}>
            DIB
          </h1>
          <h2 className="text-xs tracking-[0.35em] uppercase font-mono"
            style={{ color: "oklch(0.55 0.01 0)" }}>
            Piattaforma AI · CyberSec · OSINT
          </h2>
        </div>

        {/* Login card */}
        <div className="rounded border p-8 space-y-6"
          style={{
            background: "oklch(0.08 0.005 0)",
            borderColor: "oklch(0.22 0.005 0)"
          }}>
          <div className="text-center space-y-1">
            <div className="text-sm font-semibold tracking-wide"
              style={{ color: "oklch(0.88 0.01 0)" }}>
              Accedi a Diboraculum Hub
            </div>
            <div className="text-xs font-mono"
              style={{ color: "oklch(0.50 0.01 0)" }}>
              Crea un account o accedi con il tuo profilo
            </div>
          </div>

          {/* Main login button */}
          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 rounded text-sm font-semibold tracking-wide transition-all duration-150 active:scale-[0.97]"
            style={{
              background: "oklch(0.92 0.01 0)",
              color: "oklch(0.08 0.005 0)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "oklch(1 0 0)")}
            onMouseLeave={e => (e.currentTarget.style.background = "oklch(0.92 0.01 0)")}
          >
            Accedi / Registrati
          </button>

          {/* Provider hints */}
          <div className="text-center">
            <div className="text-xs font-mono" style={{ color: "oklch(0.40 0.01 0)" }}>
              Supporta Google · GitHub · Email
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="text-xs font-mono" style={{ color: "oklch(0.32 0.01 0)" }}>
            DIBORACULUM HUB v3.0 — SECURE ACCESS
          </div>
        </div>
      </div>
    </div>
  );
}
