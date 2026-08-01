"""GraphQL object types + enums (documented — this is the published contract)."""

from datetime import datetime
from enum import Enum
from typing import TypeAlias

import strawberry

from app import enums

# ``strawberry.enum()`` attaches the GraphQL definition to the shared enum *in place* and hands back
# the very same class, so registering and aliasing are two steps rather than one assignment. The
# aliases must be spelled as ``TypeAlias`` for the annotations below to be real types, not variables.
strawberry.enum(enums.UserKind, description="How a player authenticates.")
strawberry.enum(enums.Tier, description="Visible rank tier derived from hidden ELO.")
strawberry.enum(enums.FriendRequestStatus)
strawberry.enum(enums.MatchResult)
strawberry.enum(enums.MatchReason, description="How a game ended.")
strawberry.enum(enums.QuestKind)
strawberry.enum(enums.RoomVisibility)
strawberry.enum(enums.LeaderboardKind)

UserKind: TypeAlias = enums.UserKind
Tier: TypeAlias = enums.Tier
FriendRequestStatus: TypeAlias = enums.FriendRequestStatus
MatchResult: TypeAlias = enums.MatchResult
MatchReason: TypeAlias = enums.MatchReason
QuestKind: TypeAlias = enums.QuestKind
RoomVisibility: TypeAlias = enums.RoomVisibility
LeaderboardKind: TypeAlias = enums.LeaderboardKind


@strawberry.type(description="A player. Guests expose only a username; rank is google-only.")
class User:
    id: strawberry.ID
    kind: UserKind
    username: str
    image: str | None = None
    is_ranked: bool = False


@strawberry.type(description="Hidden ELO is shown to the owner only; others see tier + division.")
class Rating:
    elo: int
    tier: Tier
    division: int | None
    games: int
    wins: int
    losses: int
    draws: int
    peak_elo: int
    leaderboard_rank: int | None = None


@strawberry.type(description="Soft currency, experience and account level.")
class Wallet:
    coins: int
    xp: int
    level: int


@strawberry.type
class Streaks:
    login_current: int
    login_longest: int
    win_current: int
    win_longest: int


@strawberry.type(description="The signed-in player's full profile aggregate.")
class Me:
    user: User
    rating: Rating | None
    wallet: Wallet
    streaks: Streaks


@strawberry.type
class Friend:
    user: User
    online: bool
    in_room: str | None = None


@strawberry.type
class FriendRequest:
    id: strawberry.ID
    from_user: User
    to_user: User
    status: FriendRequestStatus
    created_at: datetime


@strawberry.type(description="A private message between two friends.")
class DirectMessage:
    id: strawberry.ID
    from_user_id: strawberry.ID
    to_user_id: strawberry.ID
    body: str
    created_at: datetime
    read_at: datetime | None = None


@strawberry.type(description="Unread private-message count from one friend.")
class DmUnread:
    friend_id: strawberry.ID
    count: int


@strawberry.type(description="An open, joinable room registered by the Node game server.")
class LobbyRoom:
    code: str
    host_name: str
    host_tier: Tier | None
    occupancy: int
    visibility: RoomVisibility
    created_at: datetime


@strawberry.type(description="One row of the caller's match history.")
class Match:
    external_id: strawberry.ID
    opponent: User | None
    result: MatchResult
    reason: MatchReason | None
    elo_delta: int | None
    coins: int
    xp: int
    ended_at: datetime


@strawberry.type(description="A daily quest. `code` maps to an i18n key on the web.")
class Quest:
    id: strawberry.ID
    code: str
    kind: QuestKind
    progress: int
    target: int
    reward_coins: int
    reward_xp: int
    completed: bool
    claimed: bool


@strawberry.type
class Achievement:
    code: str
    unlocked: bool
    unlocked_at: datetime | None
    reward_coins: int
    reward_xp: int


@strawberry.type
class DailyStatus:
    claimable: bool
    streak: int
    next_multiplier: float


@strawberry.type
class LeaderboardEntry:
    rank: int
    user: User
    score: int
    tier: Tier | None


@strawberry.type(description="Result of claiming a daily bonus or quest.")
class RewardResult:
    claimed: bool
    coins: int
    xp: int
    leveled_up: bool
    level: int
    streak: int | None = None
    multiplier: float | None = None


@strawberry.type(description="Result of a cosmetic purchase; `coins` is the wallet balance after.")
class PurchaseResult:
    cosmetic_id: str
    coins: int


# --- Subscription payloads ---
@strawberry.type
class PresenceEntry:
    user_id: str
    username: str
    room_id: str | None = None


@strawberry.enum
class FriendEventKind(str, Enum):
    REQUEST = "request"
    ACCEPTED = "accepted"
    RESOLVED = "resolved"


@strawberry.type
class FriendEvent:
    kind: FriendEventKind
    request: FriendRequest | None = None
    user: User | None = None
    status: FriendRequestStatus | None = None


@strawberry.type
class RoomInvite:
    from_user: User
    room_code: str


@strawberry.type(description="Live ELO change after a ranked match.")
class RankUpdate:
    elo: int
    tier: Tier
    division: int | None
    delta: int


@strawberry.type
class WalletUpdate:
    coins: int
    xp: int
    level: int
    leveled_up: bool


@strawberry.type
class QuestUpdate:
    quest_id: strawberry.ID
    code: str
    progress: int
    target: int
    completed: bool


@strawberry.type(description="A 'you earned…' toast. `tier` is set for one-time tier promotions.")
class RewardEvent:
    source: str
    coins: int
    xp: int
    achievement: str | None = None
    tier: Tier | None = None


@strawberry.input
class GuestInput:
    user_id: str
    username: str
