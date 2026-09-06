import { Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCreateAccount } from "@/features/accounts/api/use-create-account";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { useCreateCategory } from "@/features/categories/api/use-create-category";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { useGetTransactionTypes } from "@/features/transaction-types/api/use-get-transaction-types";
import { isSupportedTransactionTypeId } from "@/features/transaction-types/lib/transaction-types";
import { useDeleteTransaction } from "@/features/transactions/api/use-delete-transaction";
import { useEditTransaction } from "@/features/transactions/api/use-edit-transaction";
import { useGetTransaction } from "@/features/transactions/api/use-get-transaction";
import { useOpenTransaction } from "@/features/transactions/hooks/use-open-transaction";
import type {
  TransactionFormValues,
  TransactionMutationValues,
} from "@/features/transactions/lib/transaction-form-schema";
import { useConfirm } from "@/hooks/use-confirm";
import type { Account, Category, TransactionType } from "@/lib/api-types";

import { TransactionForm } from "./transaction-form";

export const EditTransactionSheet = () => {
  const { isOpen, onClose, id } = useOpenTransaction();

  const [ConfirmDialog, confirm] = useConfirm(
    "¿Quieres eliminar la transacción?",
    "Esta acción eliminará la transacción seleccionada.",
  );

  const transactionQuery = useGetTransaction(id);
  const editMutation = useEditTransaction(id);
  const deleteMutation = useDeleteTransaction(id);

  const categoryMutation = useCreateCategory();
  const categoryQuery = useGetCategories();
  const categoryOptions = (categoryQuery.data ?? []).map(
    (category: Category) => ({
      label: category.name,
      value: category.id,
    }),
  );

  const accountMutation = useCreateAccount();
  const accountQuery = useGetAccounts();
  const accountOptions = (accountQuery.data ?? []).map((account: Account) => ({
    label: account.name,
    value: account.id,
  }));

  const transactionTypesQuery = useGetTransactionTypes();
  const transactionTypeOptions = (transactionTypesQuery.data ?? []).map(
    (type: TransactionType) => ({
      label: type.name,
      value: type.id,
    }),
  );

  const onCreateAccount = (name: string) => accountMutation.mutate({ name });
  const onCreateCategory = (name: string) => categoryMutation.mutate({ name });

  const isPending =
    editMutation.isPending ||
    deleteMutation.isPending ||
    categoryMutation.isPending ||
    accountMutation.isPending;

  const isLoading =
    transactionQuery.isLoading ||
    categoryQuery.isLoading ||
    accountQuery.isLoading ||
    transactionTypesQuery.isLoading;
  const hasReferenceError =
    transactionQuery.isError ||
    categoryQuery.isError ||
    accountQuery.isError ||
    transactionTypesQuery.isError;
  const hasRequiredOptions =
    accountOptions.length > 0 && transactionTypeOptions.length > 0;

  const onSubmit = (values: TransactionMutationValues) => {
    editMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const defaultValues: TransactionFormValues = transactionQuery.data
    ? {
        accountId: transactionQuery.data.accountId,
        categoryId: transactionQuery.data.categoryId,
        amount: transactionQuery.data.amount.toString(),
        date: transactionQuery.data.date
          ? new Date(transactionQuery.data.date)
          : new Date(),
        payee: transactionQuery.data.payee,
        notes: transactionQuery.data.notes,
        transactionTypeId: transactionQuery.data.transactionTypeId,
      }
    : {
        accountId: "",
        categoryId: "",
        amount: "",
        date: new Date(),
        payee: "",
        notes: "",
        transactionTypeId: "",
      };

  const onDelete = async () => {
    const ok = await confirm();

    if (ok) {
      deleteMutation.mutate(undefined, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  return (
    <>
      <ConfirmDialog />
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && !isPending) onClose();
        }}
      >
        <SheetContent className="space-y-4">
          <SheetHeader>
            <SheetTitle>Editar transacción</SheetTitle>

            <SheetDescription>Edita una transacción existente.</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            </div>
          ) : hasReferenceError ? (
            <p className="text-sm text-destructive" role="alert">
              No se pudo cargar la transacción. Cierra la ventana e inténtalo de
              nuevo.
            </p>
          ) : !hasRequiredOptions ? (
            <p className="text-sm text-muted-foreground">
              No hay cuentas o tipos de transacción disponibles para editar este
              movimiento.
            </p>
          ) : (
            <TransactionForm
              id={id}
              defaultValues={defaultValues}
              onSubmit={onSubmit}
              disabled={isPending}
              categoryOptions={categoryOptions}
              onCreateCategory={onCreateCategory}
              accountOptions={accountOptions}
              onCreateAccount={onCreateAccount}
              transactionTypeOptions={transactionTypeOptions}
              unsupportedTransactionTypeId={
                transactionQuery.data &&
                !isSupportedTransactionTypeId(
                  transactionQuery.data.transactionTypeId,
                )
                  ? transactionQuery.data.transactionTypeId
                  : undefined
              }
              onDelete={onDelete}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
