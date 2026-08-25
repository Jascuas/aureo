"use client";

import { useMemo } from "react";
import ReactSelect, { type SingleValue } from "react-select";
import CreatableSelect from "react-select/creatable";

type SelectProps = {
  onChange: (value?: string) => void;
  onCreate?: (value: string) => void;
  options?: { label: string; value: string }[];
  value?: string | null | undefined;
  disabled?: boolean;
  isClearable?: boolean;
  placeholder?: string;
};

export const Select = ({
  value,
  onChange,
  onCreate,
  options = [],
  disabled,
  isClearable,
  placeholder,
}: SelectProps) => {
  const onSelect = (option: SingleValue<{ label: string; value: string }>) => {
    onChange(option?.value);
  };

  const formattedValue = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  const selectProps = {
    placeholder,
    className: "h-10 text-sm",
    styles: {
      control: (base: object) => ({
        ...base,
        backgroundColor: "hsl(var(--background))",
        borderColor: "hsl(var(--border))",
        ":hover": {
          borderColor: "hsl(var(--border))",
        },
      }),
      menu: (base: object) => ({
        ...base,
        backgroundColor: "hsl(var(--popover))",
      }),
      option: (base: object, state: { isFocused: boolean }) => ({
        ...base,
        backgroundColor: state.isFocused
          ? "hsl(var(--accent))"
          : "hsl(var(--popover))",
        color: "hsl(var(--popover-foreground))",
        ":active": {
          backgroundColor: "hsl(var(--accent))",
        },
      }),
      input: (base: object) => ({
        ...base,
        color: "hsl(var(--foreground))",
      }),
      singleValue: (base: object) => ({
        ...base,
        color: "hsl(var(--foreground))",
      }),
      placeholder: (base: object) => ({
        ...base,
        color: "hsl(var(--muted-foreground))",
      }),
      indicatorSeparator: () => ({
        display: "none",
      }),
    },
    value: formattedValue,
    onChange: onSelect,
    options,
    isDisabled: disabled,
    isClearable,
  };

  return onCreate ? (
    <CreatableSelect {...selectProps} onCreateOption={onCreate} />
  ) : (
    <ReactSelect {...selectProps} />
  );
};
