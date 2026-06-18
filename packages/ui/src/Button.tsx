import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type Variant = "primary" | "default" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: ReactNode;
};

/** Thin button wrapper: defaults type="button", maps variant -> className, merges caller className. */
export function Button({ variant = "default", icon, className, children, type, ...rest }: ButtonProps) {
  return (
    <button type={type ?? "button"} className={cx(variant !== "default" && variant, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Required for accessibility — icon-only buttons need an accessible name. */
  label: string;
  icon: ReactNode;
};

/** Icon-only button. `label` feeds both title and aria-label; pass className for styling. */
export function IconButton({ label, icon, className, type, ...rest }: IconButtonProps) {
  return (
    <button type={type ?? "button"} className={className} title={label} aria-label={label} {...rest}>
      {icon}
    </button>
  );
}
