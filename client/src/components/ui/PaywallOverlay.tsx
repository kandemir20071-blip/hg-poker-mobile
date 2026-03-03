import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PaywallOverlayProps {
  isPro: boolean;
  children: React.ReactNode;
  featureName?: string;
}

export function PaywallOverlay({ isPro, children, featureName = "Pro Feature" }: PaywallOverlayProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  if (isPro) return <>{children}</>;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: data.message || "Failed to start checkout", variant: "destructive" });
        setIsLoading(false);
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect to payment service", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" data-testid="paywall-overlay">
      <div className="blur-[6px] pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
        <div className="glass-card rounded-xl p-6 text-center max-w-xs mx-4 backdrop-blur-xl bg-card/80 border border-white/[0.08]">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-bold text-white text-lg mb-1" data-testid="text-paywall-title">{featureName}</h4>
          <p className="text-sm text-muted-foreground mb-4">Unlock advanced analytics and detailed insights with Pro.</p>
          <Button
            className="w-full font-semibold min-h-[44px]"
            data-testid="button-upgrade-pro"
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}
