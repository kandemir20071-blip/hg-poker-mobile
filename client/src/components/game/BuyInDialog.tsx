import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAddTransaction } from "@/hooks/use-transactions";
import { DollarSign, Wallet, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuyInDialogProps {
  sessionId: number;
  playerId: number;
  trigger?: React.ReactNode;
  defaultAmount?: number;
}

export function BuyInDialog({ sessionId, playerId, trigger, defaultAmount = 100 }: BuyInDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [method, setMethod] = useState<"cash" | "digital">("cash");
  
  const { mutate, isPending } = useAddTransaction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      sessionId,
      data: {
        playerId,
        amount: Number(amount),
        type: "buy_in",
        paymentMethod: method,
      }
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90">Buy In</Button>}
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-center text-primary">Add Chips</DialogTitle>
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
                  className="pl-10 text-xl font-mono bg-background/50 border-white/10 h-14"
                  placeholder="0.00"
                  required
                  min="1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Payment Method</Label>
              <RadioGroup value={method} onValueChange={(v: "cash" | "digital") => setMethod(v)} className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                  <Label
                    htmlFor="cash"
                    className={cn(
                      "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all",
                      method === "cash" && "border-primary bg-primary/5"
                    )}
                  >
                    <Wallet className="mb-3 h-6 w-6" />
                    Cash
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="digital" id="digital" className="peer sr-only" />
                  <Label
                    htmlFor="digital"
                    className={cn(
                      "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all",
                      method === "digital" && "border-primary bg-primary/5"
                    )}
                  >
                    <CreditCard className="mb-3 h-6 w-6" />
                    Digital
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-lg font-bold bg-gold-gradient text-black hover:opacity-90 shadow-lg shadow-primary/20"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Confirm Buy-In"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
