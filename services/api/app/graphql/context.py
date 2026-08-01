"""GraphQL context: a per-operation dict carrying the DB session, plus principal helpers.

Token sources:
* HTTP queries/mutations — ``Authorization: Bearer <JWE>`` (guests: ``X-Guest-Id`` / ``X-Guest-Name``).
* WS subscriptions — the graphql-ws ``connection_params`` (``authToken`` / ``guest``),
  which Strawberry merges into the context.
"""

from typing import Any

from fastapi import Depends
from graphql import GraphQLError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal, resolve_principal
from app.db import get_session


async def get_context(db: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    # Strawberry augments this dict with `request`/`response`/`connection_params`
    # for HTTP and WS operations respectively.
    return {"db": db}


def _extract_auth(ctx: dict) -> tuple[str | None, dict | None]:
    token: str | None = None
    guest: dict | None = None

    params = ctx.get("connection_params")
    if isinstance(params, dict):
        token = params.get("authToken") or params.get("token")
        g = params.get("guest")
        if isinstance(g, dict):
            guest = g

    req = ctx.get("request")
    if req is not None:
        headers = req.headers
        auth = headers.get("authorization") or headers.get("Authorization")
        if token is None and auth and auth.lower().startswith("bearer "):
            token = auth[7:].strip()
        if guest is None:
            gid = headers.get("x-guest-id")
            if gid:
                guest = {"userId": gid, "username": headers.get("x-guest-name") or "Khách"}
    return token, guest


async def get_principal(info) -> Principal | None:
    ctx = info.context
    if ctx.get("_resolved"):
        return ctx.get("_principal")
    token, guest = _extract_auth(ctx)
    principal = await resolve_principal(ctx["db"], token=token, guest=guest)
    ctx["_principal"] = principal
    ctx["_resolved"] = True
    return principal


async def require_user(info) -> Principal:
    principal = await get_principal(info)
    if principal is None:
        raise GraphQLError("unauthenticated")
    return principal


async def require_google(info) -> Principal:
    principal = await require_user(info)
    if not principal.is_ranked:
        raise GraphQLError("a signed-in (google) account is required")
    return principal


def db_of(info) -> AsyncSession:
    return info.context["db"]
