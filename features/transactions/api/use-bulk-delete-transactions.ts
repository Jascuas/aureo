import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { accountQueryKeys } from "@/features/accounts/api/query-keys";
import { summaryQueryKeys } from "@/features/summary/api/query-keys";
import { client } from "@/lib/hono";

import { transactionQueryKeys } from "./query-keys";

type ResponseType = InferResponseType<
  (typeof client.api.transactions)["bulk-delete"]["$post"]
>;
type RequestType = InferRequestType<
  (typeof client.api.transactions)["bulk-delete"]["$post"]
>["json"];

export const useBulkDeleteTransactions = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.transactions["bulk-delete"]["$post"]({
        json,
      });

      if (!response.ok) throw new Error("Failed to delete transaction(s).");

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Transaction(s) deleted.");
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryQueryKeys.all });
    },
    onError: () => {
      toast.error("Failed to delete transaction(s).");
    },
  });

  return mutation;
};
