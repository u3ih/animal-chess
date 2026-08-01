"""FastAPI app factory: public + internal GraphQL routers, CORS, Redis lifespan."""

from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.config import get_settings
from app.core.security import verify_internal_request
from app.events import close_redis, init_redis
from app.graphql.context import get_context
from app.graphql.internal_schema import get_internal_context
from app.graphql.internal_schema import schema as internal_schema
from app.graphql.schema import schema as public_schema
from app.services import lobby_service

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_redis()
    # Best-effort: rebuild the lobby registry from Node's authoritative room snapshot.
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(settings.node_snapshot_url)
            if resp.status_code == 200:
                await lobby_service.reconcile(resp.json().get("rooms", []))
    except Exception:  # noqa: BLE001 — reconciliation is best-effort
        pass
    yield
    await close_redis()


async def verify_internal(request: Request) -> None:
    body = await request.body()
    ok = verify_internal_request(
        body,
        request.headers.get("x-internal-signature"),
        request.headers.get("x-timestamp"),
    )
    if not ok:
        raise HTTPException(status_code=401, detail="invalid internal signature")


def create_app() -> FastAPI:
    app = FastAPI(title="Animal Chess API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,  # the JWE travels as a bearer token, never a cookie
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Guest-Id", "X-Guest-Name"],
    )

    # The routers are explicitly parameterized by their context type: unparameterized, the context
    # defaults to None and every context_getter looks like the wrong shape.
    public: GraphQLRouter[dict[str, Any], None] = GraphQLRouter(
        public_schema, context_getter=get_context, path="/graphql"
    )
    app.include_router(public)

    internal: GraphQLRouter[dict[str, Any], None] = GraphQLRouter(
        internal_schema, context_getter=get_internal_context, path="/internal/graphql"
    )
    app.include_router(internal, dependencies=[Depends(verify_internal)])

    @app.get("/healthz")
    async def healthz() -> dict:
        return {"status": "ok"}

    return app
