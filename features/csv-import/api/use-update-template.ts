import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/features/csv-import/api/get-api-error-message";
import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["templates"][":id"]["$patch"],
  200
>;
type ResponseType = SuccessResponse["data"];
type JsonBody = InferRequestType<
  (typeof client.api)["csv-import"]["templates"][":id"]["$patch"]
>["json"];

type RequestType = { id: string; json: JsonBody };

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ id, json }) => {
      const response = await client.api["csv-import"]["templates"][":id"][
        "$patch"
      ]({
        json,
        param: { id },
      });

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            await response.json(),
            "Failed to update template",
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
      toast.success("Template updated");
      queryClient.invalidateQueries({ queryKey: ["import-templates"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  return mutation;
};
