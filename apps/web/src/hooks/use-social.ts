"use client";

import {
  CLAIM_DAILY,
  CLAIM_QUEST,
  DAILY_STATUS_QUERY,
  type DailyStatus,
  type DirectMessage,
  DM_HISTORY_QUERY,
  DM_SUB,
  DM_UNREAD_QUERY,
  type DmUnread,
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
  MARK_DM_READ,
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
  SEARCH_USERS_QUERY,
  SEND_DM,
  SEND_FRIEND_REQUEST,
  SEND_ROOM_INVITE,
  type SocialUser,
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
  DirectMessage,
  Friend,
  FriendRequest,
  LobbyRoom,
  Me,
  PresenceEntry,
  Quest,
  RewardEvent,
  RoomInvite,
  SocialUser
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
  const [dmThreads, setDmThreads] = useState<Record<string, DirectMessage[]>>({});
  const [dmUnread, setDmUnread] = useState<Record<string, number>>({});
  const [activeDmFriendId, setActiveDmFriendId] = useState<string | null>(null);
  const clientRef = useRef<WsClient | undefined>(undefined);
  // Subscription handlers outlive renders; refs let them see the current profile + open thread.
  const meIdRef = useRef<string | null>(null);
  const activeDmRef = useRef<string | null>(null);
  meIdRef.current = me?.user.id ?? null;
  activeDmRef.current = activeDmFriendId;

  const isGoogle = identity?.kind === "google";

  const appendDm = useCallback((friendId: string, message: DirectMessage) => {
    setDmThreads((cur) => {
      const thread = cur[friendId] ?? [];
      if (thread.some((m) => m.id === message.id)) return cur;
      return { ...cur, [friendId]: [...thread, message] };
    });
  }, []);

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

  const refreshDmUnread = useCallback(async () => {
    if (!isGoogle) return;
    try {
      const { dmUnread: rows } = await gqlRequest<{ dmUnread: DmUnread[] }>(DM_UNREAD_QUERY, {}, identity);
      setDmUnread(Object.fromEntries(rows.map((r) => [r.friendId, r.count])));
    } catch {
      /* ignore */
    }
  }, [identity, isGoogle]);

  // Initial fetches.
  useEffect(() => {
    if (STATIC_EXPORT || !identity) return;
    void refreshLobby();
    void refreshFriends();
    void refreshProfile();
    void refreshDmUnread();
  }, [identity, refreshLobby, refreshFriends, refreshProfile, refreshDmUnread]);

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
        sub<{ directMessageEvents: DirectMessage }>(client, DM_SUB, (d) => {
          const message = d.directMessageEvents;
          const myId = meIdRef.current;
          const friendId = message.fromUserId === myId ? message.toUserId : message.fromUserId;
          appendDm(friendId, message);
          if (message.fromUserId === myId) return; // own echo (multi-tab)
          if (activeDmRef.current === friendId) {
            void gqlRequest(MARK_DM_READ, { friendId }, identity).catch(() => {});
          } else {
            setDmUnread((cur) => ({ ...cur, [friendId]: (cur[friendId] ?? 0) + 1 }));
          }
        });
      }
    })();

    return () => {
      cancelled = true;
      for (const d of disposers) d();
      void clientRef.current?.dispose();
      clientRef.current = undefined;
    };
  }, [identity, isGoogle, refreshFriends, appendDm]);

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

  const searchUsers = useCallback(
    async (query: string): Promise<SocialUser[]> => {
      if (!isGoogle || query.trim().length < 2) return [];
      try {
        const { searchUsers: users } = await gqlRequest<{ searchUsers: SocialUser[] }>(
          SEARCH_USERS_QUERY,
          { query: query.trim() },
          identity
        );
        return users;
      } catch {
        return [];
      }
    },
    [identity, isGoogle]
  );

  const sendFriendRequestTo = useCallback(
    async (userId: string) => {
      try {
        await gqlRequest(SEND_FRIEND_REQUEST, { toUserId: userId }, identity);
        await refreshFriends();
      } catch {
        /* ignore */
      }
    },
    [identity, refreshFriends]
  );

  const openDm = useCallback(
    async (friendId: string) => {
      setActiveDmFriendId(friendId);
      setDmUnread((cur) => ({ ...cur, [friendId]: 0 }));
      try {
        const { directMessages } = await gqlRequest<{ directMessages: DirectMessage[] }>(
          DM_HISTORY_QUERY,
          { friendId, limit: 50 },
          identity
        );
        setDmThreads((cur) => ({ ...cur, [friendId]: directMessages }));
        await gqlRequest(MARK_DM_READ, { friendId }, identity);
      } catch {
        /* ignore */
      }
    },
    [identity]
  );

  const closeDm = useCallback(() => setActiveDmFriendId(null), []);

  const sendDm = useCallback(
    async (friendId: string, body: string) => {
      const text = body.trim();
      if (!text) return;
      try {
        const { sendDirectMessage } = await gqlRequest<{ sendDirectMessage: DirectMessage }>(
          SEND_DM,
          { toUserId: friendId, body: text },
          identity
        );
        appendDm(friendId, sendDirectMessage);
      } catch {
        /* ignore */
      }
    },
    [identity, appendDm]
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
    dmThreads,
    dmUnread,
    activeDmFriendId,
    sendFriendRequest,
    sendFriendRequestTo,
    searchUsers,
    respondFriendRequest,
    removeFriend,
    sendRoomInvite,
    openDm,
    closeDm,
    sendDm,
    claimDaily,
    claimQuest,
    updateUsername,
    refreshLobby,
    dismissInvite,
    dismissToast
  };
}
