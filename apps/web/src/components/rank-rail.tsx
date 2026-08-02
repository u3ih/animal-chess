"use client";

import {
  type GameState,
  legalMovesForPiece,
  PIECE_RANK,
  type Piece,
  type PieceKind,
  type Player
} from "@animal-chess/game-core";
import { useTranslation } from "@animal-chess/i18n";
import { cx } from "@animal-chess/ui";
import { memo } from "react";
import { PieceAvatar } from "./piece-avatar";
import styles from "./rank-rail.module.scss";

// Rank order rat(1) → elephant(8), so the rail reads top-to-bottom like the classic Cờ Thú side panels.
const PIECE_ORDER = (Object.keys(PIECE_RANK) as PieceKind[]).sort((a, b) => PIECE_RANK[a] - PIECE_RANK[b]);

/**
 * Vertical rank rail that flanks the board (red left, blue right) — the iconic Cờ Thú side column.
 * Each cell is a selectable piece; defeated pieces dim out so the rail doubles as the captured tray.
 */
export const RankRail = memo(function RankRail({
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
  const { t } = useTranslation();
  const canSelect = state.status.state === "playing" && state.turn === owner && localColor === owner;

  return (
    <div className={cx(styles.rankRail, styles[owner])}>
      {PIECE_ORDER.map((kind) => {
        const piece = state.pieces.find((item) => item.owner === owner && item.kind === kind);
        const moves = piece ? legalMovesForPiece(state, piece.id) : [];
        return (
          <button
            key={kind}
            type="button"
            className={cx(styles.rankCell, !piece && styles.defeated, piece?.id === selectedPieceId && styles.selected)}
            disabled={!piece || !canSelect}
            onClick={() => piece && onSelect(piece)}
            // Only your own rail advertises the 1–8 shortcut; the opponent's numbers aren't bound to keys.
            title={
              canSelect
                ? t("game.selectKeyHint", { name: pieceLabels[kind], hotkey: String(PIECE_RANK[kind]) })
                : pieceLabels[kind]
            }
          >
            <span className={styles.rankAvatar}>
              <PieceAvatar kind={kind} />
              <b className={styles.rankNum}>{PIECE_RANK[kind]}</b>
            </span>
            <span className={styles.rankName}>{pieceLabels[kind]}</span>
            {piece && canSelect && moves.length ? <em className={styles.rankMoves}>{moves.length}</em> : null}
          </button>
        );
      })}
    </div>
  );
});
