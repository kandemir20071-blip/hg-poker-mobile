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
      <path d="M12 2 C12 2 3 10 3 14.5 C3 17 5 19 7.5 19 C9.1 19 10.5 18.1 11 16.8 L11 16.8 L11 21 L13 21 L13 16.8 C13.5 18.1 14.9 19 16.5 19 C19 19 21 17 21 14.5 C21 10 12 2 12 2Z" />
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
      <path d="M12 2 C9.24 2 7 4.24 7 7 C7 8.2 7.44 9.3 8.16 10.12 C5.84 10.56 4 12.58 4 15 C4 17.76 6.24 20 9 20 C10.14 20 11.18 19.6 11 19.6 L11 21 L13 21 L13 19.6 C12.82 19.6 13.86 20 15 20 C17.76 20 20 17.76 20 15 C20 12.58 18.16 10.56 15.84 10.12 C16.56 9.3 17 8.2 17 7 C17 4.24 14.76 2 12 2Z" />
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
