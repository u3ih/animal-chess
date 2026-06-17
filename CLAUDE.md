# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install                 # bootstrap (Node >=20, pnpm@11.7.0)
cp apps/web/.env.example apps/web/.env.local   # then fill Google OAuth + NextAuth secrets

pnpm dev          # web dev server — runs `tsx server.ts`, NOT `next dev` (see below)
pnpm build        # turbo run build (only @animal-chess/web has a build; packages ship as source)
pnpm start        # production: NODE_ENV=production tsx server.ts
pnpm test         # turbo run test (game-core vitest only)
pnpm typecheck    # tsc --noEmit across all packages
pnpm lint         # biome check .
pnpm lint:fix     # biome check --write .
pnpm format       # biome format --write .
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

pnpm + Turborepo monorepo. Three workspaces (`apps/*`, `packages/*`):

- **`packages/game-core`** (`@animal-chess/game-core`) — pure, dependency-free rules engine, AI, types, constants. The single source of truth for game logic.
- **`packages/net-protocol`** (`@animal-chess/net-protocol`) — shared Socket.IO event + payload TypeScript contract (`ClientToServerEvents` / `ServerToClientEvents`, `RoomSnapshot`, etc.). Imports types from game-core.
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

### Server state ([realtime.ts](apps/web/src/server/realtime.ts))
All in-memory `Map`s: `rooms`, matchmaking `queue`, `presence`, `friendRequests`. **A server restart wipes all live games, rooms, and matchmaking.** Turn clocks are a single 1 s `setInterval` decrementing `room.timer` (`ROOM_SECONDS = 5 min`); hitting 0 awards the win to the opponent. Rooms hold two `PlayerSlot`s (red = creator/first, blue = joiner), chat (last 50), and a rematch vote set.

### Identity & profiles
- [usePlayerIdentity](apps/web/src/hooks/use-player-identity.ts): Google (NextAuth JWT, `userId` = email) **or** guest (random uuid in `localStorage`). [useOnlineGame](apps/web/src/hooks/use-online-game.ts) owns the socket and exposes all emit helpers.
- Profiles persist to a **file**, `apps/web/.data/profiles.json`, via [profile-store.ts](apps/web/src/server/profile-store.ts) (not a DB). [/api/profile](apps/web/src/app/api/profile/route.ts) (GET/PATCH/PUT) is the only REST surface; everything else is sockets. Request bodies validated with **Valibot**.

## Conventions
- **Biome** (not ESLint/Prettier): 2-space indent, line width 120, double quotes, semicolons, no trailing commas. Run `pnpm lint:fix` before finishing.
- UI copy is **Vietnamese** — match existing strings when adding user-facing text.
- The 3D board (react-three-fiber / drei / three) is `dynamic(..., { ssr: false })` in `page.tsx`; three.js components live under [apps/web/src/components/three/](apps/web/src/components/three/).
