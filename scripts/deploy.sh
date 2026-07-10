#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 user@host [remote_dir]"
  echo "Example: $0 ubuntu@203.0.113.10 /opt/animal-chess"
  exit 2
fi

remote="$1"
remote_dir="${2:-/opt/animal-chess}"
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$root_dir/.env.production"

if [[ ! -f "$env_file" ]]; then
  echo "Missing .env.production. Copy .env.production.example and fill real values first."
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required on this machine."
  exit 1
fi

echo "Syncing source to $remote:$remote_dir"
ssh "$remote" "mkdir -p '$remote_dir'"
rsync -az --delete \
  --exclude ".git" \
  --exclude ".github" \
  --exclude ".turbo" \
  --exclude "node_modules" \
  --exclude ".pnpm-store" \
  --exclude "**/node_modules" \
  --exclude "**/.next" \
  --exclude "**/out" \
  --exclude "**/.venv" \
  --exclude "**/__pycache__" \
  --exclude "**/.pytest_cache" \
  --exclude "coverage" \
  --exclude "dist" \
  --exclude ".data" \
  "$root_dir/" "$remote:$remote_dir/"

echo "Building and starting the production stack"
ssh "$remote" "bash -s" -- "$remote_dir" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

remote_dir="$1"
cd "$remote_dir"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed on this VPS. Install Docker Engine + Compose plugin, then rerun deploy."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is not available. Install docker compose, then rerun deploy."
  exit 1
fi

compose="docker compose --env-file .env.production -f docker-compose.prod.yml"

$compose build api web
$compose up -d db redis
$compose run --rm api-migrate
$compose run --rm api-seed
$compose up -d api web caddy
$compose ps
REMOTE_SCRIPT

echo "Deploy finished."
