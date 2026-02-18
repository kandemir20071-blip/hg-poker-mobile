import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { AddTransactionRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useAddTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: number; data: AddTransactionRequest }) => {
      const url = buildUrl(api.transactions.create.path, { sessionId });
      const res = await fetch(url, {
        method: api.transactions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create transaction");
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onMutate: async ({ sessionId, data }) => {
      await queryClient.cancelQueries({ queryKey: [api.sessions.get.path, sessionId] });
      const previousData = queryClient.getQueryData([api.sessions.get.path, sessionId]) as any;

      const currentUser = queryClient.getQueryData(["/api/auth/user"]) as any;
      const isHost = currentUser?.id && currentUser.id === previousData?.session?.hostId;
      const willAutoApprove = isHost || previousData?.session?.autoApproveTransactions === true;

      queryClient.setQueryData([api.sessions.get.path, sessionId], (old: any) => {
        if (!old) return old;
        const optimisticStatus = willAutoApprove ? 'approved' : 'pending';
        const optimisticTx = {
          id: -Date.now(),
          sessionId,
          playerId: data.playerId,
          type: data.type,
          amount: data.amount,
          paymentMethod: 'cash',
          status: optimisticStatus,
          timestamp: new Date().toISOString(),
        };

        const newTransactions = [...old.transactions, optimisticTx];
        const approvedTxs = newTransactions.filter((t: any) => t.status === 'approved');

        const newPlayers = old.players.map((p: any) => {
          const playerTxs = approvedTxs.filter((t: any) => t.playerId === p.id);
          const totalBuyIn = playerTxs.filter((t: any) => t.type === 'buy_in').reduce((s: number, t: any) => s + t.amount, 0);
          const totalCashOut = playerTxs.filter((t: any) => t.type === 'cash_out').reduce((s: number, t: any) => s + t.amount, 0);
          return { ...p, totalBuyIn, totalCashOut, netProfit: totalCashOut - totalBuyIn };
        });

        return { ...old, transactions: newTransactions, players: newPlayers };
      });

      return { previousData };
    },
    onError: (_, { sessionId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([api.sessions.get.path, sessionId], context.previousData);
      }
      toast({ title: "Error", description: "Could not process transaction", variant: "destructive" });
    },
    onSuccess: (data, { sessionId }) => {
      const isInstant = data.status === 'approved';
      toast({ title: isInstant ? "Transaction Processed" : "Transaction Added", description: isInstant ? "Processed instantly." : "Sent to host for approval." });
    },
    onSettled: (_, __, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
    },
  });
}

export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, sessionId, data }: { id: number; sessionId: number; data: { status: 'approved' | 'rejected' } }) => {
      const url = buildUrl(api.transactions.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.transactions.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Updated", description: "Transaction status updated." });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, sessionId, data }: { id: number; sessionId: number; data: { amount?: number; type?: 'buy_in' | 'cash_out' } }) => {
      const url = buildUrl(api.transactions.update.path, { id });
      const res = await fetch(url, {
        method: api.transactions.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update transaction");
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Updated", description: "Transaction has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update transaction", variant: "destructive" });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, sessionId }: { id: number; sessionId: number }) => {
      const url = buildUrl(api.transactions.delete.path, { id });
      const res = await fetch(url, {
        method: api.transactions.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete transaction");
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Deleted", description: "Transaction has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not delete transaction", variant: "destructive" });
    },
  });
}

export function useCashOutPlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, playerId, amount }: { sessionId: number; playerId: number; amount: number }) => {
      const res = await fetch(`/api/sessions/${sessionId}/players/${playerId}/cashout`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to cash out player" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Cashed Out", description: "Player has left the table." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
