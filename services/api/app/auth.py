"""Identity resolution: turn a NextAuth JWE (or a guest marker) into a ``Principal``.

Google users are upserted into the DB and carry a numeric ``user_id``; guests are
ephemeral (no row, no rank, no rewards).
"""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.narrowing import must
from app.core.security import AuthError, decode_session
from app.enums import UserKind


@dataclass(slots=True)
class Principal:
    kind: UserKind
    external_key: str  # google email or guest uuid
    username: str
    image: str | None = None
    user_id: int | None = None  # DB id — set for persisted google users only

    @property
    def is_ranked(self) -> bool:
        return self.kind is UserKind.GOOGLE and self.user_id is not None

    @property
    def is_guest(self) -> bool:
        return self.kind is UserKind.GUEST

    @property
    def db_id(self) -> int:
        """The DB row id, for resolvers already behind ``require_google`` / an ``is_ranked`` check.

        Guests have no row, so reach for this only where being ranked is a precondition — anywhere
        an anonymous or guest caller is legitimate, read ``user_id`` and handle the ``None``.
        """
        return must(self.user_id, "user_id of a ranked principal")


def _username_from_claims(claims: dict) -> str:
    name = (claims.get("name") or "").strip()
    if name:
        return name[:24]
    email = claims.get("email") or ""
    return email.split("@")[0][:24] or "Player"


async def resolve_principal(
    session: AsyncSession,
    *,
    token: str | None,
    guest: dict | None,
) -> Principal | None:
    """Resolve the caller. ``None`` = anonymous (public reads only)."""
    # Imported lazily to avoid a circular import (services import models import nothing here).
    from app.services import user_service

    if token:
        try:
            claims = decode_session(token)
        except AuthError:
            return None
        email = claims.get("email")
        sub = claims.get("sub")
        if not email:
            return None
        user = await user_service.upsert_google_user(
            session,
            email=email,
            external_id=sub,
            username=_username_from_claims(claims),
            image=claims.get("picture"),
        )
        return Principal(
            kind=UserKind.GOOGLE,
            external_key=email,
            username=user.username,
            image=user.image_url,
            user_id=user.id,
        )

    if guest:
        guest_id = str(guest.get("userId") or "").strip()
        username = str(guest.get("username") or "").strip()[:24] or "Khách"
        # A guest must never claim an email-shaped id (would let them impersonate a google user).
        if not guest_id or "@" in guest_id:
            return None
        return Principal(kind=UserKind.GUEST, external_key=guest_id, username=username)

    return None
