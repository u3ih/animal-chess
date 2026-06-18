"use client";

import { type ReactNode, useEffect } from "react";
import { cx } from "./cx";

export type ModalProps = {
  ariaLabel: string;
  children: ReactNode;
  /** When provided, the backdrop click and Escape key close the modal. Omit for forced-choice dialogs. */
  onClose?: () => void;
  role?: "dialog" | "alertdialog";
  /** Extra class on `.modal-backdrop`. */
  backdropClassName?: string;
  /** Extra class on `.modal-card`. */
  className?: string;
};

/** Backdrop + card. Centralizes the duplicated overlay markup; adds Esc-to-close when closable. */
export function Modal({ ariaLabel, children, onClose, role = "dialog", backdropClassName, className }: ModalProps) {
  useEffect(() => {
    if (!onClose) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={cx("modal-backdrop", backdropClassName)} onClick={onClose}>
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: role is always dialog|alertdialog, both support aria-modal */}
      <div
        className={cx("modal-card", className)}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
