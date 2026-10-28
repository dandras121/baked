# Baked by Linda — website and admin

The Next.js app for [bakedbylinda.co.uk](https://bakedbylinda.co.uk). The behaviour is specified in `docs/`; the build order is `docs/BUILD-PLAN.md`; progress is `docs/PROGRESS.md`.

> The `main` branch still serves the live “Coming soon” page through GitHub Pages (`index.html`, `backgrnd.jpg`, `CNAME`). The app is built on phase branches (`phase-00-foundations`, …) and replaces it only at launch.

## Requirements

- Node.js 22 or newer
- pnpm 10 (`corepack enable` installs the version pinned in `package.json`)

## Run it

```sh
pnpm install
cp .env.example .env.local   # fill in values as later slices add them
scripts/dev-db.sh            # local Postgres 16: creates bbl_dev and bbl_test (or point DATABASE_URL at your own)
pnpm db:reset                # migrate and seed
pnpm dev                     # http://localhost:3000
```

Developer pages are listed at `/dev`.

## Commands

| Command                             | What it does                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Start the app in development mode                                                                                    |
| `pnpm build` / `pnpm start`         | Production build / serve it                                                                                          |
| `pnpm test`                         | Unit and integration tests (Vitest)                                                                                  |
| `pnpm e2e`                          | End-to-end tests with axe at 402 × 902, 1024 × 1366, 1280 × 800 (Playwright; builds and starts the app on port 3100) |
| `pnpm lint`                         | ESLint                                                                                                               |
| `pnpm typecheck`                    | TypeScript, strict                                                                                                   |
| `pnpm format` / `pnpm format:check` | Prettier                                                                                                             |
| `pnpm check`                        | lint + format check + typecheck + unit tests                                                                         |

The first time you run `pnpm e2e` on a new machine, install the browser: `pnpm exec playwright install chromium`.

## Previews and CI

- Every push to a branch other than `main` runs CI (`.github/workflows/ci.yml`): lint, format, typecheck, unit tests and end-to-end tests.
- Vercel builds a preview of every branch push; the preview link appears on the commit in GitHub.
