import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  customIconSrc?: string;
  trend?: string;
  trendUp?: boolean;
  subtitle?: React.ReactNode;
  prominent?: boolean;
  valueColor?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, customIconSrc, trend, trendUp, subtitle, prominent, valueColor, className }: StatCardProps) {
  return (
    <div className={cn(
      "glass-card rounded-xl relative overflow-hidden group hover:border-primary/20 transition-all duration-300",
      prominent ? "p-6 border-primary/10" : "p-5",
      className
    )} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {customIconSrc ? (
        <div className={cn("absolute -bottom-2 -right-2 transition-opacity", "opacity-[0.35] group-hover:opacity-[0.5]")}>
          <img src={customIconSrc} alt="" className={cn("object-contain", prominent ? "w-40 h-40" : "w-36 h-36")} style={{ imageRendering: 'pixelated' }} />
        </div>
      ) : (
        <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
          <Icon className={cn("transform translate-x-4 -translate-y-4 text-primary", prominent ? "w-24 h-24" : "w-20 h-20")} />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center gap-3 mb-3">
          {customIconSrc ? (
            <img src={customIconSrc} alt="" className={cn("object-contain drop-shadow-md shrink-0", prominent ? "w-14 h-14" : "w-12 h-12")} style={{ imageRendering: 'pixelated' }} />
          ) : (
            <div className={cn("bg-primary/10 rounded-lg text-primary", prominent ? "p-2.5" : "p-2")}>
              <Icon className={cn(prominent ? "w-5 h-5" : "w-4 h-4")} />
            </div>
          )}
          <h3 className={cn("font-medium text-muted-foreground uppercase tracking-wider", prominent ? "text-xs" : "text-xs")}>{title}</h3>
        </div>
        
        <div className="space-y-1">
          <div className={cn(
            "font-bold tracking-tight",
            prominent ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl",
            valueColor || "text-white"
          )}>
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground" data-testid={`stat-subtitle-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {subtitle}
            </div>
          )}
          {trend && (
            <div className={cn("text-xs font-medium flex items-center gap-1", 
              trendUp ? "text-emerald-400" : "text-destructive"
            )}>
              <span>{trend}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
