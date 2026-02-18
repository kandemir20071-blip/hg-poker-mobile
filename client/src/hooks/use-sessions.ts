import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateSessionRequest, JoinSessionRequest, EndSessionRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSessions() {
  return useQuery({
    queryKey: [api.sessions.list.path],
    queryFn: async () => {
      const res = await fetch(api.sessions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return api.sessions.list.responses[200].parse(await res.json());
    },
  });
}

export function useActiveGames(enabled: boolean = true) {
  return useQuery({
    queryKey: ['/api/sessions/active-games'],
    queryFn: async () => {
      const res = await fetch('/api/sessions/active-games', { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active games");
      return res.json() as Promise<{ session: { id: number; type: string; status: string; leagueId: number }; leagueName: string }[]>;
    },
    enabled,
    refetchInterval: 15000,
  });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: [api.sessions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.sessions.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch session");
      return api.sessions.get.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll for live updates
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSessionRequest) => {
      const res = await fetch(api.sessions.create.path, {
        method: api.sessions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create session");
      return api.sessions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Session Created", description: "Good luck at the tables!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not create session", variant: "destructive" });
    },
  });
}

export function useJoinSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: JoinSessionRequest) => {
      const res = await fetch(api.sessions.join.path, {
        method: api.sessions.join.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to join session");
      }
      return api.sessions.join.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Joined Session", description: "You are now at the table." });
    },
    onError: (err: Error) => {
      toast({ title: "Unable to Join", description: err.message, variant: "destructive" });
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, forceUnbalanced, adjustments }: { id: number; data: EndSessionRequest; forceUnbalanced?: boolean; adjustments?: { playerId: number; amount: number }[] }) => {
      const url = buildUrl(api.sessions.end.path, { id });
      const res = await fetch(url, {
        method: api.sessions.end.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, forceUnbalanced, adjustments }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to end session");
      }
      return api.sessions.end.responses[200].parse(await res.json());
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues/sessions'], refetchType: 'all' });
      toast({ title: "Session Ended", description: "Stats have been updated." });
    },
  });
}

export function useToggleAutoApprove() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const url = buildUrl(api.sessions.toggleAutoApprove.path, { id });
      const res = await fetch(url, {
        method: api.sessions.toggleAutoApprove.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update setting");
      }
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, id] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl('/api/sessions/:id', { id });
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete session");
      return res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues/sessions'], refetchType: 'all' });
      toast({ title: "Session Deleted", description: "The session and all transactions have been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not delete session", variant: "destructive" });
    },
  });
}

export function useBustPlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, playerId }: { sessionId: number; playerId: number }) => {
      const res = await fetch(`/api/sessions/${sessionId}/players/${playerId}/bust`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to bust player" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path], refetchType: 'all' });
      if (data?.autoFinished) {
        queryClient.invalidateQueries({ queryKey: [api.stats.get.path], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['/api/leagues'], refetchType: 'all' });
        toast({ title: "Tournament Complete!", description: "The last player standing wins! Payouts have been calculated." });
      } else {
        toast({ title: "Player Eliminated", description: "Player has been busted from the tournament." });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useCustomChop() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, payouts }: { sessionId: number; payouts: Record<number, number> }) => {
      const res = await fetch(`/api/sessions/${sessionId}/custom-chop`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payouts }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to apply custom chop" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Custom chop saved", description: "Payouts have been updated and saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useAddPlayerManually() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, name }: { sessionId: number; name: string }) => {
      const url = buildUrl(api.sessions.addPlayer.path, { id: sessionId });
      const res = await fetch(url, {
        method: api.sessions.addPlayer.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to add player");
      }
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Player Added", description: "Player has been added to the session." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
