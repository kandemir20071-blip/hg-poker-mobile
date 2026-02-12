import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStats } from "@/hooks/use-stats";
import { useCreateSession, useDeleteSession } from "@/hooks/use-sessions";
import { useLeagues, useLeague, useLeagueStats, useLeagueSessions, usePersonalStats, useCreateLeague, useJoinLeague, useClaimPlayer, useMigrateToLeague } from "@/hooks/use-leagues";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Trophy, TrendingUp, History, Play, Loader2, ArrowRight, Upload, Pencil, Trash2, AlertTriangle, Users, Plus, LogIn, User, Shield, Copy, Check } from "lucide-react";
import { SuitAccent, SuitsLoader, SuitsRow } from "@/components/ui/Suits";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { PlayerProfitChart } from "@/components/PlayerProfitChart";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Tab = "profile" | "leagues";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("leagues");
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const { data: leagues, isLoading: leaguesLoading } = useLeagues();

  const firstLeagueId = leagues?.[0]?.id;
  const currentLeagueId = selectedLeagueId || firstLeagueId || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3" data-testid="text-dashboard-title">
            Dashboard
            <SuitsRow size={10} className="text-muted-foreground/25" />
          </h2>
          <p className="text-muted-foreground">Welcome back, {user?.firstName}.</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-background/50 border border-white/[0.06] w-fit">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-white"
          }`}
          data-testid="tab-profile"
        >
          <User className="h-4 w-4 inline mr-2" />
          My Profile
        </button>
        <button
          onClick={() => setActiveTab("leagues")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "leagues"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-white"
          }`}
          data-testid="tab-leagues"
        >
          <Users className="h-4 w-4 inline mr-2" />
          My Leagues
        </button>
      </div>

      {activeTab === "profile" ? (
        <ProfileTab />
      ) : (
        <LeaguesTab
          leagues={leagues || []}
          leaguesLoading={leaguesLoading}
          selectedLeagueId={currentLeagueId}
          onSelectLeague={setSelectedLeagueId}
        />
      )}
    </div>
  );
}

function ProfileTab() {
  const { data: personalStats, isLoading } = usePersonalStats();
  const { data: legacyStats } = useStats();

  const stats = personalStats || legacyStats;
  const bankrollHistory = personalStats?.bankrollHistory || legacyStats?.bankrollHistory || [];
  const recentGames = personalStats?.recentGames || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/[0.08] p-3 text-sm" style={{ backgroundColor: "hsla(222, 47%, 14%, 0.95)", backdropFilter: "blur(12px)" }}>
        <p className="text-muted-foreground text-xs font-medium mb-1">{label ? format(new Date(label), "MMM d, yyyy") : ""}</p>
        <p className="font-semibold" style={{ color: payload[0].value >= 0 ? "#10b981" : "#ef4444" }}>
          {payload[0].value >= 0 ? "+" : ""}${payload[0].value}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Profit" value={`$${stats?.totalProfit || 0}`} icon={Coins} trend={stats?.roi ? `${stats.roi}% ROI` : undefined} trendUp={(stats?.roi || 0) > 0} />
        <StatCard title="Games Played" value={stats?.totalGames || 0} icon={History} />
        <StatCard title="ROI" value={`${stats?.roi || 0}%`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-6" data-testid="chart-personal-bankroll">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-primary" /> Cumulative Profit
            </h3>
            {bankrollHistory.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bankrollHistory}>
                    <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => format(new Date(v), "MMM d")} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-lg">
                <p>Claim your name in a league to see your stats</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-bold text-base mb-4 text-white">Recent Games</h3>
            <div className="space-y-2">
              {recentGames.length > 0 ? recentGames.map((game: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/30" data-testid={`card-personal-game-${i}`}>
                  <div>
                    <div className="text-sm text-white">{game.leagueName}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(game.date), 'MMM d, yyyy')}</div>
                  </div>
                  <span className={`font-semibold tabular-nums ${game.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {game.profit >= 0 ? "+" : ""}${game.profit}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No games yet. Join a league and claim your name to track your stats.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaguesTab({
  leagues,
  leaguesLoading,
  selectedLeagueId,
  onSelectLeague,
}: {
  leagues: any[];
  leaguesLoading: boolean;
  selectedLeagueId: number | null;
  onSelectLeague: (id: number) => void;
}) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  const { mutate: createLeague, isPending: isCreating } = useCreateLeague();
  const { mutate: joinLeague, isPending: isJoining } = useJoinLeague();
  const { mutate: claimPlayer } = useClaimPlayer();
  const { mutate: migrateData, isPending: isMigrating } = useMigrateToLeague();
  const { mutate: createSession, isPending: isCreatingSession } = useCreateSession();
  const { mutate: deleteSession, isPending: isDeleting } = useDeleteSession();

  const { data: leagueStats } = useLeagueStats(selectedLeagueId);
  const { data: legacyStats } = useStats();
  const { data: leagueSessions } = useLeagueSessions(selectedLeagueId);
  const { data: leagueDetail } = useLeague(selectedLeagueId);

  const currentLeague = leagues.find((l: any) => l.id === selectedLeagueId);
  const leagueWithPlayers = leagueDetail || currentLeague;
  const isCreator = currentLeague?.creatorId === user?.id;

  const activeSessions = (leagueSessions || []).filter((s: any) => s.status === 'active');
  const recentSessions = (leagueSessions || []).filter((s: any) => s.status === 'completed').slice(0, 10);

  const hasUnmigratedData = legacyStats?.totalGames > 0 && selectedLeagueId;

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: string; date: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleCreateSession = (type: "cash" | "tournament") => {
    if (!selectedLeagueId) return;
    createSession({ type, leagueId: selectedLeagueId }, {
      onSuccess: (session: any) => setLocation(`/session/${session.id}`),
    });
  };

  const copyInviteCode = () => {
    if (currentLeague?.inviteCode) {
      navigator.clipboard.writeText(currentLeague.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const playerProfitHistory = leagueStats?.playerProfitHistory || legacyStats?.playerProfitHistory || [];

  if (leaguesLoading) {
    return <div className="flex justify-center py-12"><SuitsLoader /></div>;
  }

  if (leagues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="glass-card rounded-xl p-8 max-w-md text-center space-y-4">
          <Users className="h-16 w-16 text-primary mx-auto" />
          <h3 className="text-xl font-bold text-white">No Leagues Yet</h3>
          <p className="text-muted-foreground">Create a league for your poker group or join one with an invite code.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-league">
              <Plus className="mr-2 h-4 w-4" /> Create League
            </Button>
            <Button variant="outline" onClick={() => setShowJoinDialog(true)} data-testid="button-join-league">
              <LogIn className="mr-2 h-4 w-4" /> Join League
            </Button>
          </div>
        </div>
        <CreateLeagueDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} name={newLeagueName} onNameChange={setNewLeagueName} onCreate={() => { createLeague({ name: newLeagueName }, { onSuccess: () => { setShowCreateDialog(false); setNewLeagueName(""); } }); }} isCreating={isCreating} />
        <JoinLeagueDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} code={joinCode} onCodeChange={setJoinCode} onJoin={() => { joinLeague({ inviteCode: joinCode }, { onSuccess: () => { setShowJoinDialog(false); setJoinCode(""); } }); }} isJoining={isJoining} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedLeagueId?.toString() || ""} onValueChange={(v) => onSelectLeague(Number(v))}>
            <SelectTrigger className="w-[220px] bg-background/50 border-white/[0.08]" data-testid="select-league">
              <SelectValue placeholder="Select league" />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((league: any) => (
                <SelectItem key={league.id} value={league.id.toString()}>{league.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => setShowCreateDialog(true)} data-testid="button-create-league-inline">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowJoinDialog(true)} data-testid="button-join-league-inline">
            <LogIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isCreator && currentLeague && (
            <Button variant="outline" size="sm" onClick={copyInviteCode} data-testid="button-copy-invite">
              {copiedCode ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
              {copiedCode ? "Copied" : currentLeague.inviteCode}
            </Button>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button size="default" className="rounded-full font-semibold glow-emerald" data-testid="button-new-session">
                <Play className="mr-2 h-4 w-4" /> New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">Select Game Type</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button onClick={() => handleCreateSession('cash')} disabled={isCreatingSession} className="flex flex-col items-center justify-center p-8 rounded-xl bg-background/50 border border-white/[0.08] hover:border-primary/40 hover:bg-primary/5 transition-all group disabled:opacity-50 relative overflow-hidden" data-testid="button-cash-game">
                  <div className="absolute top-2 right-2"><SuitAccent suit="diamond" size={16} /></div>
                  <Coins className="w-12 h-12 text-primary mb-4 group-hover:scale-105 transition-transform" />
                  <h3 className="font-bold text-lg text-white">Cash Game</h3>
                  <p className="text-xs text-muted-foreground text-center mt-2">Flexible buy-ins, cash out anytime.</p>
                </button>
                <button onClick={() => handleCreateSession('tournament')} disabled={isCreatingSession} className="flex flex-col items-center justify-center p-8 rounded-xl bg-background/50 border border-white/[0.08] hover:border-primary/40 hover:bg-primary/5 transition-all group disabled:opacity-50 relative overflow-hidden" data-testid="button-tournament">
                  <div className="absolute top-2 right-2"><SuitAccent suit="spade" size={16} /></div>
                  <Trophy className="w-12 h-12 text-primary mb-4 group-hover:scale-105 transition-transform" />
                  <h3 className="font-bold text-lg text-white">Tournament</h3>
                  <p className="text-xs text-muted-foreground text-center mt-2">Fixed buy-in, blinds increase, last one standing.</p>
                </button>
              </div>
              {isCreatingSession && <div className="flex justify-center mt-4"><SuitsLoader /></div>}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {hasUnmigratedData && isCreator && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">Import existing data to this league</p>
                <p className="text-xs text-muted-foreground">Move your previously imported game history into this league.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => migrateData(selectedLeagueId!)} disabled={isMigrating} data-testid="button-migrate-data">
              {isMigrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              Migrate Data
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Games Played" value={leagueStats?.totalGames || 0} icon={History} />
        <StatCard title="Total Money Wagered" value={`$${leagueStats?.totalMoneyWagered || 0}`} icon={Coins} />
        <StatCard title="Total Pot" value={`$${leagueStats?.totalPot || 0}`} icon={Trophy} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PlayerProfitChart playerProfitHistory={playerProfitHistory} />
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
                {activeSessions.map((session: any) => (
                  <Link key={session.id} href={`/session/${session.id}`}>
                    <div className="rounded-lg p-4 border border-white/[0.06] hover:border-primary/30 transition-colors cursor-pointer group bg-background/40" data-testid={`card-session-${session.id}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white capitalize">{session.type} Game</span>
                        <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Started {format(new Date(session.startTime), 'h:mm a')}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h3 className="font-bold text-base text-white">Recent Games</h3>
              {selectedLeagueId && (
                <Link href={`/import?leagueId=${selectedLeagueId}`}>
                  <Button variant="outline" size="sm" data-testid="button-import-data">
                    <Upload className="mr-2 h-3.5 w-3.5" /> Import
                  </Button>
                </Link>
              )}
            </div>
            <div className="space-y-2">
              {recentSessions.length > 0 ? recentSessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors group" data-testid={`card-recent-${session.id}`}>
                  <Link href={`/session/${session.id}`} className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium text-white capitalize">{session.type}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(session.startTime), 'MMM d, yyyy')}</div>
                    </div>
                  </Link>
                  {session.hostId === user?.id && (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setLocation(`/session/${session.id}?admin=true`); }} data-testid={`button-edit-session-${session.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: session.id, type: session.type, date: format(new Date(session.startTime), 'MMM d, yyyy') }); }} data-testid={`button-delete-session-${session.id}`}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No games yet. Start a session or import history.</p>
              )}
            </div>
          </div>

          {leagueWithPlayers && (
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h3 className="font-bold text-base text-white">League Info</h3>
                {isCreator && <Shield className="h-4 w-4 text-primary" />}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Players</span>
                  <span className="text-white">{leagueWithPlayers.players?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span className="text-white">{leagueWithPlayers.memberCount || 0}</span>
                </div>
                {isCreator && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invite Code</span>
                    <span className="text-primary font-mono">{leagueWithPlayers.inviteCode}</span>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setShowClaimDialog(true)} data-testid="button-claim-name">
                <User className="mr-2 h-3.5 w-3.5" /> Claim Your Name
              </Button>
            </div>
          )}
        </div>
      </div>

      <CreateLeagueDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} name={newLeagueName} onNameChange={setNewLeagueName} onCreate={() => { createLeague({ name: newLeagueName }, { onSuccess: () => { setShowCreateDialog(false); setNewLeagueName(""); } }); }} isCreating={isCreating} />
      <JoinLeagueDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} code={joinCode} onCodeChange={setJoinCode} onJoin={() => { joinLeague({ inviteCode: joinCode }, { onSuccess: () => { setShowJoinDialog(false); setJoinCode(""); } }); }} isJoining={isJoining} />
      <ClaimNameDialog open={showClaimDialog} onOpenChange={setShowClaimDialog} league={leagueWithPlayers} onClaim={(playerId: number) => { if (selectedLeagueId) claimPlayer({ leagueId: selectedLeagueId, playerId }, { onSuccess: () => setShowClaimDialog(false) }); }} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" /> Delete Session
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will permanently delete the <span className="text-white font-medium capitalize">{deleteTarget?.type}</span> game from <span className="text-white font-medium">{deleteTarget?.date}</span> and all associated transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Type <span className="text-white font-bold">DELETE</span> to confirm:</p>
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" className="bg-background/50 border-white/[0.08]" data-testid="input-delete-confirm" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }} data-testid="button-cancel-delete">Cancel</Button>
              <Button variant="destructive" disabled={deleteConfirmText !== "DELETE" || isDeleting} onClick={() => { if (deleteTarget) deleteSession(deleteTarget.id, { onSuccess: () => { setDeleteTarget(null); setDeleteConfirmText(""); } }); }} data-testid="button-confirm-delete">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateLeagueDialog({ open, onOpenChange, name, onNameChange, onCreate, isCreating }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a League</DialogTitle>
          <DialogDescription>Give your poker group a name. You'll get an invite code to share.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Input value={name} onChange={(e: any) => onNameChange(e.target.value)} placeholder="League name (e.g. Friday Night Poker)" className="bg-background/50 border-white/[0.08]" data-testid="input-league-name" />
          <Button className="w-full" disabled={!name.trim() || isCreating} onClick={onCreate} data-testid="button-confirm-create-league">
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Create League
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JoinLeagueDialog({ open, onOpenChange, code, onCodeChange, onJoin, isJoining }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a League</DialogTitle>
          <DialogDescription>Enter the invite code shared by the league creator.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Input value={code} onChange={(e: any) => onCodeChange(e.target.value.toUpperCase())} placeholder="Enter 6-character code" maxLength={6} className="bg-background/50 border-white/[0.08] text-center font-mono text-lg tracking-widest" data-testid="input-join-code" />
          <Button className="w-full" disabled={code.length < 6 || isJoining} onClick={onJoin} data-testid="button-confirm-join-league">
            {isJoining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
            Join League
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClaimNameDialog({ open, onOpenChange, league, onClaim }: any) {
  const unclaimedPlayers = league?.players?.filter((p: any) => !p.claimedByUserId) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Your Name</DialogTitle>
          <DialogDescription>Select your player name to link it to your account. This lets the app track your personal stats.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto">
          {unclaimedPlayers.length > 0 ? unclaimedPlayers.map((player: any) => (
            <button key={player.id} onClick={() => onClaim(player.id)} className="w-full flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/[0.06] hover:border-primary/40 transition-colors text-left" data-testid={`button-claim-${player.id}`}>
              <span className="text-white font-medium">{player.name}</span>
              <span className="text-xs text-muted-foreground">Claim</span>
            </button>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-4">No unclaimed names available. All player names have been claimed.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
