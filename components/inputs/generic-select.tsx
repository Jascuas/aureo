// components/GenericSelect.tsx
import * as React from "react";

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
  icon?: React.ReactNode;
  onChange: (v: T) => void;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
};

function GenericSelectInner<T extends string>(
  {
    value,
    options,
    placeholder = "Select…",
    icon,
    onChange,
    disabled,
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  }: GenericSelectProps<T>,
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        ref={ref}
        id={id}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className="h-9 lg:w-auto"
      >
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

export const GenericSelect = React.forwardRef(GenericSelectInner) as <
  T extends string,
>(
  props: GenericSelectProps<T> & React.RefAttributes<HTMLButtonElement>,
) => React.ReactElement;
