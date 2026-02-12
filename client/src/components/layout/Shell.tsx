import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, History, UserCircle, PlusCircle } from "lucide-react";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Nav Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <Link href="/">
          <span className="font-display font-bold text-xl text-primary cursor-pointer tracking-wider">HG Poker</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">{user.firstName}</span>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-card/30 p-6 fixed h-full z-40">
        <div className="mb-10">
          <h1 className="font-display text-2xl font-bold text-primary tracking-wider">HG Poker</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Tracker</p>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/">
            <Button variant={isActive("/") ? "secondary" : "ghost"} className="w-full justify-start gap-3">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
          <Link href="/join">
            <Button variant={isActive("/join") ? "secondary" : "ghost"} className="w-full justify-start gap-3">
              <PlusCircle className="h-4 w-4" /> Join Game
            </Button>
          </Link>
          <div className="mt-8 pt-8 border-t border-white/5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Account</h3>
            <div className="flex items-center gap-3 px-4 py-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {user.firstName?.[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start gap-3 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/50 hover:bg-destructive/10" onClick={() => logout()}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-white/5 flex justify-around p-2 z-50 pb-safe">
        <Link href="/">
          <div className={`flex flex-col items-center p-2 rounded-lg ${isActive("/") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-[10px] font-medium mt-1">Home</span>
          </div>
        </Link>
        <Link href="/join">
          <div className={`flex flex-col items-center p-2 rounded-lg ${isActive("/join") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
            <PlusCircle className="h-6 w-6" />
            <span className="text-[10px] font-medium mt-1">Join</span>
          </div>
        </Link>
        <div onClick={() => logout()} className="flex flex-col items-center p-2 rounded-lg text-muted-foreground active:text-destructive active:bg-destructive/10">
          <LogOut className="h-6 w-6" />
          <span className="text-[10px] font-medium mt-1">Exit</span>
        </div>
      </nav>
    </div>
  );
}
