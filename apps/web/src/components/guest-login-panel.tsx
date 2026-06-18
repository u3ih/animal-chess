"use client";

import { useTranslation } from "@animal-chess/i18n";
import { Button, Input, Panel } from "@animal-chess/ui";
import { UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";

export function GuestLoginPanel({ onSubmit }: { onSubmit: (username: string) => void }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) return;
    onSubmit(trimmed);
  }

  return (
    <Panel as="form" className="guest-panel" onSubmit={submit} icon={<UserPlus />} title={t("guest.title")}>
      <Input
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder={t("guest.namePlaceholder")}
      />
      <Button type="submit">{t("guest.play")}</Button>
    </Panel>
  );
}
