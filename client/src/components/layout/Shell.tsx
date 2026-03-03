import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLeagues } from "@/hooks/use-leagues";
import { useActiveGames } from "@/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, PlusCircle, Upload, Radio, Gem } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import diamondToadProSrc from "@assets/image-removebg-preview-19_1772575880656.png";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data: leagues } = useLeagues(!!user);
  const { data: activeGames } = useActiveGames(!!user);

  if (!user) return <>{children}</>;

  const isAdminOfAny = (leagues || []).some((l: any) => l.creatorId === user?.id);
  const isActive = (path: string) => location === path;

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Home", testId: "nav-home" },
    { path: "/join", icon: PlusCircle, label: "Join", testId: "nav-join" },
    ...(isAdminOfAny ? [{ path: "/import", icon: Upload, label: "Import", testId: "nav-import" }] : []),
  ];

  const liveGames = activeGames ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.06] bg-card/30 p-6 fixed h-full z-40">
        <div className="mb-10 flex items-center gap-3">
          {user.subscriptionTier === 'pro' ? (
            <div className="relative w-12 h-12 shrink-0">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-lg" />
              <img
                src={diamondToadProSrc}
                alt="Diamond Toad Pro"
                className="relative w-full h-full object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                data-testid="img-diamond-toad-logo"
              />
            </div>
          ) : (
            <Logo className="w-12 h-12" />
          )}
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

          {liveGames.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-4">Live Games</h3>
              {liveGames.map((game) => (
                <Link key={game.session.id} href={`/session/${game.session.id}`}>
                  <Button
                    variant={isActive(`/session/${game.session.id}`) ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3 text-emerald-400"
                    data-testid={`desktop-nav-live-game-${game.session.id}`}
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="truncate text-sm">
                      <span className="font-semibold">Live:</span>
                      <span className="ml-1">{game.leagueName}</span>
                    </span>
                  </Button>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-white/[0.06]">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Account</h3>
            <div className="flex items-center gap-3 px-4 py-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                {user.firstName?.[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  {user.firstName} {user.lastName}
                  {user.subscriptionTier === 'pro' && (
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20" data-testid="badge-pro">
                      PRO
                    </span>
                  )}
                </p>
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

      <header className="md:hidden sticky top-0 z-40 glass-card border-b border-white/[0.08] backdrop-blur-xl" data-testid="mobile-header">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            {user.subscriptionTier === 'pro' ? (
              <div className="relative w-10 h-10 shrink-0">
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-lg" />
                <img
                  src={diamondToadProSrc}
                  alt="Diamond Toad Pro"
                  className="relative w-full h-full object-contain drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  data-testid="mobile-header-mascot"
                />
              </div>
            ) : (
              <Logo className="w-8 h-8" />
            )}
            <span className="text-sm font-bold text-white leading-none">HG Poker</span>
          </div>
          <div className="flex items-center gap-2.5">
            {user.subscriptionTier === 'pro' ? (
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20" data-testid="mobile-header-pro">
                PRO
              </span>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs">
                {user.firstName?.[0] || user.email?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

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
                  className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] rounded-xl transition-colors relative ${
                    isActive(item.path)
                      ? "text-primary"
                      : "text-muted-foreground active:text-white"
                  }`}
                  data-testid={`mobile-${item.testId}`}
                >
                  <item.icon className={`h-5 w-5 ${isActive(item.path) ? "drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" : ""}`} />
                  <span className="text-[10px] font-medium mt-1">{item.label}</span>
                  {item.path === "/dashboard" && user.subscriptionTier === 'pro' && (
                    <span className="absolute -top-0.5 right-1 inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-400 bg-emerald-500/15 px-1 py-px rounded-full border border-emerald-500/20" data-testid="mobile-badge-pro">
                      <Gem className="w-2 h-2" />
                    </span>
                  )}
                </button>
              </Link>
            ))}
            {liveGames.length > 0 && (
              <Link href={`/session/${liveGames[0].session.id}`}>
                <button
                  className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] rounded-xl transition-colors relative ${
                    liveGames.some(g => isActive(`/session/${g.session.id}`))
                      ? "text-emerald-400"
                      : "text-emerald-400/70 active:text-emerald-300"
                  }`}
                  data-testid="mobile-nav-live-game"
                >
                  <span className="relative">
                    <Radio className={`h-5 w-5 ${liveGames.some(g => isActive(`/session/${g.session.id}`)) ? "drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" : ""}`} />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  </span>
                  <span className="text-[10px] font-medium mt-1">Live</span>
                </button>
              </Link>
            )}
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
