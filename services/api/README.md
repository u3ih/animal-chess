# @animal-chess/api

Python GraphQL backend (FastAPI + Strawberry + PostgreSQL) for **users, friends, ELO rank
and gamification**. The Node game server (`apps/web`) keeps the live game and reports results
here over the HMAC-guarded internal GraphQL schema.

## Run locally

```bash
cd services/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env            # fill NEXTAUTH_SECRET + INTERNAL_SYNC_SECRET to match apps/web

# Postgres + Redis (from the repo root)
docker compose up -d db redis

alembic upgrade head            # or: pnpm --filter @animal-chess/api migrate
python -m app.seed              # quest + achievement definitions (idempotent)
uvicorn app.asgi:app --reload --port 8000
```

GraphQL: `POST http://localhost:8000/graphql` (+ WS for subscriptions). Internal (HMAC):
`POST /internal/graphql`.

## Auth

The web app is NextAuth v4 (Google, JWT strategy). This service **decodes the encrypted
NextAuth session JWE** with the shared `NEXTAUTH_SECRET` (see `app/core/security.py`). Pin
`next-auth@4.x` — v5/Auth.js changes the key derivation. Tokens are passed as a bearer
(`Authorization: Bearer <jwe>`) for HTTP and in graphql-ws `connectionParams.authToken` for
subscriptions. Guests send `X-Guest-Id`/`X-Guest-Name` (HTTP) or `connectionParams.guest`,
and are ephemeral — no rank, no rewards.

## Contract

The schema is the shared contract. Export the SDL for the web client:

```bash
pnpm --filter @animal-chess/api schema:export   # -> packages/social-protocol/schema.graphql
```

## Tests

```bash
pytest        # uses an in-memory SQLite db; no Postgres/Redis required
```
