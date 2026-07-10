"use client";

import type { PieceKind } from "@animal-chess/game-core";
import { useTranslation } from "@animal-chess/i18n";
import { Button, cx, IconButton, Modal } from "@animal-chess/ui";
import { Coins, ShoppingBag, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { COSTUME_IDS, DEFAULT_COSTUME, getCostume } from "@/components/three/skins";
import type { CostumesApi } from "@/hooks/use-costumes";
import { PIECE_ORDER } from "@/hooks/use-game-controller";
import styles from "./costume-shop.module.scss";

const CostumePreview = dynamic(() => import("./costume-preview").then((m) => m.CostumePreview), { ssr: false });

/** Costume shop: pick a piece-kind, preview it, then equip an owned costume or buy a locked one. */
export function CostumeShop({
  open,
  onClose,
  costumes,
  coins,
  isGoogle
}: {
  open: boolean;
  onClose: () => void;
  costumes: CostumesApi;
  coins: number | null;
  isGoogle: boolean;
}) {
  const { t } = useTranslation();
  // Costume nameKeys are dynamic strings from the registry; escape the typed-key signature for them.
  const tr = t as (key: string, opts?: Record<string, unknown>) => string;
  const [kind, setKind] = useState<PieceKind>(PIECE_ORDER[0]);
  if (!open) return null;
  const equippedId = costumes.equipped[kind] ?? DEFAULT_COSTUME;

  return (
    <Modal ariaLabel={t("shop.title")} className={styles.shop} onClose={onClose}>
      <header className="modal-head">
        <h2>
          <ShoppingBag /> {t("shop.title")}
        </h2>
        <div className={styles.headRight}>
          {coins != null ? (
            <span className={styles.coins}>
              <Coins /> {coins}
            </span>
          ) : null}
          <IconButton className="icon-btn" label={t("common.close")} icon={<X />} onClick={onClose} />
        </div>
      </header>

      <div className={styles.pieceRow} role="tablist" aria-label={t("shop.choosePiece")}>
        {PIECE_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === kind}
            className={cx(styles.pieceBtn, k === kind && styles.active)}
            onClick={() => setKind(k)}
          >
            {t(`pieces.${k}`)}
          </button>
        ))}
      </div>

      <div className={styles.preview}>
        <CostumePreview kind={kind} costumeId={equippedId} label={t(`pieces.${kind}`)} />
      </div>

      <div className={styles.cardGrid}>
        {COSTUME_IDS.map((id) => {
          const def = getCostume(id);
          const isEquipped = equippedId === id;
          const isOwned = costumes.owned.has(id);
          const isFree = def.price === 0;
          return (
            <div key={id} className={cx(styles.card, isEquipped && styles.equipped)}>
              <span className={styles.name}>{tr(def.nameKey)}</span>
              <span className={styles.price}>{isFree ? t("shop.free") : `💰 ${def.price}`}</span>
              {isEquipped ? (
                <em className={styles.badge}>{t("shop.equipped")}</em>
              ) : isOwned ? (
                <Button onClick={() => costumes.equip(kind, id)}>{t("shop.equip")}</Button>
              ) : isGoogle ? (
                <Button
                  variant="primary"
                  disabled={costumes.purchasing === id || (coins ?? 0) < def.price}
                  onClick={() => costumes.purchase(id)}
                >
                  {t("shop.buy", { price: String(def.price) })}
                </Button>
              ) : (
                <small className={styles.locked}>{t("shop.signInRequired")}</small>
              )}
            </div>
          );
        })}
      </div>

      {costumes.error ? <p className={styles.error}>{costumes.error}</p> : null}
    </Modal>
  );
}
