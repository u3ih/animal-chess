"use client";

import type { Position } from "@animal-chess/game-core";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getTerrain, type TerrainKind, tileToWorld } from "./coords";
import { getLightningTexture, getMossStoneTexture, getStoneTexture, getWaterTexture } from "./textures";

/** Owner tint laid faintly over the stone of trap/den tiles. */
const OWNER_TINT: Record<"red" | "blue", string> = { red: "#caa089", blue: "#9fb6d6" };

/** Crackling lightning glyph + electric ground ring marking an electrified trap cell. */
function TrapLightning() {
  const bolt = useRef<THREE.Sprite>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => getLightningTexture(), []);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const flicker = 0.58 + Math.sin(t * 9) * 0.2 + Math.sin(t * 23 + 1.3) * 0.18;
    if (bolt.current) {
      (bolt.current.material as THREE.SpriteMaterial).opacity = Math.min(1, Math.max(0.3, flicker));
      const sc = 1 + Math.sin(t * 13) * 0.06;
      bolt.current.scale.set(0.58 * sc, 0.92 * sc, 1);
    }
    if (ringMat.current) ringMat.current.opacity = 0.32 + Math.abs(Math.sin(t * 4.2)) * 0.45;
  });

  return (
    <group>
      <sprite ref={bolt} position={[0, 0.72, 0]} scale={[0.58, 0.92, 1]} renderOrder={6}>
        <spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
        <ringGeometry args={[0.16, 0.43, 30]} />
        <meshBasicMaterial
          ref={ringMat}
          color="#8fe6ff"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export function Tile({
  pos,
  interactive,
  onCellClick
}: {
  pos: Position;
  interactive: boolean;
  onCellClick: (pos: Position) => void;
}) {
  const terrain = getTerrain(pos);
  const [wx, , wz] = tileToWorld(pos);
  const [hovered, setHovered] = useState(false);
  const isWater = terrain === "water";
  const isStone = terrain !== "grass";

  const topTexture = useMemo(() => {
    if (isWater) return getWaterTexture();
    if (isStone) return getStoneTexture();
    return getMossStoneTexture(pos.row * 7 + pos.col);
  }, [isWater, isStone, pos.row, pos.col]);

  const tint =
    terrain === "trap-red" || terrain === "den-red"
      ? OWNER_TINT.red
      : terrain === "trap-blue" || terrain === "den-blue"
        ? OWNER_TINT.blue
        : "#ffffff";

  return (
    <group position={[wx, 0, wz]}>
      <mesh
        receiveShadow
        position={[0, isWater ? -0.18 : -0.1, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onCellClick(pos);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (interactive) setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.96, isWater ? 0.1 : 0.2, 0.96]} />
        <meshStandardMaterial
          map={topTexture}
          color={tint}
          roughness={isWater ? 0.12 : 0.96}
          metalness={isWater ? 0.18 : 0}
          transparent={isWater}
          opacity={isWater ? 0.84 : 1}
          emissive={isWater ? "#0f4a63" : hovered && interactive ? "#5c6e2c" : "#000000"}
          emissiveIntensity={isWater ? 0.4 : hovered && interactive ? 0.6 : 0}
        />
      </mesh>

      {/* stone skirt below the top for terrace depth */}
      {!isWater ? (
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.96, 0.2, 0.96]} />
          <meshStandardMaterial map={getStoneTexture()} color="#6f6957" roughness={1} />
        </mesh>
      ) : null}

      {/* electrified trap cell: crackling lightning instead of a carved cross */}
      {terrain === "trap-red" || terrain === "trap-blue" ? <TrapLightning /> : null}
    </group>
  );
}
