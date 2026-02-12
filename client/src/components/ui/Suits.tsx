import { cn } from "@/lib/utils";

interface SuitProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function Heart({ className, size = 24, style }: SuitProps) {
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
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
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
      <path d="M12 2C9.5 5.5 3 9.5 3 14c0 2.76 2.24 5 5 5 1.63 0 3.07-.79 3.98-2H12v4h.02c0 .01-.02 0-.02 0h.02-.02v-4h.02A5.003 5.003 0 0016 19c2.76 0 5-2.24 5-5 0-4.5-6.5-8.5-9-12z" />
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
      <path d="M12 2a5 5 0 00-2.13 9.54A5.001 5.001 0 007 16c0 .72.15 1.4.43 2.02L12 22l4.57-3.98c.28-.62.43-1.3.43-2.02a5.001 5.001 0 00-2.87-4.46A5 5 0 0012 2z" />
    </svg>
  );
}

export function Diamond({ className, size = 24, style }: SuitProps) {
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
      <path d="M12 2L5 12l7 10 7-10L12 2z" />
    </svg>
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
