import { SessionPlayer, Transaction } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Crown, TrendingUp, DollarSign, LogOut, Loader2 } from "lucide-react";
import { BuyInDialog } from "./BuyInDialog";
import { ManagePlayerDialog } from "./ManagePlayerDialog";
import { useCashOutPlayer } from "@/hooks/use-transactions";
import { useState } from "react";

interface ExtendedPlayer extends SessionPlayer {
  totalBuyIn: number;
  totalCashOut: number;
  netProfit: number;
}

interface PlayerListProps {
  players: ExtendedPlayer[];
  hostId: string;
  sessionId: number;
  currentUserId?: string;
  adminMode?: boolean;
  transactions?: Transaction[];
  isActive?: boolean;
}

function CashOutDialog({ sessionId, player }: { sessionId: number; player: ExtendedPlayer }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(player.totalBuyIn.toString());
  const { mutate: cashOut, isPending } = useCashOutPlayer();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (val < 0 || val >= 100000) return;
    cashOut({ sessionId, playerId: player.id, amount: val }, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs border-amber-500/30 text-amber-400 min-h-[44px]" data-testid={`button-cashout-player-${player.id}`}>
          <LogOut className="w-3 h-3" /> Cash Out
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cash Out {player.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Total Buy-in: <span className="text-white font-mono font-bold">${player.totalBuyIn}</span>
          </div>
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Final Amount</Label>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={() => setAmount("0")} className={`min-h-[44px] ${amount === "0" ? "border-primary text-primary" : ""}`} data-testid={`button-busto-${player.id}`}>
                Busto ($0)
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAmount(player.totalBuyIn.toString())} className={`min-h-[44px] ${amount === player.totalBuyIn.toString() ? "border-primary text-primary" : ""}`} data-testid={`button-even-${player.id}`}>
                Even (${player.totalBuyIn})
              </Button>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-xl font-mono bg-background/50 border-white/[0.08] h-14"
                required
                min="0"
                max="99999"
                autoFocus
                data-testid={`input-cashout-amount-${player.id}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="min-h-[44px]" disabled={isPending} data-testid={`button-confirm-cashout-${player.id}`}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Cash Out
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlayerCard({ player, isHost, isCurrentUser, adminMode, sessionId, transactions, isActive }: {
  player: ExtendedPlayer;
  isHost: boolean;
  isCurrentUser: boolean;
  adminMode?: boolean;
  sessionId: number;
  transactions: Transaction[];
  isActive?: boolean;
}) {
  const profit = player.netProfit;
  const isWinning = profit > 0;
  const isEven = profit === 0;
  const isCashedOut = player.status === 'cashed_out';
  const hasBuyIn = transactions.some(t => t.playerId === player.id && t.type === 'buy_in' && t.status === 'approved');

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border p-4 transition-all
        ${isCashedOut ? 'opacity-60' : ''}
        ${isCurrentUser && !isCashedOut ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-card border-white/5'}
      `}
      data-testid={`card-player-${player.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="h-12 w-12 border-2 border-white/10 shrink-0">
            <AvatarFallback className="bg-background text-primary font-bold">
              {player.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-lg text-white truncate">{player.name}</h4>
              {isHost && <Crown className="h-3 w-3 text-primary fill-current shrink-0" />}
              {isCurrentUser && <Badge variant="secondary" className="text-[10px] h-5">YOU</Badge>}
              {!player.userId && adminMode && <Badge variant="outline" className="text-[10px] h-5">MANUAL</Badge>}
              {isCashedOut && <Badge variant="outline" className="text-[10px] h-5 border-amber-500/30 text-amber-400">LEFT</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-primary" /> Buy-in: ${player.totalBuyIn}
              </span>
              {(player.totalCashOut > 0 || isCashedOut) && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-emerald-500" /> Cash-out: ${player.totalCashOut}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className={`text-xl font-mono font-bold ${isWinning ? 'text-emerald-500' : isEven ? 'text-muted-foreground' : 'text-red-500'}`}>
              {profit > 0 ? '+' : ''}${profit}
            </div>
          </div>

          {adminMode && !isCashedOut && isActive && (
            <CashOutDialog sessionId={sessionId} player={player} />
          )}

          {adminMode && (
            <ManagePlayerDialog
              sessionId={sessionId}
              playerId={player.id}
              playerName={player.name}
              transactions={transactions}
            />
          )}

          {!adminMode && isCurrentUser && player.status === 'active' && (
            <BuyInDialog
              sessionId={sessionId}
              playerId={player.id}
              isReBuy={hasBuyIn}
              trigger={
                <Button size="sm" variant="outline" className="text-xs border-primary/30 text-primary min-h-[44px]" data-testid={`button-rebuy-${player.id}`}>
                  {hasBuyIn ? 'Re-Buy' : 'Add Chips'}
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 h-1 rounded-bl-xl w-full ${
        isCashedOut ? 'bg-amber-500 opacity-40' :
        player.status === 'active' ? 'bg-emerald-500' : 'bg-muted opacity-30'
      }`} />
    </div>
  );
}

export function PlayerList({ players, hostId, sessionId, currentUserId, adminMode, transactions = [], isActive = true }: PlayerListProps) {
  const activePlayers = players.filter(p => p.status !== 'cashed_out');
  const finishedPlayers = players.filter(p => p.status === 'cashed_out');

  const sortedActive = [...activePlayers].sort((a, b) => b.netProfit - a.netProfit);
  const sortedFinished = [...finishedPlayers].sort((a, b) => b.netProfit - a.netProfit);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {sortedActive.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isHost={player.userId === hostId}
            isCurrentUser={player.userId === currentUserId}
            adminMode={adminMode}
            sessionId={sessionId}
            transactions={transactions}
            isActive={isActive}
          />
        ))}

        {activePlayers.length === 0 && finishedPlayers.length === 0 && (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
            <p className="text-muted-foreground">Waiting for players to join...</p>
          </div>
        )}
      </div>

      {sortedFinished.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Finished Players</h3>
          <div className="space-y-3">
            {sortedFinished.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isHost={player.userId === hostId}
                isCurrentUser={player.userId === currentUserId}
                adminMode={adminMode}
                sessionId={sessionId}
                transactions={transactions}
                isActive={isActive}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
