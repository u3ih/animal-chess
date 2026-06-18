"use client";

import type { PieceKind } from "@animal-chess/game-core";
import { useTranslation } from "@animal-chess/i18n";
import { Button, IconButton, Modal } from "@animal-chess/ui";
import { Droplets, Flag, ShieldAlert, Sparkles, X } from "lucide-react";

const PIECE_ROWS: { kind: PieceKind; rank: number }[] = [
  { kind: "elephant", rank: 8 },
  { kind: "lion", rank: 7 },
  { kind: "tiger", rank: 6 },
  { kind: "leopard", rank: 5 },
  { kind: "wolf", rank: 4 },
  { kind: "dog", rank: 3 },
  { kind: "cat", rank: 2 },
  { kind: "rat", rank: 1 }
];

export function RulesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Modal ariaLabel={t("rules.ariaLabel")} className="rules-card" onClose={onClose}>
      <header className="modal-head">
        <h2>
          <Sparkles /> {t("rules.title")}
        </h2>
        <IconButton className="icon-btn" label={t("common.close")} icon={<X />} onClick={onClose} />
      </header>

      <div className="rules-body">
        <section>
          <h3>{t("rules.rankTitle")}</h3>
          <div className="rank-table">
            {PIECE_ROWS.map((p) => (
              <div key={p.kind} className="rank-row">
                <span className="rank-chip">{p.rank}</span>
                <strong>{t(`pieces.${p.kind}`)}</strong>
              </div>
            ))}
          </div>
          <p>{t("rules.rankNote")}</p>
        </section>

        <section>
          <h3>{t("rules.terrainTitle")}</h3>
          <ul className="rules-list">
            <li>
              <Droplets />{" "}
              <span>
                <strong>{t("rules.waterLabel")}</strong> {t("rules.waterText")}
              </span>
            </li>
            <li>
              <ShieldAlert />{" "}
              <span>
                <strong>{t("rules.trapLabel")}</strong> {t("rules.trapText")}
              </span>
            </li>
            <li>
              <Flag />{" "}
              <span>
                <strong>{t("rules.denLabel")}</strong> {t("rules.denText")}
              </span>
            </li>
          </ul>
          <p>{t("rules.moveNote")}</p>
        </section>

        <section>
          <h3>{t("rules.winTitle")}</h3>
          <ul className="rules-list">
            <li>
              <span>{t("rules.winDen")}</span>
            </li>
            <li>
              <span>{t("rules.winElimination")}</span>
            </li>
          </ul>
        </section>
      </div>

      <footer className="modal-foot">
        <Button onClick={onClose}>{t("common.understood")}</Button>
      </footer>
    </Modal>
  );
}
