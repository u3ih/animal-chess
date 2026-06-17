"use client";

import type { Move, Position } from "@animal-chess/game-core";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { ALL_CELLS, BOARD_H, BOARD_W, tileToWorld } from "./coords";
import { Tile } from "./Tile";

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
    <mesh ref={ref} position={[wx, 0.06, wz]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
      <ringGeometry args={capture ? [0.3, 0.46, 32] : [0.12, 0.22, 32]} />
      <meshBasicMaterial color={capture ? "#f07a5f" : "#f6d373"} transparent opacity={0.92} depthWrite={false} />
    </mesh>
  );
}

function LastMark({ pos, kind }: { pos: Position; kind: "from" | "to" }) {
  const [wx, , wz] = tileToWorld(pos);
  return (
    <mesh position={[wx, 0.04, wz]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.4, 0.46, 4]} />
      <meshBasicMaterial
        color={kind === "to" ? "#7fa05a" : "#cbd5c0"}
        transparent
        opacity={kind === "to" ? 0.85 : 0.5}
        depthWrite={false}
      />
    </mesh>
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
  useFrame((_, delta) => {
    pulse.current += delta * 3.4;
  });

  return (
    <group>
      {/* foundation slab */}
      <mesh receiveShadow position={[0, -0.55, 0]}>
        <boxGeometry args={[BOARD_W + 1.1, 0.7, BOARD_H + 1.1]} />
        <meshStandardMaterial color="#2c3a1f" roughness={1} />
      </mesh>
      {/* decorative rim */}
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[BOARD_W + 0.9, 0.12, BOARD_H + 0.9]} />
        <meshStandardMaterial color="#46341f" roughness={0.9} />
      </mesh>

      {ALL_CELLS.map((pos) => (
        <Tile key={`${pos.row}-${pos.col}`} pos={pos} interactive={interactive} onCellClick={onCellClick} />
      ))}

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
