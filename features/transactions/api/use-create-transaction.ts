import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { accountQueryKeys } from "@/features/accounts/api/query-keys";
import { summaryQueryKeys } from "@/features/summary/api/query-keys";
import {
  getMutationErrorMessage,
  MutationHttpError,
} from "@/lib/api-client-error";
import { client } from "@/lib/hono";

import { transactionQueryKeys } from "./query-keys";

type ResponseType = InferResponseType<typeof client.api.transactions.$post>;
type RequestType = InferRequestType<
  typeof client.api.transactions.$post
>["json"];

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.transactions.$post({ json });

      if (!response.ok) {
        throw new MutationHttpError(
          getMutationErrorMessage(
            response,
            "No se pudo crear la transacción. Revisa los datos e inténtalo de nuevo.",
          ),
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Transacción creada.");
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryQueryKeys.all });
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(
          error,
          "No se pudo crear la transacción. Revisa los datos e inténtalo de nuevo.",
        ),
      );
    },
  });

  return mutation;
};
