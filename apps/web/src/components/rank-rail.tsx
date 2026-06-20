"use client";

import {
  type GameState,
  legalMovesForPiece,
  PIECE_RANK,
  type Piece,
  type PieceKind,
  type Player
} from "@animal-chess/game-core";
import { cx } from "@animal-chess/ui";

// Rank order rat(1) → elephant(8), so the rail reads top-to-bottom like the classic Cờ Thú side panels.
const PIECE_ORDER = (Object.keys(PIECE_RANK) as PieceKind[]).sort((a, b) => PIECE_RANK[a] - PIECE_RANK[b]);

/**
 * Vertical rank rail that flanks the board (red left, blue right) — the iconic Cờ Thú side column.
 * Each cell is a selectable piece; defeated pieces dim out so the rail doubles as the captured tray.
 */
export function RankRail({
  owner,
  state,
  selectedPieceId,
  localColor,
  pieceLabels,
  onSelect
}: {
  owner: Player;
  state: GameState;
  selectedPieceId?: string;
  localColor?: Player;
  pieceLabels: Record<PieceKind, string>;
  onSelect: (piece: Piece) => void;
}) {
  const canSelect = state.status.state === "playing" && state.turn === owner && localColor === owner;

  return (
    <div className={cx("rank-rail", owner)}>
      {PIECE_ORDER.map((kind) => {
        const piece = state.pieces.find((item) => item.owner === owner && item.kind === kind);
        const moves = piece ? legalMovesForPiece(state, piece.id) : [];
        return (
          <button
            key={kind}
            type="button"
            className={cx("rank-cell", !piece && "defeated", piece?.id === selectedPieceId && "selected")}
            disabled={!piece || !canSelect}
            onClick={() => piece && onSelect(piece)}
            title={pieceLabels[kind]}
          >
            <span className="rank-num">{PIECE_RANK[kind]}</span>
            <span className="rank-name">{pieceLabels[kind]}</span>
            {piece && canSelect && moves.length ? <em className="rank-moves">{moves.length}</em> : null}
          </button>
        );
      })}
    </div>
  );
}
