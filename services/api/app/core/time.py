"""Time helpers — the daily-reset boundary for login bonus / daily quests."""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from app.config import get_settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def server_day(at: datetime | None = None) -> date:
    """The calendar day in the configured daily-reset timezone (e.g. Asia/Ho_Chi_Minh)."""
    tz = ZoneInfo(get_settings().daily_tz)
    moment = at or utcnow()
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(tz).date()
