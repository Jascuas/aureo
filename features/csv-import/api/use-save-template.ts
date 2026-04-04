import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["csv-import"]["templates"]["$post"]
>;
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
        const errorData = await response.json();
        throw new Error(
          (errorData as any).error?.message || "Failed to save template",
        );
      }

      return await response.json();
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
