import { Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDeleteAccount } from "@/features/accounts/api/use-delete-account";
import { useEditAccount } from "@/features/accounts/api/use-edit-account";
import { useGetAccount } from "@/features/accounts/api/use-get-account";
import { useOpenAccount } from "@/features/accounts/hooks/use-open-account";
import type { AccountFormValues } from "@/features/accounts/lib/account-form-schema";
import { useConfirm } from "@/hooks/use-confirm";

import { AccountForm } from "./account-form";

export const EditAccountSheet = () => {
  const { isOpen, onClose, id } = useOpenAccount();

  const [ConfirmDialog, confirm] = useConfirm(
    "¿Quieres eliminar la cuenta?",
    "Esta acción eliminará la cuenta y sus transacciones.",
  );

  const accountQuery = useGetAccount(id);
  const editMutation = useEditAccount(id);
  const deleteMutation = useDeleteAccount(id);

  const isPending = editMutation.isPending || deleteMutation.isPending;

  const isLoading = accountQuery.isLoading;

  const onSubmit = (values: AccountFormValues) => {
    editMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const defaultValues = accountQuery.data
    ? {
        name: accountQuery.data.name,
      }
    : {
        name: "",
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
            <SheetTitle>Editar cuenta</SheetTitle>

            <SheetDescription>Edita una cuenta existente.</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            </div>
          ) : accountQuery.isError ? (
            <p className="text-sm text-destructive" role="alert">
              No se pudo cargar la cuenta. Cierra la ventana e inténtalo de nuevo.
            </p>
          ) : accountQuery.data ? (
            <AccountForm
              id={id}
              defaultValues={defaultValues}
              onSubmit={onSubmit}
              disabled={isPending}
              onDelete={onDelete}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
};
