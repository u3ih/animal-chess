type ClassValue = string | number | false | null | undefined;

/** Join truthy class names with spaces. Tiny `clsx`-style helper shared across UI + app. */
export function cx(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}
