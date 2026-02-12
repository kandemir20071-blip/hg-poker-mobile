import { useAuth } from "@/hooks/use-auth";
import { useStats } from "@/hooks/use-stats";
import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Coins, Trophy, TrendingUp, History, Play, Plus, Loader2, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
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
          <h2 className="text-3xl font-display font-bold text-white">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {user?.firstName}.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-primary text-black font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Play className="mr-2 h-5 w-5" /> Start New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-center text-primary">Select Game Type</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button 
                onClick={() => handleCreateSession('cash')}
                disabled={isCreating}
                className="flex flex-col items-center justify-center p-8 rounded-xl bg-background/50 border-2 border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all group disabled:opacity-50"
              >
                <Coins className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg text-white">Cash Game</h3>
                <p className="text-xs text-muted-foreground text-center mt-2">Flexible buy-ins, cash out anytime.</p>
              </button>
              
              <button 
                onClick={() => handleCreateSession('tournament')}
                disabled={isCreating}
                className="flex flex-col items-center justify-center p-8 rounded-xl bg-background/50 border-2 border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all group disabled:opacity-50"
              >
                <Trophy className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg text-white">Tournament</h3>
                <p className="text-xs text-muted-foreground text-center mt-2">Fixed buy-in, blinds increase, last one standing.</p>
              </button>
            </div>
            {isCreating && (
              <div className="flex justify-center mt-4">
                <Loader2 className="animate-spin text-primary" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          className="border-primary/20 bg-gradient-to-br from-card to-primary/5"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl p-6 border border-white/5 shadow-lg">
            <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Bankroll History
            </h3>
            <div className="h-[300px] w-full">
              {stats?.bankrollHistory && stats.bankrollHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.bankrollHistory}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FFD700" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      stroke="#666" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis 
                      stroke="#666" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1d1d21', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="#FFD700" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-lg">
                  No stats recorded yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Active/Recent Sessions */}
        <div className="space-y-6">
          {activeSessions.length > 0 && (
            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
              <h3 className="font-display font-bold text-lg text-primary mb-4 flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-green-500 block" /> Live Now
              </h3>
              <div className="space-y-3">
                {activeSessions.map(session => (
                  <Link key={session.id} href={`/session/${session.id}`}>
                    <div className="bg-background/80 rounded-lg p-4 border border-primary/10 hover:border-primary/50 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white capitalize">{session.type} Game</span>
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

          <div className="bg-card rounded-xl p-6 border border-white/5">
            <h3 className="font-display font-bold text-lg mb-4 text-white">Recent Games</h3>
            <div className="space-y-3">
              {recentSessions.length > 0 ? recentSessions.map(session => (
                <Link key={session.id} href={`/session/${session.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                    <div>
                      <div className="font-medium text-white capitalize">{session.type}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(session.startTime), 'MMM d, yyyy')}</div>
                    </div>
                    {/* Placeholder for session profit if we computed it */}
                    {/* <div className="font-mono text-sm text-green-500">+$120</div> */}
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
