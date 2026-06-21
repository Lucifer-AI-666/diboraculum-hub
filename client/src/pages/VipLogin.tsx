import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

/**
 * Detect if the app is running as an installed PWA in standalone mode.
 * In standalone mode, OAuth redirects must open in the system browser
 * (via window.open) otherwise the OAuth portal opens inside the PWA shell
 * and the session cookie is lost when the user returns.
 */
function isPWAStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export default function VipLogin() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const [, navigate] = useLocation();

  // When the PWA regains focus (user returns from OAuth in system browser),
  // re-check authentication state immediately.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    const handleFocus = () => {
      refresh();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = () => {
    const loginUrl = getLoginUrl();

    if (isPWAStandalone()) {
      // In PWA standalone mode: open OAuth in the system browser so the
      // redirect back to the app works correctly and the cookie is set.
      // The visibilitychange / focus listener above will re-check auth when
      // the user returns to the PWA.
      window.open(loginUrl, "_blank", "noopener,noreferrer");
    } else {
      // Normal browser: navigate in the same tab
      window.location.href = loginUrl;
    }
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

          {/* PWA hint */}
          <div className="text-center">
            <div className="text-xs font-mono" style={{ color: "oklch(0.32 0.01 0)" }}>
              {isPWAStandalone()
                ? "Si aprirà il browser — torna qui dopo l'accesso"
                : "Verrai reindirizzato al portale sicuro"}
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
