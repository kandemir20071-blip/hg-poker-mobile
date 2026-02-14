import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddTransaction } from "@/hooks/use-transactions";
import { DollarSign, Loader2 } from "lucide-react";

interface BuyInDialogProps {
  sessionId: number;
  playerId: number;
  trigger?: React.ReactNode;
  defaultAmount?: number;
  isReBuy?: boolean;
}

export function BuyInDialog({ sessionId, playerId, trigger, defaultAmount = 100, isReBuy = false }: BuyInDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount.toString());

  const { mutate, isPending } = useAddTransaction();

  const label = isReBuy ? "Re-Buy" : "Buy-In";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      sessionId,
      data: {
        playerId,
        amount: Number(amount),
        type: "buy_in",
      }
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="w-full font-semibold" data-testid="button-buy-in">{label}</Button>}
      </DialogTrigger>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">{isReBuy ? "Re-Buy" : "Add Chips"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="amount" className="text-muted-foreground">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 text-xl font-mono bg-background/50 border-white/[0.08] h-14"
                  placeholder="0.00"
                  required
                  min="1"
                  autoFocus
                  data-testid="input-buy-in-amount"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rounded-full font-semibold"
            disabled={isPending}
            data-testid="button-confirm-buy-in"
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : `Confirm ${label}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
