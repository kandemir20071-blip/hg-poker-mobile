import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, PlusCircle, Upload, Layers } from "lucide-react";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/[0.06] bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <Link href="/">
          <span className="font-bold text-lg text-white cursor-pointer flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            HG Poker
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">{user.firstName}</span>
          <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-mobile-logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.06] bg-card/30 p-6 fixed h-full z-40">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">HG Poker</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tracker</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <Link href="/">
            <Button
              variant={isActive("/") ? "secondary" : "ghost"}
              className="w-full justify-start gap-3"
              data-testid="nav-dashboard"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
          <Link href="/join">
            <Button
              variant={isActive("/join") ? "secondary" : "ghost"}
              className="w-full justify-start gap-3"
              data-testid="nav-join"
            >
              <PlusCircle className="h-4 w-4" /> Join Game
            </Button>
          </Link>
          <Link href="/import">
            <Button
              variant={isActive("/import") ? "secondary" : "ghost"}
              className="w-full justify-start gap-3"
              data-testid="nav-import"
            >
              <Upload className="h-4 w-4" /> Import Data
            </Button>
          </Link>
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

      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-white/[0.06] flex justify-around p-2 z-50 pb-safe">
        <Link href="/">
          <div className={`flex flex-col items-center p-2 rounded-lg ${isActive("/") ? "text-primary" : "text-muted-foreground"}`} data-testid="mobile-nav-home">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1">Home</span>
          </div>
        </Link>
        <Link href="/join">
          <div className={`flex flex-col items-center p-2 rounded-lg ${isActive("/join") ? "text-primary" : "text-muted-foreground"}`} data-testid="mobile-nav-join">
            <PlusCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1">Join</span>
          </div>
        </Link>
        <Link href="/import">
          <div className={`flex flex-col items-center p-2 rounded-lg ${isActive("/import") ? "text-primary" : "text-muted-foreground"}`} data-testid="mobile-nav-import">
            <Upload className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1">Import</span>
          </div>
        </Link>
        <div onClick={() => logout()} className="flex flex-col items-center p-2 rounded-lg text-muted-foreground active:text-destructive" data-testid="mobile-nav-exit">
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-1">Exit</span>
        </div>
      </nav>
    </div>
  );
}
