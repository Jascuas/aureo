import { Info, MinusCircle, PlusCircle } from "lucide-react";
import CurrencyInput from "react-currency-input-field";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AmountInputProps = {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
};

export const AmountInput = ({
  value,
  onChange,
  placeholder,
  disabled,
}: AmountInputProps) => {
  const parsedValue = parseFloat(value);
  const isIncome = parsedValue > 0;
  const isExpense = parsedValue < 0;

  const onReverseValue = () => {
    if (!value) return;

    const reversedValue = parseFloat(value) * -1;
    onChange(reversedValue.toString());
  };

  return (
    <div className="relative">
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onReverseValue}
              disabled={disabled}
              className={cn(
                "bg-muted absolute left-1.5 top-1.5 flex items-center justify-center rounded-md p-2 text-muted-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
                isIncome && "bg-crt-pos text-background hover:bg-crt-pos",
                isExpense && "bg-destructive text-destructive-foreground hover:bg-destructive",
              )}
            >
              {!parsedValue && <Info className="size-3" />}
              {isIncome && <PlusCircle className="size-3" />}
              {isExpense && <MinusCircle className="size-3" />}
            </button>
          </TooltipTrigger>

          <TooltipContent>Cambia el signo del importe.</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CurrencyInput
        prefix="€"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={placeholder}
        value={value}
        decimalScale={2}
        decimalsLimit={2}
        onValueChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};
