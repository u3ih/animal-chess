# Animal Chess

Cờ thú / Dou Shou Qi — a 3D board game built as a **pnpm + Turborepo** monorepo with a
hybrid backend: a **Node** game server for live matches and a separate **Python GraphQL**
service for users, friends, ranking and gamification.

## Architecture

```
Browser
  ├─ socket.io ───────────────► Node game server (apps/web, :3000)
  │                              live game: rooms, matchmaking, moves, clock, chat, rematch
  │                                    │  internal GraphQL (HMAC) on game-over / room lifecycle
  │                                    ▼
  ├─ GraphQL HTTP ───────────► Python backend (services/api, :8000)
  └─ GraphQL WS (subscriptions)  users · friends · ELO rank · gamification · lobby · presence
                                       │              │
                                  PostgreSQL       Redis (subscription fan-out)
```

- **Node owns the live game** (move validation via the shared TS engine, clocks, chat). On
  game-over it reports the result to Python; the engine is never re-implemented in Python.
- **Python owns everything persistent + social**: profiles, friends, ELO + tiers, coins/XP/level,
  daily-login bonus, daily quests, achievements, leaderboards, match history, presence, room
  invites, and the public lobby — all over GraphQL (queries, mutations, subscriptions).
- **Auth** is shared: Python decodes the NextAuth v4 session token with the same `NEXTAUTH_SECRET`.
  Guests are ephemeral (no rank/rewards — anti-farm).

## Layout

```
.
├── apps/
│   └── web/                # Next.js 16 + Socket.IO game server (@animal-chess/web)
├── services/
│   └── api/                # Python FastAPI + Strawberry GraphQL backend (@animal-chess/api)
├── packages/
│   ├── game-core/          # Pure rules engine, AI, types, constants
│   ├── net-protocol/       # Socket.IO contract (Node game socket)
│   ├── social-protocol/    # GraphQL contract: types + operations + schema.graphql (Python)
│   ├── i18n/               # i18next dictionaries (vi default + en)
│   └── ui/                 # React UI primitives
├── docker-compose.yml      # Local Postgres + Redis (+ Adminer)
├── biome.json · turbo.json · pnpm-workspace.yaml · tsconfig.base.json
```

---

## Run the full project

### 0. Prerequisites
- **Node ≥ 20** + **pnpm 11.7** (`corepack enable`)
- **Python ≥ 3.10**
- **Docker** (for Postgres + Redis) — or your own Postgres 16 / Redis 7
- A **Google OAuth** client (for Google sign-in) — optional; guests work without it

### 1. Install JS deps
```bash
pnpm install
```

### 2. Start infrastructure (Postgres + Redis)
```bash
pnpm dev:infra      # docker compose up -d db redis   (Postgres :5432, Redis :6379, Adminer :8080)
```

### 3. Configure environment
Generate one secret to share, and one for NextAuth:
```bash
openssl rand -base64 32   # use for INTERNAL_SYNC_SECRET (same value in BOTH files)
openssl rand -base64 32   # use for NEXTAUTH_SECRET     (same value in BOTH files)
```

**`apps/web/.env.local`** (`cp apps/web/.env.example apps/web/.env.local`):
```ini
GOOGLE_CLIENT_ID=...            # optional (guests work without it)
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=<secret-2>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
PYTHON_SYNC_URL=http://localhost:8000
INTERNAL_SYNC_SECRET=<secret-1>
```

**`services/api/.env`** (`cp services/api/.env.example services/api/.env`):
```ini
DATABASE_URL=postgresql+asyncpg://animal_chess:animal_chess@localhost:5432/animal_chess
REDIS_URL=redis://localhost:6379/0
NEXTAUTH_SECRET=<secret-2>        # MUST equal apps/web NEXTAUTH_SECRET
INTERNAL_SYNC_SECRET=<secret-1>   # MUST equal apps/web INTERNAL_SYNC_SECRET
WEB_ORIGIN=http://localhost:3000
NODE_SNAPSHOT_URL=http://localhost:3000/internal/rooms/snapshot
PORT=8000
DAILY_TZ=Asia/Ho_Chi_Minh
```
> The two secrets must match across both files — that's how Node ↔ Python trust each other and how
> Python validates the logged-in user.

### 4. Set up the Python backend
```bash
cd services/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head        # create tables   (or: pnpm migrate)
python -m app.seed          # quests + achievements   (or: pnpm seed)
cd ../..
```

### 5. Run the three processes
Open three terminals (or background them):
```bash
pnpm dev:api     # 1) Python GraphQL backend  → http://localhost:8000/graphql
pnpm dev         # 2) Node game server + web  → http://localhost:3000
# 3) infra already running from step 2 above (docker)
```
Open **http://localhost:3000**, choose **Online**, and create a room / browse the lobby / share a
room link (`/?room=CODE`). Sign in with Google to earn rank + rewards.

### Ports
| Service | URL |
| --- | --- |
| Web + game socket | http://localhost:3000 |
| GraphQL API (HTTP + WS) | http://localhost:8000/graphql |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |
| Adminer (DB UI) | http://localhost:8080 |

---

## Verify it works

```bash
pnpm typecheck                       # TS across the web app + packages
pnpm lint                            # Biome (TS/JS/JSON)
pnpm --filter @animal-chess/game-core test   # engine unit tests
cd services/api && pytest            # 21 backend tests (in-memory sqlite + fakeredis; no infra needed)
```

End-to-end: open two browsers → create a room (it appears in the other's lobby) → join via the
lobby or a `?room=CODE` link → play to a win → the winner's coins / ELO / quests update live via
GraphQL subscriptions; the daily bonus is claimable once per day; friends persist across restarts.

---

## AI-only build (GitHub Pages)

`NEXT_PUBLIC_STATIC=1 pnpm --filter @animal-chess/web build` produces a static, server-less export
(single-player vs AI only). Online play, social, lobby, and the GraphQL client are disabled in that
build — it needs no backend.

---

## Root scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Node game server + web (`:3000`) |
| `pnpm dev:api` | Python GraphQL backend (`:8000`) — needs the venv from step 4 |
| `pnpm dev:infra` | `docker compose up -d db redis` |
| `pnpm migrate` | `alembic upgrade head` (services/api) |
| `pnpm seed` | Seed quest + achievement definitions (idempotent) |
| `pnpm schema:export` | Regenerate `packages/social-protocol/schema.graphql` from the Strawberry schema |
| `pnpm build` | Build every package via Turborepo |
| `pnpm test` | Run tests (game-core vitest + services/api pytest) |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` / `lint:fix` / `format` | Biome lint + format |

## Troubleshooting

- **GraphQL calls 401 / `unauthenticated`** — `NEXTAUTH_SECRET` differs between the two `.env`
  files, or you're a guest hitting a Google-only field. Make the secrets match; sign in with Google.
- **Rank/coins never change after a game** — `INTERNAL_SYNC_SECRET` mismatch, or the Python backend
  was down when the game ended (Node retries briefly, then drops). Check both secrets + that `:8000`
  is up.
- **Lobby empty after restarting Python** — Python rebuilds it from Node's
  `/internal/rooms/snapshot` on startup; make sure `NODE_SNAPSHOT_URL` points at the running Node
  server.
- **`alembic`/`uvicorn` not found** — activate the venv (`source services/api/.venv/bin/activate`).
- **Keep `next-auth@4.x`** — the Python JWE decoder targets NextAuth v4; v5/Auth.js changes the key
  derivation.

## Tooling

- **pnpm workspaces** + **Turborepo**; **Biome** for TS lint/format; **Ruff** for Python
- Backend: **FastAPI + Strawberry GraphQL + SQLModel/SQLAlchemy + Alembic + asyncpg + Redis**
- `node-linker=hoisted` (`.npmrc`) keeps a future React Native app able to reuse the packages
