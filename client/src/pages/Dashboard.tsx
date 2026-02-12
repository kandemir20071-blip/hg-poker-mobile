import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStats } from "@/hooks/use-stats";
import { useSessions, useCreateSession, useDeleteSession } from "@/hooks/use-sessions";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Coins, Trophy, TrendingUp, History, Play, Loader2, ArrowRight, Upload, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { SuitAccent, SuitsLoader, SuitsRow } from "@/components/ui/Suits";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { PlayerProfitChart } from "@/components/PlayerProfitChart";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats } = useStats();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { mutate: createSession, isPending: isCreating } = useCreateSession();
  const { mutate: deleteSession, isPending: isDeleting } = useDeleteSession();
  const [, setLocation] = useLocation();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: string; date: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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
          <PlayerProfitChart
            playerProfitHistory={stats?.playerProfitHistory || []}
          />
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
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors group" data-testid={`card-recent-${session.id}`}>
                  <Link href={`/session/${session.id}`} className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium text-white capitalize">{session.type}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(session.startTime), 'MMM d, yyyy')}</div>
                    </div>
                  </Link>
                  {session.hostId === user?.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/session/${session.id}?admin=true`);
                        }}
                        data-testid={`button-edit-session-${session.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({
                            id: session.id,
                            type: session.type,
                            date: format(new Date(session.startTime), 'MMM d, yyyy'),
                          });
                        }}
                        data-testid={`button-delete-session-${session.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No recent games found.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" /> Delete Session
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will permanently delete the{" "}
              <span className="text-white font-medium capitalize">
                {deleteTarget?.type}
              </span>{" "}
              game from{" "}
              <span className="text-white font-medium">
                {deleteTarget?.date}
              </span>{" "}
              and all associated transactions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Type <span className="text-white font-bold">DELETE</span> to confirm:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="bg-background/50 border-white/[0.08]"
                data-testid="input-delete-confirm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText("");
                }}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                onClick={() => {
                  if (deleteTarget) {
                    deleteSession(deleteTarget.id, {
                      onSuccess: () => {
                        setDeleteTarget(null);
                        setDeleteConfirmText("");
                      },
                    });
                  }
                }}
                data-testid="button-confirm-delete"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
