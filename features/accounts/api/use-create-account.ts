import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { summaryQueryKeys } from "@/features/summary/api/query-keys";
import { getMutationErrorMessage } from "@/lib/api-client-error";
import { client } from "@/lib/hono";

import { accountQueryKeys } from "./query-keys";

type ResponseType = InferResponseType<typeof client.api.accounts.$post>;
type RequestType = InferRequestType<typeof client.api.accounts.$post>["json"];

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.accounts.$post({ json });

      if (!response.ok) {
        throw new Error(
          getMutationErrorMessage(
            response,
            "No se pudo crear la cuenta. Inténtalo de nuevo.",
          ),
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Cuenta creada.");
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryQueryKeys.byAccount() });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return mutation;
};
