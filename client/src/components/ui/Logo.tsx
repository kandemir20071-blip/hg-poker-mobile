import logoSrc from "@assets/image-removebg-preview_1771105877255.png";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-12 h-12" }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Home Game Poker Tracker Logo"
      className={`object-contain ${className}`}
      style={{ imageRendering: 'pixelated' }}
      data-testid="img-app-logo"
    />
  );
}
