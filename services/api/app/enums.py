"""Shared enums used across models, services and the GraphQL layer.

Columns are stored as plain strings in Postgres (migration-friendly); these enums
constrain values at the application/GraphQL boundary. All inherit ``str`` so the
``.value`` is what lands in the database when an enum member is assigned.
"""

from enum import Enum


class UserKind(str, Enum):
    GOOGLE = "google"
    GUEST = "guest"


class FriendRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"


class MatchColor(str, Enum):
    RED = "red"
    BLUE = "blue"


class MatchReason(str, Enum):
    DEN = "den"
    ELIMINATION = "elimination"
    TIMEOUT = "timeout"
    RESIGN = "resign"


class MatchResult(str, Enum):
    WIN = "win"
    LOSS = "loss"
    DRAW = "draw"


class QuestKind(str, Enum):
    WIN_GAMES = "win_games"
    PLAY_GAMES = "play_games"
    CAPTURE_PIECE = "capture_piece"
    WIN_STREAK = "win_streak"
    LOGIN = "login"


class RewardSource(str, Enum):
    LOGIN = "login"
    WIN = "win"
    LOSS = "loss"
    DRAW = "draw"
    WIN_STREAK = "win_streak"
    QUEST = "quest"
    ACHIEVEMENT = "achievement"
    LEVEL_UP = "level_up"
    PURCHASE = "purchase"


class RoomVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class LeaderboardKind(str, Enum):
    ELO = "elo"
    COINS = "coins"
    LEVEL = "level"


class Tier(str, Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"
