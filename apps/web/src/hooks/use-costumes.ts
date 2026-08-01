"use client";

import type { PieceKind } from "@animal-chess/game-core";
import { OWNED_COSMETICS_QUERY, PURCHASE_COSMETIC } from "@animal-chess/social-protocol";
import { useCallback, useEffect, useRef, useState } from "react";
import { COSTUME_IDS, DEFAULT_COSTUME, type EquippedCostumes, getCostume } from "@/components/three/skins";
import type { PlayerIdentity } from "@/hooks/use-player-identity";
import { STATIC_EXPORT } from "@/lib/flags";
import { gqlRequest } from "@/lib/gql";

const STORAGE_KEY = "animal-chess-costumes";

/** Free (price-0) costume ids — owned by everyone, including guests / static export. */
const FREE_IDS = COSTUME_IDS.filter((id) => getCostume(id).price === 0);

export type CostumesApi = {
  equipped: EquippedCostumes;
  owned: Set<string>;
  equip: (kind: PieceKind, id: string) => void;
  purchase: (id: string) => Promise<void>;
  purchasing?: string;
  error?: string;
};

/**
 * Costume state. Equip choices live in localStorage (work offline / for guests / on static export);
 * ownership of paid costumes is fetched from the backend for signed-in google users and extended by
 * purchases. Free costumes are always owned.
 */
export function useCostumes(identity?: PlayerIdentity): CostumesApi {
  const [equipped, setEquipped] = useState<EquippedCostumes>({});
  const [owned, setOwned] = useState<Set<string>>(() => new Set(FREE_IDS));
  const [purchasing, setPurchasing] = useState<string>();
  const [error, setError] = useState<string>();
  const identityRef = useRef(identity);
  identityRef.current = identity;

  // Hydrate equip state on mount (avoids an SSR/localStorage hydration mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setEquipped(JSON.parse(stored) as EquippedCostumes);
    } catch {
      // ignore malformed storage
    }
  }, []);

  // Fetch backend ownership for signed-in google users (never on static export / for guests).
  const isGoogle = identity?.kind === "google";
  const userId = identity?.userId;
  // biome-ignore lint/correctness/useExhaustiveDependencies: userId re-triggers the fetch on account switch (the request reads identityRef).
  useEffect(() => {
    if (STATIC_EXPORT || !isGoogle) {
      setOwned(new Set(FREE_IDS));
      return;
    }
    let alive = true;
    gqlRequest<{ ownedCosmetics: string[] }>(OWNED_COSMETICS_QUERY, {}, identityRef.current)
      .then((data) => {
        if (alive) setOwned(new Set([...FREE_IDS, ...data.ownedCosmetics]));
      })
      .catch(() => {
        if (alive) setOwned(new Set(FREE_IDS));
      });
    return () => {
      alive = false;
    };
  }, [isGoogle, userId]);

  const equip = useCallback(
    (kind: PieceKind, id: string) => {
      if (id !== DEFAULT_COSTUME && !owned.has(id)) return; // never equip an unowned costume
      setEquipped((prev) => {
        const next: EquippedCostumes = { ...prev };
        if (id === DEFAULT_COSTUME) delete next[kind];
        else next[kind] = id;
        if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [owned]
  );

  const purchase = useCallback(async (id: string) => {
    if (STATIC_EXPORT || identityRef.current?.kind !== "google") return;
    setPurchasing(id);
    setError(undefined);
    try {
      await gqlRequest<{ purchaseCosmetic: { cosmeticId: string; coins: number } }>(
        PURCHASE_COSMETIC,
        { cosmeticId: id },
        identityRef.current
      );
      setOwned((prev) => new Set([...prev, id]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "purchase failed");
    } finally {
      setPurchasing(undefined);
    }
  }, []);

  return { equipped, owned, equip, purchase, purchasing, error };
}
