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
      if (!res.ok) throw new Error("Failed to join session");
      return api.sessions.join.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Joined Session", description: "You are now at the table." });
    },
    onError: () => {
      toast({ title: "Error", description: "Invalid code or unable to join.", variant: "destructive" });
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EndSessionRequest }) => {
      const url = buildUrl(api.sessions.end.path, { id });
      const res = await fetch(url, {
        method: api.sessions.end.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to end session");
      return api.sessions.end.responses[200].parse(await res.json());
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues'] });
      toast({ title: "Session Ended", description: "Stats have been updated." });
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
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues'] });
      toast({ title: "Session Deleted", description: "The session and all transactions have been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not delete session", variant: "destructive" });
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
      if (!res.ok) throw new Error("Failed to add player");
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Player Added", description: "Player has been added to the session." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not add player", variant: "destructive" });
    },
  });
}
