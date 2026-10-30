# Proposals built — Baked by Linda

Every **Proposal** row (SITE-FLOWS §0.2) and every case no document covers (§0.7) that was built, one line each.
Bohoka’s decision is added when he gives it (“jó” = keep, “ne legyen” = back to Figma).

| Slice | § reference | What was built | Where | Bohoka’s decision |
|---|---|---|---|---|
| 0.2 | §0.7 (no Figma spacing variables) | A spacing scale of the gaps and paddings drawn in Figma (2–96 px); the drawn values without a node are marked Proposal in the file | `src/styles/tokens.css` (Spacing) | Keep (jó), 2026-10-28 |
| 0.2 | §0.8 (fonts) + Figma | Manrope (variable, self-hosted) as the third family, because Figma uses it for the cake card description and the reviews (`V2/Quote/*`, 1490:8905) | `src/styles/fonts.css`, `--font-quote` | Keep (jó), 2026-10-26 |
| 0.5a | §0.7 (not drawn) | Radio button: the check box shape made round, a 10 px ink dot when chosen | `src/components/ui/choice.tsx` | Keep (jó), 2026-10-28 |
| 0.5a | §0.7 (not drawn) | Select (drop-down list): the text field box with the browser’s own list and a small chevron | `src/components/ui/text-field.tsx` | Keep (jó), 2026-10-28 |
| 0.5a | A§7E (“Text link · colour only”, none drawn) | Links inside sentences: accent colour, underlined; on hover or keyboard focus they turn display violet | `src/components/ui/link.*` | Keep (jó), 2026-10-28 |
| 0.5a | §7.1 Counters | Counter “n / max” can show always or only from 80 % of the limit (the field decides) | `src/components/ui/text-field.tsx` | Keep (jó), 2026-10-28 |
| 0.5b | §0.6 (phone sheets full width) | The bottom sheet runs edge to edge (the storyboard draws it as a 362 px card); top corners 10 px; a 44 × 4 grabber so it reads as draggable (as the bank sheet 985:9156) | `src/components/ui/overlay.*` | Keep (jó), 2026-10-28 |
| 0.5b | ANIM-13 (“fast” swipe) | A flick faster than 0.5 px per ms closes the sheet even when shorter than a third | `src/components/ui/overlay.tsx` | Keep (jó), 2026-10-28 |
| 0.5b | §0.7 (notice sign) | Error notice sign: a bordó ring with “!”; calm notice sign: the drawn violet ring (975:9102) | `src/components/ui/notice.*` | Keep (jó), 2026-10-28 |
| 0.5c | ANIM-10 (“Arrow keys move between dashes”) | Arrow keys (and Home / End) go straight to the next item, so the slide follows the focused dash | `src/components/ui/slider-indicator.tsx` | Keep (jó), 2026-10-28 |
| 0.6 | CLAUDE.md §3 (Prisma or Drizzle, your pick) | Drizzle ORM with drizzle-kit migrations, postgres-js driver (decision 3a, 2026-10-26) | `src/db/*`, `drizzle/` | Keep (jó), 2026-10-28 |
| 1.1 | §3.1 (Proposal: aria) | The current page’s navigation item carries `aria-current="page"`; the navigation is a landmark named “Main” | `src/components/header/desktop-nav.tsx` | Keep (mehet), 2026-10-29 |
| 1.1 | §3.1 Scrolling (Proposal) | Sticky header on every page; `scroll-padding-top` 55 px (phone, tablet) / 77 px (desktop) | `src/components/page-shell/*`, `src/styles/base.css` | Keep (mehet), 2026-10-29 |
| 1.1 | §10.13 (“Skip link”, wording not drawn) | “Skip to content”: hidden until Tab, a white pill at the top left; it moves focus to the page content | `src/components/page-shell/*` | Keep (mehet), 2026-10-29 |
| 1.1 | R§4 (above 1280 px, not drawn for the header) | Wider than 1280 px the logo and navigation stay in the centred 1280 box and the texture runs edge to edge; the mascot is then cut only by the bar’s top and bottom, not on its left side | `src/components/header/site-header.module.css` | Keep (mehet), 2026-10-29 |
| 1.1 | §10.12 Other (favicon “from V2 · Logo mark”) | Favicon and browser icon = the logo mark (SVG + 32 px .ico); home-screen icon = the mark on the paper colour, 180 px | `src/app/icon.svg`, `favicon.ico`, `apple-icon.png` | Keep (mehet), 2026-10-29 |
| 1.1 | A§7F (“a link elsewhere”, not stated) | On a page whose item is active but which is not that item’s own page (e.g. a cake page under Cakes), clicking the item goes to its page without a slide or reload | `src/components/header/desktop-nav.tsx` | Keep (mehet), 2026-10-29 |
| 1.2 | §3.1 / A§4.1 short viewports (Proposal) | A screen shorter than 902 px moves the item block up (at least 24 px under the bar, 40 px above the social heading); when even that does not fit, the menu panel scrolls inside itself and the bar stays | `src/components/header/mobile-menu.module.css` | Keep (mehet), 2026-10-30 |
| 1.2 | §3.1 without JavaScript (Proposal) | The “menu” label becomes a disclosure that opens the same seven links on white, without animation | `src/components/header/site-header.tsx` | Keep (mehet), 2026-10-30 |
| 1.2 | §10.13 (new-tab links, not drawn) | Social links tell screen readers “(Instagram, opens in a new tab)”; the visible label stays as drawn | `src/components/header/mobile-menu.tsx` | Keep (mehet), 2026-10-30 |
| 1.2 | A§4.1 noise (“if the header has a noise overlay, the pink layer uses the same”) | The pink layer gets a fine white noise veil drawn in CSS, tuned to the Figma colours (within 2 / 255) | `src/components/header/mobile-menu.module.css` | Keep (mehet), 2026-10-30 |
| 1.2 | A§7.2 path A + A§3.4 Back | The menu's history entry is replaced by the new page (or removed first for the same-page reload), so Back never needs two presses | `src/components/header/mobile-menu.tsx` | Keep (mehet), 2026-10-30 |
| 1.4 | §3.2 © year (Proposal) | The current year in London, refreshed daily | `src/components/footer/site-footer.tsx` | Keep (mehet), 2026-10-30 |
| 1.4 | §3.2 “see Cancellations & refunds” (Proposal) | An in-sentence link to `/cancellations`, ink-deep and underlined (a link must not differ by colour alone, §10.13) | `src/components/footer/site-footer.tsx` | Keep (mehet), 2026-10-30 |
| 1.4 | R§4 above 1280 px (not drawn) | The footer content stays in the centred 1280 box; the texture runs edge to edge and the mascot stays at the footer's own bottom-right corner | `src/components/footer/site-footer.module.css` | Keep (mehet), 2026-10-30 |
| 1.4 | §3.2 Cookie preferences (until slice 1.5) | A link to `/cookies#changing-your-mind` (the documented no-JavaScript behaviour); the panel arrives in 1.5 | `src/components/footer/site-footer.tsx` | Keep (mehet), 2026-10-30 |
| 1.4 | CLAUDE.md §10 (hosting) | Every hosted build first creates or updates the tables and adds the starting Settings only when none exist (never overwrites saved Settings) | `src/db/deploy-setup.ts`, `vercel.json` | Keep (mehet), 2026-10-30 |
| 1.5 | §0.6 (“the cookie bar is the floating card … with its shadow”; no shadow drawn) | The card shadow of the testimonials (`--shadow-card`) | `src/components/cookies/cookie-consent.module.css` | Keep (mehet), 2026-10-30 |
| 1.5 | §3.3 switches (motion not drawn) | The switch knob slides and the track colour changes in 160 ms ease-out; reduced motion: at once | `src/components/cookies/cookie-switch.tsx`, `cookie-consent.module.css` | Keep (mehet), 2026-10-30 |
| 1.5 | §3.3 One panel (“reopened uses I's intro”) | Reopened with a stored choice it also uses I's footnote (“Opened from the footer — you can come back and change this any time.”) | `src/components/cookies/cookie-consent.tsx` | Keep (mehet), 2026-10-30 |
| 1.5 | §3.3 Settings from the bar | While the panel is open the bar is hidden; it comes back if the panel closes without a choice | `src/components/cookies/cookie-consent.tsx` | Keep (mehet), 2026-10-30 |
| 1.5 | §3.3 Analytics switched off later | Every cookie whose name starts with `_ga`, `_gid`, `_gat`, `_pk_`, `_hj` or `plausible` is deleted at once; the list follows the provider once Linda chooses one (§14.1) | `src/lib/consent.ts`, `src/lib/analytics.ts` | Keep (mehet), 2026-10-30 |
| 1.5 | A§1.4 reduced motion + ANIM-15 | With reduced motion the bar shows without the 700 ms wait, as well as without motion | `src/components/cookies/cookie-consent.tsx` | Keep (mehet), 2026-10-30 |
