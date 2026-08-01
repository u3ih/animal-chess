"use client";

import {
  DENS,
  type GameState,
  type Move,
  type Piece,
  type PieceKind,
  type Player,
  type Position
} from "@animal-chess/game-core";
import { AdaptiveDpr, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { memo, useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { AnimalPiece } from "./AnimalPiece";
import { Board3D } from "./Board3D";
import { CaptureBurst, DenBeam, Motes } from "./effects";
import type { EquippedCostumes } from "./skins";

const TEAM_COLOR: Record<Player, string> = { red: "#ffcaa0", blue: "#a9c8ff" };

/** Distance behind the local player's edge — blue sits at the far (-z) side, so flip the sign. */
function cameraZ(viewColor?: Player): number {
  return viewColor === "blue" ? -8 : 8;
}

/**
 * Keeps the camera pinned behind the local player's home edge. `localPlayer.color` resolves
 * asynchronously (after the socket joins), so the initial `camera` prop is not enough — we must
 * re-seat the camera imperatively whenever `viewColor` changes, then nudge OrbitControls.
 */
function CameraRig({ viewColor }: { viewColor?: Player }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as {
    target: { set: (x: number, y: number, z: number) => void };
    update: () => void;
  } | null;
  useEffect(() => {
    camera.position.set(0, 13.86, cameraZ(viewColor));
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    } else {
      camera.lookAt(0, 0, 0);
    }
  }, [viewColor, camera, controls]);
  return null;
}

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
  pieceLabels,
  equippedCostumes,
  selectedPieceId,
  legalMoves,
  interactive,
  viewColor,
  onCellClick,
  onSelectPiece
}: {
  state: GameState;
  pieceLabels: Record<PieceKind, string>;
  equippedCostumes?: EquippedCostumes;
  selectedPieceId?: string;
  legalMoves: Move[];
  interactive: boolean;
  viewColor?: Player;
  onCellClick: (pos: Position) => void;
  onSelectPiece: (piece: Piece) => void;
}) {
  const playing = state.status.state === "playing";
  const captured = capturedFromLastMove(state);
  const reduced = useReducedMotion();

  return (
    <>
      {/* opaque scene backdrop = fog colour: tilting/zooming can expose canvas beyond the board,
          and with a transparent canvas that hole showed the page jungle bleeding through ("xuyên").
          Filling it with the fog colour makes distant geometry fade into a seamless atmospheric horizon. */}
      <color attach="background" args={["#26331b"]} />
      <fog attach="fog" args={["#26331b", 15, 32]} />
      <hemisphereLight color="#ffe7b0" groundColor="#2f4220" intensity={0.95} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[5, 11, 6]}
        intensity={1.9}
        color="#fff1cf"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={34}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[-6, 5, -5]} intensity={0.45} color="#a9c8ff" />
      {/* warm fill bouncing off the gorge */}
      <pointLight position={[0, 4, 0]} intensity={0.35} color="#ffcaa0" distance={18} decay={2} />

      <Board3D legalMoves={legalMoves} lastMove={state.lastMove} interactive={interactive} onCellClick={onCellClick} />

      <DenBeam pos={DENS.red} owner="red" reduced={reduced} />
      <DenBeam pos={DENS.blue} owner="blue" reduced={reduced} />
      {reduced ? null : <Motes />}

      {state.pieces.map((piece) => (
        <AnimalPiece
          key={piece.id}
          piece={piece}
          label={pieceLabels[piece.kind]}
          costumeId={equippedCostumes?.[piece.kind]}
          selected={piece.id === selectedPieceId}
          active={playing && piece.owner === state.turn}
          interactive={interactive}
          mine={viewColor != null && piece.owner === viewColor}
          reduced={reduced}
          onSelect={onSelectPiece}
        />
      ))}

      {captured ? (
        <>
          <AnimalPiece
            key={`capture-${captured.id}`}
            piece={captured}
            label={pieceLabels[captured.kind]}
            costumeId={equippedCostumes?.[captured.kind]}
            selected={false}
            active={false}
            interactive={false}
            reduced={reduced}
            exiting
            onSelect={() => {}}
          />
          {reduced ? null : (
            <CaptureBurst key={`burst-${captured.id}`} pos={captured.position} color={TEAM_COLOR[captured.owner]} />
          )}
        </>
      ) : null}
    </>
  );
}

export const GameCanvas = memo(function GameCanvas({
  state,
  pieceLabels,
  equippedCostumes,
  selectedPieceId,
  legalMoves,
  interactive,
  viewColor,
  onCellClick,
  onReady
}: {
  state: GameState;
  pieceLabels: Record<PieceKind, string>;
  equippedCostumes?: EquippedCostumes;
  selectedPieceId?: string;
  legalMoves: Move[];
  interactive: boolean;
  viewColor?: Player;
  onCellClick: (pos: Position) => void;
  /** Fired once the first frame has actually painted (used to fade the loading skeleton). */
  onReady?: () => void;
}) {
  // ~30° tilt from vertical (y=13.86, z=±8 at distance ~16) keeps the whole board readable and
  // makes the arrow-pad easy to map to the grid. `cameraZ` flips it to the local player's side.
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 13.86, cameraZ(viewColor)], fov: 46 }}
      onCreated={() => requestAnimationFrame(() => onReady?.())}
    >
      <AdaptiveDpr pixelated={false} />
      <CameraRig viewColor={viewColor} />
      <Scene
        state={state}
        pieceLabels={pieceLabels}
        equippedCostumes={equippedCostumes}
        selectedPieceId={selectedPieceId}
        legalMoves={legalMoves}
        interactive={interactive}
        viewColor={viewColor}
        onCellClick={onCellClick}
        onSelectPiece={(piece) => onCellClick(piece.position)}
      />
      <OrbitControls
        makeDefault
        regress
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={11}
        maxDistance={26}
        minPolarAngle={0.12}
        maxPolarAngle={1.2}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
});
