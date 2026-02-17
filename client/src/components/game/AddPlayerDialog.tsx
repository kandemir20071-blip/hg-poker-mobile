import { useState, useMemo, useCallback } from "react";
import { ResponsiveModal, ResponsiveModalContent, ResponsiveModalHeader, ResponsiveModalTitle, ResponsiveModalTrigger } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddPlayerManually } from "@/hooks/use-sessions";
import { useLeaguePlayers } from "@/hooks/use-leagues";
import { UserPlus, Loader2, Plus, AlertCircle, ArrowDownAZ, Activity, Search, X, Check } from "lucide-react";

interface AddPlayerDialogProps {
  sessionId: number;
  leagueId?: number | null;
  existingPlayerNames?: string[];
  trigger?: React.ReactNode;
}

export function AddPlayerDialog({ sessionId, leagueId, existingPlayerNames = [], trigger }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [sortBy, setSortBy] = useState<"alphabetical" | "most_active">("most_active");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { mutateAsync } = useAddPlayerManually();
  const { data: leaguePlayersRaw, isLoading: isLoadingRoster } = useLeaguePlayers(leagueId ?? null);

  const existingNamesLower = useMemo(
    () => existingPlayerNames.map(n => n.toLowerCase().trim()),
    [existingPlayerNames]
  );

  type RosterPlayer = { id: number; name: string; sessionCount?: number; claimedByUserId?: string | null };

  const allAvailablePlayers = useMemo(() => {
    if (!leaguePlayersRaw) return [] as RosterPlayer[];
    return (leaguePlayersRaw as RosterPlayer[])
      .filter(p => !existingNamesLower.includes(p.name.toLowerCase().trim()));
  }, [leaguePlayersRaw, existingNamesLower]);

  const filteredPlayers = useMemo(() => {
    return allAvailablePlayers
      .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "most_active") {
          const diff = (b.sessionCount ?? 0) - (a.sessionCount ?? 0);
          return diff !== 0 ? diff : a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [allAvailablePlayers, sortBy, searchQuery]);

  const allLeagueNames = useMemo(() => {
    if (!leaguePlayersRaw) return [];
    return (leaguePlayersRaw as RosterPlayer[]).map(p => p.name.toLowerCase().trim());
  }, [leaguePlayersRaw]);

  const resetState = () => {
    setSelectedNames([]);
    setShowCreateNew(false);
    setNewName("");
    setNameError("");
    setSearchQuery("");
    setIsAdding(false);
  };

  const togglePlayer = useCallback((name: string) => {
    setSelectedNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }, []);

  const removeSelected = useCallback((name: string) => {
    setSelectedNames(prev => prev.filter(n => n !== name));
  }, []);

  const handleAddSelected = async () => {
    if (selectedNames.length === 0) return;
    setIsAdding(true);
    try {
      for (const name of selectedNames) {
        await mutateAsync({ sessionId, name });
      }
      setOpen(false);
      resetState();
    } catch {
      setIsAdding(false);
    }
  };

  const isDuplicateInSession = useMemo(() => {
    const trimmed = newName.trim().toLowerCase();
    return trimmed.length > 0 && existingNamesLower.includes(trimmed);
  }, [newName, existingNamesLower]);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (isDuplicateInSession) return;

    if (allLeagueNames.includes(trimmed.toLowerCase())) {
      setNameError("Player already exists in this league. Select them from the list instead.");
      return;
    }

    setNameError("");
    setIsAdding(true);
    try {
      await mutateAsync({ sessionId, name: trimmed });
      setOpen(false);
      resetState();
    } catch {
      setIsAdding(false);
    }
  };

  const rosterLoaded = leagueId && !isLoadingRoster;
  const hasRoster = rosterLoaded && allAvailablePlayers.length > 0;

  return (
    <ResponsiveModal open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <ResponsiveModalTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-add-player">
            <UserPlus className="w-4 h-4" /> Add Player
          </Button>
        )}
      </ResponsiveModalTrigger>
      <ResponsiveModalContent className="glass-card sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="text-xl">Add Player</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <div className="flex flex-col gap-3 mt-2 min-h-0 flex-1">
          {leagueId && isLoadingRoster && (
            <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading roster...</span>
            </div>
          )}

          {hasRoster && !showCreateNew && (
            <>
              {selectedNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5" data-testid="selected-players-pills">
                  {selectedNames.map(name => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="gap-1 pr-1 text-sm"
                      data-testid={`pill-player-${name}`}
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeSelected(name)}
                        className="rounded-full p-0.5 hover-elevate"
                        data-testid={`pill-remove-${name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/50 border-white/[0.08] text-base"
                    placeholder="Search players..."
                    autoFocus
                    data-testid="input-search-players"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as "alphabetical" | "most_active")}>
                  <SelectTrigger className="w-[130px] shrink-0 text-xs bg-background/50 border-white/[0.08]" data-testid="select-sort-roster">
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

              <div
                className="overflow-y-auto border border-white/[0.06] rounded-md min-h-0 max-h-[240px]"
                data-testid="player-list-container"
              >
                {filteredPlayers.length === 0 && searchQuery && (
                  <div className="py-6 px-3 text-sm text-muted-foreground text-center" data-testid="text-no-results">
                    No players match "{searchQuery}"
                  </div>
                )}
                {filteredPlayers.length === 0 && !searchQuery && (
                  <div className="py-6 px-3 text-sm text-muted-foreground text-center">
                    All roster players are already in this session
                  </div>
                )}
                {filteredPlayers.map(p => {
                  const isSelected = selectedNames.includes(p.name);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayer(p.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover-elevate ${
                        isSelected ? "bg-emerald-500/10" : ""
                      }`}
                      data-testid={`player-row-${p.id}`}
                    >
                      <div className={`flex items-center justify-center w-5 h-5 rounded border shrink-0 transition-colors ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-white/20 bg-transparent"
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <span className="flex-1 text-sm truncate">{p.name}</span>
                      {p.sessionCount !== undefined && p.sessionCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 shrink-0 text-emerald-400 border-emerald-400/30 no-default-hover-elevate no-default-active-elevate"
                        >
                          {p.sessionCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                className="w-full rounded-full font-semibold min-h-[44px]"
                disabled={isAdding || selectedNames.length === 0}
                onClick={handleAddSelected}
                data-testid="button-confirm-add-player"
              >
                {isAdding ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  selectedNames.length === 0
                    ? "Select Players"
                    : `Add ${selectedNames.length} Player${selectedNames.length > 1 ? "s" : ""}`
                )}
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
                {isDuplicateInSession && (
                  <p className="text-sm text-red-400 flex items-center gap-1.5" data-testid="text-duplicate-warning">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Player already in game.
                  </p>
                )}
                {nameError && !isDuplicateInSession && (
                  <p className="text-sm text-red-400 flex items-center gap-1.5" data-testid="text-name-error">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {nameError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full rounded-full font-semibold min-h-[44px]"
                disabled={isAdding || !newName.trim() || isDuplicateInSession}
                data-testid="button-confirm-create-player"
              >
                {isAdding ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create & Add to Session"}
              </Button>
            </form>
          )}
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
