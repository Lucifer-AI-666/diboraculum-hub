import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import VipLogin from "./pages/VipLogin";
import OrdoAbChao from "./pages/OrdoAbChao";
import ChatAI from "./pages/ChatAI";
import TaurosSentinel from "./pages/TaurosSentinel";
import OraculumOsint from "./pages/OraculumOsint";
import AIAgent from "./pages/AIAgent";
import DependencyManager from "./pages/DependencyManager";
import CyberDashboardLayout from "./components/CyberDashboardLayout";
import { useState, useEffect } from "react";

// ─── PWA Install Banner ───────────────────────────────────────────────────────
function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  const install = async () => {
    const p = prompt as unknown as { prompt: () => void; userChoice: Promise<{ outcome: string }> };
    p.prompt();
    const choice = await p.userChoice;
    if (choice.outcome === "accepted") setPrompt(null);
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 cyber-card border-neon-green p-4 max-w-xs shadow-2xl">
      <div className="text-xs neon-green font-bold tracking-wider mb-1">INSTALL DIBORACULUM HUB</div>
      <div className="text-xs text-muted-foreground mb-3">
        Install as a PWA for offline access and native-like experience
      </div>
      <div className="flex gap-2">
        <button onClick={install} className="btn-neon flex-1 py-1.5 text-xs rounded-sm">
          INSTALL ▶
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-1.5 text-xs border border-border/40 rounded-sm text-muted-foreground hover:text-foreground"
        >
          LATER
        </button>
      </div>
    </div>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-2xl animate-pulse" style={{ color: "oklch(0.85 0.01 0)" }}>◈</div>
          <div className="text-xs text-muted-foreground tracking-widest font-mono">AUTHENTICATING...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

// ─── Dashboard Routes ─────────────────────────────────────────────────────────
function DashboardRoutes() {
  return (
    <ProtectedRoute>
      <CyberDashboardLayout>
        <Switch>
          <Route path="/dashboard" component={OrdoAbChao} />
          <Route path="/dashboard/chat" component={ChatAI} />
          <Route path="/dashboard/sentinel" component={TaurosSentinel} />
          <Route path="/dashboard/oraculum" component={OraculumOsint} />
          <Route path="/dashboard/agent" component={AIAgent} />
          <Route path="/dashboard/deps" component={DependencyManager} />
          <Route component={NotFound} />
        </Switch>
      </CyberDashboardLayout>
    </ProtectedRoute>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();

  // Redirect authenticated users away from login
  if (!loading && isAuthenticated && location === "/") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <Switch>
      <Route path="/" component={VipLogin} />
      <Route path="/dashboard/:rest*" component={DashboardRoutes} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function AppContent() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
          <PwaInstallBanner />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return <AppContent />;
}
