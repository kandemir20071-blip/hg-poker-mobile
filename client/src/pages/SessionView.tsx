import { useParams, useLocation } from "wouter";
import { useSession, useEndSession, useBustPlayer, useCustomChop } from "@/hooks/use-sessions";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateTransactionStatus, useUpdateTransaction, useDeleteTransaction, useAddTransaction } from "@/hooks/use-transactions";
import { PlayerList } from "@/components/game/PlayerList";
import { AddPlayerDialog } from "@/components/game/AddPlayerDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";
import { Loader2, Share2, Copy, AlertTriangle, CheckCircle, XCircle, LogOut, Shield, Pencil, Trash2, Trophy, Calendar, Clock, Skull, RefreshCw, DollarSign } from "lucide-react";
import { SuitsLoader, SuitAccent } from "@/components/ui/Suits";
import { BlindClock } from "@/components/game/BlindClock";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TournamentConfig } from "@shared/schema";

export default function SessionView() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const forceAdmin = urlParams.get('admin') === 'true';
  
  const { data, isLoading } = useSession(sessionId);
  const { mutate: endSession, isPending: isEnding } = useEndSession();
  const { mutate: updateTx } = useUpdateTransactionStatus();
  const { mutate: editTx } = useUpdateTransaction();
  const { mutate: deleteTx } = useDeleteTransaction();
  const { mutate: bustPlayer, isPending: isBusting } = useBustPlayer();
  const { mutate: addTransaction, isPending: isAddingTx } = useAddTransaction();
  const { mutate: applyCustomChop, isPending: isApplyingChop } = useCustomChop();

  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [finishTournamentOpen, setFinishTournamentOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(forceAdmin);
  const [editingLedgerId, setEditingLedgerId] = useState<number | null>(null);
  const [editLedgerAmount, setEditLedgerAmount] = useState("");
  const [customChopOpen, setCustomChopOpen] = useState(false);
  const [customPayouts, setCustomPayouts] = useState<Record<number, string>>({});

  const players = data?.players ?? [];
  const rankedPlayers = useMemo(() => {
    return [...players]
      .map(p => ({
        ...p,
        netProfit: p.totalCashOut - p.totalBuyIn,
      }))
      .sort((a, b) => b.netProfit - a.netProfit);
  }, [players]);

  const session = data?.session;
  const txList = data?.transactions ?? [];
  const tournamentConfig = session?.type === 'tournament' ? session.config as TournamentConfig | null : null;
  const appliedChop = useMemo(() => {
    if (!tournamentConfig?.customPayouts) return null;
    const result: Record<number, number> = {};
    Object.entries(tournamentConfig.customPayouts).forEach(([id, val]) => {
      result[Number(id)] = val;
    });
    return result;
  }, [tournamentConfig?.customPayouts]);

  if (isLoading || !data || !session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground gap-4">
        <SuitsLoader />
        <p>Loading table data...</p>
      </div>
    );
  }

  const transactions = txList;
  const isHost = session.hostId === user?.id;
  const isActive = session.status === 'active';
  const isCompleted = session.status === 'completed';
  const isImported = !!(session.config && (session.config as Record<string, unknown>).source === 'import');
  const showSummary = isCompleted;

  const totalWagered = players.reduce((sum, p) => sum + p.totalBuyIn, 0);
  const totalCashedOut = players.reduce((sum, p) => sum + p.totalCashOut, 0);
  const chipsInPlay = totalWagered - totalCashedOut;
  const pendingTransactions = transactions.filter(t => t.status === 'pending');

  const tournamentActivePlayers = players.filter(p => p.status === 'active');
  const tournamentEliminatedPlayers = [...players.filter(p => p.status === 'busted')]
    .sort((a, b) => (b.tournamentPlace ?? 0) - (a.tournamentPlace ?? 0));

  const tournamentResultPlayers = [...players]
    .sort((a, b) => (a.tournamentPlace ?? 999) - (b.tournamentPlace ?? 999));

  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.code);
    toast({ title: "Copied!", description: "Session code copied to clipboard." });
  };

  const handleEndSession = () => {
    endSession({ id: sessionId, data: {} }, {
      onSuccess: () => {
        setEndDialogOpen(false);
      }
    });
  };

  const handleLedgerEdit = (txId: number) => {
    if (editLedgerAmount && Number(editLedgerAmount) > 0) {
      editTx({ id: txId, sessionId, data: { amount: Number(editLedgerAmount) } }, {
        onSuccess: () => {
          setEditingLedgerId(null);
          setEditLedgerAmount("");
        }
      });
    }
  };

  const handleLedgerDelete = (txId: number) => {
    deleteTx({ id: txId, sessionId });
  };

  const handleRebuy = (playerId: number) => {
    const amount = session.defaultBuyIn ?? 0;
    if (amount <= 0) return;
    addTransaction({ sessionId, data: { playerId, type: 'buy_in', amount } });
  };

  const handleBust = (playerId: number) => {
    bustPlayer({ sessionId, playerId });
  };

  const initCustomPayouts = () => {
    const payouts: Record<number, string> = {};
    tournamentResultPlayers.forEach((player) => {
      const place = player.tournamentPlace ?? 999;
      const pct = tournamentConfig?.payoutStructure?.percentages?.[place - 1] ?? 0;
      const payout = Math.round(totalWagered * pct / 100);
      payouts[player.id] = String(payout);
    });
    setCustomPayouts(payouts);
    setCustomChopOpen(true);
  };

  const initFinishTournament = () => {
    const payouts: Record<number, string> = {};
    const allSorted = [...players].sort((a, b) => (a.tournamentPlace ?? 999) - (b.tournamentPlace ?? 999));
    allSorted.forEach((player) => {
      const place = player.tournamentPlace ?? 999;
      const pct = tournamentConfig?.payoutStructure?.percentages?.[place - 1] ?? 0;
      const payout = Math.round(totalWagered * pct / 100);
      payouts[player.id] = String(payout);
    });
    setCustomPayouts(payouts);
    setFinishTournamentOpen(true);
  };

  const handleFinishTournament = () => {
    const applied: Record<number, number> = {};
    Object.entries(customPayouts).forEach(([id, val]) => {
      applied[Number(id)] = Number(val) || 0;
    });
    applyCustomChop({ sessionId, payouts: applied }, {
      onSuccess: () => {
        endSession({ id: sessionId, data: {} }, {
          onSuccess: () => {
            setFinishTournamentOpen(false);
          }
        });
      }
    });
  };

  const customPayoutTotal = Object.values(customPayouts).reduce((sum, v) => sum + (Number(v) || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="glass-card rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-white capitalize flex items-center gap-2" data-testid="text-session-title">
              <SuitAccent suit={session.type === 'cash' ? 'diamond' : 'spade'} size={16} className="text-primary opacity-40" />
              {session.type} Game
            </h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`} data-testid="badge-session-status">
              {session.status}
            </span>
            {isImported && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-500/20 text-blue-400" data-testid="badge-imported">
                Imported
              </span>
            )}
            {adminMode && !isImported && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-400" data-testid="badge-admin-mode">
                Admin Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5" data-testid="text-session-date">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(session.startTime), 'dd.MM.yyyy')}
            </span>
            <span className="flex items-center gap-1.5" data-testid="text-session-time-range">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(session.startTime), 'HH:mm')}
              {session.endTime && ` - ${format(new Date(session.endTime), 'HH:mm')}`}
            </span>
            {isCompleted && (
              <span className="flex items-center gap-1.5" data-testid="text-time-played">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                {(() => {
                  if (!session.endTime) return 'Duration Unknown';
                  const ms = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
                  if (ms <= 0) return 'Duration Unknown';
                  const totalMinutes = Math.round(ms / 60000);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
                  if (hours > 0) return `${hours}h`;
                  return `${minutes}m`;
                })()}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-primary font-bold">{session.code}</span>
              <button onClick={handleCopyCode} className="hover:text-white" data-testid="button-copy-code"><Copy className="w-3 h-3" /></button>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isHost && !isImported && isActive && (
            <Button
              variant={adminMode ? "default" : "outline"}
              size="sm"
              className="gap-2 min-h-[44px]"
              onClick={() => setAdminMode(!adminMode)}
              data-testid="button-toggle-admin"
            >
              <Shield className="w-4 h-4" /> {adminMode ? "Admin On" : "Admin Mode"}
            </Button>
          )}

          {!showSummary && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-h-[44px]" data-testid="button-share">
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card text-center max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Join Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-6 py-4">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeSVG value={session.code} size={180} />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground text-sm">Scan or enter code to join</p>
                    <div className="text-4xl font-mono font-bold text-primary tracking-widest" data-testid="text-session-code">{session.code}</div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {isHost && isActive && session.type === 'cash' && (
            <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2 min-h-[44px]" data-testid="button-end-session">
                  <LogOut className="w-4 h-4" /> End Session
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>End Session?</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive">
                    <AlertTriangle className="h-6 w-6 shrink-0" />
                    <p className="text-sm">This will calculate final stats and lock the session. Ensure all cash-outs are recorded!</p>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Total Wagered: <span className="text-white font-mono font-bold">${totalWagered}</span></p>
                    <p>Chips in Play: <span className="text-primary font-mono font-bold">${chipsInPlay}</span></p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" className="min-h-[44px]" onClick={() => setEndDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" className="min-h-[44px]" onClick={handleEndSession} disabled={isEnding}>
                    {isEnding ? <Loader2 className="animate-spin mr-2" /> : "Confirm End"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {showSummary ? (
        session.type === 'tournament' ? (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-8 text-center" data-testid="tournament-complete-header">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h2 className="text-2xl font-bold text-white">Tournament Complete</h2>
                {appliedChop && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-400" data-testid="badge-custom-chop">Custom Chop</span>
                )}
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total Prize Pool</p>
              <p className="text-6xl font-bold font-mono text-primary mb-4" data-testid="text-tournament-prize-pool">${totalWagered}</p>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5" data-testid="text-summary-players-count">
                  <Trophy className="w-3.5 h-3.5" /> {players.length} players
                </span>
                <span className="flex items-center gap-1.5" data-testid="text-summary-duration">
                  <Clock className="w-3.5 h-3.5" />
                  {(() => {
                    if (!session.endTime) return 'Duration Unknown';
                    const ms = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
                    if (ms <= 0) return 'Duration Unknown';
                    const totalMinutes = Math.round(ms / 60000);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
                    if (hours > 0) return `${hours}h`;
                    return `${minutes}m`;
                  })()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(session.startTime), 'dd.MM.yyyy')}
                </span>
              </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.06]">
                <h3 className="font-bold text-base text-white">Final Standings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap" data-testid="table-tournament-results">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-xs text-muted-foreground uppercase tracking-wider px-4 py-3 w-12">Place</th>
                      <th className="text-left text-xs text-muted-foreground uppercase tracking-wider px-4 py-3">Player</th>
                      <th className="text-right text-xs text-muted-foreground uppercase tracking-wider px-4 py-3">Buy-in</th>
                      <th className="text-right text-xs text-muted-foreground uppercase tracking-wider px-4 py-3">Payout</th>
                      <th className="text-right text-xs text-muted-foreground uppercase tracking-wider px-4 py-3">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {tournamentResultPlayers.map((player) => {
                      const place = player.tournamentPlace ?? '-';
                      const payout = player.totalCashOut;
                      const net = payout - player.totalBuyIn;
                      return (
                        <tr key={player.id} className="hover-elevate" data-testid={`row-tournament-result-${player.id}`}>
                          <td className="px-4 py-3 text-sm font-mono text-muted-foreground" data-testid={`text-tournament-place-${player.id}`}>
                            {place === 1 ? (
                              <Trophy className="w-4 h-4 text-amber-400 inline" />
                            ) : (
                              `#${place}`
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-white" data-testid={`text-tournament-player-${player.id}`}>{player.name}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold text-red-400" data-testid={`text-tournament-buyin-${player.id}`}>
                            -${player.totalBuyIn}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold text-emerald-400" data-testid={`text-tournament-payout-${player.id}`}>
                            {payout > 0 ? `+$${payout}` : '$0'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold" data-testid={`text-tournament-net-${player.id}`}>
                            <span className={net > 0 ? 'text-emerald-500' : net < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                              {net > 0 ? '+' : ''}${net}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-center gap-3 flex-wrap">
              <Button variant="outline" className="gap-2 min-h-[44px]" onClick={() => setLocation('/dashboard')} data-testid="button-back-to-dashboard">
                <LogOut className="w-4 h-4" /> Back to Dashboard
              </Button>
              {isHost && (
                <Dialog open={customChopOpen} onOpenChange={setCustomChopOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 min-h-[44px]" onClick={initCustomPayouts} data-testid="button-custom-chop">
                      <RefreshCw className="w-4 h-4" /> Adjust Payouts
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl text-center">Custom Chop</DialogTitle>
                    </DialogHeader>
                    <p className="text-xs text-muted-foreground text-center">Override the automatic payouts. The total must equal the prize pool (${totalWagered}).</p>
                    <div className="space-y-3 mt-2">
                      {tournamentResultPlayers.map((player) => {
                        const place = player.tournamentPlace ?? '-';
                        return (
                          <div key={player.id} className="flex items-center gap-3">
                            <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">#{place}</span>
                            <span className="text-sm font-medium text-white flex-1 truncate" data-testid={`text-chop-player-${player.id}`}>{player.name}</span>
                            <div className="relative w-28 shrink-0">
                              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                type="number"
                                value={customPayouts[player.id] ?? '0'}
                                onChange={(e) => setCustomPayouts(prev => ({ ...prev, [player.id]: e.target.value }))}
                                className="pl-7 bg-background/50 border-white/[0.08] min-h-[44px] text-base font-mono"
                                min="0"
                                data-testid={`input-chop-payout-${player.id}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`text-sm text-center font-mono font-bold mt-2 ${customPayoutTotal === totalWagered ? 'text-emerald-400' : 'text-red-400'}`} data-testid="text-chop-total">
                      Total: ${customPayoutTotal} / ${totalWagered} {customPayoutTotal === totalWagered ? '(valid)' : `(${customPayoutTotal > totalWagered ? 'over' : 'under'} by $${Math.abs(customPayoutTotal - totalWagered)})`}
                    </div>
                    <DialogFooter className="mt-2">
                      <Button variant="ghost" className="min-h-[44px]" onClick={() => setCustomChopOpen(false)} data-testid="button-chop-cancel">
                        Cancel
                      </Button>
                      <Button
                        className="glow-emerald min-h-[44px]"
                        disabled={customPayoutTotal !== totalWagered || isApplyingChop}
                        onClick={() => {
                          const applied: Record<number, number> = {};
                          Object.entries(customPayouts).forEach(([id, val]) => {
                            applied[Number(id)] = Number(val) || 0;
                          });
                          applyCustomChop({ sessionId, payouts: applied }, {
                            onSuccess: () => {
                              setCustomChopOpen(false);
                            }
                          });
                        }}
                        data-testid="button-chop-apply"
                      >
                        {isApplyingChop ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply Chop'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> Post-Game Summary
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="glass-card px-4 py-2 rounded-lg">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">Total Wagered</span>
                  <span className="text-xl font-mono font-bold text-muted-foreground" data-testid="text-summary-wagered">${totalWagered}</span>
                </div>
                <div className="glass-card px-4 py-2 rounded-lg">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">Players</span>
                  <span className="text-xl font-mono font-bold text-muted-foreground" data-testid="text-summary-players">{players.length}</span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap" data-testid="table-post-game-summary">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-xs text-muted-foreground uppercase tracking-wider px-4 py-3 w-12">#</th>
                      <th className="text-left text-xs text-muted-foreground uppercase tracking-wider px-4 py-3">Player</th>
                      <th className="text-right text-xs text-muted-foreground uppercase tracking-wider px-4 py-3">Buy-In</th>
                      <th className="text-right text-xs text-muted-foreground uppercase tracking-wider px-4 py-3">Cash-Out</th>
                      <th className="text-right text-xs text-muted-foreground uppercase tracking-wider px-4 py-3">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {rankedPlayers.map((player, index) => (
                      <tr key={player.id} className="hover-elevate" data-testid={`row-summary-player-${player.id}`}>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground" data-testid={`text-rank-${player.id}`}>
                          {index === 0 && rankedPlayers.length > 1 ? (
                            <Trophy className="w-4 h-4 text-amber-400 inline" />
                          ) : (
                            index + 1
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-white" data-testid={`text-player-name-${player.id}`}>{player.name}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground" data-testid={`text-buyin-${player.id}`}>
                          ${player.totalBuyIn}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground" data-testid={`text-cashout-${player.id}`}>
                          ${player.totalCashOut}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold" data-testid={`text-profit-${player.id}`}>
                          <span className={player.netProfit > 0 ? 'text-emerald-500' : player.netProfit < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                            {player.netProfit > 0 ? '+' : ''}{player.netProfit === 0 ? '' : ''}${player.netProfit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : (
        session.type === 'tournament' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card rounded-xl p-6 text-center" data-testid="tournament-prize-pool">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Prize Pool</p>
                <p className="text-5xl font-bold font-mono text-primary" data-testid="text-live-prize-pool">${totalWagered}</p>
                <div className="flex items-center justify-center gap-6 mt-3 text-sm text-muted-foreground">
                  <span data-testid="text-players-remaining">{tournamentActivePlayers.length} remaining</span>
                  {tournamentConfig?.allowRebuys && <span data-testid="text-rebuys-enabled">Re-buys enabled</span>}
                </div>
                {isHost && isActive && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-4 gap-2 min-h-[44px]"
                    onClick={initFinishTournament}
                    data-testid="button-finish-tournament"
                  >
                    <Trophy className="w-4 h-4" /> Finish Game
                  </Button>
                )}
              </div>

              {tournamentConfig?.blindTimer?.enabled && (
                <BlindClock
                  levelDurationMinutes={tournamentConfig.blindTimer.levelDurationMinutes}
                  startingBigBlind={tournamentConfig.blindTimer.startingBigBlind}
                />
              )}

              <div>
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <h3 className="text-lg font-bold text-white" data-testid="text-active-players-heading">Active Players ({tournamentActivePlayers.length})</h3>
                  {adminMode && (
                    <AddPlayerDialog
                      sessionId={sessionId}
                      leagueId={session.leagueId}
                      existingPlayerNames={players.map(p => p.name)}
                    />
                  )}
                </div>
                <div className="space-y-3">
                  {tournamentActivePlayers.map(player => (
                    <div
                      key={player.id}
                      className="glass-card rounded-xl p-4 flex items-center justify-between gap-3"
                      data-testid={`card-tournament-player-${player.id}`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white text-lg truncate" data-testid={`text-active-player-name-${player.id}`}>{player.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Buy-in: <span className="font-mono font-bold text-white">${player.totalBuyIn}</span></p>
                      </div>
                      {adminMode && (
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {tournamentConfig?.allowRebuys && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 min-h-[44px] border-primary/30 text-primary"
                              onClick={() => handleRebuy(player.id)}
                              disabled={isAddingTx}
                              data-testid={`button-rebuy-${player.id}`}
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Re-buy
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1.5 min-h-[44px]"
                            onClick={() => handleBust(player.id)}
                            disabled={isBusting}
                            data-testid={`button-bust-${player.id}`}
                          >
                            <Skull className="w-3.5 h-3.5" /> Bust
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {tournamentActivePlayers.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                      <p className="text-muted-foreground">No active players remaining.</p>
                    </div>
                  )}
                </div>
              </div>

              {tournamentEliminatedPlayers.length > 0 && (
                <div data-testid="tournament-eliminated-section">
                  <h3 className="text-lg font-bold text-white mb-4" data-testid="text-eliminated-heading">Eliminated ({tournamentEliminatedPlayers.length})</h3>
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="divide-y divide-white/[0.04]">
                      {tournamentEliminatedPlayers.map(player => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                          data-testid={`row-eliminated-${player.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-mono font-bold text-muted-foreground w-8 shrink-0" data-testid={`text-eliminated-place-${player.id}`}>
                              #{player.tournamentPlace}
                            </span>
                            <span className="font-medium text-white truncate" data-testid={`text-eliminated-name-${player.id}`}>{player.name}</span>
                          </div>
                          <span className="text-xs text-red-400 font-bold uppercase shrink-0" data-testid={`text-eliminated-status-${player.id}`}>Busted</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {isHost && pendingTransactions.length > 0 && (
                <div className="glass-card rounded-xl overflow-hidden border-primary/20">
                  <div className="bg-primary/10 p-4 border-b border-primary/20 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-primary animate-pulse" />
                    <h3 className="font-bold text-primary">Approvals Needed</h3>
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {pendingTransactions.map(tx => {
                      const player = players.find(p => p.id === tx.playerId);
                      return (
                        <div key={tx.id} className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-bold text-white">{player?.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{tx.type.replace('_', ' ')}</p>
                            </div>
                            <div className="text-xl font-mono font-bold text-white">${tx.amount}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive min-h-[44px]"
                              onClick={() => updateTx({ id: tx.id, sessionId, data: { status: 'rejected' } })}
                              data-testid={`button-reject-${tx.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button 
                              size="sm" 
                              className="min-h-[44px]"
                              onClick={() => updateTx({ id: tx.id, sessionId, data: { status: 'approved' } })}
                              data-testid={`button-approve-${tx.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="glass-card rounded-xl p-4">
                <h3 className="font-bold text-base mb-4 text-white">Ledger</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {transactions
                    .filter(t => t.status !== 'pending')
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map(tx => {
                      const player = players.find(p => p.id === tx.playerId);
                      const isBuyIn = tx.type === 'buy_in';
                      const isEditingThis = editingLedgerId === tx.id;

                      let actionLabel = 'cashed out';
                      if (isBuyIn) {
                        const playerBuyIns = transactions
                          .filter(t => t.playerId === tx.playerId && t.type === 'buy_in' && t.status !== 'pending')
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        const buyInIndex = playerBuyIns.findIndex(t => t.id === tx.id);
                        actionLabel = buyInIndex > 0 ? 're-bought' : 'bought in';
                      }

                      return (
                        <div key={tx.id} className="flex items-center justify-between gap-2 text-sm py-1" data-testid={`ledger-entry-${tx.id}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground text-xs font-mono shrink-0">
                              {format(new Date(tx.timestamp), 'HH:mm')}
                            </span>
                            <span className="font-medium text-white truncate">{player?.name}</span>
                            <span className="text-muted-foreground text-xs shrink-0">{actionLabel}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={editLedgerAmount}
                                  onChange={(e) => setEditLedgerAmount(e.target.value)}
                                  className="w-20 bg-background/50 border border-white/[0.08] rounded px-2 py-0.5 text-xs font-mono text-white"
                                  autoFocus
                                  data-testid={`input-ledger-edit-${tx.id}`}
                                />
                                <Button size="icon" variant="ghost" onClick={() => handleLedgerEdit(tx.id)} data-testid={`button-ledger-save-${tx.id}`}>
                                  <CheckCircle className="w-3 h-3 text-primary" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => { setEditingLedgerId(null); setEditLedgerAmount(""); }} data-testid={`button-ledger-cancel-${tx.id}`}>
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className={`font-mono font-bold ${isBuyIn ? 'text-destructive' : 'text-emerald-400'}`}>
                                  {isBuyIn ? '-' : '+'}${tx.amount}
                                </span>
                                {adminMode && (
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="opacity-50"
                                      onClick={() => { setEditingLedgerId(tx.id); setEditLedgerAmount(tx.amount.toString()); }}
                                      data-testid={`button-ledger-edit-${tx.id}`}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="opacity-50 text-destructive"
                                      onClick={() => handleLedgerDelete(tx.id)}
                                      data-testid={`button-ledger-delete-${tx.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {transactions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No transactions yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-xl font-bold text-white">Players</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {adminMode && (
                    <AddPlayerDialog
                      sessionId={sessionId}
                      leagueId={session.leagueId}
                      existingPlayerNames={players.map(p => p.name)}
                    />
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="glass-card px-4 py-2 rounded-lg">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">Wagered</span>
                      <span className="text-xl font-mono font-bold text-muted-foreground" data-testid="text-total-wagered">${totalWagered}</span>
                    </div>
                    <div className="glass-card px-4 py-2 rounded-lg">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">In Play</span>
                      <span className="text-xl font-mono font-bold text-primary" data-testid="text-chips-in-play">${chipsInPlay}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <PlayerList 
                players={players} 
                hostId={session.hostId} 
                sessionId={sessionId} 
                currentUserId={user?.id}
                adminMode={adminMode}
                transactions={transactions}
                isActive={isActive}
              />
            </div>

            <div className="space-y-6">
              {isHost && pendingTransactions.length > 0 && (
                <div className="glass-card rounded-xl overflow-hidden border-primary/20">
                  <div className="bg-primary/10 p-4 border-b border-primary/20 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-primary animate-pulse" />
                    <h3 className="font-bold text-primary">Approvals Needed</h3>
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {pendingTransactions.map(tx => {
                      const player = players.find(p => p.id === tx.playerId);
                      return (
                        <div key={tx.id} className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-bold text-white">{player?.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{tx.type.replace('_', ' ')}</p>
                            </div>
                            <div className="text-xl font-mono font-bold text-white">${tx.amount}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive min-h-[44px]"
                              onClick={() => updateTx({ id: tx.id, sessionId, data: { status: 'rejected' } })}
                              data-testid={`button-reject-${tx.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button 
                              size="sm" 
                              className="min-h-[44px]"
                              onClick={() => updateTx({ id: tx.id, sessionId, data: { status: 'approved' } })}
                              data-testid={`button-approve-${tx.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="glass-card rounded-xl p-4">
                <h3 className="font-bold text-base mb-4 text-white">Ledger</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {transactions
                    .filter(t => t.status !== 'pending')
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map(tx => {
                      const player = players.find(p => p.id === tx.playerId);
                      const isBuyIn = tx.type === 'buy_in';
                      const isEditingThis = editingLedgerId === tx.id;

                      let actionLabel = 'cashed out';
                      if (isBuyIn) {
                        const playerBuyIns = transactions
                          .filter(t => t.playerId === tx.playerId && t.type === 'buy_in' && t.status !== 'pending')
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        const buyInIndex = playerBuyIns.findIndex(t => t.id === tx.id);
                        actionLabel = buyInIndex > 0 ? 're-bought' : 'bought in';
                      }

                      return (
                        <div key={tx.id} className="flex items-center justify-between gap-2 text-sm py-1" data-testid={`ledger-entry-${tx.id}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground text-xs font-mono shrink-0">
                              {format(new Date(tx.timestamp), 'HH:mm')}
                            </span>
                            <span className="font-medium text-white truncate">{player?.name}</span>
                            <span className="text-muted-foreground text-xs shrink-0">{actionLabel}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={editLedgerAmount}
                                  onChange={(e) => setEditLedgerAmount(e.target.value)}
                                  className="w-20 bg-background/50 border border-white/[0.08] rounded px-2 py-0.5 text-xs font-mono text-white"
                                  autoFocus
                                  data-testid={`input-ledger-edit-${tx.id}`}
                                />
                                <Button size="icon" variant="ghost" onClick={() => handleLedgerEdit(tx.id)} data-testid={`button-ledger-save-${tx.id}`}>
                                  <CheckCircle className="w-3 h-3 text-primary" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => { setEditingLedgerId(null); setEditLedgerAmount(""); }} data-testid={`button-ledger-cancel-${tx.id}`}>
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className={`font-mono font-bold ${isBuyIn ? 'text-destructive' : 'text-emerald-400'}`}>
                                  {isBuyIn ? '-' : '+'}${tx.amount}
                                </span>
                                {adminMode && (
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="opacity-50"
                                      onClick={() => { setEditingLedgerId(tx.id); setEditLedgerAmount(tx.amount.toString()); }}
                                      data-testid={`button-ledger-edit-${tx.id}`}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="opacity-50 text-destructive"
                                      onClick={() => handleLedgerDelete(tx.id)}
                                      data-testid={`button-ledger-delete-${tx.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {transactions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No transactions yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      <Dialog open={finishTournamentOpen} onOpenChange={setFinishTournamentOpen}>
        <DialogContent className="glass-card sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-center flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Payout Settlement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Prize Pool</p>
              <p className="text-3xl font-bold font-mono text-primary">${totalWagered}</p>
            </div>

            <div className="flex items-center gap-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-xs">Review payouts below. You can adjust amounts for a custom chop before concluding.</p>
            </div>

            <div className="space-y-2">
              {[...players].sort((a, b) => (a.tournamentPlace ?? 999) - (b.tournamentPlace ?? 999)).map((player) => {
                const place = player.tournamentPlace ?? '-';
                return (
                  <div key={player.id} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">#{place}</span>
                    <span className="text-sm font-medium text-white flex-1 truncate" data-testid={`text-finish-player-${player.id}`}>{player.name}</span>
                    <div className="relative w-28 shrink-0">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={customPayouts[player.id] ?? '0'}
                        onChange={(e) => setCustomPayouts(prev => ({ ...prev, [player.id]: e.target.value }))}
                        className="pl-7 bg-background/50 border-white/[0.08] min-h-[44px] text-base font-mono"
                        min="0"
                        data-testid={`input-finish-payout-${player.id}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`text-sm text-center font-mono font-bold ${customPayoutTotal === totalWagered ? 'text-emerald-400' : 'text-red-400'}`} data-testid="text-finish-payout-total">
              Total: ${customPayoutTotal} / ${totalWagered} {customPayoutTotal === totalWagered ? '(valid)' : `(${customPayoutTotal > totalWagered ? 'over' : 'under'} by $${Math.abs(customPayoutTotal - totalWagered)})`}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" className="min-h-[44px]" onClick={() => setFinishTournamentOpen(false)} data-testid="button-finish-cancel">
              Cancel
            </Button>
            <Button
              className="glow-emerald min-h-[44px] gap-2"
              disabled={customPayoutTotal !== totalWagered || isApplyingChop || isEnding}
              onClick={handleFinishTournament}
              data-testid="button-confirm-conclude"
            >
              {(isApplyingChop || isEnding) ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Confirm Payouts & Conclude</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
