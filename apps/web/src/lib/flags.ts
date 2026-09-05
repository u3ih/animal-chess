/**
 * Build-time flags. `NEXT_PUBLIC_*` vars are inlined by Next at build, so these are
 * tree-shakeable constants in the client bundle. All default to the full-server build.
 */

/**
 * Server-less, AI-only build (`output: "export"`): no Socket.IO server, no GraphQL backend,
 * no auth. Online + social UI is compiled out. Off for the Vercel and self-hosted builds.
 */
export const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Origin of the Node game server (Socket.IO: rooms, matchmaking, moves, clock, chat).
 * Empty string = same origin, which is what the self-hosted `tsx server.ts` deploy uses.
 * On Vercel the Next app and the game server are different hosts (serverless can't hold a
 * WebSocket), so this must point at the external game server, e.g. https://game.example.com.
 */
export const GAME_SERVER_URL = (process.env.NEXT_PUBLIC_GAME_URL ?? "").replace(/\/+$/, "");

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
