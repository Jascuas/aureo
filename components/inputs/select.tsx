"use client";

import { useMemo } from "react";
import type { SingleValue } from "react-select";
import CreatableSelect from "react-select/creatable";

type SelectProps = {
  onChange: (value?: string) => void;
  onCreate?: (value: string) => void;
  options?: { label: string; value: string }[];
  value?: string | null | undefined;
  disabled?: boolean;
  placeholder?: string;
};

export const Select = ({
  value,
  onChange,
  onCreate,
  options = [],
  disabled,
  placeholder,
}: SelectProps) => {
  const onSelect = (option: SingleValue<{ label: string; value: string }>) => {
    onChange(option?.value);
  };

  const formattedValue = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  return (
    <CreatableSelect
      placeholder={placeholder}
      className="h-10 text-sm"
      styles={{
        control: (base) => ({
          ...base,
          backgroundColor: "hsl(var(--background))",
          borderColor: "hsl(var(--border))",
          ":hover": {
            borderColor: "hsl(var(--border))",
          },
        }),
        menu: (base) => ({
          ...base,
          backgroundColor: "hsl(var(--popover))",
        }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isFocused
            ? "hsl(var(--accent))"
            : "hsl(var(--popover))",
          color: "hsl(var(--popover-foreground))",
          ":active": {
            backgroundColor: "hsl(var(--accent))",
          },
        }),
        input: (base) => ({
          ...base,
          color: "hsl(var(--foreground))",
        }),
        singleValue: (base) => ({
          ...base,
          color: "hsl(var(--foreground))",
        }),
        placeholder: (base) => ({
          ...base,
          color: "hsl(var(--muted-foreground))",
        }),
        indicatorSeparator: () => ({
          display: "none",
        }),
      }}
      value={formattedValue}
      onChange={onSelect}
      options={options}
      onCreateOption={onCreate}
      isDisabled={disabled}
    />
  );
};
