import { cn } from "@/lib/utils";
import {
  Heart as LucideHeart,
  Spade as LucideSpade,
  Club as LucideClub,
  Diamond as LucideDiamond,
} from "lucide-react";

interface SuitProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function Heart({ className, size = 24, style }: SuitProps) {
  return (
    <LucideHeart
      size={size}
      fill="currentColor"
      strokeWidth={0}
      className={cn("shrink-0", className)}
      aria-hidden="true"
      style={style}
    />
  );
}

export function Spade({ className, size = 24, style }: SuitProps) {
  return (
    <LucideSpade
      size={size}
      fill="currentColor"
      strokeWidth={0}
      className={cn("shrink-0", className)}
      aria-hidden="true"
      style={style}
    />
  );
}

export function Club({ className, size = 24, style }: SuitProps) {
  return (
    <LucideClub
      size={size}
      fill="currentColor"
      strokeWidth={0}
      className={cn("shrink-0", className)}
      aria-hidden="true"
      style={style}
    />
  );
}

export function Diamond({ className, size = 24, style }: SuitProps) {
  return (
    <LucideDiamond
      size={size}
      fill="currentColor"
      strokeWidth={0}
      className={cn("shrink-0", className)}
      aria-hidden="true"
      style={style}
    />
  );
}

export function SuitWatermark({ suit, className }: { suit: "heart" | "spade" | "club" | "diamond"; className?: string }) {
  const suitMap = { heart: Heart, spade: Spade, club: Club, diamond: Diamond };
  const SuitIcon = suitMap[suit];
  return <SuitIcon className={cn("text-primary opacity-[0.05]", className)} size={160} />;
}

export function SuitAccent({ suit, className, size = 14 }: { suit: "heart" | "spade" | "club" | "diamond"; className?: string; size?: number }) {
  const suitMap = { heart: Heart, spade: Spade, club: Club, diamond: Diamond };
  const SuitIcon = suitMap[suit];
  return <SuitIcon className={cn("text-muted-foreground opacity-30", className)} size={size} />;
}

export function SuitsLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="suits-loader">
      <Heart size={16} className="text-primary animate-pulse" style={{ animationDelay: "0ms" }} />
      <Diamond size={16} className="text-primary animate-pulse" style={{ animationDelay: "150ms" }} />
      <Club size={16} className="text-primary animate-pulse" style={{ animationDelay: "300ms" }} />
      <Spade size={16} className="text-primary animate-pulse" style={{ animationDelay: "450ms" }} />
    </div>
  );
}

export function SuitsRow({ className, size = 12 }: { className?: string; size?: number }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Heart size={size} className="text-current" />
      <Diamond size={size} className="text-current" />
      <Club size={size} className="text-current" />
      <Spade size={size} className="text-current" />
    </div>
  );
}
