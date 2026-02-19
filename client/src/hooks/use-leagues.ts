import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useLeagues(enabled: boolean = true) {
  return useQuery({
    queryKey: [api.leagues.list.path],
    queryFn: async () => {
      const res = await fetch(api.leagues.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leagues");
      return res.json();
    },
    enabled,
  });
}

export function useLeague(id: number | null) {
  return useQuery({
    queryKey: [api.leagues.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.leagues.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch league");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateLeague() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch(api.leagues.create.path, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to create league");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path] });
      toast({ title: "League Created", description: "Your league is ready. Share the invite code with your group." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useJoinLeague() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { inviteCode: string }) => {
      const res = await fetch(api.leagues.join.path, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to join league");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path] });
      toast({ title: "Joined League", description: "You've joined the league." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useClaimPlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leagueId, playerId }: { leagueId: number; playerId: number }) => {
      const url = buildUrl(api.leagues.claimPlayer.path, { id: leagueId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to claim player");
      }
      return res.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.get.path, leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      toast({ title: "Name Claimed", description: "Your name has been linked to your account. Your personal stats are now updated." });
    },
    onError: (err: any) => {
      const message = err?.message || "Could not claim player name";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });
}

export function useCreateAndClaimPlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leagueId, name }: { leagueId: number; name: string }) => {
      const url = buildUrl(api.leagues.createAndClaimPlayer.path, { id: leagueId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to create player");
      }
      return res.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.get.path, leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      toast({ title: "Profile Created", description: "Your new player name has been created and linked to your account." });
    },
    onError: (err: any) => {
      const message = err?.message || "Could not create player name";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });
}

export function useLeaguePlayers(leagueId: number | null) {
  return useQuery({
    queryKey: [api.leagues.players.path, leagueId],
    queryFn: async () => {
      if (!leagueId) return [];
      const url = buildUrl(api.leagues.players.path, { id: leagueId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch league players");
      return res.json();
    },
    enabled: !!leagueId,
  });
}

export function useLeagueSessions(leagueId: number | null) {
  return useQuery({
    queryKey: ['/api/leagues/sessions', leagueId],
    queryFn: async () => {
      if (!leagueId) return [];
      const res = await fetch(`/api/leagues/${leagueId}/sessions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch league sessions");
      return res.json();
    },
    enabled: !!leagueId,
  });
}

export function useLeagueStats(leagueId: number | null) {
  return useQuery({
    queryKey: [api.stats.league.path, leagueId],
    queryFn: async () => {
      if (!leagueId) return null;
      const url = buildUrl(api.stats.league.path, { leagueId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch league stats");
      return res.json();
    },
    enabled: !!leagueId,
  });
}

export function usePersonalStats() {
  return useQuery({
    queryKey: [api.stats.personal.path],
    queryFn: async () => {
      const res = await fetch(api.stats.personal.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch personal stats");
      return res.json();
    },
  });
}

export function usePlayerRivalries() {
  return useQuery({
    queryKey: [api.stats.playerRivalries.path],
    queryFn: async () => {
      const res = await fetch(api.stats.playerRivalries.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rivalries");
      return res.json() as Promise<{
        formChart: Array<{ date: string; netProfit: number; cumulativeProfit: number; leagueName: string }>;
        nemesis: { name: string; totalProfit: number; sharedGames: number } | null;
        target: { name: string; totalProfit: number; sharedGames: number } | null;
      }>;
    },
  });
}

export function useUnclaimPlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leagueId, playerId }: { leagueId: number; playerId: number }) => {
      const url = buildUrl(api.leagues.unclaimPlayer.path, { id: leagueId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to unclaim player");
      }
      return res.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.get.path, leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      toast({ title: "Name Unclaimed", description: "The player name has been reverted to guest status." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useMergePlayers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leagueId, sourcePlayerId, targetPlayerId }: { leagueId: number; sourcePlayerId: number; targetPlayerId: number }) => {
      const url = buildUrl(api.leagues.mergePlayers.path, { id: leagueId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePlayerId, targetPlayerId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to merge players");
      }
      return res.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.get.path, leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues/sessions', leagueId], refetchType: 'all' });
      toast({ title: "Players Merged", description: "All history has been combined under the target name." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useRenamePlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leagueId, playerId, newName }: { leagueId: number; playerId: number; newName: string }) => {
      const url = buildUrl(api.leagues.renamePlayer.path, { id: leagueId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, newName }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to rename player");
      }
      return res.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.get.path, leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.players.path, leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues/sessions', leagueId], refetchType: 'all' });
      toast({ title: "Player Renamed", description: "The player name has been updated across all historical data." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leagueId, playerId }: { leagueId: number; playerId: number }) => {
      const path = api.leagues.deletePlayer.path.replace(':id', String(leagueId));
      const res = await fetch(path, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to delete player");
      }
      return res.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.get.path, leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.players.path, leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues/sessions', leagueId], refetchType: 'all' });
      toast({ title: "Player Deleted", description: "The player and all associated data have been permanently removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useLeaveLeague() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leagueId: number) => {
      const url = buildUrl(api.leagues.leave.path, { id: leagueId });
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to leave league");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      toast({ title: "Left League", description: "You have left the league." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteLeague() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leagueId: number) => {
      const url = buildUrl(api.leagues.delete.path, { id: leagueId });
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to delete league");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      toast({ title: "League Deleted", description: "The league has been permanently deleted." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useKickMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leagueId, userId }: { leagueId: number; userId: string }) => {
      const url = buildUrl(api.leagues.kickMember.path, { leagueId, userId });
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to remove member");
      }
      return res.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues', leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      toast({ title: "Member Removed", description: "User has been removed from the league.", variant: "destructive" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateMemberPermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leagueId, userId, canHostSessions }: { leagueId: number; userId: string; canHostSessions: boolean }) => {
      const res = await fetch(`/api/leagues/${leagueId}/members/${userId}/permissions`, {
        method: 'PATCH',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canHostSessions }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to update permissions");
      }
      return res.json();
    },
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.get.path, leagueId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useMigrateToLeague() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leagueId: number) => {
      const res = await fetch('/api/migrate-to-league', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Migration failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues/sessions'], refetchType: 'all' });
      toast({
        title: "Data Migrated",
        description: `Moved ${data.migrated} records, created ${data.playersCreated} new players.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
