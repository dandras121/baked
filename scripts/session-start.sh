#!/usr/bin/env bash
# Claude Code cloud sessions: install dependencies, start Postgres, migrate and seed (idempotent, quiet on success).
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile >/dev/null
scripts/dev-db.sh >/dev/null
[ -f .env.local ] || cp .env.example .env.local
pnpm -s db:migrate >/dev/null
pnpm -s db:seed >/dev/null
