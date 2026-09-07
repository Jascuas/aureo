import { TriangleAlert } from "lucide-react";

import { useOpenCategory } from "@/features/categories/hooks/use-open-category";
import { useOpenTransaction } from "@/features/transactions/hooks/use-open-transaction";
import { cn } from "@/lib/utils";

type CategoryColumnProps = {
  id: string;
  category: string | null;
  categoryId: string | null;
};

export const CategoryColumn = ({
  id,
  category,
  categoryId,
}: CategoryColumnProps) => {
  const { onOpen: onOpenCategory } = useOpenCategory();
  const { onOpen: onOpenTransaction } = useOpenTransaction();

  const onClick = () => {
    if (categoryId) onOpenCategory(categoryId);
    else onOpenTransaction(id);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 cursor-pointer items-center text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        !category && "text-destructive",
      )}
      aria-label={
        category
          ? `Editar categoría ${category}`
          : "Asignar categoría a la transacción"
      }
    >
      {!category && <TriangleAlert className="mr-2 size-4 shrink-0" />}
      {category || "Sin categoría"}
    </button>
  );
};
