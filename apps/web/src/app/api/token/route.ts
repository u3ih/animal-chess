import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Hands the raw (still-encrypted) NextAuth session JWE to the signed-in client so it can
// authenticate to the separate Python GraphQL backend (bearer header + graphql-ws params).
// The httpOnly session cookie is sent automatically because this route is same-origin.
// Guests have no session ⇒ `{ token: null }`.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, raw: true, secret: process.env.NEXTAUTH_SECRET });
  return Response.json({ token: token ?? null });
}
