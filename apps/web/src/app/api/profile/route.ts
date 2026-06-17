import { getServerSession } from "next-auth";
import * as v from "valibot";
import { authOptions } from "@/lib/auth";
import { getOrCreateProfile, updateFriends, updateUsername } from "@/server/profile-store";

const usernameSchema = v.pipe(v.string(), v.trim(), v.minLength(2), v.maxLength(24), v.regex(/^[\p{L}\p{N}_ .-]+$/u));

const friendsSchema = v.pipe(v.array(usernameSchema), v.maxLength(100));

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getOrCreateProfile(
    session.user.email,
    session.user.name ?? session.user.email.split("@")[0],
    session.user.image
  );
  return Response.json(profile);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const parsed = v.safeParse(usernameSchema, body.username);
  if (!parsed.success) return Response.json({ error: "Invalid username" }, { status: 400 });
  const profile = await updateUsername(session.user.email, parsed.output);
  return Response.json(profile);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const friends = v.safeParse(friendsSchema, body.friends);
  if (!friends.success) return Response.json({ error: "Invalid friend list" }, { status: 400 });
  const profile = await updateFriends(session.user.email, friends.output);
  return Response.json(profile);
}
