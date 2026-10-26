# Baked by Linda — Responsive Rules (breakpoints, tablet, layout)

> **For Claude Code.** This file says which design applies at which screen width and how the layout behaves between the designed widths.
> Animations are in `ANIMATIONS.md`. What every button and step does is in `SITE-FLOWS.md`.
> The build-spec board card `State / TABLET · 768 TO 1119` (Figma node `1153:9292`) carries the same rules in short form.

- **Last updated:** 2026-10-23 (v1.12 — overlays follow the input (dialog with a pointer, bottom sheet with touch); header shadow and the Order confirmed mascot on every breakpoint; v1.11 — the tablet Home testimonials have the indicator since 2026-10-22 (exception closed); the testimonials are all Google reviews, `SITE-FLOWS.md` §4.1; v1.10 — the slider indicator is the same size on every breakpoint; v1.9 — hover and press behaviour follows the input, not the width; v1.8 — the header is sticky on every breakpoint; v1.7 — catalogue page size 12 everywhere; v1.6 — tablet text formula wins over smaller drawn tablet text; v1.5 — Gallery page, tablet Special idea updated; v1.4 — pages without a tablet frame, tablet Home exceptions, admin widths (§5); v1.3 — other widths decided; new pages Your enquiry and 500 have tablet frames; v1.2 — About Linda phone carousel; v1.1 — catalogue 3 × 5; v1.0 — split out of `ANIMATIONS.md` v1.13 §8.1)
- **Figma file:** `py7HpVoQwoEm9shlxEoCXL`
- **Labels:** **Decided** = owner decision · **Design** = shown in Figma · **Proposal** = sensible default, not decided yet (implement it and list it in your report).

---

## 1. Breakpoints

| Band | Viewport width | Figma design width | Header | Basis |
|---|---|---|---|---|
| Phone | below 768 px | 402 | phone header with the “menu” button (`V2 · Nav / Header — mobil v3`, `1461:9222`) | Decided |
| Tablet | 768–1119 px | 1024 | tablet header with the “menu” button (`V2 · Nav / Header — tablet v3`, `1549:10272`) | Decided |
| Desktop | 1120 px and wider | 1280 | desktop navigation bar (`V2 · Nav / Header — v3`, `1421:9315`) | Decided |

Why 1120: the desktop header needs about 1115 px (wordmark right edge 491 px + at least 48 px gap + the 539 px navigation + 37 px right margin). With seven items (Gallery, 2026-10-16) the gap between items is 32 px, so the navigation is still 539 px wide.

All three headers are **sticky**: they stay at the top of the screen while the page scrolls under them (Decided 2026-10-21, `SITE-FLOWS.md` §3.1). The footer has no navigation on any breakpoint (`SITE-FLOWS.md` §3.2).

Hover and press motion follow the **input**, not the width (Decided 2026-10-21, `ANIMATIONS.md` §1.9, ANIM-07): with a mouse, trackpad or keyboard a tablet gets the desktop hover and press; with touch it gets the phone press.

Overlays follow the same rule (Decided 2026-10-23, `ANIMATIONS.md` §7J): with a mouse, trackpad or keyboard a confirm opens as a centred dialog (ANIM-12); with touch below 1120 px it opens as a bottom sheet (ANIM-13). The sticky header’s scroll shadow (ANIM-24) and the Order confirmed mascot (ANIM-25: desktop 100 %, tablet 85 %, phone 70 %) apply on every breakpoint.

Orientation does not choose the design, the width does. A tablet turned to landscape that is 1120 px or wider (e.g. 1180 × 820, 1366 × 1024) gets the desktop design. A 1024 × 768 tablet gets the tablet design.

---

## 2. Phone (below 768 px)

- The `M · Page — …` frames (section `785:5624`, Home `1464:8417`) are the design at 402 px. **Design**
- Other phone widths (360–767): type sizes and component heights stay as designed; horizontal sizes (margins, columns, gaps, images) are fluid and text rewraps — the same principle as the tablet rule in §3.3. **Decided (2026-10-15)**
- Carousels (Home cakes and testimonials) are swiped, with the next card peeking in; testimonials and the About Linda cards show the shared slider indicator (`ANIMATIONS.md` ANIM-10). **Design + Decided 2026-10-22**
- About Linda “What do we offer?”: on the phone the three cards (Made by hand, start to finish · Designed around you · For every kind of occasion) are a swipe carousel, one card at a time, with the same pagination dashes (cards 2 and 3 sit to the right of the page in Figma, section `1443:11135`). Tablet and desktop show the three side by side. **Design**

---

## 3. Tablet (768–1119 px)

### 3.1 Header — **Decided**

The phone header at full viewport width: same 55 px height, logo mark (tilted 15°, cropped by the bar, as on the phone) and wordmark on the left at phone size, the “menu” button pinned to the right edge (right margin 17 px), the header texture covers the bar (`background-size: cover`). Component `V2 · Nav / Header — tablet v3` (`1549:10272`, 1024 × 55).

### 3.2 Pages at 1024 px — **Decided**

Every tablet page is the **desktop design scaled to 0.8** (1280 → 1024 px) with the tablet header on top. It is not a separate layout.

- Figma: section `V2 · Oldalak — tablet (1024, desktop 0,8×)` (`1549:10271`), frames `T · Page — … · tablet 1024` (26 pages incl. Gallery `1638:11793`; IDs in `SITE-FLOWS.md` §2).
- **Pages without a tablet frame** (the token pages and state cards: order status, change / message / cancel, pay, missed delivery, unsubscribe, complaint sent) follow the same rule: the desktop design scaled 0.8. **Decided**
- **Tablet Home exception (closed 2026-10-22):** the tablet Home testimonials now have the slider indicator in Figma (`1760:12667`). The “Special idea?” section was updated on 2026-10-16. **Decided**
- **Gallery grid:** 4 columns on desktop and tablet, 2 on the phone; 12 photos per page everywhere (`SITE-FLOWS.md` §4.8). **Decided**
- **Text rule:** scaling never pushes a text below 14 px, and never makes it larger than its desktop size: `font-size = max(0.8 × desktop, min(desktop, 14px))`. Line height and letter spacing follow the same factor as the font size.
- Where a tablet frame shows a text smaller than this formula gives (e.g. some tablet copies made by scaling a component to 0.8), the formula wins. **Decided**
- Where the larger text needed more room, the containers grew in Figma (text pushes the content below it down; it never overlaps). Follow the tablet frames for these spacings.
- **Tablet components:** `V2 · Footer — tablet v3` (`1551:10408`) and `V2 · Card / Cake — tablet v3` (`1553:10842`, the owner’s own adjusted version). Outline buttons whose text kept its desktop size also keep their desktop size (e.g. Cookie preferences 131 × 28).
- **Catalogue page size:** **12 cakes** per page on every breakpoint — desktop and tablet 3 columns × 4 rows, phone 2 × 6 (Decided 2026-10-17; replaces 15 / 14 of 2026-10-14). The server renders exactly the cards in `shown` (`SITE-FLOWS.md` §4.2).

### 3.3 Other tablet widths (768–1119, not 1024) — **Decided**

- Font sizes, line heights and component heights stay exactly as in the 1024 px tablet design; they do not scale with the viewport.
- Horizontal sizes are fluid: page margins, columns, gaps and images scale with the viewport width (`value_at_1024 / 1024 × 100vw`, or percentage-based containers), and text rewraps.
- Example: at 820 px a 432 px wide column becomes about 346 px wide, and its 14 px text simply wraps to more lines.
- Buttons, pills and inputs keep their tablet size; if a row no longer fits, they wrap onto a new row.

### 3.4 Landscape tablet (e.g. 1024 × 768) — **Decided**

- Pages: the same 1024 px tablet design; the screen is only shorter, so there is more scrolling.
- The open menu has its own landscape layout and timing — see `ANIMATIONS.md` §8.1.

### 3.5 Carousels on tablet — **Decided**

Home cakes and testimonials are swiped as on the phone (horizontal scroll with scroll-snap, the next card peeks in at the right edge). **No arrow buttons on tablet.** The testimonials show the shared slider indicator at full size, like the phone and the desktop (`ANIMATIONS.md` ANIM-10; tablet not scaled, Decided 2026-10-22). Desktop keeps its arrow buttons and also shows the indicator.

---

## 4. Desktop (1120 px and wider)

- The `V2 · Page — …` frames (section `616:2998`), Home section `518:2687`, About Linda section `518:2688` are the design at 1280 px. **Design**
- 1120–1279 px: the 1280 design with the same principle as §3.3 — type sizes fixed, horizontal sizes fluid. **Decided (2026-10-15)**
- Above 1280 px: content stays at its 1280 layout width, centred; full-bleed backgrounds (hero, colour bands, footer) stretch to the viewport. **Decided (2026-10-15)**

---

## 5. Admin (Linda’s side) — **Decided (2026-10-15)**

The admin has a desktop and a phone design and does **not** use the tablet rule: from **1024 px** the desktop layout (sidebar); below 1024 px the phone layout, centred, max 640 px wide (`SITE-FLOWS.md` §9.1).

---

## 6. Open questions

None — the width rules in §2, §4 and §5 were confirmed by the owner on 2026-10-15.
