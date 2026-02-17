import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUnclaimPlayer, useMergePlayers, useRenamePlayer, useDeletePlayer } from "@/hooks/use-leagues";
import { UserX, GitMerge, Search, AlertTriangle, Loader2, Pencil, Check, X, ArrowDownAZ, Activity, Trash2 } from "lucide-react";

type LeaguePlayer = {
  id: number;
  leagueId: number;
  name: string;
  claimedByUserId: string | null;
  sessionCount?: number;
};

interface LeagueAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: number;
  players: LeaguePlayer[];
}

export function LeagueAdminDialog({ open, onOpenChange, leagueId, players }: LeagueAdminDialogProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"alphabetical" | "most_active">("alphabetical");
  const [mergeSource, setMergeSource] = useState<LeaguePlayer | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string>("");
  const [mergeConfirmText, setMergeConfirmText] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeaguePlayer | null>(null);

  const { mutate: unclaim, isPending: isUnclaiming } = useUnclaimPlayer();
  const { mutate: merge, isPending: isMerging } = useMergePlayers();
  const { mutate: rename, isPending: isRenaming } = useRenamePlayer();
  const { mutate: deletePlayer, isPending: isDeleting } = useDeletePlayer();

  const sorted = [...players].sort((a, b) => {
    if (sortBy === "most_active") {
      const diff = (b.sessionCount ?? 0) - (a.sessionCount ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    }
    if (a.claimedByUserId && !b.claimedByUserId) return -1;
    if (!a.claimedByUserId && b.claimedByUserId) return 1;
    return a.name.localeCompare(b.name);
  });

  const filtered = sorted.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleUnclaim = (playerId: number) => {
    unclaim({ leagueId, playerId });
  };

  const handleMerge = () => {
    if (!mergeSource || !mergeTarget) return;
    const targetId = Number(mergeTarget);
    merge({ leagueId, sourcePlayerId: mergeSource.id, targetPlayerId: targetId }, {
      onSuccess: () => {
        setMergeSource(null);
        setMergeTarget("");
        setMergeConfirmText("");
      },
    });
  };

  const handleStartEdit = (player: LeaguePlayer) => {
    setEditingPlayerId(player.id);
    setEditName(player.name);
  };

  const handleCancelEdit = () => {
    setEditingPlayerId(null);
    setEditName("");
  };

  const handleSubmitRename = () => {
    if (!editingPlayerId || !editName.trim()) return;
    rename({ leagueId, playerId: editingPlayerId, newName: editName.trim() }, {
      onSuccess: () => {
        setEditingPlayerId(null);
        setEditName("");
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deletePlayer({ leagueId, playerId: deleteTarget.id }, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  const mergeTargetOptions = players.filter(p => p.id !== mergeSource?.id);

  if (mergeSource) {
    const targetPlayer = players.find(p => p.id === Number(mergeTarget));
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setMergeSource(null); setMergeTarget(""); setMergeConfirmText(""); } onOpenChange(v); }}>
        <DialogContent className="glass-card sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-amber-400" /> Merge Player
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              All game history from <span className="text-white font-medium">{mergeSource.name}</span> will be moved to the target player. The name "{mergeSource.name}" will be removed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Source (will be removed)</label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="text-white font-medium">{mergeSource.name}</span>
                {mergeSource.claimedByUserId && <Badge variant="secondary" className="text-xs">Claimed</Badge>}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Target (will keep all data)</label>
              <Select value={mergeTarget} onValueChange={setMergeTarget}>
                <SelectTrigger className="bg-background/50 border-white/[0.08]" data-testid="select-merge-target">
                  <SelectValue placeholder="Select target player..." />
                </SelectTrigger>
                <SelectContent>
                  {mergeTargetOptions.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mergeTarget && targetPlayer && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-sm text-amber-400 font-medium">This cannot be undone</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  All history from <span className="text-white">{mergeSource.name}</span> will move to <span className="text-white">{targetPlayer.name}</span>. The name "{mergeSource.name}" will be permanently deleted.
                </p>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">Type <span className="text-white font-bold">MERGE</span> to confirm:</p>
                  <Input
                    value={mergeConfirmText}
                    onChange={(e) => setMergeConfirmText(e.target.value)}
                    placeholder="Type MERGE"
                    className="bg-background/50 border-white/[0.08] min-h-[44px] text-base"
                    data-testid="input-merge-confirm"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setMergeSource(null); setMergeTarget(""); setMergeConfirmText(""); }} data-testid="button-cancel-merge">
                Back
              </Button>
              <Button
                variant="destructive"
                disabled={!mergeTarget || mergeConfirmText !== "MERGE" || isMerging}
                onClick={handleMerge}
                data-testid="button-confirm-merge"
              >
                {isMerging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GitMerge className="h-4 w-4 mr-2" />}
                Merge Players
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Players</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Edit names, unclaim, or merge duplicate players. Only the league creator can use these tools.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players..."
              className="pl-9 bg-background/50 border-white/[0.08] min-h-[44px] text-base"
              data-testid="input-search-players"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "alphabetical" | "most_active")}>
            <SelectTrigger className="w-[160px] bg-background/50 border-white/[0.08]" data-testid="select-sort-players">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">
                <span className="flex items-center gap-2"><ArrowDownAZ className="h-3.5 w-3.5" /> A-Z</span>
              </SelectItem>
              <SelectItem value="most_active">
                <span className="flex items-center gap-2"><Activity className="h-3.5 w-3.5" /> Most Active</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 mt-2 min-h-0 max-h-[50vh]">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No players found</p>
          ) : (
            filtered.map(player => (
              <div
                key={player.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg hover-elevate"
                data-testid={`row-player-${player.id}`}
              >
                {editingPlayerId === player.id ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-background/50 border-white/[0.08] min-h-[36px] text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmitRename();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      data-testid={`input-rename-${player.id}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSubmitRename}
                      disabled={isRenaming || !editName.trim() || editName.trim() === player.name}
                      data-testid={`button-confirm-rename-${player.id}`}
                    >
                      {isRenaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-400" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={isRenaming}
                      data-testid={`button-cancel-rename-${player.id}`}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-white font-medium truncate" data-testid={`text-player-name-${player.id}`}>
                        {player.name}
                      </span>
                      {player.claimedByUserId ? (
                        <Badge variant="secondary" className="text-xs shrink-0" data-testid={`badge-claimed-${player.id}`}>
                          Claimed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground" data-testid={`badge-guest-${player.id}`}>
                          Guest
                        </Badge>
                      )}
                      {sortBy === "most_active" && player.sessionCount !== undefined && (
                        <Badge variant="outline" className="text-xs shrink-0 text-emerald-400 border-emerald-400/30" data-testid={`badge-sessions-${player.id}`}>
                          {player.sessionCount} {player.sessionCount === 1 ? "game" : "games"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStartEdit(player)}
                        data-testid={`button-edit-${player.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {player.claimedByUserId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnclaim(player.id)}
                          disabled={isUnclaiming}
                          data-testid={`button-unclaim-${player.id}`}
                        >
                          <UserX className="h-3.5 w-3.5 mr-1" />
                          Unclaim
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMergeSource(player)}
                        data-testid={`button-merge-${player.id}`}
                      >
                        <GitMerge className="h-3.5 w-3.5 mr-1" />
                        Merge
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(player)}
                        className="text-red-400"
                        data-testid={`button-delete-${player.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" /> Delete Player
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete <span className="text-white font-medium">{deleteTarget?.name}</span>? All associated data (game history, transactions, and session records) will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
