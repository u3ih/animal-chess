"use client";

import { UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";

export function GuestLoginPanel({ onSubmit }: { onSubmit: (username: string) => void }) {
  const [username, setUsername] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) return;
    onSubmit(trimmed);
  }

  return (
    <form className="guest-panel" onSubmit={submit}>
      <div className="panel-title">
        <UserPlus />
        Chơi với tư cách khách
      </div>
      <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Tên khách" />
      <button type="submit">Vào chơi</button>
    </form>
  );
}
