"use client";

import type { Position } from "@animal-chess/game-core";
import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";
import { getTerrain, type TerrainKind, tileToWorld } from "./coords";

const TILE_TOP: Record<TerrainKind, string> = {
  grass: "#5f7e3c",
  water: "#2f7196",
  "trap-red": "#86492a",
  "trap-blue": "#2c4f86",
  "den-red": "#b9862f",
  "den-blue": "#2f72b9"
};

const TILE_SIDE = "#374a26";

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
  const top = TILE_TOP[terrain];

  return (
    <group position={[wx, 0, wz]}>
      <mesh
        receiveShadow
        position={[0, isWater ? -0.16 : -0.1, 0]}
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
        <boxGeometry args={[0.94, isWater ? 0.12 : 0.2, 0.94]} />
        <meshStandardMaterial
          color={hovered && interactive ? "#dfe6b0" : top}
          roughness={isWater ? 0.18 : 0.92}
          metalness={isWater ? 0.05 : 0}
          transparent={isWater}
          opacity={isWater ? 0.78 : 1}
          emissive={isWater ? "#13435c" : "#000000"}
          emissiveIntensity={isWater ? 0.45 : 0}
        />
      </mesh>
      {/* dark side skirt for depth */}
      {!isWater ? (
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[0.94, 0.16, 0.94]} />
          <meshStandardMaterial color={TILE_SIDE} roughness={1} />
        </mesh>
      ) : null}
      {/* trap cross marker */}
      {terrain === "trap-red" || terrain === "trap-blue" ? (
        <group position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <mesh>
            <boxGeometry args={[0.5, 0.07, 0.001]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffb066" emissiveIntensity={0.4} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.5, 0.07, 0.001]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffb066" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ) : null}
      {/* den marker: glowing notch ring */}
      {terrain === "den-red" || terrain === "den-blue" ? (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.34, 24]} />
          <meshStandardMaterial color="#ffe9a8" emissive="#ffcf63" emissiveIntensity={0.9} transparent opacity={0.95} />
        </mesh>
      ) : null}
    </group>
  );
}
