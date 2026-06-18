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
import { Button, cx, Panel } from "@animal-chess/ui";
import { BadgeInfo } from "lucide-react";

const PIECE_ORDER = Object.keys(PIECE_RANK) as PieceKind[];

export function PieceRoster({
  owner,
  state,
  selectedPieceId,
  localColor,
  onSelect
}: {
  owner: Player;
  state: GameState;
  selectedPieceId?: string;
  localColor?: Player;
  onSelect: (piece: Piece) => void;
}) {
  const { t } = useTranslation();
  const canSelect = state.status.state === "playing" && state.turn === owner && localColor === owner;

  return (
    <Panel as="div" className={`piece-roster ${owner}`} icon={<BadgeInfo />} title={t("roster.title")}>
      <div className="piece-grid">
        {PIECE_ORDER.map((kind) => {
          const piece = state.pieces.find((item) => item.owner === owner && item.kind === kind);
          const moves = piece ? legalMovesForPiece(state, piece.id) : [];
          const name: string = t(`pieces.${kind}`);
          return (
            <Button
              key={kind}
              className={cx(!piece && "defeated", piece?.id === selectedPieceId && "selected")}
              onClick={() => piece && onSelect(piece)}
              disabled={!piece || !canSelect}
              title={
                piece
                  ? t("roster.pieceTooltip", { name, rank: String(PIECE_RANK[kind]) })
                  : t("roster.defeatedTooltip", { name })
              }
            >
              <strong>{PIECE_RANK[kind]}</strong>
              <span>{name}</span>
              {piece && canSelect ? <em>{moves.length}</em> : null}
            </Button>
          );
        })}
      </div>
    </Panel>
  );
}
