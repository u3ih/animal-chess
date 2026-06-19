# syntax=docker/dockerfile:1

# Custom server (apps/web/server.ts) runs via tsx, and workspace packages ship
# as raw TS consumed through transpilePackages — so the runtime image keeps the
# full install (tsx + next live in node_modules). No standalone output.

FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

# ---- build: install everything + next build ----
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Profiles persist to apps/web/.data/profiles.json — mount a volume here to keep
# them across container restarts:  docker run -v animal-chess-data:/app/apps/web/.data ...
VOLUME ["/app/apps/web/.data"]
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "start"]
