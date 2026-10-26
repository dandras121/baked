# Deviations — Baked by Linda

Anything built differently from the docs or Figma, and why. Bohoka’s decision is added when he gives it.

| Slice | Source (doc § / Figma node) | What differs | Why | Bohoka’s decision |
|---|---|---|---|---|
| 0.1 | INDITO-PROMPT §5.2 (“this folder becomes the git repo and app root”) | The app lives in the existing `dandras121/baked` repo, on phase branches. `main` keeps the live “Coming soon” page (GitHub Pages, bakedbylinda.co.uk) untouched until launch. | The repo already serves the live domain from `main`. | Accepted 2026-10-26 (decision 1a) |
| 0.1 | CLAUDE.md §4.2 step 8 / §8 (“commit after acceptance”) | Each slice is committed and pushed to the phase branch **before** the report; on acceptance a follow-up commit ticks `PROGRESS.md`. | The work runs in a cloud session that is wiped afterwards, and Bohoka checks it on the Vercel preview of the pushed branch. | Accepted 2026-10-26 |
| 0.1 | CLAUDE.md §8 (Git) | From 2026-10-26 commits are authored as `dandras121` (with a `Co-Authored-By: Claude` line). | Vercel Hobby only builds commits whose author has access to the Vercel team. | Accepted 2026-10-26 |
| 0.2 | CLAUDE.md §3 “Quicksand 300/500/600 and Fraunces 300” | Variable font files: Quicksand 300–700, Fraunces 100–900 (with italic and the SOFT/WONK axes), so every weight drawn in Figma (Fraunces 400/600/700 and italic, Quicksand 400/700) shows as designed. Still self-hosted WOFF2. | Figma uses more weights than the list; static files would fake-bold them. | |
| 0.2 | Style guide 1490:8656 (2026-10-12) | The style guide still shows meta #7C7389, faint #9A93A8 and lilac-pale #CEBBE3 for text; the build uses #756C82 for all of them. | SITE-FLOWS §10.13 (2026-10-23) wins. | |
| 0.2 | SITE-FLOWS §10.13 (controls 3 : 1) | Six borders stay as drawn in Figma below 3 : 1: text field (ink 20 %), pill (22 %), empty checkbox (30 %), light wallet button (16 %), focused field stroke (lilac 70 %), field in error (bordó 45 %). Fields are identified by their visible label; keyboard focus has the 2 px accent ring (5.3 : 1). | Owner decision. | Accepted 2026-10-26 (decision 1a) |
