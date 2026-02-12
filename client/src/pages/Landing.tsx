import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowRight, Layers } from "lucide-react";

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
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center" data-testid="logo-icon">
            <Layers className="w-7 h-7 text-primary" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
          HOME GAME<br/>
          <span className="text-primary">POKER TRACKER</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Track buy-ins, manage cash-outs, monitor your bankroll, and climb the leaderboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a href="/api/login" data-testid="link-sign-in">
            <Button size="lg" className="rounded-full px-8 font-semibold text-base glow-emerald" data-testid="button-sign-in">
              Sign In <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-xs text-muted-foreground/40 tracking-widest uppercase font-medium">
        Built for serious players
      </div>
    </div>
  );
}
