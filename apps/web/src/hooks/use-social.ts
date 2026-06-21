"use client";

import {
  CLAIM_DAILY,
  CLAIM_QUEST,
  DAILY_STATUS_QUERY,
  type DailyStatus,
  FRIEND_EVENTS_SUB,
  FRIEND_REQUESTS_QUERY,
  FRIENDS_QUERY,
  type Friend,
  type FriendEvent,
  type FriendRequest,
  INVITES_SUB,
  LOBBY_QUERY,
  LOBBY_SUB,
  type LobbyRoom,
  ME_QUERY,
  type Me,
  PRESENCE_SUB,
  type PresenceEntry,
  QUEST_SUB,
  QUESTS_QUERY,
  type Quest,
  type QuestUpdate,
  RANK_SUB,
  type RankUpdate,
  REMOVE_FRIEND,
  RESPOND_FRIEND_REQUEST,
  REWARD_SUB,
  type RewardEvent,
  type RewardResult,
  type RoomInvite,
  SEND_FRIEND_REQUEST,
  SEND_ROOM_INVITE,
  UPDATE_USERNAME,
  WALLET_SUB,
  type WalletUpdate
} from "@animal-chess/social-protocol";
import type { Client as WsClient } from "graphql-ws";
import { useCallback, useEffect, useRef, useState } from "react";
import { STATIC_EXPORT } from "@/lib/flags";
import { createSocialWsClient, gqlRequest } from "@/lib/gql";
import type { PlayerIdentity } from "./use-player-identity";

export type {
  DailyStatus,
  Friend,
  FriendRequest,
  LobbyRoom,
  Me,
  PresenceEntry,
  Quest,
  RewardEvent,
  RoomInvite
} from "@animal-chess/social-protocol";

const MAX_TOASTS = 4;

/** All social / rank / gamification state for the signed-in player, over the Python GraphQL API. */
export function useSocial(identity?: PlayerIdentity) {
  const [me, setMe] = useState<Me | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [lobby, setLobby] = useState<LobbyRoom[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [toasts, setToasts] = useState<RewardEvent[]>([]);
  const clientRef = useRef<WsClient | undefined>(undefined);

  const isGoogle = identity?.kind === "google";

  const refreshFriends = useCallback(async () => {
    if (!isGoogle) return;
    try {
      const [f, r] = await Promise.all([
        gqlRequest<{ friends: Friend[] }>(FRIENDS_QUERY, {}, identity),
        gqlRequest<{ friendRequests: FriendRequest[] }>(FRIEND_REQUESTS_QUERY, { incoming: true }, identity)
      ]);
      setFriends(f.friends);
      setRequests(r.friendRequests);
    } catch {
      /* backend offline — leave state as-is */
    }
  }, [identity, isGoogle]);

  const refreshProfile = useCallback(async () => {
    if (!isGoogle) return;
    try {
      const [m, q, d] = await Promise.all([
        gqlRequest<{ me: Me | null }>(ME_QUERY, {}, identity),
        gqlRequest<{ quests: Quest[] }>(QUESTS_QUERY, {}, identity),
        gqlRequest<{ dailyStatus: DailyStatus }>(DAILY_STATUS_QUERY, {}, identity)
      ]);
      setMe(m.me);
      setQuests(q.quests);
      setDailyStatus(d.dailyStatus);
    } catch {
      /* ignore */
    }
  }, [identity, isGoogle]);

  const refreshLobby = useCallback(async () => {
    try {
      const { lobby: rooms } = await gqlRequest<{ lobby: LobbyRoom[] }>(LOBBY_QUERY, {}, identity);
      setLobby(rooms);
    } catch {
      /* ignore */
    }
  }, [identity]);

  // Initial fetches.
  useEffect(() => {
    if (STATIC_EXPORT || !identity) return;
    void refreshLobby();
    void refreshFriends();
    void refreshProfile();
  }, [identity, refreshLobby, refreshFriends, refreshProfile]);

  // Live subscriptions.
  useEffect(() => {
    if (STATIC_EXPORT || !identity) return;
    let cancelled = false;
    const disposers: (() => void)[] = [];

    function sub<T>(client: WsClient, query: string, onNext: (data: T) => void) {
      const unsub = client.subscribe<T>(
        { query },
        { next: (msg) => msg.data && onNext(msg.data), error: () => {}, complete: () => {} }
      );
      disposers.push(unsub);
    }

    void (async () => {
      const client = await createSocialWsClient(identity);
      if (cancelled) {
        await client.dispose();
        return;
      }
      clientRef.current = client;

      sub<{ presence: PresenceEntry[] }>(client, PRESENCE_SUB, (d) => setPresence(d.presence));
      sub<{ lobbyUpdates: LobbyRoom[] }>(client, LOBBY_SUB, (d) => setLobby(d.lobbyUpdates));
      if (isGoogle) {
        sub<{ friendEvents: FriendEvent }>(client, FRIEND_EVENTS_SUB, (d) => {
          const ev = d.friendEvents;
          if (ev.kind === "REQUEST" && ev.request) setRequests((cur) => [ev.request as FriendRequest, ...cur]);
          else void refreshFriends();
        });
        sub<{ invites: RoomInvite }>(client, INVITES_SUB, (d) => setInvites((cur) => [...cur, d.invites]));
        sub<{ rankUpdates: RankUpdate }>(client, RANK_SUB, (d) =>
          setMe((cur) =>
            cur?.rating
              ? {
                  ...cur,
                  rating: {
                    ...cur.rating,
                    elo: d.rankUpdates.elo,
                    tier: d.rankUpdates.tier,
                    division: d.rankUpdates.division
                  }
                }
              : cur
          )
        );
        sub<{ walletUpdates: WalletUpdate }>(client, WALLET_SUB, (d) =>
          setMe((cur) =>
            cur
              ? {
                  ...cur,
                  wallet: { coins: d.walletUpdates.coins, xp: d.walletUpdates.xp, level: d.walletUpdates.level }
                }
              : cur
          )
        );
        sub<{ questUpdates: QuestUpdate }>(client, QUEST_SUB, (d) =>
          setQuests((cur) =>
            cur.map((q) =>
              q.id === d.questUpdates.questId
                ? { ...q, progress: d.questUpdates.progress, completed: d.questUpdates.completed }
                : q
            )
          )
        );
        sub<{ rewardToasts: RewardEvent }>(client, REWARD_SUB, (d) =>
          setToasts((cur) => [...cur, d.rewardToasts].slice(-MAX_TOASTS))
        );
      }
    })();

    return () => {
      cancelled = true;
      for (const d of disposers) d();
      void clientRef.current?.dispose();
      clientRef.current = undefined;
    };
  }, [identity, isGoogle, refreshFriends]);

  const sendFriendRequest = useCallback(
    async (username: string) => {
      try {
        await gqlRequest(SEND_FRIEND_REQUEST, { toUsername: username }, identity);
        await refreshFriends();
      } catch {
        /* ignore */
      }
    },
    [identity, refreshFriends]
  );

  const respondFriendRequest = useCallback(
    async (id: string, accept: boolean) => {
      setRequests((cur) => cur.filter((r) => r.id !== id));
      try {
        await gqlRequest(RESPOND_FRIEND_REQUEST, { id, accept }, identity);
        await refreshFriends();
      } catch {
        /* ignore */
      }
    },
    [identity, refreshFriends]
  );

  const removeFriend = useCallback(
    async (userId: string) => {
      setFriends((cur) => cur.filter((f) => f.user.id !== userId));
      try {
        await gqlRequest(REMOVE_FRIEND, { userId }, identity);
      } catch {
        /* ignore */
      }
    },
    [identity]
  );

  const sendRoomInvite = useCallback(
    async (toUserId: string, roomCode: string) => {
      try {
        await gqlRequest(SEND_ROOM_INVITE, { toUserId, roomCode }, identity);
      } catch {
        /* ignore */
      }
    },
    [identity]
  );

  const claimDaily = useCallback(async (): Promise<RewardResult | null> => {
    try {
      const { claimDailyBonus } = await gqlRequest<{ claimDailyBonus: RewardResult }>(CLAIM_DAILY, {}, identity);
      await Promise.all([refreshProfile()]);
      return claimDailyBonus;
    } catch {
      return null;
    }
  }, [identity, refreshProfile]);

  const claimQuest = useCallback(
    async (questId: string) => {
      try {
        await gqlRequest(CLAIM_QUEST, { questId }, identity);
        await refreshProfile();
      } catch {
        /* ignore */
      }
    },
    [identity, refreshProfile]
  );

  const updateUsername = useCallback(
    async (username: string): Promise<boolean> => {
      try {
        await gqlRequest(UPDATE_USERNAME, { username }, identity);
        await refreshProfile();
        return true;
      } catch {
        return false;
      }
    },
    [identity, refreshProfile]
  );

  const dismissInvite = useCallback((index: number) => {
    setInvites((cur) => cur.filter((_, i) => i !== index));
  }, []);

  const dismissToast = useCallback((index: number) => {
    setToasts((cur) => cur.filter((_, i) => i !== index));
  }, []);

  return {
    me,
    friends,
    requests,
    presence,
    invites,
    lobby,
    quests,
    dailyStatus,
    toasts,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    sendRoomInvite,
    claimDaily,
    claimQuest,
    updateUsername,
    refreshLobby,
    dismissInvite,
    dismissToast
  };
}
