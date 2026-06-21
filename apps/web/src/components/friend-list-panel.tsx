"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { Friend, FriendRequest, RoomInvite } from "@animal-chess/social-protocol";
import { Button, IconButton, Input, Panel } from "@animal-chess/ui";
import { Check, Circle, MailPlus, Send, UserRoundPlus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { PlayerIdentity } from "@/hooks/use-player-identity";
import styles from "./friend-list-panel.module.scss";

export function FriendListPanel({
  identity,
  friends,
  requests,
  invites,
  roomId,
  onRequest,
  onRespond,
  onRemove,
  onInvite,
  onAcceptInvite,
  onDismissInvite
}: {
  identity?: PlayerIdentity;
  friends: Friend[];
  requests: FriendRequest[];
  invites: RoomInvite[];
  roomId?: string;
  onRequest: (username: string) => void;
  onRespond: (id: string, accept: boolean) => void;
  onRemove: (userId: string) => void;
  onInvite: (toUserId: string) => void;
  onAcceptInvite: (roomCode: string) => void;
  onDismissInvite: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  if (!identity) return null;

  if (identity.kind !== "google") {
    return (
      <Panel className="friend-panel" icon={<UserRoundPlus />} title={t("friends.title")}>
        <p>{t("friends.signInRequired")}</p>
        {invites.length > 0 ? (
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
        ) : null}
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

  return (
    <Panel className="friend-panel" icon={<UserRoundPlus />} title={t("friends.title")}>
      <form onSubmit={addFriend}>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("friends.invitePlaceholder")}
        />
        <Button type="submit" icon={<MailPlus />} />
      </form>
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
      {invites.length > 0 ? (
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
      ) : null}
    </Panel>
  );
}
