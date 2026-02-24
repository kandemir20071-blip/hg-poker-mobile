import { useState } from "react";
import { ResponsiveModal, ResponsiveModalContent, ResponsiveModalHeader, ResponsiveModalTitle, ResponsiveModalTrigger } from "@/components/ui/responsive-modal";
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

const rebuyPresets = [10, 20, 30, 40, 50];

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
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger asChild>
        {trigger || <Button className="w-full font-semibold" data-testid="button-buy-in">{label}</Button>}
      </ResponsiveModalTrigger>
      <ResponsiveModalContent className="glass-card sm:max-w-md max-h-[90vh] overflow-y-auto">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="text-2xl text-center">{isReBuy ? "Re-Buy" : "Add Chips"}</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            {isReBuy && (
              <div className="grid grid-cols-3 gap-2">
                {rebuyPresets.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={Number(amount) === preset ? "default" : "outline"}
                    className="font-mono text-base min-h-[44px]"
                    onClick={() => setAmount(preset.toString())}
                    data-testid={`button-rebuy-preset-${preset}`}
                  >
                    ${preset}
                  </Button>
                ))}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="amount" className="text-muted-foreground">{isReBuy ? "Custom Amount" : "Amount"}</Label>
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
            className="w-full rounded-full font-semibold min-h-[44px]"
            disabled={isPending}
            data-testid="button-confirm-buy-in"
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : `Confirm ${label}`}
          </Button>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
