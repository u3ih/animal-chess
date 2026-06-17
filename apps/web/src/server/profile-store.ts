import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Profile = {
  email: string;
  username: string;
  image?: string | null;
  friends: string[];
};

const dataDir = path.join(process.cwd(), ".data");
const filePath = path.join(dataDir, "profiles.json");

async function readProfiles(): Promise<Record<string, Profile>> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as Record<string, Profile>;
  } catch {
    return {};
  }
}

async function writeProfiles(profiles: Record<string, Profile>): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(filePath, JSON.stringify(profiles, null, 2), "utf8");
}

export async function getOrCreateProfile(email: string, username: string, image?: string | null): Promise<Profile> {
  const profiles = await readProfiles();
  if (!profiles[email]) {
    profiles[email] = { email, username, image, friends: [] };
    await writeProfiles(profiles);
  } else if (!profiles[email].friends) {
    profiles[email] = { ...profiles[email], friends: [] };
    await writeProfiles(profiles);
  }
  return profiles[email];
}

export async function updateUsername(email: string, username: string): Promise<Profile> {
  const profiles = await readProfiles();
  const current = profiles[email];
  if (!current) throw new Error("Profile not found");
  profiles[email] = { ...current, username };
  await writeProfiles(profiles);
  return profiles[email];
}

export async function updateFriends(email: string, friends: string[]): Promise<Profile> {
  const profiles = await readProfiles();
  const current = profiles[email];
  if (!current) throw new Error("Profile not found");
  profiles[email] = { ...current, friends };
  await writeProfiles(profiles);
  return profiles[email];
}
