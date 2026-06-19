"use client";

import type { AiLevel } from "@animal-chess/game-core";
import { useTranslation } from "@animal-chess/i18n";
import { Button, cx, Select } from "@animal-chess/ui";
import { BookOpen, Cpu, Globe2, Play } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { STATIC_EXPORT } from "@/lib/flags";

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
  const { t } = useTranslation();
  const levelOptions = [
    { value: "easy", label: t("difficulty.easy") },
    { value: "medium", label: t("difficulty.medium") },
    { value: "hard", label: t("difficulty.hard") }
  ];

  return (
    <main className="menu-screen">
      <div className="menu-card">
        <div className="menu-toolbar">
          <LanguageSwitcher className="menu-lang" />
        </div>
        <p className="eyebrow">{t("menu.eyebrow")}</p>
        <h1 className="menu-title">{t("menu.title")}</h1>
        <p className="menu-sub">{t("menu.subtitle")}</p>

        <div className="menu-modes">
          <Button
            className={cx("menu-mode", mode === "ai" && "active")}
            onClick={() => onModeChange("ai")}
            aria-pressed={mode === "ai"}
            icon={<Cpu />}
          >
            <strong>{t("menu.modeAi")}</strong>
            <span>{t("menu.modeAiHint")}</span>
          </Button>
          {STATIC_EXPORT ? null : (
            <Button
              className={cx("menu-mode", mode === "online" && "active")}
              onClick={() => onModeChange("online")}
              aria-pressed={mode === "online"}
              icon={<Globe2 />}
            >
              <strong>{t("menu.modeOnline")}</strong>
              <span>{t("menu.modeOnlineHint")}</span>
            </Button>
          )}
        </div>

        {mode === "ai" ? (
          <Select
            label={t("menu.difficulty")}
            labelClassName="menu-difficulty"
            value={aiLevel}
            onChange={(event) => onAiLevelChange(event.target.value as AiLevel)}
            options={levelOptions}
          />
        ) : (
          <p className="menu-note">{t("menu.onlineNote")}</p>
        )}

        <div className="menu-actions">
          <Button variant="primary" onClick={onStart} icon={<Play />}>
            {mode === "ai" ? t("menu.startAi") : t("menu.startOnline")}
          </Button>
          <Button onClick={onShowRules} icon={<BookOpen />}>
            {t("menu.rules")}
          </Button>
        </div>

        {playerName ? <p className="menu-greeting">{t("menu.greeting", { name: playerName })}</p> : null}
      </div>
    </main>
  );
}
