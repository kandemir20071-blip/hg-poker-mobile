import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddPlayerManually } from "@/hooks/use-sessions";
import { useLeaguePlayers } from "@/hooks/use-leagues";
import { UserPlus, Loader2, Plus, AlertCircle, ArrowDownAZ, Activity } from "lucide-react";

interface AddPlayerDialogProps {
  sessionId: number;
  leagueId?: number | null;
  existingPlayerNames?: string[];
  trigger?: React.ReactNode;
}

export function AddPlayerDialog({ sessionId, leagueId, existingPlayerNames = [], trigger }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [sortBy, setSortBy] = useState<"alphabetical" | "most_active">("most_active");
  const { mutate, isPending } = useAddPlayerManually();
  const { data: leaguePlayersRaw, isLoading: isLoadingRoster } = useLeaguePlayers(leagueId ?? null);

  const existingNamesLower = useMemo(
    () => existingPlayerNames.map(n => n.toLowerCase().trim()),
    [existingPlayerNames]
  );

  const availablePlayers = useMemo(() => {
    if (!leaguePlayersRaw) return [];
    return (leaguePlayersRaw as { id: number; name: string; sessionCount?: number }[])
      .filter(p => !existingNamesLower.includes(p.name.toLowerCase().trim()))
      .sort((a, b) => {
        if (sortBy === "most_active") {
          const diff = (b.sessionCount ?? 0) - (a.sessionCount ?? 0);
          return diff !== 0 ? diff : a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [leaguePlayersRaw, existingNamesLower, sortBy]);

  const allLeagueNames = useMemo(() => {
    if (!leaguePlayersRaw) return [];
    return (leaguePlayersRaw as { id: number; name: string }[]).map(p => p.name.toLowerCase().trim());
  }, [leaguePlayersRaw]);

  const resetState = () => {
    setSelectedPlayer("");
    setShowCreateNew(false);
    setNewName("");
    setNameError("");
  };

  const handleAddFromRoster = () => {
    if (!selectedPlayer) return;
    mutate({ sessionId, name: selectedPlayer }, {
      onSuccess: () => {
        setOpen(false);
        resetState();
      }
    });
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (existingNamesLower.includes(trimmed.toLowerCase())) {
      setNameError("This player is already in the session.");
      return;
    }

    if (allLeagueNames.includes(trimmed.toLowerCase())) {
      setNameError("Player already exists in this league. Please select them from the dropdown.");
      return;
    }

    setNameError("");
    mutate({ sessionId, name: trimmed }, {
      onSuccess: () => {
        setOpen(false);
        resetState();
      }
    });
  };

  const rosterLoaded = leagueId && !isLoadingRoster;
  const hasRoster = rosterLoaded && availablePlayers.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-add-player">
            <UserPlus className="w-4 h-4" /> Add Player
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-card sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Player</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {leagueId && isLoadingRoster && (
            <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading roster...</span>
            </div>
          )}

          {hasRoster && !showCreateNew && (
            <>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-muted-foreground">Select from Roster</Label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as "alphabetical" | "most_active")}>
                    <SelectTrigger className="w-[140px] h-8 text-xs bg-background/50 border-white/[0.08]" data-testid="select-sort-roster">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="most_active">
                        <span className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> Most Active</span>
                      </SelectItem>
                      <SelectItem value="alphabetical">
                        <span className="flex items-center gap-1.5"><ArrowDownAZ className="h-3 w-3" /> A-Z</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger className="bg-background/50 border-white/[0.08] min-h-[44px] text-base" data-testid="select-roster-player">
                    <SelectValue placeholder="Choose a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlayers.map(p => (
                      <SelectItem key={p.id} value={p.name} data-testid={`option-player-${p.id}`}>
                        <span className="flex items-center gap-2">
                          {p.name}
                          {sortBy === "most_active" && (p as any).sessionCount !== undefined && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-emerald-400 border-emerald-400/30 no-default-hover-elevate no-default-active-elevate">
                              {(p as any).sessionCount}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full rounded-full font-semibold min-h-[44px]"
                disabled={isPending || !selectedPlayer}
                onClick={handleAddFromRoster}
                data-testid="button-confirm-add-player"
              >
                {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Add to Session"}
              </Button>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-white/[0.06]" />
                <span className="px-3 text-xs text-muted-foreground">or</span>
                <div className="flex-grow border-t border-white/[0.06]" />
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 min-h-[44px]"
                onClick={() => setShowCreateNew(true)}
                data-testid="button-create-new-player"
              >
                <Plus className="w-4 h-4" /> Create New Player
              </Button>
            </>
          )}

          {(showCreateNew || (rosterLoaded && !hasRoster) || (!leagueId)) && (
            <form onSubmit={handleCreateNew} className="space-y-4">
              {showCreateNew && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowCreateNew(false); setNewName(""); setNameError(""); }}
                  data-testid="button-back-to-roster"
                >
                  Back to Roster
                </Button>
              )}
              <div className="grid gap-2">
                <Label htmlFor="new-player-name" className="text-muted-foreground">Player Name</Label>
                <Input
                  id="new-player-name"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setNameError(""); }}
                  className="bg-background/50 border-white/[0.08] min-h-[44px] text-base"
                  placeholder="Enter player name..."
                  required
                  autoFocus
                  data-testid="input-player-name"
                />
                {nameError && (
                  <p className="text-sm text-red-400 flex items-center gap-1.5" data-testid="text-name-error">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {nameError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full rounded-full font-semibold min-h-[44px]"
                disabled={isPending || !newName.trim()}
                data-testid="button-confirm-create-player"
              >
                {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create & Add to Session"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
