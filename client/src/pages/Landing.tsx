import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowRight, Spade, Club, Heart, Diamond } from "lucide-react";

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
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-destructive/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl w-full text-center space-y-8">
        {/* Logo / Icon */}
        <div className="flex justify-center gap-4 mb-8 text-primary/40 animate-pulse">
          <Spade className="w-8 h-8" />
          <Heart className="w-8 h-8 text-destructive/40" />
          <Club className="w-8 h-8" />
          <Diamond className="w-8 h-8 text-destructive/40" />
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tight drop-shadow-2xl">
          HOME GAME<br/>
          <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary via-yellow-200 to-primary">POKER TRACKER</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The ultimate companion for your home poker nights. Track buy-ins, manage cash-outs, monitor bankrolls, and climb the league leaderboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <a href="/api/login">
            <Button size="lg" className="h-14 px-8 text-lg font-bold bg-gold-gradient text-black shadow-lg shadow-primary/25 hover:scale-105 transition-transform duration-200 rounded-full">
              Sign In to Play <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-xs text-muted-foreground/50 font-display tracking-widest uppercase">
        Built for serious players
      </div>
    </div>
  );
}
