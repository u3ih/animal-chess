import crypto from "node:crypto";

/**
 * Fire-and-forget client for the Python backend's internal GraphQL schema
 * (`/internal/graphql`). Calls are HMAC-signed with INTERNAL_SYNC_SECRET and retried in
 * the background; a Python outage never blocks the Node game loop.
 */

const PYTHON_URL = process.env.PYTHON_SYNC_URL ?? "http://localhost:8000";
const SECRET = process.env.INTERNAL_SYNC_SECRET ?? "";
const ENDPOINT = `${PYTHON_URL}/internal/graphql`;
const BACKOFF_MS = [500, 2000, 8000];

function sign(body: string, timestamp: string): string {
  return crypto.createHmac("sha256", SECRET).update(`${timestamp}.${body}`).digest("hex");
}

async function call(query: string, variables: Record<string, unknown>, attempt = 0): Promise<void> {
  if (!SECRET) return; // sync disabled until the shared secret is configured
  const body = JSON.stringify({ query, variables });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-signature": sign(body, timestamp),
        "x-timestamp": timestamp
      },
      body
    });
    if (!res.ok && res.status >= 500) throw new Error(`status ${res.status}`);
  } catch (err) {
    if (attempt < BACKOFF_MS.length) {
      setTimeout(() => void call(query, variables, attempt + 1), BACKOFF_MS[attempt]);
    } else {
      console.warn("[python-sync] giving up after retries:", (err as Error).message);
    }
  }
}

export type SyncColor = "red" | "blue";

export type MatchResultPayload = {
  matchId: string;
  players: { userId: string; color: SyncColor }[];
  winner: SyncColor | null;
  reason: "den" | "elimination" | "timeout" | "resign";
  moves: number;
  startedAt: string;
  endedAt: string;
  capturedKinds: { red: string[]; blue: string[] };
};

const REPORT_MATCH = `mutation($input: MatchResultInput!) {
  reportMatchResult(input: $input) { status ranked }
}`;

const REGISTER_ROOM = `mutation($input: RoomInput!) { registerRoom(input: $input) }`;
const UPDATE_ROOM = `mutation($code: String!, $occupancy: Int!) { updateRoom(code: $code, occupancy: $occupancy) }`;
const CLOSE_ROOM = `mutation($code: String!) { closeRoom(code: $code) }`;

export function reportMatchResult(payload: MatchResultPayload): void {
  void call(REPORT_MATCH, { input: payload });
}

export function registerRoom(input: {
  code: string;
  hostId: string;
  hostName: string;
  visibility: "public" | "private";
}): void {
  void call(REGISTER_ROOM, { input });
}

export function updateRoom(code: string, occupancy: number): void {
  void call(UPDATE_ROOM, { code, occupancy });
}

export function closeRoom(code: string): void {
  void call(CLOSE_ROOM, { code });
}
