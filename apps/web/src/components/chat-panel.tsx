"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { ChatMessage } from "@animal-chess/net-protocol";
import { Button, cx, Input, Panel } from "@animal-chess/ui";
import { MessageSquareText, Send } from "lucide-react";
import { type FormEvent, type Ref, useState } from "react";
import styles from "./chat-panel.module.scss";

export type { ChatMessage } from "@animal-chess/net-protocol";

/** Preset one-tap taunts (i18n keys) + universal emoji reactions — both sent through `onSend`. */
const QUICK_TAUNTS = ["gg", "nice", "oops", "hurry", "close", "gl"] as const;
const QUICK_EMOJI = ["👍", "😅", "😮", "🐯", "🐭", "🎉"];

/** Scrollable message feed. `logRef` lets a caller auto-scroll to the latest message. */
export function ChatLog({ messages, logRef }: { messages: ChatMessage[]; logRef?: Ref<HTMLDivElement> }) {
  const { t } = useTranslation();
  return (
    <div className={styles.chatLog} ref={logRef}>
      {messages.length === 0 ? <p>{t("chat.empty")}</p> : null}
      {messages.map((message) => (
        <article key={message.id}>
          <strong>{message.username}</strong>
          <span>{message.text}</span>
        </article>
      ))}
    </div>
  );
}

/** One-tap taunt + emoji chips. Each tap fires `onSend` immediately (no draft). */
export function QuickChatRow({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className={styles.chatQuick} role="toolbar" aria-label={t("chat.quickLabel")}>
      {QUICK_TAUNTS.map((key) => (
        <button
          key={key}
          type="button"
          className={styles.chatChip}
          disabled={disabled}
          onClick={() => onSend(t(`chat.quick.${key}`))}
        >
          {t(`chat.quick.${key}`)}
        </button>
      ))}
      {QUICK_EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={cx(styles.chatChip, styles.chatChipEmoji)}
          disabled={disabled}
          aria-label={emoji}
          onClick={() => onSend(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/** Free-text input + send button. Clears the draft on submit. */
export function ChatComposer({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
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
    <form onSubmit={submit}>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={disabled}
        placeholder={t("chat.placeholder")}
      />
      <Button type="submit" disabled={disabled} icon={<Send />} />
    </form>
  );
}

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
  return (
    <Panel className="chat-panel" icon={<MessageSquareText />} title={t("chat.title")}>
      <ChatLog messages={messages} />
      <QuickChatRow disabled={disabled} onSend={onSend} />
      <ChatComposer disabled={disabled} onSend={onSend} />
    </Panel>
  );
}
