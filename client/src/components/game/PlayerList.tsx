import { SessionPlayer, Transaction } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Crown, TrendingUp, DollarSign } from "lucide-react";
import { BuyInDialog } from "./BuyInDialog";
import { ManagePlayerDialog } from "./ManagePlayerDialog";
import { Button } from "@/components/ui/button";

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
}

export function PlayerList({ players, hostId, sessionId, currentUserId, adminMode, transactions = [] }: PlayerListProps) {
  const sortedPlayers = [...players].sort((a, b) => b.netProfit - a.netProfit);

  return (
    <div className="space-y-4">
      {sortedPlayers.map((player) => {
        const isHost = player.userId === hostId;
        const isCurrentUser = player.userId === currentUserId;
        const profit = player.netProfit;
        const isWinning = profit > 0;
        const isEven = profit === 0;

        return (
          <div 
            key={player.id} 
            className={`
              relative overflow-hidden rounded-xl border p-4 transition-all
              ${isCurrentUser ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-card border-white/5'}
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
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-primary" /> Buy-in: ${player.totalBuyIn}
                    </span>
                    {player.totalCashOut > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-green-500" /> Cash-out: ${player.totalCashOut}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className={`text-xl font-mono font-bold ${isWinning ? 'text-green-500' : isEven ? 'text-muted-foreground' : 'text-destructive'}`}>
                    {profit > 0 ? '+' : ''}{profit}
                  </div>
                </div>

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
                    trigger={
                      <Button size="sm" variant="outline" className="text-xs border-primary/30 text-primary">
                        Add Chips
                      </Button>
                    } 
                  />
                )}
              </div>
            </div>
            
            <div className={`absolute bottom-0 left-0 h-1 rounded-bl-xl ${player.status === 'active' ? 'bg-green-500 w-full' : 'bg-muted w-full opacity-30'}`} />
          </div>
        );
      })}

      {players.length === 0 && (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <p className="text-muted-foreground">Waiting for players to join...</p>
        </div>
      )}
    </div>
  );
}
