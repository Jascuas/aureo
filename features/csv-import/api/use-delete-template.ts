import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["csv-import"]["templates"][":id"]["$delete"]
>;

export const useDeleteTemplate = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api["csv-import"]["templates"][":id"]["$delete"]({
        param: { id },
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      return await response.json();
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
