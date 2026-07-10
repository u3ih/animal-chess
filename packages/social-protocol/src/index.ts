/**
 * Typed GraphQL contract for the Python backend (users, friends, rank, gamification).
 *
 * The SDL in `../schema.graphql` (exported by `services/api`) is the source of truth; these
 * TypeScript types + operation documents mirror it. (Wire `graphql-codegen` against the SDL to
 * regenerate this file once the schema grows.)
 */

export type Tier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
export type UserKind = "GOOGLE" | "GUEST";
export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
export type LeaderboardKind = "ELO" | "COINS" | "LEVEL";
export type RoomVisibility = "PUBLIC" | "PRIVATE";

export type SocialUser = {
  id: string;
  kind: UserKind;
  username: string;
  image?: string | null;
  isRanked: boolean;
};

export type Rating = {
  elo: number;
  tier: Tier;
  division: number | null;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  peakElo: number;
  leaderboardRank: number | null;
};

export type Wallet = { coins: number; xp: number; level: number };
export type Streaks = { loginCurrent: number; loginLongest: number; winCurrent: number; winLongest: number };
export type Me = { user: SocialUser; rating: Rating | null; wallet: Wallet; streaks: Streaks };

export type Friend = { user: SocialUser; online: boolean; inRoom?: string | null };
export type FriendRequest = {
  id: string;
  fromUser: SocialUser;
  toUser: SocialUser;
  status: FriendRequestStatus;
  createdAt: string;
};

export type LobbyRoom = {
  code: string;
  hostName: string;
  hostTier: Tier | null;
  occupancy: number;
  visibility: RoomVisibility;
  createdAt: string;
};

export type Quest = {
  id: string;
  code: string;
  kind: string;
  progress: number;
  target: number;
  rewardCoins: number;
  rewardXp: number;
  completed: boolean;
  claimed: boolean;
};

export type Achievement = {
  code: string;
  unlocked: boolean;
  unlockedAt?: string | null;
  rewardCoins: number;
  rewardXp: number;
};

export type DailyStatus = { claimable: boolean; streak: number; nextMultiplier: number };
export type LeaderboardEntry = { rank: number; user: SocialUser; score: number; tier: Tier | null };
export type RewardResult = {
  claimed: boolean;
  coins: number;
  xp: number;
  leveledUp: boolean;
  level: number;
  streak?: number | null;
  multiplier?: number | null;
};

// --- Subscription payloads ---
export type PresenceEntry = { userId: string; username: string; roomId?: string | null };
export type FriendEvent = {
  kind: "REQUEST" | "ACCEPTED" | "RESOLVED";
  request?: FriendRequest | null;
  user?: SocialUser | null;
  status?: FriendRequestStatus | null;
};
export type RoomInvite = { fromUser: SocialUser; roomCode: string };
export type RankUpdate = { elo: number; tier: Tier; division: number | null; delta: number };
export type WalletUpdate = { coins: number; xp: number; level: number; leveledUp: boolean };
export type QuestUpdate = { questId: string; code: string; progress: number; target: number; completed: boolean };
export type RewardEvent = { source: string; coins: number; xp: number; achievement?: string | null };
export type PurchaseResult = { cosmeticId: string; coins: number };

// --- Reusable fragments ---
const USER_FIELDS = "id kind username image isRanked";
const RATING_FIELDS = "elo tier division games wins losses draws peakElo leaderboardRank";

// --- Queries ---
export const ME_QUERY = `query Me {
  me {
    user { ${USER_FIELDS} }
    rating { ${RATING_FIELDS} }
    wallet { coins xp level }
    streaks { loginCurrent loginLongest winCurrent winLongest }
  }
}`;

export const FRIENDS_QUERY = `query Friends {
  friends { user { ${USER_FIELDS} } online inRoom }
}`;

export const FRIEND_REQUESTS_QUERY = `query FriendRequests($incoming: Boolean!) {
  friendRequests(incoming: $incoming) {
    id status createdAt fromUser { ${USER_FIELDS} } toUser { ${USER_FIELDS} }
  }
}`;

export const LOBBY_QUERY = `query Lobby {
  lobby { code hostName hostTier occupancy visibility createdAt }
}`;

export const QUESTS_QUERY = `query Quests {
  quests { id code kind progress target rewardCoins rewardXp completed claimed }
}`;

export const ACHIEVEMENTS_QUERY = `query Achievements {
  achievements { code unlocked unlockedAt rewardCoins rewardXp }
}`;

export const DAILY_STATUS_QUERY = `query DailyStatus { dailyStatus { claimable streak nextMultiplier } }`;

export const OWNED_COSMETICS_QUERY = `query OwnedCosmetics { ownedCosmetics }`;

export const LEADERBOARD_QUERY = `query Leaderboard($kind: LeaderboardKind!, $limit: Int!) {
  leaderboard(kind: $kind, limit: $limit) { rank score tier user { ${USER_FIELDS} } }
}`;

export const SEARCH_USERS_QUERY = `query SearchUsers($query: String!) {
  searchUsers(query: $query) { ${USER_FIELDS} }
}`;

// --- Mutations ---
export const SEND_FRIEND_REQUEST = `mutation Send($toUsername: String) {
  sendFriendRequest(toUsername: $toUsername) { id status }
}`;

export const RESPOND_FRIEND_REQUEST = `mutation Respond($id: ID!, $accept: Boolean!) {
  respondFriendRequest(id: $id, accept: $accept) { id status }
}`;

export const CANCEL_FRIEND_REQUEST = `mutation Cancel($id: ID!) { cancelFriendRequest(id: $id) }`;
export const REMOVE_FRIEND = `mutation Remove($userId: ID!) { removeFriend(userId: $userId) }`;
export const SEND_ROOM_INVITE = `mutation Invite($toUserId: ID!, $roomCode: String!) {
  sendRoomInvite(toUserId: $toUserId, roomCode: $roomCode)
}`;
export const UPDATE_USERNAME = `mutation Rename($username: String!) {
  updateUsername(username: $username) { ${USER_FIELDS} }
}`;
export const CLAIM_DAILY = `mutation ClaimDaily {
  claimDailyBonus { claimed coins xp leveledUp level streak multiplier }
}`;
export const CLAIM_QUEST = `mutation ClaimQuest($questId: ID!) {
  claimQuest(questId: $questId) { claimed coins xp leveledUp level }
}`;
export const PURCHASE_COSMETIC = `mutation Purchase($cosmeticId: String!) {
  purchaseCosmetic(cosmeticId: $cosmeticId) { cosmeticId coins }
}`;

// --- Subscriptions ---
export const PRESENCE_SUB = `subscription { presence { userId username roomId } }`;
export const FRIEND_EVENTS_SUB = `subscription {
  friendEvents { kind status request { id status createdAt fromUser { ${USER_FIELDS} } toUser { ${USER_FIELDS} } } user { ${USER_FIELDS} } }
}`;
export const INVITES_SUB = `subscription { invites { roomCode fromUser { ${USER_FIELDS} } } }`;
export const LOBBY_SUB = `subscription { lobbyUpdates { code hostName hostTier occupancy visibility createdAt } }`;
export const RANK_SUB = `subscription { rankUpdates { elo tier division delta } }`;
export const WALLET_SUB = `subscription { walletUpdates { coins xp level leveledUp } }`;
export const QUEST_SUB = `subscription { questUpdates { questId code progress target completed } }`;
export const REWARD_SUB = `subscription { rewardToasts { source coins xp achievement } }`;
