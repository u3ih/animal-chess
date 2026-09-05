# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install                 # bootstrap (Node >=26, pnpm@11.7.0)
cp apps/web/.env.example apps/web/.env.local   # then fill Google OAuth + NextAuth secrets

pnpm dev          # web dev server — runs `tsx server.ts`, NOT `next dev` (see below)
pnpm build        # turbo run build (only @animal-chess/web has a build; packages ship as source)
pnpm start        # production: NODE_ENV=production tsx server.ts
pnpm test         # turbo run test (game-core vitest + services/api pytest)
pnpm typecheck    # tsc --noEmit across all packages
pnpm lint         # biome check . (TS/JS/JSON; Python uses ruff via services/api)
pnpm lint:fix     # biome check --write .
pnpm format       # biome format --write .
```

Online play needs **three processes**: Node game server (`:3000`), the Python GraphQL backend
(`services/api`, `:8000`), and Postgres + Redis. The Python backend (users/friends/rank/gamification)
is separate — see `services/api/README.md`.

```bash
pnpm dev:infra    # docker compose up -d db redis  (Postgres :5432 + Redis :6379)
pnpm dev:api      # uvicorn app.asgi:app  (needs a venv: cd services/api && pip install -e ".[dev]")
pnpm migrate      # alembic upgrade head   (services/api)
pnpm seed         # python -m app.seed     (quest + achievement definitions, idempotent)
pnpm schema:export  # regenerate packages/social-protocol/schema.graphql from the Strawberry schema
cd services/api && pytest   # 21 backend tests (in-memory sqlite + fakeredis, no infra needed)
```

Single test (game-core is the only package with tests):

```bash
pnpm --filter @animal-chess/game-core test                       # all
cd packages/game-core && pnpm vitest run src/engine.test.ts      # one file
cd packages/game-core && pnpm vitest run -t "rat captures elephant"  # one test by name
cd packages/game-core && pnpm vitest                              # watch
```

Visual smoke test: with a dev server up on :3000, `node apps/web/scripts/verify-board.mjs` (Playwright) screenshots desktop + mobile to `/private/tmp` and reports canvas size + console errors.

## Architecture

pnpm + Turborepo monorepo. Workspaces (`apps/*`, `packages/*`):

- **`packages/game-core`** (`@animal-chess/game-core`) — pure, dependency-free rules engine, AI, types, constants. The single source of truth for game logic.
- **`packages/net-protocol`** (`@animal-chess/net-protocol`) — shared Socket.IO event + payload TypeScript contract (`ClientToServerEvents` / `ServerToClientEvents`, `RoomSnapshot`, etc.) for the **Node game socket only**. Imports types from game-core.
- **`packages/social-protocol`** (`@animal-chess/social-protocol`) — the **GraphQL contract** for the Python backend: TypeScript types + operation documents (queries/mutations/subscriptions) mirroring `schema.graphql` (the SDL exported by `services/api`). The web client imports these.
- **`services/api`** (`@animal-chess/api`) — **Python** FastAPI + Strawberry **GraphQL** backend (PostgreSQL + Redis) owning everything persistent + social + discovery: users, friends, ELO rank, gamification (coins/XP/level, daily-login bonus, quests, achievements), match history, presence, room invites, and the public lobby. A thin `package.json` lets turbo run its scripts; real deps live in `pyproject.toml`.
- **`packages/i18n`** (`@animal-chess/i18n`) — framework-agnostic i18next + react-i18next setup. `vi` (default) + `en` dictionaries in `src/locales/`, a single `translation` namespace, type-safe `t()` keys (module augmentation in `src/types.ts`). The single source of truth for **all** UI copy and piece/terrain names. Reusable in a future RN app.
- **`packages/ui`** (`@animal-chess/ui`) — web React primitives (`Button`/`IconButton`, `Input`, `Select`, `Modal`, `Panel`) as thin, `className`-passthrough wrappers over the existing CSS classes. Web-DOM only (not RN).
- **`apps/web`** (`@animal-chess/web`) — Next.js 16 (App Router) + a custom Socket.IO server.

Packages are consumed **as raw TypeScript** — `main`/`types` point at `./src/index.ts`, there is no build step. The web app resolves them via `transpilePackages` in [next.config.ts](apps/web/next.config.ts). `.npmrc` sets `node-linker=hoisted` so a future `apps/mobile` (React Native / Metro) can reuse both packages unchanged.

### Custom server is the entry point
`pnpm dev`/`start` run [apps/web/server.ts](apps/web/server.ts) via `tsx`, which boots **Next.js and Socket.IO on the same HTTP server**. There is no `next dev` script — changing how the app starts means editing `server.ts`, and realtime handlers live in [src/server/realtime.ts](apps/web/src/server/realtime.ts), not in an API route.

### Game engine ([packages/game-core/src/engine.ts](packages/game-core/src/engine.ts))
Board is 9 rows × 7 cols (`{row, col}`, 0-indexed). Red starts at the bottom (den `row 8, col 3`), Blue at the top (den `row 0, col 3`). All board geometry — start positions, dens, traps, water, piece ranks (rat=1 … elephant=8) — lives in [constants.ts](packages/game-core/src/constants.ts). Engine is pure functions over immutable `GameState`:
- `createInitialState`, `legalMovesForPiece`, `allLegalMoves`, `isLegalMove`, `applyMove` (throws on illegal).
- Cờ thú rules encoded in `canCapture` / `candidateDestinations`: rat↔elephant exception, traps nullify rank, only rat enters water, lion/tiger jump water unless a rat blocks the lane, no capture across the water boundary, den entry wins.

This engine runs in **both** the browser (AI mode) and the server (online) — never reimplement a rule in the UI or server; extend the engine and both inherit it.

### AI ([packages/game-core/src/ai.ts](packages/game-core/src/ai.ts))
`chooseAiMove(state, level)`. `easy` = random legal move; `medium`/`hard` = minimax + alpha-beta at depth 2/3 (`DEPTH_BY_LEVEL`). Eval = material (rank×10) + den-distance pressure.

### Authority model
- **AI mode** is fully client-side ([apps/web/src/app/page.tsx](apps/web/src/app/page.tsx)): the page holds local `state`, calls `applyMove`, and schedules the AI reply with a 380 ms `setTimeout`. Undo is local (`past` stack), AI-mode only.
- **Online mode** is server-authoritative: the client emits intent (`game:move` with `{pieceId, to}`) and the server re-validates with `isLegalMove`/`applyMove`, rejecting via `game:rejected`. The page renders `liveState = online.snapshot.state` when online, else the local `state` — most of the UI reads `liveState` so both modes share one render path.

### Server state ([realtime.ts](apps/web/src/server/realtime.ts)) — game only
In-memory `Map`s: `rooms` + matchmaking `queue`. **A server restart wipes all live games.** Turn clocks are a single 1 s `setInterval`; hitting 0 awards the win. Rooms hold two `PlayerSlot`s, chat (last 50), a rematch set, plus capture tracking. **Social/presence/friends/invites moved to the Python backend** — `realtime.ts` no longer has those handlers. On game-over a single `finishGame(room)` funnel reports the result **exactly once** (guarded by `room.reported`; both the timeout and den/capture win paths route through it) to Python via the internal GraphQL mutation. Room lifecycle (`registerRoom`/`updateRoom`/`closeRoom`) and the match result go through [python-sync.ts](apps/web/src/server/python-sync.ts) (HMAC-signed, fire-and-forget, retried). [server.ts](apps/web/server.ts) also serves `GET /internal/rooms/snapshot` so Python can rebuild its lobby cache on startup.

### Online backend split (hybrid)
- **Node** = live game authority (move validation via game-core, clock, in-room chat, rematch, lobby room existence).
- **Python** ([services/api](services/api)) = persistent + social + discovery via **GraphQL** (public `/graphql`, internal `/internal/graphql`). Subscriptions (presence, friend events, invites, lobby, rank/wallet/quest updates, reward toasts) fan out over Redis pub/sub.
- The web client opens **two connections**: the Node game socket ([useOnlineGame](apps/web/src/hooks/use-online-game.ts) — same origin by default, or `NEXT_PUBLIC_GAME_URL` when the game server is on another host) and the Python GraphQL client ([useSocial](apps/web/src/hooks/use-social.ts), via [lib/gql.ts](apps/web/src/lib/gql.ts) — `fetch` for queries/mutations + `graphql-ws` for subscriptions). Both early-return under `STATIC_EXPORT` (the server-less AI-only export).
- The engine stays the single TS source of truth: Python does **not** re-implement game rules — it only ingests finished-match results from Node.

### Identity & profiles
- [usePlayerIdentity](apps/web/src/hooks/use-player-identity.ts): Google (NextAuth JWT, `userId` = email) **or** guest (random uuid in `localStorage`).
- **Auth across services**: Python decodes the **NextAuth v4 session JWE** with the shared `NEXTAUTH_SECRET` (`services/api/app/core/security.py` — `dir`+`A256GCM`, HKDF-derived key; pin `next-auth@4.x`). The client fetches the raw JWE from [/api/token](apps/web/src/app/api/token/route.ts) and passes it as a bearer (HTTP) / `connectionParams.authToken` (WS). **Guests are ephemeral** — no DB row, no rank/rewards (anti-farm). Any guest in a match makes it unranked and awards nothing to anyone.
- **Profiles now live in Postgres** (Python), not `apps/web/.data/profiles.json`. The legacy `profile-store.ts` + `/api/profile` route are superseded by the GraphQL `me`/`updateUsername`/`friends` operations (username rules ported to `services/api/app/services/validation.py`).

### Deployment
- **Vercel** ([apps/web/vercel.json](apps/web/vercel.json)) hosts the Next app only — serverless can't hold a WebSocket, so `server.ts` (Socket.IO) and the Python API run elsewhere and the client reaches them via `NEXT_PUBLIC_GAME_URL` / `NEXT_PUBLIC_API_URL`. Root Directory is `apps/web` and every build setting stays on Default (Vercel detects the pnpm workspace itself); path-prefixed overrides resolve against the root dir and double up. `@vercel/analytics` is mounted in [layout.tsx](apps/web/src/app/layout.tsx).
- **Docker VPS** (`docker-compose.prod.yml` + `Caddyfile`) runs the full stack same-origin — leave `NEXT_PUBLIC_GAME_URL` empty there.
- `NEXT_PUBLIC_STATIC=1` still builds the server-less AI-only export (`output: "export"`); GitHub Pages is no longer a deploy target.

## Conventions
- **Biome** (not ESLint/Prettier): 2-space indent, line width 120, double quotes, semicolons, no trailing commas. Run `pnpm lint:fix` before finishing.
- **i18n for all copy** — every user-facing string goes through `@animal-chess/i18n` `t()`; never hardcode display text. Add the key to **both** [vi.ts](packages/i18n/src/locales/vi.ts) and [en.ts](packages/i18n/src/locales/en.ts) (vi is also the type source, so keys are checked at compile time). `vi` is the default/fallback. Piece and terrain names come from i18n keys (`pieces.*`, `terrain.*`), **not** local maps — `PIECE_RANK` (game-core) is the only piece data kept in code. React context does **not** cross the r3f `<Canvas>` boundary, so 3D piece labels are threaded as a `pieceLabels` prop from `page.tsx`, not read via `useTranslation` inside meshes.
- **Reuse `@animal-chess/ui` primitives** before hand-rolling markup. They keep the existing CSS classes (pass `className`), so styling is unchanged. `Modal` centralizes the backdrop pattern (Esc/backdrop close when `onClose` is given); `Panel` renders the shared `.panel-title` header.
- **Component files hold at most 1–2 components and stay short.** Extract large or nested components into their own file under `components/` (e.g. `captured-rail.tsx`, `piece-roster.tsx`).
- **Use providers wisely to prevent rerenders.** Create contexts/providers once at the right level ([providers.tsx](apps/web/src/app/providers.tsx) → `SessionProvider` > `I18nProvider`), memoize their values, and keep volatile state local. The i18n instance is created once; language changes propagate via react-i18next's own subscription — do **not** mirror the current language in `page.tsx` state.
- UI copy default language is **Vietnamese** — when adding the `vi` value, match the existing tone; add the matching `en` value too.
- The 3D board (react-three-fiber / drei / three) is `dynamic(..., { ssr: false })` in `page.tsx`; three.js components live under [apps/web/src/components/three/](apps/web/src/components/three/).
