/**
 * Build-time flags for the static GitHub Pages export (AI-only, no server).
 * `NEXT_PUBLIC_*` vars are inlined by Next at build, so these are tree-shakeable
 * constants in the client bundle. Both default to the full-server build.
 */
export const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Base URL of the Python GraphQL backend (users, friends, rank, gamification).
 * Empty string = same origin (only meaningful for the full-server build; the static
 * export has no backend and online/social features are disabled — see STATIC_EXPORT).
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** HTTP(S) GraphQL endpoint. */
export const GRAPHQL_HTTP_URL = `${API_URL}/graphql`;

/** WebSocket GraphQL endpoint (graphql-ws) for subscriptions. */
export const GRAPHQL_WS_URL = `${API_URL.replace(/^http/, "ws")}/graphql`;
