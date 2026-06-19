/**
 * Build-time flags for the static GitHub Pages export (AI-only, no server).
 * `NEXT_PUBLIC_*` vars are inlined by Next at build, so these are tree-shakeable
 * constants in the client bundle. Both default to the full-server build.
 */
export const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
