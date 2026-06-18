import { createElement, type ElementType, type ReactNode } from "react";

type PanelProps = {
  /** Wrapper element — defaults to `section`. Use `form` for input panels, `div` where needed. */
  as?: ElementType;
  title: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  // Allow element-specific props (onSubmit, role, aria-*, …) to pass through to the wrapper.
  [key: string]: unknown;
};

/** Side-panel wrapper with the shared `.panel-title` header (icon + title). Polymorphic via `as`. */
export function Panel({ as, title, icon, children, ...rest }: PanelProps) {
  const tag: ElementType = as ?? "section";
  return createElement(
    tag,
    rest,
    <div className="panel-title" key="panel-title">
      {icon}
      {title}
    </div>,
    children
  );
}
