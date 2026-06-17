"use client";

import type { ChatMessage } from "@animal-chess/net-protocol";
import { MessageSquareText, Send } from "lucide-react";
import { type FormEvent, useState } from "react";

export type { ChatMessage } from "@animal-chess/net-protocol";

export function ChatPanel({
  messages,
  disabled,
  onSend
}: {
  messages: ChatMessage[];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <section className="chat-panel">
      <div className="panel-title">
        <MessageSquareText />
        Chat
      </div>
      <div className="chat-log">
        {messages.length === 0 ? <p>Chưa có tin nhắn</p> : null}
        {messages.map((message) => (
          <article key={message.id}>
            <strong>{message.username}</strong>
            <span>{message.text}</span>
          </article>
        ))}
      </div>
      <form onSubmit={submit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={disabled}
          placeholder="Nhắn trong phòng"
        />
        <button type="submit" disabled={disabled}>
          <Send />
        </button>
      </form>
    </section>
  );
}
