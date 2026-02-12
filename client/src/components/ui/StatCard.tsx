import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, subtitle, className }: StatCardProps) {
  return (
    <div className={cn(
      "glass-card rounded-xl p-5 relative overflow-hidden group hover:border-primary/20 transition-all duration-300",
      className
    )} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
        <Icon className="w-20 h-20 transform translate-x-4 -translate-y-4 text-primary" />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</h3>
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
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
