"use client";

import { UserCog } from "lucide-react";
import { useSession } from "next-auth/react";
import { type FormEvent, useEffect, useState } from "react";

export function ProfilePanel({ onUsernameChange }: { onUsernameChange?: (username: string) => void }) {
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
    <form className="profile-panel" onSubmit={save}>
      <div className="panel-title">
        <UserCog />
        Hồ sơ
      </div>
      <input value={username} onChange={(event) => setUsername(event.target.value)} />
      <button type="submit">{saved ? "Đã lưu" : "Lưu tên"}</button>
    </form>
  );
}
