import type { ReactNode, SelectHTMLAttributes } from "react";

export type SelectOption = { value: string; label: string };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[];
  /** Optional label wrapping the select (matches the `<label>Text<select/></label>` pattern). */
  label?: ReactNode;
  /** Class applied to the wrapping `<label>` when `label` is set. */
  labelClassName?: string;
};

/** Select rendered from an options list, optionally wrapped in a label. */
export function Select({ options, label, labelClassName, className, ...rest }: SelectProps) {
  const optionEls = options.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ));

  if (label == null) {
    return (
      <select className={className} {...rest}>
        {optionEls}
      </select>
    );
  }

  return (
    <label className={labelClassName}>
      {label}
      <select className={className} {...rest}>
        {optionEls}
      </select>
    </label>
  );
}
