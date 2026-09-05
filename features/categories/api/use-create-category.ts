import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { getMutationErrorMessage } from "@/lib/api-client-error";
import { client } from "@/lib/hono";

import { categoryQueryKeys } from "./query-keys";

type ResponseType = InferResponseType<typeof client.api.categories.$post>;
type RequestType = InferRequestType<typeof client.api.categories.$post>["json"];

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.categories.$post({ json });

      if (!response.ok) {
        throw new Error(
          getMutationErrorMessage(
            response,
            "No se pudo crear la categoría. Inténtalo de nuevo.",
          ),
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Categoría creada.");
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return mutation;
};
