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

interface GenericSelectProps<T extends string> {
  value: T;
  options: Option<T>[];
  placeholder?: string;
  icon?: ReactNode;
  onChange: (v: T) => void;
}

export function GenericSelect<T extends string>({
  value,
  options,
  placeholder = "Select…",
  icon,
  onChange,
}: GenericSelectProps<T>) {
  return (
    <Select defaultValue={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 rounded-md px-3 lg:w-auto">
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
