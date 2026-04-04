import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["csv-import"]["templates"][":id"]["$patch"]
>;
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["templates"][":id"]["$patch"]
>["json"];

export const useUpdateTemplate = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["templates"][":id"]["$patch"]({
        json,
        param: { id },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          (errorData as any).error?.message || "Failed to update template",
        );
      }

      return await response.json();
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
