"""Process a finished game (from the Node game server) → ELO + rewards + quests + achievements.

Exactly-once: ``matches.external_id`` is unique. A duplicate report (Node retry) returns
early and awards nothing. Any guest participant ⇒ the match is unranked and NOBODY earns
(anti-farm).
"""

from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import MatchResult, QuestKind, RewardSource
from app.events import publish_to_user
from app.gamification import new_elo, result_reward, tier_for, win_streak_bonus
from app.models.gamification import WinStreak
from app.models.match import Match, MatchPlayer
from app.models.user import User, UserRating
from app.services import achievement_service, quest_service, reward_service, user_service


@dataclass(slots=True)
class PlayerInput:
    user_id: str  # web identity: email (google) or uuid (guest)
    color: str  # "red" | "blue"


@dataclass(slots=True)
class MatchResultInput:
    match_id: str
    players: list[PlayerInput]
    winner: str | None  # "red" | "blue" | None (draw)
    reason: str | None
    moves: int
    started_at: datetime
    ended_at: datetime
    captured_kinds: dict[str, list[str]] = field(default_factory=dict)


@dataclass(slots=True)
class ReportOutcome:
    status: str  # "processed" | "duplicate" | "invalid"
    is_ranked: bool = False


def _result_for(color: str, winner: str | None) -> MatchResult:
    if winner is None:
        return MatchResult.DRAW
    return MatchResult.WIN if color == winner else MatchResult.LOSS


def _score(result: MatchResult) -> float:
    return {MatchResult.WIN: 1.0, MatchResult.DRAW: 0.5, MatchResult.LOSS: 0.0}[result]


async def _resolve_user(session: AsyncSession, web_id: str) -> User | None:
    """Map a web identity to a persisted google user (guests never resolve)."""
    if "@" not in web_id:
        return None
    return (await session.execute(select(User).where(User.email == web_id))).scalar_one_or_none()


async def report_result(session: AsyncSession, data: MatchResultInput) -> ReportOutcome:
    if len(data.players) != 2 or data.players[0].user_id == data.players[1].user_id:
        return ReportOutcome(status="invalid")

    if (await session.execute(select(Match).where(Match.external_id == data.match_id))).scalar_one_or_none():
        return ReportOutcome(status="duplicate")

    resolved = [(p, await _resolve_user(session, p.user_id)) for p in data.players]
    is_ranked = all(u is not None and u.kind == "google" for _, u in resolved)

    match = Match(
        external_id=data.match_id,
        winner_color=data.winner,
        reason=data.reason,
        moves=data.moves,
        is_ranked=is_ranked,
        started_at=data.started_at,
        ended_at=data.ended_at,
    )
    session.add(match)
    try:
        await session.flush()
    except IntegrityError:  # lost an insert race ⇒ already processed
        await session.rollback()
        return ReportOutcome(status="duplicate")

    if not is_ranked:
        # History only (no awards) for any resolved google user; guests get nothing.
        for p, user in resolved:
            if user is not None:
                session.add(
                    MatchPlayer(
                        match_id=match.id,
                        user_id=user.id,
                        color=p.color,
                        result=_result_for(p.color, data.winner).value,
                    )
                )
        await session.commit()
        return ReportOutcome(status="processed", is_ranked=False)

    # Ranked: ensure progress rows then snapshot both ELOs before mutating either.
    for _, user in resolved:
        await user_service.ensure_progress_rows(session, user.id)
    await session.flush()
    elos = {u.id: (await session.get(UserRating, u.id)).elo for _, u in resolved}

    publishes: list[tuple[int, str, dict]] = []

    for idx, (p, user) in enumerate(resolved):
        opponent = resolved[1 - idx][1]
        result = _result_for(p.color, data.winner)
        rating = await session.get(UserRating, user.id)
        before = elos[user.id]
        after = new_elo(before, elos[opponent.id], _score(result), rating.games)
        rating.elo = after
        rating.peak_elo = max(rating.peak_elo, after)
        rating.games += 1
        if result is MatchResult.WIN:
            rating.wins += 1
        elif result is MatchResult.LOSS:
            rating.losses += 1
        else:
            rating.draws += 1
        session.add(rating)

        win = await session.get(WinStreak, user.id)
        if result is MatchResult.WIN:
            win.current += 1
            win.longest = max(win.longest, win.current)
        else:
            win.current = 0
        streak_value = win.current
        session.add(win)

        coins, xp = result_reward(result.value)
        if result is MatchResult.WIN:
            sc, sx = win_streak_bonus(streak_value)
            coins += sc
            xp += sx
        outcome = await reward_service.grant(
            session, user.id, coins=coins, xp=xp, source=RewardSource(result.value), ref_id=f"match:{data.match_id}"
        )

        captured = data.captured_kinds.get(p.color, [])
        await quest_service.bump(session, user.id, QuestKind.PLAY_GAMES)
        if result is MatchResult.WIN:
            await quest_service.bump(session, user.id, QuestKind.WIN_GAMES)
            await quest_service.set_streak(session, user.id, streak_value)
        await quest_service.bump_capture(session, user.id, captured)

        new_codes = await achievement_service.evaluate_for_match(
            session,
            user.id,
            elo_after=after,
            total_wins=rating.wins,
            win_streak_value=streak_value,
            captured_kinds=captured,
            won=result is MatchResult.WIN,
            reason=data.reason,
        )

        session.add(
            MatchPlayer(
                match_id=match.id,
                user_id=user.id,
                color=p.color,
                result=result.value,
                elo_before=before,
                elo_after=after,
                coins_awarded=outcome.coins,
                xp_awarded=outcome.xp,
            )
        )

        tier, division = tier_for(after)
        publishes.append(
            (user.id, "rank", {"elo": after, "tier": tier.value, "division": division, "delta": after - before,
                               "games": rating.games, "wins": rating.wins, "losses": rating.losses,
                               "draws": rating.draws, "peakElo": rating.peak_elo}))
        publishes.append((user.id, "reward", {"source": result.value, "coins": outcome.coins, "xp": outcome.xp}))
        publishes.append((user.id, "wallet", {"coins": outcome.total_coins, "xp": outcome.total_xp,
                                              "level": outcome.level, "leveledUp": outcome.leveled_up}))
        publishes.extend((user.id, "achievement", {"code": code}) for code in new_codes)

    await session.commit()

    for user_id, type_, payload in publishes:
        await publish_to_user(user_id, type_, payload)
    for _, user in resolved:
        for view in await quest_service.todays_quests(session, user.id):
            await publish_to_user(
                user.id,
                "quest",
                {"questId": view.row.quest_id, "code": view.definition.code, "progress": view.row.progress,
                 "target": view.row.target, "completed": view.row.completed_at is not None},
            )
    return ReportOutcome(status="processed", is_ranked=True)


@dataclass(slots=True)
class MatchHistoryRow:
    match: Match
    me: MatchPlayer
    opponent: User | None


async def list_matches(session: AsyncSession, user_id: int, limit: int, before_id: int | None) -> list[MatchHistoryRow]:
    stmt = (
        select(MatchPlayer, Match)
        .join(Match, Match.id == MatchPlayer.match_id)
        .where(MatchPlayer.user_id == user_id)
        .order_by(Match.id.desc())
        .limit(min(limit, 100))
    )
    if before_id is not None:
        stmt = stmt.where(Match.id < before_id)
    rows = (await session.execute(stmt)).all()

    history: list[MatchHistoryRow] = []
    for mine, match in rows:
        opp_stmt = (
            select(User)
            .join(MatchPlayer, MatchPlayer.user_id == User.id)
            .where(MatchPlayer.match_id == match.id, MatchPlayer.user_id != user_id)
        )
        opponent = (await session.execute(opp_stmt)).scalars().first()
        history.append(MatchHistoryRow(match=match, me=mine, opponent=opponent))
    return history
