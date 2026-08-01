"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { ChatMessage } from "@animal-chess/net-protocol";
import { IconButton } from "@animal-chess/ui";
import { MessageSquareText, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChatComposer, ChatLog, QuickChatRow } from "@/components/chat-panel";
import styles from "./in-game-chat.module.scss";

/**
 * Floating in-match chat docked bottom-left (above the panels drawer toggle). Collapsed to a bubble
 * with an unread badge; opens upward. Reuses the shared chat parts so the drawer panel and this
 * overlay stay in sync. Unread counts only the opponent's messages received while collapsed.
 */
export function InGameChat({
  messages,
  disabled,
  onSend,
  selfId
}: {
  messages: ChatMessage[];
  disabled: boolean;
  onSend: (text: string) => void;
  selfId?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(messages.length);
  const logRef = useRef<HTMLDivElement>(null);

  // While open, keep the seen marker pinned to the tail so nothing reads as unread.
  useEffect(() => {
    if (open) setSeenCount(messages.length);
  }, [open, messages.length]);

  // Auto-scroll to the newest message whenever the log changes while open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length is the scroll trigger, not read here.
  useLayoutEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, messages.length]);

  const unread = open ? 0 : messages.slice(seenCount).filter((message) => message.userId !== selfId).length;

  if (!open) {
    return (
      <button
        type="button"
        className={styles.ingameChatBubble}
        aria-label={t("chat.title")}
        onClick={() => setOpen(true)}
      >
        <MessageSquareText />
        {unread > 0 ? <span className={styles.ingameChatBadge}>{unread > 9 ? "9+" : unread}</span> : null}
      </button>
    );
  }

  return (
    <section className={styles.ingameChat} aria-label={t("chat.title")}>
      <header className={styles.ingameChatHead}>
        <span className="panel-title">
          <MessageSquareText />
          {t("chat.title")}
        </span>
        <IconButton label={t("common.close")} icon={<X />} onClick={() => setOpen(false)} />
      </header>
      <ChatLog messages={messages} logRef={logRef} />
      <QuickChatRow disabled={disabled} onSend={onSend} />
      <ChatComposer disabled={disabled} onSend={onSend} />
    </section>
  );
}
