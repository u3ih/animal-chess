"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { Friend, FriendRequest, RoomInvite, SocialUser } from "@animal-chess/social-protocol";
import { Button, IconButton, Input, Panel } from "@animal-chess/ui";
import { Check, Circle, MessagesSquare, Send, UserRoundPlus, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { PlayerIdentity } from "@/hooks/use-player-identity";
import styles from "./friend-list-panel.module.scss";

const SEARCH_DEBOUNCE_MS = 300;

export function FriendListPanel({
  identity,
  friends,
  requests,
  invites,
  dmUnread,
  roomId,
  onRequest,
  onAddById,
  onSearch,
  onRespond,
  onRemove,
  onInvite,
  onOpenChat,
  onAcceptInvite,
  onDismissInvite
}: {
  identity?: PlayerIdentity;
  friends: Friend[];
  requests: FriendRequest[];
  invites: RoomInvite[];
  dmUnread: Record<string, number>;
  roomId?: string;
  onRequest: (username: string) => void;
  onAddById: (userId: string) => void;
  onSearch: (query: string) => Promise<SocialUser[]>;
  onRespond: (id: string, accept: boolean) => void;
  onRemove: (userId: string) => void;
  onInvite: (toUserId: string) => void;
  onOpenChat: (friend: SocialUser) => void;
  onAcceptInvite: (roomCode: string) => void;
  onDismissInvite: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<SocialUser[]>([]);
  const [searched, setSearched] = useState(false);
  const searchSeq = useRef(0);

  const friendIds = new Set(friends.map((f) => f.user.id));

  // Debounced username search; a sequence guard drops stale responses.
  useEffect(() => {
    const query = draft.trim();
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      const users = await onSearch(query);
      if (searchSeq.current === seq) {
        setResults(users);
        setSearched(true);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, onSearch]);

  if (!identity) return null;

  const roomInvites =
    invites.length > 0 ? (
      <div className={styles.roomInvites}>
        {invites.map((invite, index) => (
          <div key={`${invite.fromUser.id}-${invite.roomCode}`}>
            <strong>{invite.fromUser.username}</strong>
            <span>{t("friends.invitedToRoom", { id: invite.roomCode })}</span>
            <Button onClick={() => onAcceptInvite(invite.roomCode)}>{t("common.join")}</Button>
            <Button onClick={() => onDismissInvite(index)}>{t("common.skip")}</Button>
          </div>
        ))}
      </div>
    ) : null;

  if (identity.kind !== "google") {
    return (
      <Panel className="friend-panel" icon={<UserRoundPlus />} title={t("friends.title")}>
        <p>{t("friends.signInRequired")}</p>
        {roomInvites}
      </Panel>
    );
  }

  function addFriend(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next) return;
    onRequest(next);
    setDraft("");
  }

  function addById(userId: string) {
    onAddById(userId);
    setDraft("");
  }

  return (
    <Panel className="friend-panel" icon={<UserRoundPlus />} title={t("friends.title")}>
      <form onSubmit={addFriend}>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("friends.searchPlaceholder")}
        />
        <Button type="submit" icon={<UserRoundPlus />} />
      </form>
      {searched ? (
        <div className={styles.searchResults}>
          {results.length === 0 ? <p>{t("friends.noResults")}</p> : null}
          {results.map((user) => (
            <span key={user.id}>
              {user.username}
              {friendIds.has(user.id) ? (
                <Check aria-hidden="true" />
              ) : (
                <IconButton
                  label={t("friends.add", { name: user.username })}
                  icon={<UserRoundPlus />}
                  onClick={() => addById(user.id)}
                />
              )}
            </span>
          ))}
        </div>
      ) : null}
      {requests.length > 0 ? (
        <div className={styles.friendRequests}>
          {requests.map((request) => (
            <span key={request.id}>
              {request.fromUser.username}
              <IconButton
                label={t("friends.accept", { name: request.fromUser.username })}
                icon={<Check />}
                onClick={() => onRespond(request.id, true)}
              />
              <IconButton
                label={t("friends.decline", { name: request.fromUser.username })}
                icon={<X />}
                onClick={() => onRespond(request.id, false)}
              />
            </span>
          ))}
        </div>
      ) : null}
      <div className={styles.friendList}>
        {friends.length === 0 ? <p>{t("friends.empty")}</p> : null}
        {friends.map((friend) => (
          <span key={friend.user.id}>
            <Circle className={friend.online ? "online" : ""} />
            {friend.user.username}
            <span className={styles.chatButton}>
              <IconButton
                label={t("friends.chat", { name: friend.user.username })}
                icon={<MessagesSquare />}
                onClick={() => onOpenChat(friend.user)}
              />
              {(dmUnread[friend.user.id] ?? 0) > 0 ? (
                <em className={styles.unreadBadge}>{dmUnread[friend.user.id] > 9 ? "9+" : dmUnread[friend.user.id]}</em>
              ) : null}
            </span>
            {roomId && friend.online ? (
              <IconButton
                label={t("friends.invite", { name: friend.user.username })}
                icon={<Send />}
                onClick={() => onInvite(friend.user.id)}
              />
            ) : null}
            <IconButton
              label={t("friends.remove", { name: friend.user.username })}
              icon={<X />}
              onClick={() => onRemove(friend.user.id)}
            />
          </span>
        ))}
      </div>
      {roomInvites}
    </Panel>
  );
}
