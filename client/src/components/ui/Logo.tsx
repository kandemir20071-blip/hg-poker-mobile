import logoSrc from "@assets/image_1771096663950.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-20 h-20",
  xl: "w-24 h-24",
};

export function Logo({ className = "", size = "md" }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Home Game Poker Tracker Logo"
      className={`object-contain ${sizeMap[size]} ${className}`}
      data-testid="img-app-logo"
    />
  );
}
