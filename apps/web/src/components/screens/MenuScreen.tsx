"use client";

import type { AiLevel } from "@animal-chess/game-core";
import { BookOpen, Cpu, Globe2, Play } from "lucide-react";

type Mode = "ai" | "online";

export function MenuScreen({
  mode,
  aiLevel,
  playerName,
  onModeChange,
  onAiLevelChange,
  onStart,
  onShowRules
}: {
  mode: Mode;
  aiLevel: AiLevel;
  playerName?: string;
  onModeChange: (mode: Mode) => void;
  onAiLevelChange: (level: AiLevel) => void;
  onStart: () => void;
  onShowRules: () => void;
}) {
  return (
    <main className="menu-screen">
      <div className="menu-card">
        <p className="eyebrow">Dou Shou Qi · Cờ Thú</p>
        <h1 className="menu-title">Animal Chess</h1>
        <p className="menu-sub">Bàn cờ 3D — chỉ huy bầy thú, lùa đối thủ vào hang.</p>

        <div className="menu-modes">
          <button
            type="button"
            className={`menu-mode ${mode === "ai" ? "active" : ""}`}
            onClick={() => onModeChange("ai")}
            aria-pressed={mode === "ai"}
          >
            <Cpu />
            <strong>Đấu máy</strong>
            <span>Chơi đơn với AI</span>
          </button>
          <button
            type="button"
            className={`menu-mode ${mode === "online" ? "active" : ""}`}
            onClick={() => onModeChange("online")}
            aria-pressed={mode === "online"}
          >
            <Globe2 />
            <strong>Online</strong>
            <span>Đấu người chơi khác</span>
          </button>
        </div>

        {mode === "ai" ? (
          <label className="menu-difficulty">
            Độ khó
            <select value={aiLevel} onChange={(e) => onAiLevelChange(e.target.value as AiLevel)}>
              <option value="easy">Dễ</option>
              <option value="medium">Vừa</option>
              <option value="hard">Khó</option>
            </select>
          </label>
        ) : (
          <p className="menu-note">Sau khi bắt đầu, tạo phòng hoặc tìm trận nhanh ở bảng Online.</p>
        )}

        <div className="menu-actions">
          <button type="button" className="primary" onClick={onStart}>
            <Play /> {mode === "ai" ? "Bắt đầu" : "Vào sảnh online"}
          </button>
          <button type="button" onClick={onShowRules}>
            <BookOpen /> Luật chơi
          </button>
        </div>

        {playerName ? <p className="menu-greeting">Xin chào, {playerName}</p> : null}
      </div>
    </main>
  );
}
