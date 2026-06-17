"use client";

import type { GameState, Move, Piece, PieceKind, Player, Position } from "@animal-chess/game-core";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { AnimalPiece } from "./AnimalPiece";
import { Board3D } from "./Board3D";

/** Rebuild a just-captured piece from lastMove so it can play an exit animation. */
function capturedFromLastMove(state: GameState): Piece | null {
  const lm = state.lastMove;
  if (!lm?.capturedPieceId) return null;
  const [owner, kind] = lm.capturedPieceId.split("-");
  return {
    id: lm.capturedPieceId,
    owner: owner as Player,
    kind: kind as PieceKind,
    position: lm.to
  };
}

function Scene({
  state,
  selectedPieceId,
  legalMoves,
  interactive,
  onCellClick,
  onSelectPiece
}: {
  state: GameState;
  selectedPieceId?: string;
  legalMoves: Move[];
  interactive: boolean;
  onCellClick: (pos: Position) => void;
  onSelectPiece: (piece: Piece) => void;
}) {
  const playing = state.status.state === "playing";
  const captured = capturedFromLastMove(state);

  return (
    <>
      <hemisphereLight color="#fff4d6" groundColor="#384a26" intensity={0.85} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 10, 6]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#bcd6ff" />

      <Board3D legalMoves={legalMoves} lastMove={state.lastMove} interactive={interactive} onCellClick={onCellClick} />

      {state.pieces.map((piece) => (
        <AnimalPiece
          key={piece.id}
          piece={piece}
          selected={piece.id === selectedPieceId}
          active={playing && piece.owner === state.turn}
          interactive={interactive}
          onSelect={onSelectPiece}
        />
      ))}

      {captured ? (
        <AnimalPiece
          key={`capture-${captured.id}-${state.history.length}`}
          piece={captured}
          selected={false}
          active={false}
          interactive={false}
          exiting
          onSelect={() => {}}
        />
      ) : null}
    </>
  );
}

export function GameCanvas({
  state,
  selectedPieceId,
  legalMoves,
  interactive,
  viewColor,
  onCellClick,
  onSelectPiece
}: {
  state: GameState;
  selectedPieceId?: string;
  legalMoves: Move[];
  interactive: boolean;
  viewColor?: Player;
  onCellClick: (pos: Position) => void;
  onSelectPiece: (piece: Piece) => void;
}) {
  // Blue sits at the far edge by default; flip the camera so the local player is near.
  const camZ = viewColor === "blue" ? -9.5 : 9.5;

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 11, camZ], fov: 42 }}>
      <Scene
        state={state}
        selectedPieceId={selectedPieceId}
        legalMoves={legalMoves}
        interactive={interactive}
        onCellClick={onCellClick}
        onSelectPiece={onSelectPiece}
      />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={9}
        maxDistance={20}
        minPolarAngle={0.15}
        maxPolarAngle={1.18}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
