import { useState } from "react";
import { useJoinSession } from "@/hooks/use-sessions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function JoinSession() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { mutate: joinSession, isPending } = useJoinSession();

  const [code, setCode] = useState("");
  const [name, setName] = useState(user?.firstName || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    joinSession({ code, name }, {
      onSuccess: (data) => {
        setLocation(`/session/${data.session.id}`);
      }
    });
  };

  return (
    <div className="max-w-md mx-auto mt-10 md:mt-20">
      <div className="glass-card rounded-2xl p-8" data-testid="card-join">
        <h1 className="text-3xl font-bold text-center mb-2 text-white">Join Table</h1>
        <p className="text-center text-muted-foreground mb-8">Enter the session code to take your seat.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-muted-foreground">Session Code</Label>
            <Input 
              id="code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A7X9"
              className="text-center text-2xl font-mono tracking-widest uppercase h-14 bg-background border-white/[0.08] focus:border-primary/50"
              maxLength={6}
              required
              data-testid="input-session-code"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground">Display Name</Label>
            <Input 
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your Name"
              className="h-12 bg-background border-white/[0.08]"
              required
              data-testid="input-display-name"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full rounded-full font-semibold mt-4"
            disabled={isPending}
            data-testid="button-join-game"
          >
            {isPending ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">Join Game <ArrowRight className="w-4 h-4" /></span>}
          </Button>
        </form>
      </div>
    </div>
  );
}
