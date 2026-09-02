import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { summaryQueryKeys } from "@/features/summary/api/query-keys";
import { client } from "@/lib/hono";

import { accountQueryKeys } from "./query-keys";

type ResponseType = InferResponseType<typeof client.api.accounts.$post>;
type RequestType = InferRequestType<typeof client.api.accounts.$post>["json"];

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.accounts.$post({ json });

      if (!response.ok) throw new Error("Failed to create account.");

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Account created.");
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: summaryQueryKeys.byAccount() });
    },
    onError: () => {
      toast.error("Failed to create account.");
    },
  });

  return mutation;
};
