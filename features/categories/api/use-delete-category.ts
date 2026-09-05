import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";
import { toast } from "sonner";

import { summaryQueryKeys } from "@/features/summary/api/query-keys";
import { transactionQueryKeys } from "@/features/transactions/api/query-keys";
import { getMutationErrorMessage } from "@/lib/api-client-error";
import { client } from "@/lib/hono";

import { categoryQueryKeys } from "./query-keys";

type ResponseType = InferResponseType<
  (typeof client.api.categories)[":id"]["$delete"]
>;

export const useDeleteCategory = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api.categories[":id"]["$delete"]({
        param: { id },
      });

      if (!response.ok) {
        throw new Error(
          getMutationErrorMessage(
            response,
            "No se pudo eliminar la categoría. Inténtalo de nuevo.",
          ),
        );
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Categoría eliminada.");
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
