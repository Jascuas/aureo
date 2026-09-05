import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Trash } from "lucide-react";
import { useForm } from "react-hook-form";

import { AmountInput } from "@/components/inputs/amount-input";
import { DatePicker } from "@/components/inputs/date-picker";
import { GenericSelect } from "@/components/inputs/generic-select";
import { Select } from "@/components/inputs/select";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  transactionFormSchema,
  type TransactionFormValues,
  transactionMutationSchema,
  type TransactionMutationValues,
} from "@/features/transactions/lib/transaction-form-schema";
import { convertAmountToMilliunits } from "@/lib/utils";

type TransactionFormProps = {
  id?: string;
  defaultValues?: TransactionFormValues;
  onSubmit: (values: TransactionMutationValues) => void;
  onDelete?: () => void;
  disabled?: boolean;
  accountOptions: { label: string; value: string }[];
  categoryOptions: { label: string; value: string }[];
  transactionTypeOptions: { label: string; value: string }[];
  unsupportedTransactionTypeId?: string;
  onCreateAccount: (name: string) => void;
  onCreateCategory: (name: string) => void;
};

const DEFAULT_TRANSACTION_FORM_VALUES: TransactionFormValues = {
  accountId: "",
  amount: "",
  categoryId: null,
  date: new Date(),
  notes: "",
  payee: "",
  transactionTypeId: "",
};

export const TransactionForm = ({
  id,
  defaultValues,
  onSubmit,
  onDelete,
  disabled,
  accountOptions,
  categoryOptions,
  transactionTypeOptions,
  unsupportedTransactionTypeId,
  onCreateAccount,
  onCreateCategory,
}: TransactionFormProps) => {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaultValues ?? DEFAULT_TRANSACTION_FORM_VALUES,
  });
  const handleSubmit = (values: TransactionFormValues) => {
    if (!accountOptions.some((option) => option.value === values.accountId)) {
      form.setError("accountId", { message: "Selecciona una cuenta válida." });
      return;
    }

    if (
      values.categoryId &&
      !categoryOptions.some((option) => option.value === values.categoryId)
    ) {
      form.setError("categoryId", {
        message: "Selecciona una categoría válida o déjala vacía.",
      });
      return;
    }

    if (
      !transactionTypeOptions.some(
        (option) => option.value === values.transactionTypeId,
      )
    ) {
      form.setError("transactionTypeId", {
        message: "Selecciona un tipo de transacción válido.",
      });
      return;
    }

    const amountInMilliunits = convertAmountToMilliunits(values.amount);

    onSubmit(
      transactionMutationSchema.parse({
        ...values,
        amount: amountInMilliunits,
        date: format(values.date, "yyyy-MM-dd"),
      }),
    );
  };

  const handleDelete = () => {
    onDelete?.();
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        autoCapitalize="off"
        autoComplete="off"
        className="space-y-4 pt-4"
      >
        <FormField
          name="date"
          control={form.control}
          disabled={disabled}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="accountId"
          control={form.control}
          disabled={disabled}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta</FormLabel>

              <FormControl>
                <Select
                  placeholder="Selecciona una cuenta"
                  options={accountOptions}
                  onCreate={onCreateAccount}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="categoryId"
          control={form.control}
          disabled={disabled}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>

              <FormControl>
                <Select
                  placeholder="Selecciona una categoría"
                  options={categoryOptions}
                  onCreate={onCreateCategory}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="transactionTypeId"
          control={form.control}
          disabled={disabled}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>

              <FormControl>
                <GenericSelect
                  placeholder="Selecciona un tipo"
                  options={transactionTypeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>

              <FormMessage />
              {unsupportedTransactionTypeId && (
                <p className="text-destructive text-sm" role="alert">
                  Este tipo de transacción ya no es compatible. Selecciona un
                  tipo admitido antes de guardar los cambios.
                </p>
              )}
            </FormItem>
          )}
        />

        <FormField
          name="payee"
          control={form.control}
          disabled={disabled}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beneficiario</FormLabel>

              <FormControl>
                <Input
                  disabled={disabled}
                  placeholder="Añade un beneficiario"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="amount"
          control={form.control}
          disabled={disabled}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Importe</FormLabel>

              <FormControl>
                <AmountInput
                  {...field}
                  disabled={disabled}
                  placeholder="0.00"
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="notes"
          control={form.control}
          disabled={disabled}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>

              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  disabled={disabled}
                  placeholder="Notas opcionales..."
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="w-full" disabled={disabled}>
          {disabled && <Loader2 className="mr-2 size-4 animate-spin" />}
          {id ? "Guardar cambios" : "Crear transacción"}
        </Button>

        {!!id && (
          <Button
            type="button"
            disabled={disabled}
            onClick={handleDelete}
            className="w-full"
            variant="outline"
          >
            <Trash className="mr-2 size-4" />
            Eliminar transacción
          </Button>
        )}
      </form>
    </Form>
  );
};
