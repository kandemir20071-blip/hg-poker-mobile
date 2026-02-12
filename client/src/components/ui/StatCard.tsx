import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl p-6 border border-white/5 shadow-lg relative overflow-hidden group hover:border-primary/20 transition-all duration-300",
      className
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-24 h-24 transform translate-x-4 -translate-y-4 text-primary" />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
            {value}
          </div>
          {trend && (
            <div className={cn("text-xs font-medium flex items-center gap-1", 
              trendUp ? "text-green-500" : "text-destructive"
            )}>
              <span>{trend}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
