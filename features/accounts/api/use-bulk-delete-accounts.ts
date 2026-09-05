import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
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
  (typeof client.api.accounts)["bulk-delete"]["$post"]
>;
type RequestType = InferRequestType<
  (typeof client.api.accounts)["bulk-delete"]["$post"]
>["json"];

export const useBulkDeleteAccounts = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.accounts["bulk-delete"]["$post"]({
        json,
      });

      if (!response.ok) {
        throw new MutationHttpError(
          getMutationErrorMessage(
            response,
            "No se pudieron eliminar las cuentas. Inténtalo de nuevo.",
          ),
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Cuentas eliminadas.");
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryQueryKeys.all });
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(error, "No se pudieron eliminar las cuentas. Inténtalo de nuevo."),
      );
    },
  });

  return mutation;
};
