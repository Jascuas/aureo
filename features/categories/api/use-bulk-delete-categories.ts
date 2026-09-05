import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { summaryQueryKeys } from "@/features/summary/api/query-keys";
import { transactionQueryKeys } from "@/features/transactions/api/query-keys";
import { getMutationErrorMessage } from "@/lib/api-client-error";
import { client } from "@/lib/hono";

import { categoryQueryKeys } from "./query-keys";

type ResponseType = InferResponseType<
  (typeof client.api.categories)["bulk-delete"]["$post"]
>;
type RequestType = InferRequestType<
  (typeof client.api.categories)["bulk-delete"]["$post"]
>["json"];

export const useBulkDeleteCategories = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.categories["bulk-delete"]["$post"]({
        json,
      });

      if (!response.ok) {
        throw new Error(
          getMutationErrorMessage(
            response,
            "No se pudieron eliminar las categorías. Inténtalo de nuevo.",
          ),
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Categorías eliminadas.");
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: summaryQueryKeys.byCategoryRoot(),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return mutation;
};
