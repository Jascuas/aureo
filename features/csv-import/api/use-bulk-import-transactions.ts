import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { accountQueryKeys } from "@/features/accounts/api/query-keys";
import { getImportResultFeedback } from "@/features/csv-import/lib/import-result-feedback";
import { summaryQueryKeys } from "@/features/summary/api/query-keys";
import { transactionQueryKeys } from "@/features/transactions/api/query-keys";
import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["import"]["$post"],
  200
>;
type ResponseType = SuccessResponse["data"];
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["import"]["$post"]
>["json"];

export const useBulkImportTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["import"].$post({ json });
      if (!response.ok) {
        throw new Error("No se han podido importar las transacciones.");
      }
      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("La respuesta del servidor no tiene un formato válido.");
      }
      return result.data;
    },
    onSuccess: (data) => {
      const feedback = getImportResultFeedback(
        data.summary.failed,
        data.summary.imported,
      );
      toast[feedback.kind](feedback.message);
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryQueryKeys.all });
    },
    onError: () => {
      toast.error("No se han podido importar las transacciones.");
    },
  });
};
