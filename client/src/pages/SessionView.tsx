import { useParams, useLocation } from "wouter";
import { useSession, useEndSession } from "@/hooks/use-sessions";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateTransactionStatus } from "@/hooks/use-transactions";
import { PlayerList } from "@/components/game/PlayerList";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Share2, Copy, AlertTriangle, CheckCircle, XCircle, LogOut } from "lucide-react";
import { SuitsLoader, SuitAccent } from "@/components/ui/Suits";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SessionView() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data, isLoading } = useSession(sessionId);
  const { mutate: endSession, isPending: isEnding } = useEndSession();
  const { mutate: updateTx } = useUpdateTransactionStatus();

  const [endDialogOpen, setEndDialogOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground gap-4">
        <SuitsLoader />
        <p>Loading table data...</p>
      </div>
    );
  }

  const { session, players, transactions } = data;
  const isHost = session.hostId === user?.id;
  const isActive = session.status === 'active';
  
  const totalInPlay = players.reduce((sum, p) => sum + p.totalBuyIn, 0);
  const pendingTransactions = transactions.filter(t => t.status === 'pending');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.code);
    toast({ title: "Copied!", description: "Session code copied to clipboard." });
  };

  const handleEndSession = () => {
    endSession({ id: sessionId, data: {} }, {
      onSuccess: () => {
        setEndDialogOpen(false);
        setLocation('/dashboard');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="glass-card rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white capitalize flex items-center gap-2" data-testid="text-session-title">
              <SuitAccent suit={session.type === 'cash' ? 'diamond' : 'spade'} size={16} className="text-primary opacity-40" />
              {session.type} Game
            </h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`} data-testid="badge-session-status">
              {session.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Started {format(new Date(session.startTime), 'h:mm a')} 
            <span className="font-mono text-primary font-bold">{session.code}</span>
            <button onClick={handleCopyCode} className="hover:text-white" data-testid="button-copy-code"><Copy className="w-3 h-3" /></button>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-share">
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card text-center">
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

          {isHost && isActive && (
            <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2" data-testid="button-end-session">
                  <LogOut className="w-4 h-4" /> End Session
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card">
                <DialogHeader>
                  <DialogTitle>End Session?</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive">
                    <AlertTriangle className="h-6 w-6 shrink-0" />
                    <p className="text-sm">This will calculate final stats and lock the session. Ensure all cash-outs are recorded!</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total Chips in Play: <span className="text-white font-mono font-bold">${totalInPlay}</span>
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setEndDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleEndSession} disabled={isEnding}>
                    {isEnding ? <Loader2 className="animate-spin mr-2" /> : "Confirm End"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Players</h2>
            <div className="glass-card px-4 py-2 rounded-lg">
              <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">Total Pot</span>
              <span className="text-xl font-mono font-bold text-primary" data-testid="text-total-pot">${totalInPlay}</span>
            </div>
          </div>
          
          <PlayerList 
            players={players} 
            hostId={session.hostId} 
            sessionId={sessionId} 
            currentUserId={user?.id}
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
                      <div className="flex justify-between items-start">
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
                          className="text-destructive"
                          onClick={() => updateTx({ id: tx.id, sessionId, data: { status: 'rejected' } })}
                          data-testid={`button-reject-${tx.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                        <Button 
                          size="sm" 
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
                  return (
                    <div key={tx.id} className="flex items-center justify-between text-sm py-1" data-testid={`ledger-entry-${tx.id}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-mono">
                          {format(new Date(tx.timestamp), 'HH:mm')}
                        </span>
                        <span className="font-medium text-white">{player?.name}</span>
                        <span className="text-muted-foreground text-xs">{isBuyIn ? 'bought in' : 'cashed out'}</span>
                      </div>
                      <span className={`font-mono font-bold ${isBuyIn ? 'text-destructive' : 'text-emerald-400'}`}>
                        {isBuyIn ? '-' : '+'}${tx.amount}
                      </span>
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
    </div>
  );
}
