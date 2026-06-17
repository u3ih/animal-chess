"use client";

import type { Player } from "@animal-chess/game-core";
import { Home, RefreshCw, Trophy } from "lucide-react";

export function WinOverlay({
  winner,
  reason,
  mode,
  onNewGame,
  onRematch,
  onMenu
}: {
  winner: Player;
  reason: "den" | "elimination";
  mode: "ai" | "online";
  onNewGame: () => void;
  onRematch: () => void;
  onMenu: () => void;
}) {
  const winnerLabel = winner === "red" ? "Đỏ" : "Xanh";
  const reasonLabel = reason === "den" ? "tiến vào hang đối thủ" : "ăn hết quân địch";

  return (
    <div className="modal-backdrop win-backdrop" role="alertdialog" aria-modal="true" aria-label="Kết quả ván đấu">
      <div className={`modal-card win-card ${winner}`}>
        <div className="win-trophy">
          <Trophy />
        </div>
        <p className="win-eyebrow">Kết thúc ván</p>
        <h2>{winnerLabel} chiến thắng</h2>
        <p className="win-reason">Thắng bằng cách {reasonLabel}.</p>
        <div className="win-actions">
          {mode === "online" ? (
            <button type="button" className="primary" onClick={onRematch}>
              <RefreshCw /> Tái đấu
            </button>
          ) : (
            <button type="button" className="primary" onClick={onNewGame}>
              <RefreshCw /> Ván mới
            </button>
          )}
          <button type="button" onClick={onMenu}>
            <Home /> Về menu
          </button>
        </div>
      </div>
    </div>
  );
}
