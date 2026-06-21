"""Pure rank + reward math (no DB). Kept side-effect-free so it is trivially unit-tested."""

import math

from app.enums import Tier

# --- ELO ---
ELO_START = 1000
ELO_FLOOR = 100
_PROVISIONAL_GAMES = 30


def k_factor(games_played: int, elo: int) -> int:
    if games_played < _PROVISIONAL_GAMES:
        return 40
    if elo >= 2100:
        return 10
    return 20


def expected_score(rating: int, opponent: int) -> float:
    return 1.0 / (1.0 + 10 ** ((opponent - rating) / 400))


def new_elo(rating: int, opponent: int, score: float, games_played: int) -> int:
    """``score`` = 1 win / 0.5 draw / 0 loss."""
    k = k_factor(games_played, rating)
    updated = rating + k * (score - expected_score(rating, opponent))
    return max(ELO_FLOOR, round(updated))


# --- Tiers (derived from ELO) ---
# (tier, lower_bound). Diamond has no divisions.
_TIER_BANDS: list[tuple[Tier, int, int]] = [
    (Tier.BRONZE, 0, 1099),
    (Tier.SILVER, 1100, 1299),
    (Tier.GOLD, 1300, 1499),
    (Tier.PLATINUM, 1500, 1699),
    (Tier.DIAMOND, 1700, 100_000),
]


def tier_for(elo: int) -> tuple[Tier, int | None]:
    """Return (tier, division) where division is 3..1 (III lowest) or None for Diamond."""
    for tier, low, high in _TIER_BANDS:
        if low <= elo <= high:
            if tier is Tier.DIAMOND:
                return tier, None
            span = (high - low + 1) / 3
            offset = elo - low
            division = 3 - min(2, int(offset // span))  # III at the bottom, I at the top
            return tier, division
    return (Tier.DIAMOND, None) if elo > 1699 else (Tier.BRONZE, 3)


# --- Level curve (cumulative xp -> level) ---
_LEVEL_UP_COINS = 100


def level_for_xp(xp: int) -> int:
    if xp <= 0:
        return 1
    return int((1 + math.sqrt(1 + 8 * xp / 100)) / 2)


def xp_for_level(level: int) -> int:
    return 100 * (level - 1) * level // 2


def level_up_bonus(old_level: int, new_level: int) -> int:
    return max(0, new_level - old_level) * _LEVEL_UP_COINS


# --- Daily login bonus ---
_DAILY_BASE_COINS = 50
_DAILY_BASE_XP = 20
_DAILY_WEEKLY_BONUS = 200


def daily_multiplier(streak_day: int) -> float:
    return min(1 + 0.1 * (streak_day - 1), 2.0)


def daily_reward(streak_day: int) -> tuple[int, int]:
    """(coins, xp) for claiming on the ``streak_day``-th consecutive day."""
    mult = daily_multiplier(streak_day)
    coins = round(_DAILY_BASE_COINS * mult)
    xp = round(_DAILY_BASE_XP * mult)
    if streak_day % 7 == 0:
        coins += _DAILY_WEEKLY_BONUS
    return coins, xp


def next_daily_multiplier(current_streak: int, last_claim_was_yesterday: bool) -> float:
    next_streak = current_streak + 1 if last_claim_was_yesterday else 1
    return daily_multiplier(next_streak)


# --- Per-match rewards (ranked only) ---
_RESULT_REWARDS = {
    "win": (30, 50),
    "loss": (5, 10),
    "draw": (10, 20),
}


def result_reward(result: str) -> tuple[int, int]:
    return _RESULT_REWARDS.get(result, (0, 0))


def win_streak_bonus(win_streak_after: int) -> tuple[int, int]:
    """Extra (coins, xp) for a win that brings the streak to ``win_streak_after``."""
    steps = min(max(win_streak_after - 1, 0), 5)
    return 10 * steps, 5 * steps
