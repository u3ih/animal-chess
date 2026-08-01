"use client";

import type { Piece } from "@animal-chess/game-core";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { memo, useRef, useState } from "react";
import type * as THREE from "three";
import { AnimalModel } from "./animal-meshes";
import { pieceSurfaceY, tileToWorld } from "./coords";
import { angleTowards, easeInOutCubic, hopArc, hopHeight, tileDistance, travelDuration } from "./motion";
import { getBasicMaterial, getRingGeometry } from "./shared-assets";
import type { CostumeId } from "./skins";

const BASE_SCALE = 0.82;
const EXIT_DURATION = 0.42;
/** Idle facing: every animal looks down +z so its badge stays readable from the camera. */
const REST_YAW = 0;

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
  exitDelay = 0,
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
  /** Hold the exit animation until the attacker has actually landed on this cell. */
  exitDelay?: number;
  onSelect: (piece: Piece) => void;
  onExitDone?: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const initial = tileToWorld(piece.position);
  const clock = useRef(0);
  const exitT = useRef(0);
  // Terrain height the piece rests on; lerped so stepping between terraces is smooth.
  const baseY = useRef(pieceSurfaceY(piece.position));
  const [hovered, setHovered] = useState(false);

  // --- hop state. A move is a timed leap from the pose we had when the cell changed to the new
  // cell, not an exponential chase: that lets the dust/ripple VFX sync to the same clock. The body
  // never scales during a move — the jump has to read as a jump, not a zoom.
  const cell = useRef(piece.position);
  const travelT = useRef(Number.POSITIVE_INFINITY);
  const travelDur = useRef(0);
  const arc = useRef(0);
  const from = useRef<[number, number, number]>([initial[0], baseY.current, initial[2]]);
  const yaw = useRef(REST_YAW);
  const yawTarget = useRef(REST_YAW);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    clock.current += delta;
    const ease = reduced ? 1 : 1 - 0.0015 ** delta; // frame-rate independent smoothing

    if (exiting) {
      exitT.current += delta;
      const k = Math.min(1, (exitT.current - exitDelay) / (reduced ? 0.01 : EXIT_DURATION));
      if (k < 0) return; // attacker still in the air — hold the pose
      g.scale.setScalar(BASE_SCALE * (1 - k));
      g.position.y = baseY.current - k * 0.8;
      if (!reduced) g.rotation.y += delta * 7;
      if (k >= 1) onExitDone?.(piece.id);
      return;
    }

    const pos = piece.position;
    if (pos.row !== cell.current.row || pos.col !== cell.current.col) {
      const dist = tileDistance(cell.current, pos);
      from.current = [g.position.x, baseY.current, g.position.z];
      travelDur.current = travelDuration(dist, reduced);
      arc.current = hopHeight(dist, reduced);
      travelT.current = 0;
      cell.current = pos;
      const [tx, , tz] = tileToWorld(pos);
      const dx = tx - from.current[0];
      const dz = tz - from.current[2];
      if (dx !== 0 || dz !== 0) yawTarget.current = Math.atan2(dx, dz);
    }

    const target = tileToWorld(pos);
    const groundY = pieceSurfaceY(pos);
    travelT.current += delta;
    const flying = travelT.current < travelDur.current;

    let hop = 0;
    if (flying) {
      const k = Math.min(1, travelT.current / travelDur.current);
      // horizontal travel is near-linear (a jump carries its speed), only the ends are eased
      const e = k * 0.72 + easeInOutCubic(k) * 0.28;
      const [fx, fy, fz] = from.current;
      g.position.x = fx + (target[0] - fx) * e;
      g.position.z = fz + (target[2] - fz) * e;
      baseY.current = fy + (groundY - fy) * e;
      hop = hopArc(k) * arc.current;
      yaw.current = angleTowards(yaw.current, yawTarget.current, 1 - 0.0001 ** delta);
    } else {
      // settled: chase the target (covers server snapshots that teleport a piece) and unwind the turn
      g.position.x += (target[0] - g.position.x) * ease;
      g.position.z += (target[2] - g.position.z) * ease;
      baseY.current += (groundY - baseY.current) * ease;
      yaw.current = angleTowards(yaw.current, REST_YAW, ease * 0.55);
    }

    const lift = selected ? 0.26 : 0;
    const bob = reduced || flying || !active || selected ? 0 : Math.sin(clock.current * 3.2) * 0.035;
    g.position.y = baseY.current + hop + lift + bob;
    g.rotation.y = reduced ? REST_YAW : yaw.current;
    // slight forward lean while airborne, so the hop reads as momentum rather than a float
    const leanTarget = reduced || !flying ? 0 : -0.16;
    g.rotation.x += (leanTarget - g.rotation.x) * ease;

    // scale only ever answers selection/hover — a move must never change the piece's size
    const targetScale = BASE_SCALE * (selected ? 1.14 : hovered && interactive ? 1.06 : 1);
    g.scale.setScalar(g.scale.x + (targetScale - g.scale.x) * ease);
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
