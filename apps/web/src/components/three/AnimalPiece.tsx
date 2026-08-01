"use client";

import type { Piece } from "@animal-chess/game-core";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { memo, useRef, useState } from "react";
import type * as THREE from "three";
import { AnimalModel } from "./animal-meshes";
import { surfaceY, tileToWorld } from "./coords";
import { getBasicMaterial, getRingGeometry } from "./shared-assets";
import type { CostumeId } from "./skins";

const BASE_SCALE = 0.82;
const EXIT_DURATION = 0.42;

/** Bright ground ring under the local player's own pieces — the at-a-glance "these are yours" cue. */
const MINE_RING: Record<Piece["owner"], string> = { red: "#ff8a5f", blue: "#6fa8ff" };

export const AnimalPiece = memo(function AnimalPiece({
  piece,
  label,
  costumeId,
  selected,
  active,
  interactive,
  mine,
  reduced,
  exiting,
  onSelect,
  onExitDone
}: {
  piece: Piece;
  label: string;
  /** Equipped costume for this piece-kind (shop); undefined = bare look. */
  costumeId?: CostumeId;
  selected: boolean;
  active: boolean;
  interactive: boolean;
  /** True when this piece belongs to the local player — gets a persistent team ring. */
  mine?: boolean;
  /** Honor prefers-reduced-motion: snap positions, drop hop/bob and the exit spin. */
  reduced?: boolean;
  exiting?: boolean;
  onSelect: (piece: Piece) => void;
  onExitDone?: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const initial = tileToWorld(piece.position);
  const clock = useRef(0);
  const exitT = useRef(0);
  // Terrain height the piece rests on; lerped so stepping between terraces is smooth.
  const baseY = useRef(surfaceY(piece.position));
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    clock.current += delta;
    const ease = reduced ? 1 : 1 - 0.0015 ** delta; // frame-rate independent smoothing

    if (exiting) {
      exitT.current += delta;
      const k = Math.min(1, exitT.current / (reduced ? 0.01 : EXIT_DURATION));
      g.scale.setScalar(BASE_SCALE * (1 - k));
      g.position.y = baseY.current - k * 0.8;
      if (!reduced) g.rotation.y += delta * 7;
      if (k >= 1) onExitDone?.(piece.id);
      return;
    }

    const target = tileToWorld(piece.position);
    g.position.x += (target[0] - g.position.x) * ease;
    g.position.z += (target[2] - g.position.z) * ease;

    baseY.current += (surfaceY(piece.position) - baseY.current) * ease;
    const dist = Math.hypot(target[0] - g.position.x, target[2] - g.position.z);
    const hop = reduced ? 0 : Math.sin(Math.min(1, dist) * Math.PI) * 0.42;
    const lift = selected ? 0.26 : 0;
    const bob = reduced || !active || selected ? 0 : Math.sin(clock.current * 3.2) * 0.035;
    g.position.y = baseY.current + hop + lift + bob;

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
      position={[initial[0], baseY.current, initial[2]]}
      scale={BASE_SCALE}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (interactive) setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <AnimalModel
        kind={piece.kind}
        owner={piece.owner}
        label={label}
        costumeId={costumeId}
        badgeEmphasis={selected || (hovered && interactive)}
        reduced={reduced}
      />
      {selected ? (
        <mesh
          position={[0, -0.12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={getRingGeometry(0.42, 0.52, 32)}
          material={getBasicMaterial("#ffe9a8", 0.85)}
        />
      ) : mine ? (
        <mesh
          position={[0, -0.11, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={getRingGeometry(0.46, 0.6, 36)}
          material={getBasicMaterial(MINE_RING[piece.owner], 0.55)}
        />
      ) : null}
    </group>
  );
});
