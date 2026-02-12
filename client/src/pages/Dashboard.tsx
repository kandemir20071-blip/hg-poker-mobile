import { useAuth } from "@/hooks/use-auth";
import { useStats } from "@/hooks/use-stats";
import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Coins, Trophy, TrendingUp, History, Play, Loader2, ArrowRight, Upload } from "lucide-react";
import { SuitAccent, SuitsLoader, SuitsRow } from "@/components/ui/Suits";
import { Link, useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats } = useStats();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { mutate: createSession, isPending: isCreating } = useCreateSession();
  const [, setLocation] = useLocation();

  const handleCreateSession = (type: "cash" | "tournament") => {
    createSession({ type }, {
      onSuccess: (session) => {
        setLocation(`/session/${session.id}`);
      }
    });
  };

  const activeSessions = sessions?.filter(s => s.status === 'active') || [];
  const recentSessions = sessions?.filter(s => s.status === 'completed').slice(0, 5) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3" data-testid="text-dashboard-title">
            Dashboard
            <SuitsRow size={10} className="text-muted-foreground/25" />
          </h2>
          <p className="text-muted-foreground">Welcome back, {user?.firstName}.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full font-semibold glow-emerald" data-testid="button-new-session">
              <Play className="mr-2 h-5 w-5" /> Start New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Select Game Type</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button 
                onClick={() => handleCreateSession('cash')}
                disabled={isCreating}
                className="flex flex-col items-center justify-center p-8 rounded-xl bg-background/50 border border-white/[0.08] hover:border-primary/40 hover:bg-primary/5 transition-all group disabled:opacity-50 relative overflow-hidden"
                data-testid="button-cash-game"
              >
                <div className="absolute top-2 right-2"><SuitAccent suit="diamond" size={16} /></div>
                <Coins className="w-12 h-12 text-primary mb-4 group-hover:scale-105 transition-transform" />
                <h3 className="font-bold text-lg text-white">Cash Game</h3>
                <p className="text-xs text-muted-foreground text-center mt-2">Flexible buy-ins, cash out anytime.</p>
              </button>
              
              <button 
                onClick={() => handleCreateSession('tournament')}
                disabled={isCreating}
                className="flex flex-col items-center justify-center p-8 rounded-xl bg-background/50 border border-white/[0.08] hover:border-primary/40 hover:bg-primary/5 transition-all group disabled:opacity-50 relative overflow-hidden"
                data-testid="button-tournament"
              >
                <div className="absolute top-2 right-2"><SuitAccent suit="spade" size={16} /></div>
                <Trophy className="w-12 h-12 text-primary mb-4 group-hover:scale-105 transition-transform" />
                <h3 className="font-bold text-lg text-white">Tournament</h3>
                <p className="text-xs text-muted-foreground text-center mt-2">Fixed buy-in, blinds increase, last one standing.</p>
              </button>
            </div>
            {isCreating && (
              <div className="flex justify-center mt-4">
                <SuitsLoader />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total Profit" 
          value={`$${stats?.totalProfit || 0}`} 
          icon={Coins} 
          trend={stats?.roi ? `${stats.roi}% ROI` : undefined}
          trendUp={(stats?.roi || 0) > 0}
        />
        <StatCard 
          title="Games Played" 
          value={stats?.totalGames || 0} 
          icon={History} 
        />
        <StatCard 
          title="League Rank" 
          value="#1" 
          icon={Trophy} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl p-6" data-testid="chart-bankroll">
            <h3 className="font-bold text-base mb-6 flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-primary" /> Bankroll History
            </h3>
            <div className="h-[300px] w-full">
              {stats?.bankrollHistory && stats.bankrollHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.bankrollHistory}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      stroke="#475569" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsla(222, 47%, 14%, 0.9)', 
                        border: '1px solid rgba(255,255,255,0.08)', 
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                      }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-lg gap-3">
                  <p>No stats recorded yet</p>
                  <Link href="/import">
                    <Button variant="outline" size="sm" data-testid="button-import-from-chart">
                      <Upload className="mr-2 h-4 w-4" /> Import Game History
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {activeSessions.length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden border-primary/20">
              <div className="p-4 border-b border-white/[0.06]">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-pulse" /> Live Now
                </h3>
              </div>
              <div className="p-3 space-y-2">
                {activeSessions.map(session => (
                  <Link key={session.id} href={`/session/${session.id}`}>
                    <div className="rounded-lg p-4 border border-white/[0.06] hover:border-primary/30 transition-colors cursor-pointer group bg-background/40" data-testid={`card-session-${session.id}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white capitalize">{session.type} Game</span>
                        <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Started {format(new Date(session.startTime), 'h:mm a')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card rounded-xl p-5">
            <h3 className="font-bold text-base mb-4 text-white">Recent Games</h3>
            <div className="space-y-2">
              {recentSessions.length > 0 ? recentSessions.map(session => (
                <Link key={session.id} href={`/session/${session.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer" data-testid={`card-recent-${session.id}`}>
                    <div>
                      <div className="font-medium text-white capitalize">{session.type}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(session.startTime), 'MMM d, yyyy')}</div>
                    </div>
                  </div>
                </Link>
              )) : (
                <p className="text-sm text-muted-foreground">No recent games found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
