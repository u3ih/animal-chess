"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { ChatMessage } from "@animal-chess/net-protocol";
import { Button, Input, Panel } from "@animal-chess/ui";
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
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <Panel className="chat-panel" icon={<MessageSquareText />} title={t("chat.title")}>
      <div className="chat-log">
        {messages.length === 0 ? <p>{t("chat.empty")}</p> : null}
        {messages.map((message) => (
          <article key={message.id}>
            <strong>{message.username}</strong>
            <span>{message.text}</span>
          </article>
        ))}
      </div>
      <form onSubmit={submit}>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={disabled}
          placeholder={t("chat.placeholder")}
        />
        <Button type="submit" disabled={disabled} icon={<Send />} />
      </form>
    </Panel>
  );
}
