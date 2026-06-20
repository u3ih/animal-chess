"use client";

import type { Player, Position } from "@animal-chess/game-core";
import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { surfaceY, tileToWorld } from "./coords";
import { getStoneTexture } from "./textures";

const GLOW: Record<Player, string> = { red: "#ffb066", blue: "#67b6ff" };

/** A stepped stone den that frames the goal cell, leaving the center open for the entering piece. */
export function DenStructure({
  pos,
  owner,
  onCellClick
}: {
  pos: Position;
  owner: Player;
  onCellClick: (pos: Position) => void;
}) {
  const [wx, , wz] = tileToWorld(pos);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const stone = getStoneTexture();

  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.35;
    }
  });

  // Four edge bars per tier form an open square frame; clicks forward to the cell underneath.
  const bar = (len: number, p: [number, number, number], rotY = 0) => (
    <mesh castShadow receiveShadow position={p} rotation={[0, rotY, 0]}>
      <boxGeometry args={[len, 0.18, 0.16]} />
      <meshStandardMaterial map={stone} color="#9a917b" roughness={0.95} />
    </mesh>
  );

  const tier = (half: number, y: number) => (
    <group>
      {bar(half * 2, [0, y, half])}
      {bar(half * 2, [0, y, -half])}
      {bar(half * 2, [half, y, 0], Math.PI / 2)}
      {bar(half * 2, [-half, y, 0], Math.PI / 2)}
    </group>
  );

  return (
    <group
      position={[wx, surfaceY(pos), wz]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onCellClick(pos);
      }}
    >
      {tier(0.46, 0.09)}
      {tier(0.4, 0.26)}
      {/* corner posts for a broken-ziggurat silhouette */}
      {[
        [0.42, 0.42],
        [-0.42, 0.42],
        [0.42, -0.42],
        [-0.42, -0.42]
      ].map(([cx, cz]) => (
        <mesh key={`${cx}-${cz}`} castShadow position={[cx, 0.2, cz]}>
          <boxGeometry args={[0.18, 0.42, 0.18]} />
          <meshStandardMaterial map={stone} color="#aaa088" roughness={0.95} />
        </mesh>
      ))}
      {/* glowing engraved socket in the open center */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.3, 28]} />
        <meshStandardMaterial ref={glowRef} color="#ffe9a8" emissive={GLOW[owner]} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}
