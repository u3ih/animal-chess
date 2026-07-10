"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { DirectMessage, SocialUser } from "@animal-chess/social-protocol";
import { Button, cx, IconButton, Input } from "@animal-chess/ui";
import { MessagesSquare, Send, X } from "lucide-react";
import { type FormEvent, useLayoutEffect, useRef, useState } from "react";
import styles from "./dm-chat.module.scss";

/** Floating private-chat window for one friend — docked bottom-right, mirrors the in-game chat shell. */
export function DmChat({
  friend,
  messages,
  meId,
  onSend,
  onClose
}: {
  friend: SocialUser;
  messages: DirectMessage[];
  meId: string | null;
  onSend: (body: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  // Pin the log to the newest message on open and whenever the thread grows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length drives the scroll
  useLayoutEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages.length]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <section className={styles.dmChat} aria-label={t("dm.title")}>
      <header className={styles.dmHead}>
        <span className="panel-title">
          <MessagesSquare />
          {friend.username}
        </span>
        <IconButton label={t("dm.close")} icon={<X />} onClick={onClose} />
      </header>
      <div className={styles.dmLog} ref={logRef}>
        {messages.length === 0 ? <p>{t("dm.empty", { name: friend.username })}</p> : null}
        {messages.map((message) => (
          <article key={message.id} className={cx(message.fromUserId === meId && styles.mine)}>
            <span>{message.body}</span>
          </article>
        ))}
      </div>
      <form onSubmit={submit}>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("dm.placeholder", { name: friend.username })}
        />
        <Button type="submit" icon={<Send />} aria-label={t("dm.send")} />
      </form>
    </section>
  );
}
