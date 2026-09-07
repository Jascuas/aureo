import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TableHeadSelectProps = {
  columnIndex: number;
  headerLabel: string;
  selectedColumns: Record<string, string | null>;
  onChange: (columnIndex: number, value: string | null) => void;
};

const options = [
  { value: "amount", label: "Importe" },
  { value: "payee", label: "Beneficiario" },
  { value: "date", label: "Fecha" },
];

export const TableHeadSelect = ({
  columnIndex,
  headerLabel,
  selectedColumns,
  onChange,
}: TableHeadSelectProps) => {
  const currentSelection = selectedColumns[`column_${columnIndex}`];

  return (
    <Select
      value={currentSelection || "skip"}
      onValueChange={(value) => onChange(columnIndex, value)}
    >
      <SelectTrigger
        className={cn(
          "min-h-11 border-none bg-transparent capitalize outline-none focus:ring-transparent focus:ring-offset-0",
          currentSelection && "text-crt-accent",
        )}
        aria-label={`Asignar columna ${columnIndex + 1}: ${headerLabel || "sin nombre"}`}
      >
        <SelectValue placeholder="Ignorar" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="skip">Ignorar</SelectItem>
        {options.map((option) => {
          const disabled =
            Object.values(selectedColumns).includes(option.value) &&
            selectedColumns[`column_${columnIndex}`] !== option.value;

          return (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={disabled}
              className="capitalize"
            >
              {option.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
