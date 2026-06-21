"use client";

import { createClient, type Client as WsClient } from "graphql-ws";
import type { PlayerIdentity } from "@/hooks/use-player-identity";
import { GRAPHQL_HTTP_URL, GRAPHQL_WS_URL } from "./flags";

/**
 * Thin GraphQL client for the Python backend: native `fetch` for queries/mutations,
 * `graphql-ws` for subscriptions. The NextAuth session JWE (fetched from /api/token) is the
 * bearer credential; guests authenticate over the WS `connectionParams` only.
 */

let cachedToken: string | null | undefined;

export async function getAuthToken(identity?: PlayerIdentity): Promise<string | null> {
  if (identity?.kind !== "google") return null;
  if (cachedToken !== undefined) return cachedToken;
  try {
    const res = await fetch("/api/token");
    const data = (await res.json()) as { token: string | null };
    cachedToken = data.token ?? null;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export function clearAuthToken(): void {
  cachedToken = undefined;
}

export async function gqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  identity?: PlayerIdentity
): Promise<T> {
  const token = await getAuthToken(identity);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(GRAPHQL_HTTP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables })
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

export async function createSocialWsClient(identity?: PlayerIdentity): Promise<WsClient> {
  const token = await getAuthToken(identity);
  return createClient({
    url: GRAPHQL_WS_URL,
    lazy: true,
    retryAttempts: 5,
    connectionParams: () => {
      if (token) return { authToken: token };
      if (identity?.kind === "guest") return { guest: { userId: identity.userId, username: identity.username } };
      return {};
    }
  });
}
