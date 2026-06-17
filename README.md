# Animal Chess

Cờ thú / Dou Shou Qi built as a **pnpm + Turborepo** monorepo. The rules engine and
network protocol live in standalone packages so a future **React Native** mobile app can
reuse them without copying code.

## Layout

```
.
├── apps/
│   └── web/                # Next.js app + Socket.IO realtime server (@animal-chess/web)
├── packages/
│   ├── game-core/          # Pure rules engine, AI, types, constants (@animal-chess/game-core)
│   └── net-protocol/       # Shared Socket.IO event + payload contract (@animal-chess/net-protocol)
├── biome.json              # Lint + format (replaces ESLint)
├── turbo.json              # Task pipeline
├── pnpm-workspace.yaml
└── tsconfig.base.json      # Shared TS compiler options
```

A future `apps/mobile` (React Native) drops in beside `apps/web` and imports
`@animal-chess/game-core` and `@animal-chess/net-protocol` exactly the way the web app does.

## Run locally

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

Google sign-in requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and
`NEXTAUTH_URL` in `apps/web/.env.local`.

## Root scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run the web app dev server |
| `pnpm build` | Build every package via Turborepo |
| `pnpm start` | Start the production web server |
| `pnpm test` | Run unit tests (game-core) |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` | Biome lint + format check |
| `pnpm lint:fix` | Biome auto-fix |
| `pnpm format` | Biome format (write) |

## Tooling

- **pnpm workspaces** + **Turborepo** for the monorepo
- **Biome** for lint + format (replaces ESLint / `eslint-config-next`)
- **Valibot** for request validation
- `node-linker=hoisted` (`.npmrc`) keeps Metro/React Native and Next.js happy with workspace packages

## Features

- Classic cờ thú rules engine shared by client, server, and AI
- Three AI levels
- Private rooms, quick matchmaking, turn timers, and rematch
- Editable usernames after Google login
- Nostalgic jungle presentation with basic game audio
