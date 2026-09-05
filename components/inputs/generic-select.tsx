// components/GenericSelect.tsx
import { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Option<T extends string> = {
  value: T;
  label: string;
};

type GenericSelectProps<T extends string> = {
  value: T;
  options: Option<T>[];
  placeholder?: string;
  icon?: ReactNode;
  onChange: (v: T) => void;
  disabled?: boolean;
};

export function GenericSelect<T extends string>({
  value,
  options,
  placeholder = "Select…",
  icon,
  onChange,
  disabled,
}: GenericSelectProps<T>) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 lg:w-auto">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <div className="flex items-center gap-2">
              {icon}
              <p className="line-clamp-1">{o.label}</p>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
