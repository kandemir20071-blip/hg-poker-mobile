import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { SuitsRow } from "@/components/ui/Suits";
import { Logo } from "@/components/ui/Logo";
import { getApiBase } from "@/lib/api-base";
import { Capacitor } from "@capacitor/core";
import heroBg from "@assets/unnamed-2_1771086435607.jpg";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isLoading) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-6">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        <div className="flex flex-col items-center gap-0">
          <Logo className="w-56 h-56 drop-shadow-[0_0_4px_rgba(74,222,128,0.3)] mb-0" />
          <h1 className="-mt-6 text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-none">
            HOME GAME<br/>
            <span className="text-primary">POKER TRACKER</span>
          </h1>
        </div>

        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Track buy-ins, manage cash-outs, monitor your bankroll, and climb the leaderboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            size="lg"
            className="rounded-full px-8 font-semibold text-base glow-emerald"
            data-testid="button-sign-in"
            onClick={async () => {
              if (Capacitor.isNativePlatform()) {
                const { Browser } = await import("@capacitor/browser");
                await Browser.open({ url: getApiBase() + "/api/login" });
              } else {
                window.location.href = "/api/login";
              }
            }}
          >
            Sign In <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-xs text-muted-foreground/40 tracking-widest uppercase font-medium flex flex-col items-center gap-2">
        <SuitsRow size={10} className="text-muted-foreground/20" />
        Built for serious players
      </div>
    </div>
  );
}
