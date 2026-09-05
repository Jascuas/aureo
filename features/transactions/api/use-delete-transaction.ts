import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";
import { toast } from "sonner";

import { accountQueryKeys } from "@/features/accounts/api/query-keys";
import { summaryQueryKeys } from "@/features/summary/api/query-keys";
import {
  getMutationErrorMessage,
  MutationHttpError,
} from "@/lib/api-client-error";
import { client } from "@/lib/hono";

import { transactionQueryKeys } from "./query-keys";

type ResponseType = InferResponseType<
  (typeof client.api.transactions)[":id"]["$delete"]
>;

export const useDeleteTransaction = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api.transactions[":id"]["$delete"]({
        param: { id },
      });

      if (!response.ok) {
        throw new MutationHttpError(
          getMutationErrorMessage(
            response,
            "No se pudo eliminar la transacción. Inténtalo de nuevo.",
          ),
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Transacción eliminada.");
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryQueryKeys.all });
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(error, "No se pudo eliminar la transacción. Inténtalo de nuevo."),
      );
    },
  });

  return mutation;
};
