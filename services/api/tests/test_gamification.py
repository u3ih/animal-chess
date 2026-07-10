"""Pure rank/reward math."""

from app.enums import Tier
from app.gamification import (
    TIER_PROMOTION_REWARDS,
    daily_multiplier,
    daily_reward,
    expected_score,
    level_for_xp,
    new_elo,
    result_reward,
    tier_for,
    tier_promotions,
    win_streak_bonus,
)


def test_expected_score_symmetry():
    assert expected_score(1000, 1000) == 0.5
    assert expected_score(1200, 1000) > 0.5
    assert round(expected_score(1000, 1200) + expected_score(1200, 1000), 6) == 1.0


def test_new_elo_direction():
    win = new_elo(1000, 1000, 1.0, 0)
    loss = new_elo(1000, 1000, 0.0, 0)
    assert win > 1000 > loss
    # K=40 provisional, equal opponents ⇒ +/-20.
    assert win == 1020
    assert loss == 980


def test_new_elo_floor():
    assert new_elo(110, 2000, 0.0, 100) >= 100


def test_tier_bands():
    assert tier_for(900)[0] is Tier.BRONZE
    assert tier_for(1150)[0] is Tier.SILVER
    assert tier_for(1350)[0] is Tier.GOLD
    assert tier_for(1550)[0] is Tier.PLATINUM
    assert tier_for(1800)[0] is Tier.DIAMOND
    # Master/Grandmaster are apex tiers without divisions.
    assert tier_for(1950) == (Tier.MASTER, None)
    assert tier_for(2100) == (Tier.GRANDMASTER, None)
    assert tier_for(3000) == (Tier.GRANDMASTER, None)
    # Divisions run III (low) -> I (high).
    assert tier_for(1100)[1] == 3
    assert tier_for(1290)[1] == 1


def test_tier_promotions():
    # No rise, or rise inside one band ⇒ nothing.
    assert tier_promotions(1000, 1000) == []
    assert tier_promotions(1120, 1050) == []
    assert tier_promotions(1000, 1099) == []
    # Crossing one floor pays that tier once.
    assert tier_promotions(1095, 1112) == [(Tier.SILVER, *TIER_PROMOTION_REWARDS[Tier.SILVER])]
    # A big jump pays every tier crossed, in order.
    tiers = [t for t, _, _ in tier_promotions(1000, 2150)]
    assert tiers == [Tier.SILVER, Tier.GOLD, Tier.PLATINUM, Tier.DIAMOND, Tier.MASTER, Tier.GRANDMASTER]
    # Rewards escalate monotonically.
    rewards = [TIER_PROMOTION_REWARDS[t][0] for t in tiers]
    assert rewards == sorted(rewards)


def test_level_curve():
    assert level_for_xp(0) == 1
    assert level_for_xp(99) == 1
    assert level_for_xp(100) == 2
    assert level_for_xp(300) == 3


def test_daily_reward_scaling():
    assert daily_multiplier(1) == 1.0
    assert daily_multiplier(11) == 2.0  # capped
    c1, _ = daily_reward(1)
    c7, _ = daily_reward(7)
    assert c7 > c1  # weekly bonus on day 7


def test_result_and_streak_rewards():
    assert result_reward("win")[0] == 30
    assert result_reward("loss")[0] == 5
    assert win_streak_bonus(1) == (0, 0)
    assert win_streak_bonus(6) == (50, 25)  # capped at 5 steps
    assert win_streak_bonus(10) == (50, 25)
