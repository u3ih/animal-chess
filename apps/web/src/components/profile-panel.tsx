"use client";

import { useTranslation } from "@animal-chess/i18n";
import { Button, Input, Panel } from "@animal-chess/ui";
import { UserCog } from "lucide-react";
import { useSession } from "next-auth/react";
import { type FormEvent, useEffect, useState } from "react";

export function ProfilePanel({ onUsernameChange }: { onUsernameChange?: (username: string) => void }) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/profile")
      .then((response) => response.json())
      .then((profile) => {
        setUsername(profile.username ?? "");
        onUsernameChange?.(profile.username ?? "");
      });
  }, [session, onUsernameChange]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    setSaved(response.ok);
    if (response.ok) onUsernameChange?.(username);
  }

  if (!session?.user) return null;

  return (
    <Panel as="form" className="profile-panel" onSubmit={save} icon={<UserCog />} title={t("profile.title")}>
      <Input value={username} onChange={(event) => setUsername(event.target.value)} />
      <Button type="submit">{saved ? t("profile.saved") : t("profile.save")}</Button>
    </Panel>
  );
}
