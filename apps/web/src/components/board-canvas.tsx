"use client";

import type { GameState, Move, PieceKind, Player, Position } from "@animal-chess/game-core";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { BoardSkeleton } from "@/components/board-skeleton";
import type { EquippedCostumes } from "@/components/three/skins";

const GameCanvas = dynamic(() => import("@/components/three/GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <BoardSkeleton />
});

type BoardCanvasProps = {
  state: GameState;
  pieceLabels: Record<PieceKind, string>;
  equippedCostumes?: EquippedCostumes;
  selectedPieceId?: string;
  legalMoves: Move[];
  interactive: boolean;
  viewColor?: Player;
  onCellClick: (pos: Position) => void;
};

/**
 * Wraps the dynamically-imported WebGL board with a skeleton that fades out only after the first frame
 * paints. `ready` lives here (not page.tsx) so the once-a-second page re-render never churns it, and
 * `onReady` is a stable ref so GameCanvas's memoization is preserved.
 */
export function BoardCanvas(props: BoardCanvasProps) {
  const [ready, setReady] = useState(false);
  const handleReady = useRef(() => setReady(true)).current;
  return (
    <>
      <GameCanvas {...props} onReady={handleReady} />
      <BoardSkeleton overlay hidden={ready} />
    </>
  );
}
