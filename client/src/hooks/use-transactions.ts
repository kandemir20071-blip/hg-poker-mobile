import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { AddTransactionRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Transaction Added", description: "Update sent to host." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not process transaction", variant: "destructive" });
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
    mutationFn: async ({ id, sessionId, data }: { id: number; sessionId: number; data: { amount?: number; type?: 'buy_in' | 'cash_out'; paymentMethod?: 'cash' | 'digital' } }) => {
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
