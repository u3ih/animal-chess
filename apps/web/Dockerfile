FROM node:26-slim AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/game-core/package.json packages/game-core/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/net-protocol/package.json packages/net-protocol/package.json
COPY packages/social-protocol/package.json packages/social-protocol/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY services/api/package.json services/api/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STATIC=0

COPY . .
RUN pnpm --filter @animal-chess/web build

FROM node:26-slim AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
WORKDIR /app

RUN corepack enable

COPY --from=builder /app /app

EXPOSE 3000
CMD ["pnpm", "--filter", "@animal-chess/web", "start"]
