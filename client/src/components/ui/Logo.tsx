import logoSrc from "@assets/Logo-removebg-preview_1771098081122.png";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-12 h-12" }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Home Game Poker Tracker Logo"
      className={`object-contain ${className}`}
      data-testid="img-app-logo"
    />
  );
}
