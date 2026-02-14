import logoSrc from "@assets/image_1771097397897.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-24 h-24",
  xl: "w-36 h-36",
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
