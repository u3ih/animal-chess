"use client";

import { BOARD_H, BOARD_W } from "./coords";
import { getStoneTexture } from "./textures";

const HX = BOARD_W / 2 + 0.35; // just outside the tiles on x
const HZ = BOARD_H / 2 + 0.35; // ...and on z

/** Mossy stone retaining wall + broken corner pillars ringing the board, plus the forest floor. */
export function RuinWall() {
  const stone = getStoneTexture();
  // [x, z, height] — taller, uneven pillars give the ruined silhouette of the backdrop.
  const pillars: [number, number, number][] = [
    [HX, HZ, 1.5],
    [-HX, HZ, 1.1],
    [HX, -HZ, 1.2],
    [-HX, -HZ, 1.6],
    [0, HZ, 0.9],
    [0, -HZ, 1.0]
  ];

  return (
    <group>
      {/* forest floor far below so orbiting never shows a void */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]}>
        <planeGeometry args={[46, 46]} />
        <meshStandardMaterial color="#1b2413" roughness={1} />
      </mesh>

      {/* retaining walls */}
      <mesh castShadow receiveShadow position={[HX, -0.05, 0]}>
        <boxGeometry args={[0.5, 1.1, BOARD_H + 0.7]} />
        <meshStandardMaterial map={stone} color="#857c66" roughness={1} />
      </mesh>
      <mesh castShadow receiveShadow position={[-HX, -0.05, 0]}>
        <boxGeometry args={[0.5, 1.1, BOARD_H + 0.7]} />
        <meshStandardMaterial map={stone} color="#857c66" roughness={1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -0.05, HZ]}>
        <boxGeometry args={[BOARD_W + 1.2, 1.1, 0.5]} />
        <meshStandardMaterial map={stone} color="#7f7660" roughness={1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -0.05, -HZ]}>
        <boxGeometry args={[BOARD_W + 1.2, 1.1, 0.5]} />
        <meshStandardMaterial map={stone} color="#7f7660" roughness={1} />
      </mesh>

      {pillars.map(([px, pz, h]) => (
        <mesh key={`${px}-${pz}`} castShadow receiveShadow position={[px, h / 2 - 0.5, pz]}>
          <boxGeometry args={[0.62, h, 0.62]} />
          <meshStandardMaterial map={stone} color="#928974" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
