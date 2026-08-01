"use client";

import type { Position } from "@animal-chess/game-core";
import { WATER } from "@animal-chess/game-core";
import { FOUNDATION_Y, tileToWorld, WATER_POST_TOP, WATER_Y } from "./coords";
import { getCylinderGeometry, getRingGeometry, getStandardMaterial } from "./shared-assets";

/**
 * Wooden stilts driven into the moat — one per water cell, so a swimming rat lands *on* something
 * instead of standing in the current. `WATER_POST_TOP` (coords.ts) is the deck height every piece
 * on water rests at; keep the two in sync.
 */

const WOOD = "#6b4c2f";
const DECK = "#8a6640";
const TRUNK_R = 0.12;
const DECK_R = 0.19;
const DECK_H = 0.05;

/** Deterministic 0..1 jitter per cell — posts look hand-driven without a random() reflow. */
function wobble(pos: Position, salt: number): number {
  const n = Math.sin((pos.row * 13.17 + pos.col * 7.31 + salt * 3.7) * 12.9898) * 43758.5453;
  return n - Math.floor(n);
}

function Post({ pos }: { pos: Position }) {
  const [wx, , wz] = tileToWorld(pos);
  const deckY = WATER_POST_TOP - DECK_H / 2;
  const trunkTop = WATER_POST_TOP - DECK_H;
  const trunkH = trunkTop - FOUNDATION_Y;
  const tilt = (wobble(pos, 1) - 0.5) * 0.06;
  const spin = wobble(pos, 2) * Math.PI;

  return (
    <group position={[wx, 0, wz]} rotation={[tilt, spin, tilt * 0.7]}>
      {/* main stilt: foundation → deck */}
      <mesh
        castShadow
        position={[0, FOUNDATION_Y + trunkH / 2, 0]}
        geometry={getCylinderGeometry(TRUNK_R, TRUNK_R * 1.15, trunkH, 10)}
        material={getStandardMaterial(WOOD, 0.95)}
      />
      {/* deck the animal stands on */}
      <mesh
        castShadow
        receiveShadow
        position={[0, deckY, 0]}
        geometry={getCylinderGeometry(DECK_R, DECK_R * 0.92, DECK_H, 14)}
        material={getStandardMaterial(DECK, 0.9)}
      />
      {/* saw-cut growth rings so the stump top reads as timber, not a plate */}
      <mesh
        position={[0, WATER_POST_TOP + 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={getRingGeometry(DECK_R * 0.32, DECK_R * 0.62, 18)}
        material={getStandardMaterial("#5c4026", 1)}
      />

      {/* two shorter stakes poking out of the water beside it */}
      {[0, 1].map((i) => {
        const a = wobble(pos, 3 + i) * Math.PI * 2;
        const r = 0.3 + wobble(pos, 5 + i) * 0.08;
        const h = 0.18 + wobble(pos, 7 + i) * 0.22;
        return (
          <mesh
            key={i}
            castShadow
            position={[Math.cos(a) * r, WATER_Y + h / 2 - 0.1, Math.sin(a) * r]}
            geometry={getCylinderGeometry(0.035, 0.045, h, 8)}
            material={getStandardMaterial(WOOD, 1)}
          />
        );
      })}
    </group>
  );
}

export function WaterPosts() {
  return (
    <group>
      {WATER.map((pos) => (
        <Post key={`post-${pos.row}-${pos.col}`} pos={pos} />
      ))}
    </group>
  );
}
