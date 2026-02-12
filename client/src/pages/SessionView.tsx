import { useParams, useLocation } from "wouter";
import { useSession, useEndSession } from "@/hooks/use-sessions";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateTransactionStatus } from "@/hooks/use-transactions";
import { PlayerList } from "@/components/game/PlayerList";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Share2, Copy, AlertTriangle, CheckCircle, XCircle, LogOut } from "lucide-react";
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p>Loading table data...</p>
      </div>
    );
  }

  const { session, players, transactions } = data;
  const isHost = session.hostId === user?.id;
  const isActive = session.status === 'active';
  
  // Calculations
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card rounded-xl p-6 border border-white/5 shadow-lg">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-bold text-white capitalize">{session.type} Game</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {session.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Started {format(new Date(session.startTime), 'h:mm a')} • Code: 
            <span className="font-mono text-primary font-bold">{session.code}</span>
            <button onClick={handleCopyCode} className="hover:text-white"><Copy className="w-3 h-3" /></button>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-center">
              <DialogHeader>
                <DialogTitle>Join Code</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG value={session.code} size={180} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground text-sm">Scan or enter code to join</p>
                  <div className="text-4xl font-mono font-bold text-primary tracking-widest">{session.code}</div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {isHost && isActive && (
            <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <LogOut className="w-4 h-4" /> End Session
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10">
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
        {/* Main Content: Player List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-white">Players</h2>
            <div className="bg-card px-4 py-2 rounded-lg border border-white/5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">Total Pot</span>
              <span className="text-xl font-mono font-bold text-primary">${totalInPlay}</span>
            </div>
          </div>
          
          <PlayerList 
            players={players} 
            hostId={session.hostId} 
            sessionId={sessionId} 
            currentUserId={user?.id}
          />
        </div>

        {/* Sidebar: Activity / Approval Queue */}
        <div className="space-y-6">
          {/* Approval Queue (Host Only) */}
          {isHost && pendingTransactions.length > 0 && (
            <div className="bg-card rounded-xl border border-primary/30 overflow-hidden shadow-lg shadow-primary/5">
              <div className="bg-primary/10 p-4 border-b border-primary/20 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary animate-pulse" />
                <h3 className="font-bold text-primary">Approvals Needed</h3>
              </div>
              <div className="divide-y divide-white/5">
                {pendingTransactions.map(tx => {
                  const player = players.find(p => p.id === tx.playerId);
                  return (
                    <div key={tx.id} className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-white">{player?.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{tx.type.replace('_', ' ')} • {tx.paymentMethod}</p>
                        </div>
                        <div className="text-xl font-mono font-bold text-white">${tx.amount}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => updateTx({ id: tx.id, sessionId, data: { status: 'rejected' } })}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateTx({ id: tx.id, sessionId, data: { status: 'approved' } })}
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

          {/* Recent Activity Stream */}
          <div className="bg-card rounded-xl border border-white/5 p-4">
            <h3 className="font-display font-bold text-lg mb-4 text-white">Ledger</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {transactions
                .filter(t => t.status !== 'pending')
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map(tx => {
                  const player = players.find(p => p.id === tx.playerId);
                  const isBuyIn = tx.type === 'buy_in';
                  return (
                    <div key={tx.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-mono">
                          {format(new Date(tx.timestamp), 'HH:mm')}
                        </span>
                        <span className="font-medium text-white">{player?.name}</span>
                        <span className="text-muted-foreground text-xs">{isBuyIn ? 'bought in' : 'cashed out'}</span>
                      </div>
                      <span className={`font-mono font-bold ${isBuyIn ? 'text-destructive' : 'text-green-500'}`}>
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
