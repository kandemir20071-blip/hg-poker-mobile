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
      prominent ? "p-4 sm:p-6 border-primary/10" : "p-3 sm:p-5",
      className
    )} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {customIconSrc ? (
        <div className={cn("absolute -bottom-2 -right-2 transition-opacity hidden sm:block", "opacity-[0.35] group-hover:opacity-[0.5]")}>
          <img src={customIconSrc} alt="" className={cn("object-contain", prominent ? "w-40 h-40" : "w-36 h-36")} style={{ imageRendering: 'pixelated' }} />
        </div>
      ) : (
        <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity hidden sm:block">
          <Icon className={cn("transform translate-x-4 -translate-y-4 text-primary", prominent ? "w-24 h-24" : "w-20 h-20")} />
        </div>
      )}

      <div className="relative z-10 flex sm:flex-col h-full sm:justify-between items-center sm:items-start gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 sm:mb-3 shrink-0">
          {customIconSrc ? (
            <img src={customIconSrc} alt="" className={cn("object-contain drop-shadow-md shrink-0 w-10 h-10 sm:w-12 sm:h-12", prominent && "sm:w-14 sm:h-14")} style={{ imageRendering: 'pixelated' }} />
          ) : (
            <div className={cn("bg-primary/10 rounded-lg text-primary p-2", prominent && "sm:p-2.5")}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
          <h3 className="font-medium text-muted-foreground uppercase tracking-wider text-[10px] sm:text-xs sm:block hidden">{title}</h3>
        </div>
        
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1 sm:flex-none">
          <h3 className="font-medium text-muted-foreground uppercase tracking-wider text-[10px] sm:hidden">{title}</h3>
          <div className={cn(
            "font-bold tracking-tight text-xl sm:text-2xl md:text-3xl",
            prominent && "sm:text-3xl md:text-4xl",
            valueColor || "text-white"
          )}>
            {value}
          </div>
          {subtitle && (
            <div className="text-[10px] sm:text-xs text-muted-foreground" data-testid={`stat-subtitle-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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
