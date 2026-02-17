import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, PlusCircle, Upload, User } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const isActive = (path: string) => location === path;

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Home", testId: "nav-home" },
    { path: "/join", icon: PlusCircle, label: "Join", testId: "nav-join" },
    { path: "/import", icon: Upload, label: "Import", testId: "nav-import" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.06] bg-card/30 p-6 fixed h-full z-40">
        <div className="mb-10 flex items-center gap-3">
          <Logo className="w-12 h-12" />
          <div>
            <h1 className="text-lg font-bold text-white leading-none">HG Poker</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tracker</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive(item.path) ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                data-testid={`desktop-${item.testId}`}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Button>
            </Link>
          ))}
          <div className="mt-8 pt-8 border-t border-white/[0.06]">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Account</h3>
            <div className="flex items-center gap-3 px-4 py-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                {user.firstName?.[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-destructive border-destructive/20"
              onClick={() => logout()}
              data-testid="button-desktop-logout"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 md:ml-64 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 md:p-8 pb-bottom-nav md:pb-8">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50" data-testid="bottom-nav">
        <div className="glass-card border-t border-white/[0.08] backdrop-blur-xl">
          <div className="flex justify-around items-center px-2 pt-2 pb-safe">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <button
                  className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] rounded-xl transition-colors ${
                    isActive(item.path)
                      ? "text-primary"
                      : "text-muted-foreground active:text-white"
                  }`}
                  data-testid={`mobile-${item.testId}`}
                >
                  <item.icon className={`h-5 w-5 ${isActive(item.path) ? "drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" : ""}`} />
                  <span className="text-[10px] font-medium mt-1">{item.label}</span>
                </button>
              </Link>
            ))}
            <button
              onClick={() => logout()}
              className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] rounded-xl text-muted-foreground active:text-destructive transition-colors"
              data-testid="mobile-nav-exit"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-1">Exit</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
