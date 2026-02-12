import { cn } from "@/lib/utils";
import {
  Heart as LucideHeart,
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
      style={style}
    >
      <path d="M5 9c-1.5 1.5-3 3.2-3 5.5A5.5 5.5 0 0 0 7.5 20c1.8 0 3-.5 4.5-2 1.5 1.5 2.7 2 4.5 2a5.5 5.5 0 0 0 5.5-5.5c0-2.3-1.5-4-3-5.5l-7-7-7 7Z" />
      <path d="M9 22h6l-1.5-4h-3L9 22Z" />
    </svg>
  );
}

export function Club({ className, size = 24, style }: SuitProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
      style={style}
    >
      <path d="M17.28 9.05a5.5 5.5 0 1 0-10.56 0A5.5 5.5 0 1 0 12 17.66a5.5 5.5 0 1 0 5.28-8.6Z" />
      <path d="M9 22h6l-1.5-4h-3L9 22Z" />
    </svg>
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
