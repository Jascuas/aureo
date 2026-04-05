"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PaginatedDataTable } from "@/components/paginated-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectAccount } from "@/features/accounts/hooks/use-select-account";
import { useBulkDeleteTransactions } from "@/features/transactions/api/use-bulk-delete-transactions";
import { useGetPaginatedTransactions } from "@/features/transactions/api/use-get-paginated-transactions";
import { columns } from "@/features/transactions/components/columns";
import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";

const TransactionsPage = () => {
  const router = useRouter();
  const [AccountDialog, confirm] = useSelectAccount();
  const newTransaction = useNewTransaction();
  const deleteTransactions = useBulkDeleteTransactions();
  const { transactions, paginationInfo, paginationCallbacks } =
    useGetPaginatedTransactions();

  const onUpload = async () => {
    // Select account first
    const accountId = await confirm();

    if (!accountId) {
      return toast.error("Please select an account to continue.");
    }

    router.push(`/transactions/upload?accountId=${accountId}`);
  };

  const isDisabled = paginationInfo.isLoading || deleteTransactions.isPending;

  if (paginationInfo.isLoading) {
    return (
      <div className="mx-auto -mt-4 w-full max-w-screen-2xl pb-10 lg:-mt-20">
        <Card className="border-none drop-shadow-sm">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>

          <CardContent>
            <div className="flex h-[500px] w-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-slate-300" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AccountDialog />

      <div className="mx-auto -mt-4 w-full max-w-screen-2xl pb-10 lg:-mt-20">
        <Card className="border-none drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="line-clamp-1 text-xl">
            Transaction History
          </CardTitle>

          <div className="flex flex-col items-center gap-x-2 gap-y-2 lg:flex-row">
            <Button
              size="sm"
              onClick={newTransaction.onOpen}
              className="w-full lg:w-auto"
            >
              <Plus className="mr-2 size-4" /> Add new
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void onUpload()}
              className="w-full lg:w-auto"
            >
              <Plus className="mr-2 size-4" /> Import CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <PaginatedDataTable
            filterKey="payee"
            columns={columns}
            data={transactions}
            onDelete={(row) => {
              const ids = row.map((r) => r.original.id);

              deleteTransactions.mutate({ ids });
            }}
            disabled={isDisabled}
            paginationInfo={paginationInfo}
            paginationCallbacks={paginationCallbacks}
          />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default TransactionsPage;
