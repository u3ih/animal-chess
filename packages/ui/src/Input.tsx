import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Thin text input wrapper — className passthrough, defaults type="text". */
export function Input({ type, ...rest }: InputProps) {
  return <input type={type ?? "text"} {...rest} />;
}
