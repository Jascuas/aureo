import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["templates"][":id"]["$delete"],
  200
>;
type ResponseType = SuccessResponse["data"];
type RequestType = { id: string };

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ id }) => {
      const response = await client.api["csv-import"]["templates"][":id"][
        "$delete"
      ]({
        param: { id },
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("Unexpected response shape");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["import-templates"] });
    },
    onError: () => {
      toast.error("Failed to delete template");
    },
  });

  return mutation;
};
