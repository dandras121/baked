# Deviations — Baked by Linda

Anything built differently from the docs or Figma, and why. Bohoka’s decision is added when he gives it.

| Slice | Source (doc § / Figma node) | What differs | Why | Bohoka’s decision |
|---|---|---|---|---|
| 0.1 | INDITO-PROMPT §5.2 (“this folder becomes the git repo and app root”) | The app lives in the existing `dandras121/baked` repo, on phase branches. `main` keeps the live “Coming soon” page (GitHub Pages, bakedbylinda.co.uk) untouched until launch. | The repo already serves the live domain from `main`. | Accepted 2026-10-26 (decision 1a) |
| 0.1 | CLAUDE.md §4.2 step 8 / §8 (“commit after acceptance”) | Each slice is committed and pushed to the phase branch **before** the report; on acceptance a follow-up commit ticks `PROGRESS.md`. | The work runs in a cloud session that is wiped afterwards, and Bohoka checks it on the Vercel preview of the pushed branch. | |
