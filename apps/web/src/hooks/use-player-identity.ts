"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export type PlayerIdentity = {
  userId: string;
  username: string;
  kind: "google" | "guest";
};

const STORAGE_KEY = "animal-chess-guest";

export function usePlayerIdentity(usernameOverride?: string) {
  const { data: session } = useSession();
  const [guest, setGuest] = useState<PlayerIdentity | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as PlayerIdentity) : undefined;
  });

  if (session?.user?.email) {
    return {
      identity: {
        userId: session.user.email,
        username: usernameOverride ?? session.user.name ?? session.user.email.split("@")[0],
        kind: "google" as const
      },
      signInGuest: () => undefined,
      signOutGuest: () => undefined
    };
  }

  return {
    identity: guest
      ? {
          ...guest,
          username: usernameOverride ?? guest.username
        }
      : undefined,
    signInGuest: (username: string) => {
      const nextGuest = {
        userId: crypto.randomUUID(),
        username: username.trim(),
        kind: "guest" as const
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextGuest));
      setGuest(nextGuest);
    },
    signOutGuest: () => {
      window.localStorage.removeItem(STORAGE_KEY);
      setGuest(undefined);
    }
  };
}
