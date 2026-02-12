import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type AddTransactionRequest, type UpdateTransactionStatusRequest } from "@shared/routes";
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
    mutationFn: async ({ id, sessionId, data }: { id: number; sessionId: number; data: UpdateTransactionStatusRequest }) => {
      const url = buildUrl(api.transactions.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.transactions.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return api.transactions.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Updated", description: "Transaction status updated." });
    },
  });
}
