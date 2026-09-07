"use client";

import { type AriaAttributes, forwardRef, useMemo } from "react";
import ReactSelect, { type SelectInstance, type SingleValue } from "react-select";
import CreatableSelect from "react-select/creatable";

type SelectProps = {
  onChange: (value?: string) => void;
  onCreate?: (value: string) => void;
  options?: { label: string; value: string }[];
  value?: string | null | undefined;
  disabled?: boolean;
  isClearable?: boolean;
  placeholder?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
};

type SelectOption = { label: string; value: string };
type SelectRef = SelectInstance<SelectOption, false>;

export const Select = forwardRef<SelectRef, SelectProps>(
  ({
    value,
    onChange,
    onCreate,
    options = [],
    disabled,
    isClearable,
    placeholder,
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  }, ref) => {
  const onSelect = (option: SingleValue<SelectOption>) => {
    onChange(option?.value);
  };

  const formattedValue = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  const selectProps = {
    placeholder,
    inputId: id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
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
        color: state.isFocused ? "var(--crt-accent-fg)" : "var(--crt-fg)",
        ":active": {
          backgroundColor: "var(--crt-accent)",
          color: "var(--crt-accent-fg)",
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
    <CreatableSelect {...selectProps} ref={ref} onCreateOption={onCreate} />
  ) : (
    <ReactSelect {...selectProps} ref={ref} />
  );
});
Select.displayName = "Select";
