import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  customIconSrc?: string;
  customIconBgClass?: string;
  customIconSize?: string;
  landscapeIcon?: boolean;
  cinematicIcon?: boolean;
  trend?: string;
  trendUp?: boolean;
  subtitle?: React.ReactNode;
  prominent?: boolean;
  valueColor?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, customIconSrc, customIconBgClass, customIconSize, landscapeIcon, cinematicIcon, trend, trendUp, subtitle, prominent, valueColor, className }: StatCardProps) {
  return (
    <div className={cn(
      "glass-card rounded-xl relative overflow-hidden group hover:border-primary/20 transition-all duration-300",
      prominent ? "p-4 sm:p-6 border-primary/10" : "p-3 sm:p-5",
      customIconSrc && "pr-24 sm:pr-5",
      className
    )} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {customIconSrc ? (
        cinematicIcon ? (
          <img
            src={customIconSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none transition-all duration-700 ease-out group-hover:drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : landscapeIcon ? (
          <img
            src={customIconSrc}
            alt=""
            className="absolute right-0 top-0 h-full w-auto object-contain opacity-60 pointer-events-none transition-all duration-700 ease-out group-hover:opacity-80 group-hover:drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
        <div className="absolute top-1/2 -translate-y-1/2 right-4 transition-all duration-700 ease-out opacity-[0.45] group-hover:opacity-[0.7] sm:opacity-[0.35] sm:group-hover:opacity-[0.6] group-hover:drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]">
          <img src={customIconSrc} alt="" className={cn("object-contain", customIconSize || "w-20 h-20 sm:w-28 sm:h-28")} style={{ imageRendering: 'pixelated' }} />
        </div>
        )
      ) : (
        <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity hidden sm:block">
          <Icon className={cn("transform translate-x-4 -translate-y-4 text-primary", prominent ? "w-24 h-24" : "w-20 h-20")} />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-3">
          {!customIconSrc && (
            <div className={cn("bg-primary/10 rounded-lg text-primary p-2", prominent && "sm:p-2.5")}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
          <h3 className="font-medium text-muted-foreground uppercase tracking-wider text-[10px] sm:text-xs">{title}</h3>
        </div>

        <div className="space-y-0.5 sm:space-y-1">
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
