"use client";

import { useTranslation } from "@animal-chess/i18n";
import { Button, IconButton, Input, Panel } from "@animal-chess/ui";
import { Circle, MailPlus, Send, UserRoundPlus, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { FriendRequest, PresenceEntry, RoomInvite } from "@/hooks/use-online-game";
import type { PlayerIdentity } from "@/hooks/use-player-identity";

const STORAGE_KEY = "animal-chess-guest-friends";

export function FriendListPanel({
  identity,
  presence,
  requests,
  acceptedFriends,
  invites,
  roomId,
  onRequest,
  onAcceptRequest,
  onInvite,
  onAcceptInvite,
  onDismissInvite
}: {
  identity?: PlayerIdentity;
  presence: PresenceEntry[];
  requests: FriendRequest[];
  acceptedFriends: string[];
  invites: RoomInvite[];
  roomId?: string;
  onRequest: (username: string) => void;
  onAcceptRequest: (requestId: string) => void;
  onInvite: (username: string) => void;
  onAcceptInvite: (invite: RoomInvite) => void;
  onDismissInvite: (inviteId: string) => void;
}) {
  const { t } = useTranslation();
  const [friends, setFriends] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!identity) return;
    if (identity.kind === "guest") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      queueMicrotask(() => setFriends(stored ? (JSON.parse(stored) as string[]) : []));
      return;
    }
    fetch("/api/profile")
      .then((response) => response.json())
      .then((profile) => setFriends(profile.friends ?? []));
  }, [identity]);

  const persist = useCallback(
    async (nextFriends: string[]) => {
      setFriends(nextFriends);
      if (!identity) return;
      if (identity.kind === "guest") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFriends));
        return;
      }
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friends: nextFriends })
      });
    },
    [identity]
  );

  useEffect(() => {
    const additions = acceptedFriends.filter((friend) => !friends.includes(friend));
    if (additions.length > 0) queueMicrotask(() => void persist([...friends, ...additions]));
  }, [acceptedFriends, friends, persist]);

  function addFriend(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next || friends.includes(next)) return;
    onRequest(next);
    setDraft("");
  }

  function removeFriend(friend: string) {
    void persist(friends.filter((entry) => entry !== friend));
  }

  if (!identity) return null;

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
        <div className="friend-requests">
          {requests.map((request) => (
            <Button key={request.id} onClick={() => onAcceptRequest(request.id)}>
              {t("friends.accept", { name: request.fromUsername })}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="friend-list">
        {friends.length === 0 ? <p>{t("friends.empty")}</p> : null}
        {friends.map((friend) => (
          <span key={friend}>
            <Circle className={presence.some((entry) => entry.username === friend) ? "online" : ""} />
            {friend}
            {roomId && presence.some((entry) => entry.username === friend) ? (
              <IconButton
                label={t("friends.invite", { name: friend })}
                icon={<Send />}
                onClick={() => onInvite(friend)}
              />
            ) : null}
            <IconButton
              label={t("friends.remove", { name: friend })}
              icon={<X />}
              onClick={() => removeFriend(friend)}
            />
          </span>
        ))}
      </div>
      {invites.length > 0 ? (
        <div className="room-invites">
          {invites.map((invite) => (
            <div key={invite.id}>
              <strong>{invite.fromUsername}</strong>
              <span>{t("friends.invitedToRoom", { id: invite.roomId })}</span>
              <Button onClick={() => onAcceptInvite(invite)}>{t("common.join")}</Button>
              <Button onClick={() => onDismissInvite(invite.id)}>{t("common.skip")}</Button>
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
