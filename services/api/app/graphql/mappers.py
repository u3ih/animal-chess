"""Convert service/ORM results into GraphQL types."""

import strawberry

from app.enums import UserKind
from app.gamification import tier_for
from app.graphql import types as t
from app.models.gamification import LoginStreak, WinStreak
from app.models.user import User as UserModel
from app.models.user import UserRating, UserWallet


def user(u: UserModel) -> t.User:
    return t.User(
        id=strawberry.ID(str(u.id)),
        kind=UserKind(u.kind),
        username=u.username,
        image=u.image_url,
        is_ranked=u.kind == UserKind.GOOGLE.value,
    )


def rating(r: UserRating | None, *, leaderboard_rank: int | None = None) -> t.Rating | None:
    if r is None:
        return None
    tier, division = tier_for(r.elo)
    return t.Rating(
        elo=r.elo,
        tier=tier,
        division=division,
        games=r.games,
        wins=r.wins,
        losses=r.losses,
        draws=r.draws,
        peak_elo=r.peak_elo,
        leaderboard_rank=leaderboard_rank,
    )


def wallet(w: UserWallet) -> t.Wallet:
    return t.Wallet(coins=w.coins, xp=w.xp, level=w.level)


def streaks(login: LoginStreak, win: WinStreak) -> t.Streaks:
    return t.Streaks(
        login_current=login.current_streak,
        login_longest=login.longest_streak,
        win_current=win.current,
        win_longest=win.longest,
    )
