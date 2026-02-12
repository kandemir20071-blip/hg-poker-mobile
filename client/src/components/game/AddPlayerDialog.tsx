import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddPlayerManually } from "@/hooks/use-sessions";
import { UserPlus, Loader2 } from "lucide-react";

interface AddPlayerDialogProps {
  sessionId: number;
  trigger?: React.ReactNode;
}

export function AddPlayerDialog({ sessionId, trigger }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { mutate, isPending } = useAddPlayerManually();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutate({ sessionId, name: name.trim() }, {
      onSuccess: () => {
        setOpen(false);
        setName("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-add-player">
            <UserPlus className="w-4 h-4" /> Add Player
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Player Manually</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="player-name" className="text-muted-foreground">Player Name</Label>
            <Input
              id="player-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50 border-white/[0.08]"
              placeholder="Enter player name..."
              required
              autoFocus
              data-testid="input-player-name"
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-full font-semibold"
            disabled={isPending || !name.trim()}
            data-testid="button-confirm-add-player"
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Add to Session"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
