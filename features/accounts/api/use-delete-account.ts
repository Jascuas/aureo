import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";
import { toast } from "sonner";

import { summaryQueryKeys } from "@/features/summary/api/query-keys";
import { transactionQueryKeys } from "@/features/transactions/api/query-keys";
import {
  getMutationErrorMessage,
  MutationHttpError,
} from "@/lib/api-client-error";
import { client } from "@/lib/hono";

import { accountQueryKeys } from "./query-keys";

type ResponseType = InferResponseType<
  (typeof client.api.accounts)[":id"]["$delete"]
>;

export const useDeleteAccount = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api.accounts[":id"]["$delete"]({
        param: { id },
      });

      if (!response.ok) {
        throw new MutationHttpError(
          getMutationErrorMessage(
            response,
            "No se pudo eliminar la cuenta. Comprueba que ya no la necesites.",
          ),
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Cuenta eliminada.");
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryQueryKeys.all });
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(error, "No se pudo eliminar la cuenta. Inténtalo de nuevo."),
      );
    },
  });

  return mutation;
};
