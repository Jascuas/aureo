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
    className: "min-h-11 text-sm",
    styles: {
      control: (base: object) => ({
        ...base,
        minHeight: 44,
        backgroundColor: "var(--crt-bg)",
        borderColor: "var(--crt-border)",
        ":hover": {
          borderColor: "var(--crt-accent)",
        },
      }),
      menu: (base: object) => ({
        ...base,
        backgroundColor: "var(--crt-surface)",
      }),
      option: (base: object, state: { isFocused: boolean }) => ({
        ...base,
        backgroundColor: state.isFocused
          ? "var(--crt-accent)"
          : "var(--crt-surface)",
        color: "var(--crt-fg)",
        ":active": {
          backgroundColor: "var(--crt-accent)",
        },
      }),
      input: (base: object) => ({
        ...base,
        color: "var(--crt-fg)",
      }),
      singleValue: (base: object) => ({
        ...base,
        color: "var(--crt-fg)",
      }),
      placeholder: (base: object) => ({
        ...base,
        color: "var(--crt-muted)",
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
