"use client";

import { DENS, type Move, type Position } from "@animal-chess/game-core";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { ALL_CELLS, BOARD_H, BOARD_W, surfaceY, tileToWorld } from "./coords";
import { DenStructure } from "./DenStructure";
import { RuinWall } from "./RuinWall";
import { getBasicMaterial, getRingGeometry } from "./shared-assets";
import { Tile } from "./Tile";
import { getStoneTexture, getWaterTexture } from "./textures";

function MoveHint({ pos, capture, pulse }: { pos: Position; capture: boolean; pulse: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Mesh>(null);
  const [wx, , wz] = tileToWorld(pos);
  useFrame(() => {
    if (ref.current) {
      const s = 1 + Math.sin(pulse.current) * 0.08;
      ref.current.scale.set(s, s, s);
    }
  });
  return (
    <mesh
      ref={ref}
      position={[wx, surfaceY(pos) + 0.06, wz]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={5}
      geometry={capture ? getRingGeometry(0.3, 0.46, 32) : getRingGeometry(0.12, 0.22, 32)}
      material={capture ? getBasicMaterial("#f07a5f", 0.92, false) : getBasicMaterial("#f6d373", 0.92, false)}
    />
  );
}

function LastMark({ pos, kind }: { pos: Position; kind: "from" | "to" }) {
  const [wx, , wz] = tileToWorld(pos);
  return (
    <mesh
      position={[wx, surfaceY(pos) + 0.04, wz]}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={getRingGeometry(0.4, 0.46, 4)}
      material={kind === "to" ? getBasicMaterial("#7fa05a", 0.85, false) : getBasicMaterial("#cbd5c0", 0.5, false)}
    />
  );
}

export function Board3D({
  legalMoves,
  lastMove,
  interactive,
  onCellClick
}: {
  legalMoves: Move[];
  lastMove?: Move;
  interactive: boolean;
  onCellClick: (pos: Position) => void;
}) {
  const pulse = useRef(0);
  const water = getWaterTexture();
  useFrame((_, delta) => {
    pulse.current += delta * 3.4;
    // scroll the shared water texture so every moat tile flows together
    water.offset.y += delta * 0.05;
    water.offset.x += delta * 0.012;
  });

  return (
    <group>
      {/* stone foundation slab — tile columns drop onto its top (FOUNDATION_Y) */}
      <mesh receiveShadow position={[0, -0.95, 0]}>
        <boxGeometry args={[BOARD_W + 1.4, 0.7, BOARD_H + 1.4]} />
        <meshStandardMaterial map={getStoneTexture()} color="#6a6250" roughness={1} />
      </mesh>

      <RuinWall />

      {ALL_CELLS.map((pos) => (
        <Tile key={`${pos.row}-${pos.col}`} pos={pos} interactive={interactive} onCellClick={onCellClick} />
      ))}

      <DenStructure pos={DENS.red} owner="red" onCellClick={onCellClick} />
      <DenStructure pos={DENS.blue} owner="blue" onCellClick={onCellClick} />

      {legalMoves.map((m) => (
        <MoveHint key={`${m.to.row}-${m.to.col}`} pos={m.to} capture={Boolean(m.capturedPieceId)} pulse={pulse} />
      ))}

      {lastMove ? (
        <>
          <LastMark pos={lastMove.from} kind="from" />
          <LastMark pos={lastMove.to} kind="to" />
        </>
      ) : null}
    </group>
  );
}
