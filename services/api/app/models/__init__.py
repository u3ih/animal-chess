"""All SQLModel tables. Imported here so Alembic autogenerate sees every table."""

from app.models.achievement import AchievementDefinition, UserAchievement
from app.models.cosmetic import UserCosmetic
from app.models.gamification import DailyLoginLog, LoginStreak, WinStreak
from app.models.match import Match, MatchPlayer
from app.models.quest import QuestDefinition, UserDailyQuest
from app.models.social import FriendRequest, Friendship
from app.models.user import User, UserRating, UserWallet, WalletLedger

__all__ = [
    "AchievementDefinition",
    "UserAchievement",
    "UserCosmetic",
    "DailyLoginLog",
    "LoginStreak",
    "WinStreak",
    "Match",
    "MatchPlayer",
    "QuestDefinition",
    "UserDailyQuest",
    "FriendRequest",
    "Friendship",
    "User",
    "UserRating",
    "UserWallet",
    "WalletLedger",
]
