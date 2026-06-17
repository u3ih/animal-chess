"use client";

import type { Piece } from "@animal-chess/game-core";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type * as THREE from "three";
import { AnimalModel } from "./animal-meshes";
import { tileToWorld } from "./coords";

const BASE_SCALE = 0.82;
const EXIT_DURATION = 0.42;

export function AnimalPiece({
  piece,
  selected,
  active,
  interactive,
  exiting,
  onSelect,
  onExitDone
}: {
  piece: Piece;
  selected: boolean;
  active: boolean;
  interactive: boolean;
  exiting?: boolean;
  onSelect: (piece: Piece) => void;
  onExitDone?: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const initial = tileToWorld(piece.position);
  const clock = useRef(0);
  const exitT = useRef(0);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    clock.current += delta;
    const ease = 1 - 0.0015 ** delta; // frame-rate independent smoothing

    if (exiting) {
      exitT.current += delta;
      const k = Math.min(1, exitT.current / EXIT_DURATION);
      g.scale.setScalar(BASE_SCALE * (1 - k));
      g.position.y = -k * 0.8;
      g.rotation.y += delta * 7;
      if (k >= 1) onExitDone?.(piece.id);
      return;
    }

    const target = tileToWorld(piece.position);
    g.position.x += (target[0] - g.position.x) * ease;
    g.position.z += (target[2] - g.position.z) * ease;

    const dist = Math.hypot(target[0] - g.position.x, target[2] - g.position.z);
    const hop = Math.sin(Math.min(1, dist) * Math.PI) * 0.42;
    const lift = selected ? 0.26 : 0;
    const bob = active && !selected ? Math.sin(clock.current * 3.2) * 0.035 : 0;
    g.position.y = hop + lift + bob;

    const targetScale = BASE_SCALE * (selected ? 1.14 : hovered && interactive ? 1.06 : 1);
    const s = g.scale.x + (targetScale - g.scale.x) * ease;
    g.scale.setScalar(s);
  });

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onSelect(piece);
  }

  return (
    <group
      ref={group}
      position={[initial[0], 0, initial[2]]}
      scale={BASE_SCALE}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (interactive) setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <AnimalModel kind={piece.kind} owner={piece.owner} />
      {selected ? (
        <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.52, 32]} />
          <meshBasicMaterial color="#ffe9a8" transparent opacity={0.85} />
        </mesh>
      ) : null}
    </group>
  );
}
