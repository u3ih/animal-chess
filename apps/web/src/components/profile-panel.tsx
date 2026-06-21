"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { Me } from "@animal-chess/social-protocol";
import { Button, Input, Panel } from "@animal-chess/ui";
import { Coins, Star, UserCog } from "lucide-react";
import { useSession } from "next-auth/react";
import { type FormEvent, useEffect, useState } from "react";
import { TIER_LABEL_KEY } from "@/lib/labels";

export function ProfilePanel({
  me,
  onRename,
  onUsernameChange
}: {
  me: Me | null;
  onRename: (username: string) => Promise<boolean>;
  onUsernameChange?: (username: string) => void;
}) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me?.user.username) {
      setUsername(me.user.username);
      onUsernameChange?.(me.user.username);
    }
  }, [me?.user.username, onUsernameChange]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const ok = await onRename(username);
    setSaved(ok);
    if (ok) onUsernameChange?.(username);
  }

  if (!session?.user) return null;

  return (
    <Panel className="profile-panel" icon={<UserCog />} title={t("profile.title")}>
      <form onSubmit={save}>
        <Input value={username} onChange={(event) => setUsername(event.target.value)} />
        <Button type="submit">{saved ? t("profile.saved") : t("profile.save")}</Button>
      </form>
      {me ? (
        <div className="profile-stats">
          <span title={t("rank.tier")}>
            <Star />
            {t(TIER_LABEL_KEY[me.rating?.tier ?? "BRONZE"])}
            {me.rating?.division ? ` ${me.rating.division}` : ""}
          </span>
          <span title={t("gamification.coins")}>
            <Coins />
            {me.wallet.coins}
          </span>
          <span title={t("gamification.level")}>
            {t("gamification.levelShort", { level: String(me.wallet.level) })}
          </span>
        </div>
      ) : null}
    </Panel>
  );
}
