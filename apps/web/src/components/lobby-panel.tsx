"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { LobbyRoom } from "@animal-chess/social-protocol";
import { Button, IconButton, Panel } from "@animal-chess/ui";
import { DoorOpen, LogIn, RefreshCcw } from "lucide-react";
import { TIER_LABEL_KEY } from "@/lib/labels";

export function LobbyPanel({
  rooms,
  onJoin,
  onRefresh
}: {
  rooms: LobbyRoom[];
  onJoin: (code: string) => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Panel className="lobby-panel" icon={<DoorOpen />} title={t("lobby.title")}>
      <div className="panel-actions">
        <IconButton label={t("lobby.refresh")} icon={<RefreshCcw />} onClick={onRefresh} />
      </div>
      {rooms.length === 0 ? <p>{t("lobby.empty")}</p> : null}
      <div className="lobby-list">
        {rooms.map((room) => (
          <span key={room.code} className="lobby-room">
            <strong>{room.hostName || room.code}</strong>
            {room.hostTier ? <em>{t(TIER_LABEL_KEY[room.hostTier])}</em> : null}
            <Button icon={<LogIn />} onClick={() => onJoin(room.code)}>
              {t("common.join")}
            </Button>
          </span>
        ))}
      </div>
    </Panel>
  );
}
