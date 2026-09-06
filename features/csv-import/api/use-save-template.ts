import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/features/csv-import/api/get-api-error-message";
import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["templates"]["$post"],
  200
>;
type ResponseType = SuccessResponse["data"];
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["templates"]["$post"]
>["json"];

export const useSaveTemplate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["templates"]["$post"]({
        json,
      });

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            await response.json(),
            "Failed to save template",
          ),
        );
      }

      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("Unexpected response shape");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Template saved successfully");
      queryClient.invalidateQueries({ queryKey: ["import-templates"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save template");
    },
  });

  return mutation;
};
