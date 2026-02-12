import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddTransaction, useUpdateTransaction, useDeleteTransaction } from "@/hooks/use-transactions";
import { Settings, Plus, Pencil, Trash2, DollarSign, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import type { Transaction } from "@shared/schema";
import { format } from "date-fns";

interface ManagePlayerDialogProps {
  sessionId: number;
  playerId: number;
  playerName: string;
  transactions: Transaction[];
  trigger?: React.ReactNode;
}

export function ManagePlayerDialog({ sessionId, playerId, playerName, transactions, trigger }: ManagePlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"buy_in" | "cash_out">("buy_in");
  const [method, setMethod] = useState<"cash" | "digital">("cash");

  const { mutate: addTx, isPending: isAdding } = useAddTransaction();
  const { mutate: updateTx, isPending: isUpdating } = useUpdateTransaction();
  const { mutate: deleteTx, isPending: isDeleting } = useDeleteTransaction();

  const playerTxs = transactions
    .filter(t => t.playerId === playerId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalBuyIn = playerTxs.filter(t => t.type === 'buy_in' && t.status === 'approved').reduce((s, t) => s + t.amount, 0);
  const totalCashOut = playerTxs.filter(t => t.type === 'cash_out' && t.status === 'approved').reduce((s, t) => s + t.amount, 0);
  const net = totalCashOut - totalBuyIn;

  const resetForm = () => {
    setAmount("");
    setType("buy_in");
    setMethod("cash");
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addTx({ sessionId, data: { playerId, amount: Number(amount), type, paymentMethod: method } }, {
      onSuccess: resetForm
    });
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setAmount(tx.amount.toString());
    setType(tx.type as "buy_in" | "cash_out");
    setMethod(tx.paymentMethod as "cash" | "digital");
    setShowAddForm(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) return;
    updateTx({ id: editingId, sessionId, data: { amount: Number(amount), type, paymentMethod: method } }, {
      onSuccess: resetForm
    });
  };

  const handleDelete = (txId: number) => {
    deleteTx({ id: txId, sessionId }, {
      onSuccess: () => {
        if (editingId === txId) resetForm();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" data-testid={`button-manage-player-${playerId}`}>
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-card sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Manage {playerName}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 px-1 py-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-primary" /> In: <span className="text-white font-mono">${totalBuyIn}</span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingDown className="w-3 h-3 text-emerald-400" /> Out: <span className="text-white font-mono">${totalCashOut}</span>
            </span>
          </div>
          <span className={`font-mono font-bold text-sm ${net > 0 ? 'text-green-500' : net < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {net > 0 ? '+' : ''}{net}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {playerTxs.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No transactions yet.</p>
          )}
          {playerTxs.map(tx => {
            const isBuyIn = tx.type === 'buy_in';
            const isEditing = editingId === tx.id;

            if (isEditing) {
              return (
                <form key={tx.id} onSubmit={handleUpdate} className="border border-primary/30 rounded-lg p-3 space-y-3 bg-primary/5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-8 bg-background/50 border-white/[0.08]"
                          required
                          min="1"
                          data-testid={`input-edit-amount-${tx.id}`}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Select value={type} onValueChange={(v: "buy_in" | "cash_out") => setType(v)}>
                        <SelectTrigger className="bg-background/50 border-white/[0.08]" data-testid={`select-edit-type-${tx.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy_in">Buy-in</SelectItem>
                          <SelectItem value="cash_out">Cash-out</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={resetForm} data-testid={`button-cancel-edit-${tx.id}`}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={isUpdating} data-testid={`button-save-edit-${tx.id}`}>
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </form>
              );
            }

            return (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3 group" data-testid={`manage-tx-${tx.id}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isBuyIn ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {isBuyIn ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{isBuyIn ? 'Buy-in' : 'Cash-out'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.timestamp), 'h:mm a')} · {tx.paymentMethod} · {tx.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold ${isBuyIn ? 'text-destructive' : 'text-emerald-400'}`}>
                    {isBuyIn ? '-' : '+'}${tx.amount}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-50"
                      onClick={() => handleEdit(tx)}
                      data-testid={`button-edit-tx-${tx.id}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-50 text-destructive"
                      onClick={() => handleDelete(tx.id)}
                      disabled={isDeleting}
                      data-testid={`button-delete-tx-${tx.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showAddForm ? (
          <form onSubmit={handleAdd} className="border-t border-white/[0.06] pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 bg-background/50 border-white/[0.08]"
                    required
                    min="1"
                    autoFocus
                    data-testid="input-new-tx-amount"
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={(v: "buy_in" | "cash_out") => setType(v)}>
                  <SelectTrigger className="bg-background/50 border-white/[0.08]" data-testid="select-new-tx-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy_in">Buy-in</SelectItem>
                    <SelectItem value="cash_out">Cash-out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <Select value={method} onValueChange={(v: "cash" | "digital") => setMethod(v)}>
                <SelectTrigger className="bg-background/50 border-white/[0.08]" data-testid="select-new-tx-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm} data-testid="button-cancel-new-tx">Cancel</Button>
              <Button type="submit" size="sm" disabled={isAdding} data-testid="button-confirm-new-tx">
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Entry"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="border-t border-white/[0.06] pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => { resetForm(); setShowAddForm(true); }}
              data-testid="button-add-transaction"
            >
              <Plus className="w-4 h-4" /> Add Transaction
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
