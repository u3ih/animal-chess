"use client";

import type { Player } from "@animal-chess/game-core";

/**
 * Costume registry — presentation only (the engine never sees it). A costume is a small
 * 3D accessory mesh mounted on the animal at a slot anchor (hat = head top, body = chest).
 * The future shop adds entries here + persists an `equipped` map per player; nothing in the
 * render path or the game engine changes.
 */

export type CostumeId = string;
export type CostumeSlot = "hat" | "body" | "accessory";

export interface CostumeDef {
  id: CostumeId;
  /** i18n key resolved by the shop UI (kept out of game logic). */
  nameKey: string;
  slot: CostumeSlot;
  /** Soft-currency price for the shop; 0 = owned by default. */
  price: number;
  /** r3f accessory drawn around the slot anchor (local origin). */
  Accessory: (props: { owner: Player }) => React.ReactElement | null;
}

export const DEFAULT_COSTUME: CostumeId = "none";

const TEAM: Record<Player, string> = { red: "#e0563c", blue: "#4a82d6" };

const NONE: CostumeDef = {
  id: "none",
  nameKey: "shop.costumes.none",
  slot: "hat",
  price: 0,
  Accessory: () => null
};

const STRAW_HAT: CostumeDef = {
  id: "straw_hat",
  nameKey: "shop.costumes.strawHat",
  slot: "hat",
  price: 120,
  Accessory: () => (
    <group>
      <mesh castShadow position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 0.04, 20]} />
        <meshStandardMaterial color="#d8b35a" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.1, 0]}>
        <coneGeometry args={[0.18, 0.22, 18]} />
        <meshStandardMaterial color="#e6c873" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <torusGeometry args={[0.17, 0.022, 8, 20]} />
        <meshStandardMaterial color="#9c7a2c" roughness={0.7} />
      </mesh>
    </group>
  )
};

const GOLD_CROWN: CostumeDef = {
  id: "gold_crown",
  nameKey: "shop.costumes.goldCrown",
  slot: "hat",
  price: 400,
  Accessory: () => (
    <group>
      <mesh castShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.1, 20]} />
        <meshStandardMaterial color="#f4cf52" roughness={0.3} metalness={0.7} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2).map((a) => (
        <mesh key={a} castShadow position={[Math.cos(a) * 0.19, 0.13, Math.sin(a) * 0.19]}>
          <coneGeometry args={[0.04, 0.12, 8]} />
          <meshStandardMaterial color="#f4cf52" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0.21]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#e8584a" roughness={0.2} metalness={0.3} emissive="#651a14" />
      </mesh>
    </group>
  )
};

const CAPE: CostumeDef = {
  id: "cape",
  nameKey: "shop.costumes.cape",
  slot: "body",
  price: 220,
  Accessory: ({ owner }) => (
    <group>
      {/* clasp at the throat */}
      <mesh castShadow position={[0, 0.12, 0.04]}>
        <sphereGeometry args={[0.05, 14, 14]} />
        <meshStandardMaterial color="#f4cf52" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* drape down the back */}
      <mesh castShadow position={[0, -0.12, -0.16]} rotation={[0.32, 0, 0]}>
        <coneGeometry args={[0.34, 0.62, 18, 1, true]} />
        <meshStandardMaterial color={TEAM[owner]} roughness={0.6} side={2} />
      </mesh>
    </group>
  )
};

export const COSTUMES: Record<CostumeId, CostumeDef> = {
  none: NONE,
  straw_hat: STRAW_HAT,
  gold_crown: GOLD_CROWN,
  cape: CAPE
};

/** Stable order for shop listing. */
export const COSTUME_IDS: CostumeId[] = ["none", "straw_hat", "gold_crown", "cape"];

export function getCostume(id: CostumeId | undefined): CostumeDef {
  return COSTUMES[id ?? DEFAULT_COSTUME] ?? NONE;
}
