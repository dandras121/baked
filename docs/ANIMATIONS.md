# Baked by Linda — Animation Guide

> **For Claude Code.** This file is the single source of truth for every animation on the Baked by Linda website.
> Read §1 before writing any animation code. Implement from the data in this file — do not estimate values from Figma screenshots.
> Animations only. Breakpoints and tablet layout: `RESPONSIVE.md`. What every button and step does: `SITE-FLOWS.md`.
> New animations are added to this file using the template in §10. Do not invent motion that is not specified here; if something is missing, ask the owner (Bohoka).

- **Last updated:** 2026-10-22 (v1.34 — ANIM-12–25 surface motion: dialogs, bottom sheets, lightbox, cookie bar, catalogue filter / search, Show more, checkout step change, notices and errors, price change, calendar month, cake-page media, photo load, sticky-header shadow, Order confirmed mascot (owner decisions 2026-10-23); v1.33 — the testimonial row holds all Google reviews, loaded a few at a time and virtualised; ANIM-10 unchanged; v1.32 — ANIM-11: opening slowed to 500 ms, the title grows / shrinks on a gentler curve, the description and tiers fade softly and shrink a little; the cake sits at the bottom of the picture in every crop (bottom-anchored); v1.31 — ANIM-11 cake card opens into its zoomed video version and closes; one card open at a time; v1.30 — ANIM-10 slider position indicator: one indicator everywhere, window of max 5, active kept 3rd, smooth size and colour; testimonial and About cards centre themselves on click; v1.29 — ANIM-09 drop-down rows: smooth roll open / closed, the arrow flips like the phone menu arrow; replaces UI-04; v1.28 — ANIM-05 now covers every writable field: press back to 100 % (desktop) / 90 % then back to 100 % on release (phone), no bounce, no 110 % while typing; desktop nav items grow 15 %; the current menu item reloads the page (desktop and mobile menus); everything added from the admin follows the same rules; v1.27 — ANIM-07: full list of element kinds incl. selection controls and row-shaped pressables, Figma annotations “Pressable · ANIM-07”, `data-pressable`; v1.26 — ANIM-07 hover / press / release for every pressable component (public site), ANIM-08 desktop underline slide, ANIM-05 aligned to the press rule, UI-01/02 colour hovers dropped, tablet input rule; v1.25 — ANIM-06 footer mascot peek; header now sticky; footer has no navigation; v1.24 — ANIM-05 catalogue search field: hover grow, click and tap bounce, focus and blur; v1.23 — UI-08 points to SITE-FLOWS §9.13 for the video limits; v1.22 — after the Claude Code dry run: §1.3 scoped to ANIM-01–04, UI-01/02/04 properties named, `gallery` in the ANIM-03 flag, no codebase yet (path A by default), hero slide designs and their motion left to the owner, fonts self-hosted; v1.21 — menu panel scrolls on short viewports; v1.20 — Gallery added to the menus: seven items, desktop gap 32, mobile block 462 px tall (top 248 / landscape 106); the header’s active underline is no longer clipped in Figma; v1.19 — small consistency fixes with SITE-FLOWS v3.0: page names in §3.3, UI-06 designed hero first; v1.18 — menu interactions §3.4, UI-06 hero and routing decided; nav hover left for later; v1.17 — About Linda mobile page found and assembled (`1600:10493`); v1.16 — UI-01–08 in the index, checklist and open questions; v1.15 — §7B small UI motion added after the audit; v1.14 — animations only: layout rules moved to RESPONSIVE.md, flows to SITE-FLOWS.md; v1.13 — consistency pass: index, interaction map, JSON landscape overrides; v1.12 — tablet in-between widths: fixed type, fluid widths; v1.11 — landscape tablet menu storyboard + rotation rule; v1.10 — tablet storyboards: menu 1575:9215, mascot tablet row, full desktop header; v1.9 — ANIM-04 ends on the owner’s header design: 15° tilt, cropped by the bar; v1.8 — tablet band 768–1119 px: tablet header, tablet pages, swipe carousels; v1.7 — ANIM-04 mascot slide-in; SVG logo asset; breakpoint 1120 px)
- **Figma file:** `py7HpVoQwoEm9shlxEoCXL`
- **Figma storyboard section:** `V2 · Animáció lépésekben — mobil fejléc kinyitás` (node `1497:8799`). Layer and frame names in Figma are partly Hungarian; the mapping is given in each section.
- **Prototype:** Figma flow **“Flow 1”**, starting frame `Befedés 1 · zárt` (node `1499:8841`).
- **Tablet storyboards:** portrait `V2 · Animáció lépésekben — tablet menü (1024 × 1366)` (node `1575:9215`, flow “Tablet menü”), landscape `V2 · Animáció lépésekben — tablet menü, fekvő (1024 × 768)` (node `1578:9779`, flow “Tablet menü — fekvő”). Mascot: section `1545:10103` (flows “Sütiszörny — mobil / tablet / desktop”). Details in §8.1 and §7A.

### Before you start (every task that touches an animation)

1. **Find out how the site navigates** — client-side routing or full page loads. ANIM-03 depends on it (§7.2). There is no codebase yet: the stack is your choice (Decided 2026-10-17, `SITE-FLOWS.md` §0.8); with the default (Next.js App Router, client-side routing) build path A.
2. **Read the open questions (§11).** If one of them blocks your task, ask the owner instead of guessing. Everything marked *Proposal* in §3.4 you may implement, but list it in your report.
3. **Assets you need:**
   - header texture — export layer `Rectangle 165` from the header master `V2 · Nav / Header — mobil v3` (node `1461:9222`); it is used by the header and by the pink layer (the tablet header `1549:10272` uses the same image, `background-size: cover`);
   - Instagram and Facebook icons — the `Instagram` and `Facebook` frames inside `Link / Instagram` and `Link / Facebook` in frame `Befedés 16 · kész`;
   - logo — export the component `Baked by Linda logo svg` (node `1541:9603`) as SVG; it is the only wordmark used on the site (e-mails: use the owner-provided `baked-by-linda-logo-email@2x.png` — 354 × 54, transparent, display it at 177 × 27 — because many e-mail clients do not render SVG);
   - fonts — Quicksand 300, 500, 600 and Fraunces 300, self-hosted as WOFF2 from the site’s own domain (not loaded from Google Fonts), `font-display: swap`.
   If you have no Figma access, ask the owner to export them.
4. **When you finish:** update the status in §3.1, go through the checklist in §9 in a 402 × 902 viewport and in the tablet viewports listed there, ask the owner to check it on a real phone, and report which *Proposal* rows you implemented.

---

## Contents

1. Global rules (apply to every animation)
2. Design tokens used by animations
3. Animation index, navigation map and interaction map
4. Shared component: mobile menu overlay (anatomy and geometry)
5. ANIM-01 — Mobile menu: open
6. ANIM-02 — Mobile menu: close
7. ANIM-03 — Mobile menu: select an item and navigate
7A. ANIM-04 — Header mascot: slide-in on first page load
7B. Small UI motion — buttons, spinner, accordion, hero, carousels, gallery video
7C. ANIM-05 — Writable fields (incl. the catalogue search): hover grow, press, focus
7D. ANIM-06 — Footer mascot: peek in when the footer comes into view
7E. ANIM-07 — Pressable components: hover grow, press, release (all breakpoints)
7F. ANIM-08 — Desktop navigation: the underline slides to the clicked item
7G. ANIM-09 — Drop-down rows: roll open and closed, the arrow flips
7H. ANIM-10 — Slider position indicator (all sliders) and cards that centre on click
7I. ANIM-11 — Cake card: open into the zoomed video, close
7J. ANIM-12–25 — Surface motion (overlays, lists, steps, messages, numbers, media, header, Order confirmed)
8. Static style: active navigation underline (desktop and mobile); 8.1 Animations on tablet — storyboards, landscape, rotation
9. Acceptance checklist
10. Template for adding a new animation
11. Open questions
12. Appendix — keyframe data (JSON)

---

## 1. Global rules (apply to every animation)

1. **Duration cap: every animation completes in under 1000 ms.** This is an owner requirement. If a change would exceed it, shorten the timeline proportionally and keep the shape of the curves.
2. **Keyframes are sampled; interpolate linearly between them.** The easing is already baked into the sampled values (the step timings and values were tuned frame by frame). Use `linear` timing between keyframes. Never add an extra ease on top of a sampled table, or the motion stutters at every keyframe.
   Exception: segments that are described with a single named easing (e.g. “160 ms, ease-out”) use that easing.
3. **Animate only `opacity`, `transform` and `clip-path`** in ANIM-01–07 (ANIM-09 animates the panel’s `grid-template-rows`, see §7G). The one exception is the small, absolutely positioned underline (see §8): it animates `width` (and in ANIM-08 its left edge, `translateX` or `left`), never `scaleX`, so its glow keeps its round shape. The small UI motion of §7B names its own properties: UI-01/02 transition `background-color` and `box-shadow`; UI-04 grows the panel with a `grid-template-rows: 0fr → 1fr` transition (where the browser supports it, `<details name=…>` with `::details-content` may be used instead).
4. **Reduced motion.** When `prefers-reduced-motion: reduce` matches, every animation in this file becomes an instant state change (no motion, no fades). Navigation happens immediately.
5. **Input lock.** While an animation runs, ignore further taps on its trigger and on the elements it animates. Release the lock when the animation finishes.
6. **No layout shift.** Animated decorations (underlines, overlays) are positioned absolutely or fixed; they must never move surrounding content.
7. **Destination content is never part of a design.** Where a storyboard shows “Itt a megnyitott oldal jelenik meg — kódból kerül ide” (“the opened page appears here — provided by code”), the real page content goes there at runtime.
8. **Pressable components (public site, Decided 2026-10-21):** every button, link, card, image, pill, tab, menu item, thumbnail and the catalogue search field grows **10 %** on hover and shrinks back when the pointer leaves, both animated; on a desktop a press brings it back to its original size while held, on a phone a press shrinks it 10 % while held; the action fires only on **release**. Values: ANIM-07. Exceptions: text links inside sentences (colour only), disabled controls, the admin (§7E). Desktop navigation items grow **15 %** instead (they are small). Writable fields follow ANIM-05. **Everything Linda adds from the admin** (new cakes and their options, gallery photos, FAQ questions, the synced Google reviews, hero slides, page photos, legal page texts and anything added later) renders through the same shared components, so its pressables and fields follow these rules automatically — never render admin content with one-off markup (Decided 2026-10-21).
9. **Which behaviour on which device (Decided 2026-10-21):** chosen per input, not per screen size — a mouse, trackpad or pen (`pointerType` `"mouse"` / `"pen"`, and hover only under `(hover: hover) and (pointer: fine)`) gets the desktop behaviour; touch gets the phone behaviour; keyboard focus (`:focus-visible`) gets the desktop hover. So a tablet with a keyboard and trackpad behaves like a desktop and without them like a phone. (A web page cannot see a keyboard itself; it sees how the user points and focuses, which is what matters here.)

---

## 2. Design tokens used by animations

### Colours

| Token | Value | Used for |
|---|---|---|
| `--bbl-display` | `#563b83` | menu item text, “Follow our social media” |
| `--bbl-accent` | `#7a57c2` | underline fill, “menu” label |
| `--bbl-glow` | `#c9a7e8` | underline glow |
| `--bbl-ink` | `#241b33` | social link text, inactive desktop nav text |
| `--bbl-paper` | `#f7f4fa` | page background |
| `--bbl-white` | `#ffffff` | the white reveal layer |

### Type

| Element | Font | Size / line height | Colour |
|---|---|---|---|
| Mobile menu item | Quicksand Light (300) | 34 px / 44 px | `--bbl-display` |
| “Follow our social media” | Fraunces Light (300) | 24 px / auto, centred | `--bbl-display` |
| Social link label | Quicksand Medium (500) | 12 px / auto | `--bbl-ink` |
| Header “menu” label | Quicksand Medium (500) | 12 px / auto | `--bbl-accent` |
| Desktop nav item | Quicksand Medium (500); active: SemiBold (600) | 14 px | `--bbl-ink` |

### Motion

| Token | Value |
|---|---|
| `--bbl-ring` | `24px` — final width of the pink ring around the white circle |
| Underline glow | `box-shadow: 0 0 5.7px var(--bbl-glow)` |
| Underline shape | height `2px`, `border-radius: 100px`, fill `--bbl-accent` |

### Stacking order of the mobile menu (bottom → top)

1. Page content
2. Pink layer (header texture, clipped to a circle)
3. White layer (clipped to a circle)
4. Menu content (items, social block)
5. Header bar (logo, wordmark, “menu” button) — always on top and always visible

---

## 3. Animation index, navigation map and interaction map

### 3.1 Animation index

| ID | Name | Trigger | Duration | Status | Figma frames |
|---|---|---|---|---|---|
| ANIM-01 | Mobile menu — open (phone and tablet) | tap “menu” button (menu closed) | 870 ms | designed | `Befedés 1 · zárt` … `Befedés 16 · kész` (phone `1497:8799`, tablet `1575:9215`, tablet landscape `1578:9779`) |
| ANIM-02 | Mobile menu — close (phone and tablet) | tap “menu” button (menu open), or `Esc` | 760 ms | designed | `Bezárás 1` … `Bezárás 14` |
| ANIM-03 | Mobile menu — select item and navigate (phone and tablet) | tap a non-active menu item | 920 ms | designed | `Választás · minta 1` … `Választás · minta 17` |
| ANIM-04 | Header mascot — slide-in | first page load of a visit (phone, tablet and desktop) | 450 ms (+150 ms delay) | designed | `Szörny mobil 1–6`, `Szörny tablet 1–6`, `Szörny desktop 1–6` |
| ANIM-05 | Writable fields (every text field, incl. the catalogue search) — hover grow, press, focus | pointer enters (mouse); press; release (focus) | hover in 240 · out 200 · press 120 · phone release 340 ms | designed | section `V2 · Animáció lépésekben — keresőmező (ANIM-05)` (`1692:12074`); Figma annotation “Writable field · ANIM-05” on every field |
| ANIM-06 | Footer mascot — peek in (phone, tablet and desktop) | the footer’s mascot area is 80 % in view, once per page load | 450 ms (+150 ms delay) | designed | section `V2 · Animáció — sütiszörny a láblécben (ANIM-06)` (`1703:13165`), frames `Lábléc szörny mobil 1–6`, `Lábléc szörny tablet 1–6`, `Lábléc szörny desktop 1–6` |
| ANIM-07 | Pressable components — hover grow, press, release (public site) | pointer enters / leaves; press; release; cancel | hover in 240 · out 200 · press 120 · release 340 · cancel 200 ms | designed | section `1722:12049`: rows `Hover — desktop menü`, `Hover — aktív pont`, `Gomb — desktop`, `Gomb — telefon`, `Gomb — telefon megszakítás` |
| ANIM-08 | Desktop navigation — the underline slides to the clicked item | release on a non-active nav item (≥ 1120 px) | 420 ms | designed | section `1722:12049`: rows `Aláhúzás — jobbra`, `Aláhúzás — balra` |
| ANIM-09 | Drop-down rows (FAQ and every future drop-down) — roll open / closed, the arrow flips | press on the row | 360 ms each way | designed | section `V2 · Animáció lépésekben — lenyíló sorok (ANIM-09)` (`1745:12629`) |
| ANIM-10 | Slider position indicator — window of max 5 dashes, active kept 3rd; testimonial / About cards centre on click | every slide change (swipe, arrow, autoplay, dash, card click) | 360 ms | designed | components `V2 · Slider dash` `1759:12635`, `V2 · Slider indicator` `1759:12772`; storyboard `1762:12666` |
| ANIM-11 | Cake card — corner button opens the card in place into its zoomed, playing video; closes back | release on the card’s corner button | open 500 ms (+ video start) · close 120 + 500 ms | designed | card sets `1776:12902`, `1776:12914`, `1777:12902`, `1777:12926`; storyboard `1779:12951`; video layout `1783:12951` |
| ANIM-12 | Dialog — open / close (every confirm and centred dialog, desktop and tablet with a pointer) | release on the opener; Esc, close button or scrim | open 240 · close 160 ms | designed | storyboard `1804:13056` |
| ANIM-13 | Bottom sheet — open / close (phone and touch tablet: confirms, order summary panel, cookie settings) | release on the opener; close, scrim or swipe down | open 320 · close 240 ms | designed | storyboard `1804:13056` |
| ANIM-14 | Lightbox — zoom from the tile, close back into it, next photo | release on a gallery tile; × / Esc / Back; ‹ › / arrows / swipe | open 320 · close 280 · next 280 ms | designed | storyboard `1804:13056` |
| ANIM-15 | Cookie bar — in (first visit) / out (a choice) | 700 ms after first paint; release on Accept / Reject / Save | in 320 · out 200 ms | designed | storyboard `1804:13056` |
| ANIM-16 | Catalogue filter pill and live search — cards leave, move, enter | release on a pill; 150 ms after typing stops | 320 ms | designed | storyboard `1804:13056` |
| ANIM-17 | Show the next … — new tiles rise in | the next page of data arrives | 240 ms + 40 ms stagger (max 440) | designed | storyboard `1804:13056` |
| ANIM-18 | Checkout step change and the stepper | the next step is ready after Continue / Back | 360 ms | designed | storyboard `1804:13056` |
| ANIM-19 | Field error, notice and alert boxes — appear / disappear | validation result; server notice | error 160 · notice 200 · out 120 ms | designed | storyboard `1804:13056` |
| ANIM-20 | Price change (size, options, quantity) | a choice changes a price | 240 ms | designed | storyboard `1804:13056` |
| ANIM-21 | Calendar month change | release on ‹ › | 320 ms | designed | storyboard `1804:13056` |
| ANIM-22 | Cake page main picture change (desktop, tablet) | release on an arrow or a thumbnail | 240 ms | designed | storyboard `1804:13056` |
| ANIM-23 | Photo fade-in on load | the image is decoded (not cached, not the hero or LCP image) | 240 ms | designed | storyboard `1804:13056` |
| ANIM-24 | Sticky header shadow | scrollY crosses 0 | 200 ms each way | designed | storyboard `1804:13056` |
| ANIM-25 | Order confirmed — the mascot peeks over the order-number card | first paint of Order confirmed, once per order | 300 ms delay + 450 ms | designed | storyboard `1804:13056` |
| STYLE-01 | Active navigation underline | static (current page) | — | designed | desktop: component `V2 · Nav / Header — v3` (node `1421:9315`) |
| UI-01 – UI-08 | Small UI motion (UI-01/02 replaced by ANIM-07): button loading, FAQ accordion, calendar hover, hero slides, carousels, gallery videos | see §7B | 80–800 ms | designed (UI-07 smooth scroll: Proposal) | not storyboarded — values on the design frames (§7B) |

Status values: `designed` → `implemented` → `verified`. Update the status when you finish an item.

### 3.2 Navigation map — what each menu item opens

The same seven items, in this order, appear in the desktop navigation and in the mobile menu: **Home · Cakes · Bespoke · Gallery · About Linda · FAQ · Contact** (Gallery added 2026-10-16). *Cakes* is the catalogue of pre-designed cakes (and its order flow); *Bespoke* is the bespoke-cake enquiry.

| Item | Opens (desktop design) | Opens (mobile design) | Route |
|---|---|---|---|
| Home | `V2 · Home — desktop` (`518:2687`) | `M · Page — Home` (`1464:8417`) | `/` |
| Cakes | `V2 · Page — The full range` (`599:2721`) | `M · Page — The full range` (`798:5566`) | `/cakes` |
| Bespoke | `V2 · Page — Bespoke enquiry` (`660:4068`) | `M · Page — Bespoke enquiry` (`847:8028`) | `/bespoke` |
| Gallery | `V2 · Page — Gallery` (`1633:11617`) | `M · Page — Gallery` (`1636:11699`) | `/gallery` |
| About Linda | `V2 · About Linda` (`518:2688`) | `M · Page — About Linda` (`1600:10493`, in section `1443:11135`) | `/about` |
| FAQ | `V2 · Page — FAQ` (`658:3996`) | `M · Page — FAQ` (`803:5741`) | `/faq` |
| Contact | `V2 · Page — Contact` (`656:3843`) | `M · Page — Contact` (`839:6616`) | `/contact` |

Routes are decided by the owner (2026-10-13). The full page and route list is in `SITE-FLOWS.md` §2.

### 3.3 Active item per page

The active item gets the underline (STYLE-01) in the desktop navigation, and in the mobile menu it is the item that is already underlined when the menu opens. Tapping it in the mobile menu **reloads that page** (the ANIM-03 same-item variant, end of §7.2; Decided 2026-10-21); clicking it in the desktop navigation reloads it too (§7F). Source: the variant of the navigation component used on each desktop page in Figma.

| Active item | Pages |
|---|---|
| Home | Home |
| Cakes | The full range, the cake page (order step 1; Figma frame name “Customise a design”), When & where, Your details, Review & pay, Order confirmed |
| Bespoke | Bespoke enquiry, Enquiry sent, Your enquiry (read-only) |
| Gallery | Gallery (and its lightbox) |
| About Linda | About Linda |
| FAQ | FAQ |
| Contact | Contact, Message sent |
| none | 404, 500, Find my order, Terms and conditions, Privacy policy, Cookie policy, Delivery & collection, Cancellations & refunds, Accessibility statement, Complaints procedure, Allergen information, and every token page (order status and its change/message/cancel pages, Pay for your cake, missed delivery, unsubscribe) and Complaint sent |

On pages with **no active item**: no underline is drawn in ANIM-01/ANIM-02, every menu item navigates (ANIM-03), and ANIM-03 skips the 0–80 ms retract step (nothing to retract) while keeping the same timeline.

### 3.4 Interaction map — when does what run

**Decided** = from the design or the owner. **Guide rule** = a technical rule from §1. **Proposal** = a sensible default that is not designed yet; implement it, but list it in your report so the owner can confirm or change it.

Phone and tablet (the header with the “menu” button, below 1120 px):

| Current state | Input | Result | Basis |
|---|---|---|---|
| Menu closed | tap “menu” | ANIM-01 | Decided |
| Any animation running | any tap on the “menu” button or a menu item | ignored (input lock, §1.5) | Guide rule |
| Menu open | tap “menu” | ANIM-02 | Decided |
| Menu open | tap the active item (§3.3) | the page reloads: ANIM-03 same-item variant (§7, end of §7.2) | Decided (2026-10-21; replaces “ANIM-02, no navigation”) |
| Menu open | tap any other item | ANIM-03, then the page from §3.2 | Decided |
| Menu open | `Esc` | ANIM-02 | Decided (2026-10-15) |
| Menu open | tap the logo or wordmark | same as tapping the Home item (closes the menu and goes to Home) | Decided (2026-10-15) |
| Menu open | tap Instagram / Facebook | opens the profile in a new tab (`target="_blank" rel="noopener"`), menu stays open | Decided (2026-10-15) |
| Menu open | browser Back | **only closes the menu** (ANIM-02) and stays on the page: opening the menu pushes one history entry, Back pops it. If the menu was closed another way, remove that entry so Back is never “eaten”. On return from another page the bfcache rule (§7.2 B.3) shows it closed. | Decided (2026-10-15) |
| Menu open | rotation / resize | the menu stays open; recompute origin and radii (§4.2) and the layout (§8.1 landscape) and snap to them with no animation; if the viewport becomes 1120 px or wider, close the menu instantly | Decided (owner, 2026-10-13) |
| Menu closed | any other link (footer, buttons, cards…) | normal navigation, no menu animation | Decided |
| First page load of a visit | — | ANIM-04 (the mascot slides into the header) | Decided |
| Scrolling to the bottom of any page (the footer mascot area 80 % in view) | — | ANIM-06 once per page load (also on desktop) | Decided (2026-10-21) |
| Any later page load or a reload in the same visit | — | no ANIM-04 | Decided |

Desktop (the navigation bar):

| Input | Result | Basis |
|---|---|---|
| press a navigation item | ANIM-07 press (the text back to 1.00 while held) | Decided (2026-10-21) |
| release on a non-active navigation item | the navigation starts and ANIM-08 slides the underline to it (§7F) | Decided (2026-10-21) |
| release on the active item | the page reloads (fresh, scrolled to the top, filters and search cleared); no underline slide, only the ANIM-07 press / release | Decided (2026-10-21) |
| first page load of a visit | ANIM-04 with the desktop emblem | Decided |
| hover a navigation item | ANIM-07: the item’s text grows 15 % around its centre, animated in and out; the underline does not change | Decided (2026-10-21) |
| hover / press / release any other pressable component | ANIM-07 (§7E) | Decided (2026-10-21) |
| pointer enters / leaves any writable field (the catalogue search field and every other) | ANIM-05 hover in / out (+10 %) | Decided (2026-10-21) |
| click into a writable field | ANIM-05: back to 1.00 on press and stays 1.00 while typing (no bounce) | Decided (2026-10-21, v1.28) |
| hover / press / release a cake card’s corner button | ANIM-07, then on release ANIM-11 opens (or closes) the card; another open card closes at the same time | Decided (2026-10-22) |

Overlays and surfaces (every breakpoint, Decided 2026-10-23): a dialog opens and closes with ANIM-12 (desktop, or tablet with a pointer), a bottom sheet with ANIM-13 (phone, touch tablet); the lightbox with ANIM-14; the cookie bar with ANIM-15; scrolling past the top shows the header shadow (ANIM-24). While an overlay animates, a second press on its opener is ignored; Esc during the opening closes it from where it is.

Phone and tablet touch: press on a writable field → ANIM-05 shrinks it to 0.90; release opens the keyboard and it springs back to 1.00 (no bounce); leaving the field → ANIM-05 blur. Tap a cake card’s corner button → ANIM-07 press / release, then ANIM-11 open or close (one card open at a time). (Decided 2026-10-21 / 2026-10-22)

---

## 4. Shared component: mobile menu overlay

### 4.1 Anatomy (reference viewport 402 × 902 px)

| Part | Figma layer | Spec |
|---|---|---|
| Header bar | `Fejléc sáv` | height 55 px, header texture background, logo + wordmark + “menu” button. Stays visible above the overlay. |
| “menu” button | `Nav / Cakes` (legacy name) | label “menu” + arrowhead. Its **top-right corner** is the animation origin. |
| Arrowhead | `Menu arrowhead` | 3.29 × 6.38 px vector, flips horizontally (see §4.4). |
| Pink layer | `Befedés · kör` (mask `Kör maszk` + `Textúra · fejléc kép`) | full-viewport element with the **header texture** as background (cover, fixed to the viewport), clipped by a circle. |
| White layer | `Fehér kör` | full-viewport white element, clipped by a smaller concentric circle. |
| Menu items | `Menu · nyitott` | Home / Cakes / Bespoke / Gallery / About Linda / FAQ / Contact. Left 24 px, 44 px line height, 68 px pitch (item top to item top). The block of 7 items (462 px tall) is vertically centred in the area below the header bar (top at 248 px on the reference viewport; same centre line as before). |
| Short viewports | — | If the viewport is shorter than the menu content (seven items + social block), the menu panel scrolls inside itself; the header bar stays fixed. The social heading is hidden when both social URLs are empty. (Proposal) |
| Underline | `Underline` inside each item | see §8. Sits 2 px below the item’s 44 px line box (top = 46 px from item top). Width = the word’s rendered width. |
| Social block | `Follow our social media`, `Link / Instagram`, `Link / Facebook` | heading (Fraunces Light 24, centred, 290 px wide); below it, 26 px gap, a row with Instagram (`@bakedbylinda`) and Facebook (`Baked by Linda`) links, each a 17 px icon + 7 px gap + label; Instagram left, Facebook right, centred as a pair with 67 px between them. On the reference viewport the link row’s bottom is 36 px above the viewport bottom. |

The texture asset: export the header background from Figma (layer `Rectangle 165` inside the header bar; the header master component is `V2 · Nav / Header — mobil v3`, node `1461:9222`). The header currently also has a white 25 % noise effect on that texture; if the site renders the header with a noise overlay, the pink layer uses the same overlay.

### 4.2 Origin and radii (responsive)

The Figma values were designed on a 402 × 902 viewport. In code, compute them at the moment the animation starts:

```
origin  = top-right corner of the "menu" button's bounding box   (Figma: x 385, y 22)
R_white = ceil( distance from origin to the farthest viewport corner )   (Figma: 961)
R_pink  = R_white + 24                                            (Figma: 985)

pinkRadius(t)  = pink(t)  × R_pink
whiteRadius(t) = white(t) × R_white
clip-path: circle(<radius>px at <origin.x>px <origin.y>px)
```

`pink(t)` and `white(t)` are the normalised values (0 → 1) from the tables in §5–§7. On the reference viewport this reproduces the Figma radii exactly. `0` means fully closed.

Why the white circle ends at exactly `R_white`: at the end of the open animation the white must cover every corner of the screen, and the 24 px pink ring must lie just outside the screen — so the open menu is pure white.

### 4.3 Why the two circles are separate layers

The visible pink is only the ring between the two circles. The pink circle leads and the white circle catches up: the ring opens up to 320 px wide in the middle of the open animation and closes back to 24 px at the end. This difference in motion is the core of the design — do not merge the two layers or animate them with one shared curve.

The texture must stay fixed to the viewport while its circle grows (clip-path on a full-viewport element does this). Do not scale an element that carries the texture, or the texture will zoom.

### 4.4 The arrowhead flip

Use a 3D rotation **without** perspective:

```
transform: translateX(<arrowShiftPx>px) rotateY(<arrowDeg>deg);
transform-origin: center;
```

`rotateY` without perspective renders as a horizontal squash by |cos θ| and mirrors the arrow past 90°, which is exactly the Figma design (width 3.29 · |cos θ|, mirrored after the edge-on frame at 90°). `arrowShiftPx` moves the arrow’s centre from its closed position (35.64 px from the button’s left) to its open position (38.75 px), matching the owner’s Figma end states.

### 4.5 Behaviour requirements (not visible in Figma — accessibility defaults)

- The “menu” button has `aria-expanded` and `aria-controls`; its accessible name is “Open menu” / “Close menu”. The visible label stays “menu” in both states.
- When the menu is open: move focus to the first menu item; keep focus inside the header bar + menu; `Esc` runs ANIM-02; page scrolling is locked.
- When the menu closes without navigation: return focus to the “menu” button.
- Menu items and social links are real links (`<a href>`), so they work without JavaScript.

---

## 5. ANIM-01 — Mobile menu: open

- **Trigger:** tap the “menu” button while the menu is closed.
- **Duration:** 870 ms (circles 0–660 ms, menu items 495–660 ms, social block 660–870 ms).
- **Interpolation:** linear between keyframes (rule §1.2).
- **What happens:** the pink circle shoots out from the button corner and slows down; the white circle starts slowly and catches up faster and faster; the ring narrows to 24 px and leaves the screen at 660 ms. Meanwhile the arrow turns over the whole circle phase. Then the menu items fade in while the active item’s underline draws from the left; only after the screen is fully white does the social block fade in.
- **Columns:** `pink`, `white` = normalised radii (§4.2). `arrowDeg`, `arrowShiftPx` = §4.4. `menuOpacity` = opacity of the menu item block. `underline` = active item’s underline width as a fraction of its full width (left edge fixed). `socialOpacity` = opacity of the social block.
- **Input:** menu items become interactive at 660 ms.
- **Pages without an active item (§3.3):** run the same table but keep the `underline` column at 0.

| t (ms) | pink | white | arrow ° | arrow shift px | menu op. | underline | social op. |
|---|---|---|---|---|---|---|---|
| 0 | 0.0 | 0.0 | 0 | 0.0 | 0 | 0 | 0 |
| 55 | 0.1371 | 0.0104 | 15 | 0.26 | 0 | 0 | 0 |
| 110 | 0.266 | 0.0385 | 30 | 0.52 | 0 | 0 | 0 |
| 165 | 0.3868 | 0.1051 | 45 | 0.78 | 0 | 0 | 0 |
| 220 | 0.4985 | 0.1904 | 60 | 1.04 | 0 | 0 | 0 |
| 275 | 0.6 | 0.282 | 75 | 1.3 | 0 | 0 | 0 |
| 330 | 0.6924 | 0.3788 | 90 | 1.55 | 0 | 0 | 0 |
| 385 | 0.7746 | 0.4755 | 105 | 1.81 | 0 | 0 | 0 |
| 440 | 0.8457 | 0.5702 | 120 | 2.07 | 0 | 0 | 0 |
| 495 | 0.9056 | 0.666 | 135 | 2.33 | 0 | 0.0212 | 0 |
| 550 | 0.9523 | 0.7627 | 150 | 2.59 | 0.25 | 0.3596 | 0 |
| 605 | 0.9858 | 0.8751 | 165 | 2.85 | 0.65 | 0.7826 | 0 |
| 660 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 0 |
| 730 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 0.25 |
| 800 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 0.65 |
| 870 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 1 |

---

## 6. ANIM-02 — Mobile menu: close

- **Triggers:** tap the “menu” button while open; `Esc`. (Tapping the current page’s item reloads the page since 2026-10-21 — end of §7.2.)
- **Duration:** 760 ms.
- **What happens:** the exact reverse of ANIM-01 — social block fades out first (0–220 ms), then the menu items fade out while the active underline retracts to the left (220–355 ms), and the circles shrink back into the button corner while the arrow turns back (220–760 ms). At 760 ms the overlay is removed and focus returns to the “menu” button.
- **Interpolation:** linear between keyframes.

| t (ms) | pink | white | arrow ° | arrow shift px | menu op. | underline | social op. |
|---|---|---|---|---|---|---|---|
| 0 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 1 |
| 100 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 0.65 |
| 160 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 0.25 |
| 220 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 0 |
| 265 | 0.9858 | 0.8751 | 165 | 2.85 | 0.65 | 0.7826 | 0 |
| 310 | 0.9523 | 0.7627 | 150 | 2.59 | 0.25 | 0.3596 | 0 |
| 355 | 0.9056 | 0.666 | 135 | 2.33 | 0 | 0.0212 | 0 |
| 400 | 0.8457 | 0.5702 | 120 | 2.07 | 0 | 0 | 0 |
| 445 | 0.7746 | 0.4755 | 105 | 1.81 | 0 | 0 | 0 |
| 490 | 0.6924 | 0.3788 | 90 | 1.55 | 0 | 0 | 0 |
| 535 | 0.6 | 0.282 | 75 | 1.3 | 0 | 0 | 0 |
| 580 | 0.4985 | 0.1904 | 60 | 1.04 | 0 | 0 | 0 |
| 625 | 0.3868 | 0.1051 | 45 | 0.78 | 0 | 0 | 0 |
| 670 | 0.266 | 0.0385 | 30 | 0.52 | 0 | 0 | 0 |
| 715 | 0.1371 | 0.0104 | 15 | 0.26 | 0 | 0 | 0 |
| 760 | 0.0 | 0.0 | 0 | 0.0 | 0 | 0 | 0 |

---

## 7. ANIM-03 — Mobile menu: select an item and navigate

- **Trigger:** tap a menu item that is **not** the current page.
- **Duration:** 920 ms from tap to fully revealed new page.
- **What happens:** the tapped item gets underlined, then ANIM-02 plays in reverse order, and as the circles shrink the **newly opened page** is revealed underneath them.

### 7.1 Timeline

| Time | What | Easing |
|---|---|---|
| 0–80 ms | the current page’s underline retracts to the left (to 2 px) | ease-out |
| 80–240 ms | the tapped item’s underline draws from the left: 2 px → full word width | ease-out |
| **240 ms** | **handoff point** — the new page takes over (see §7.2) | — |
| 240–300 ms | hold (gives the new page time to paint) | — |
| 300–920 ms | the reverse sequence below; the **tapped** item plays the role of the active item | linear between keyframes |
| 920 ms | overlay removed, new page fully visible, focus moves to the new page’s main content | — |

| t (ms) | pink | white | arrow ° | arrow shift px | menu op. | underline | social op. |
|---|---|---|---|---|---|---|---|
| 300 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 1 |
| 350 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 0.65 |
| 400 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 0.25 |
| 440 | 1.0 | 1.0 | 180 | 3.11 | 1 | 1 | 0 |
| 480 | 0.9858 | 0.8751 | 165 | 2.85 | 0.65 | 0.7826 | 0 |
| 520 | 0.9523 | 0.7627 | 150 | 2.59 | 0.25 | 0.3596 | 0 |
| 560 | 0.9056 | 0.666 | 135 | 2.33 | 0 | 0.0212 | 0 |
| 600 | 0.8457 | 0.5702 | 120 | 2.07 | 0 | 0 | 0 |
| 640 | 0.7746 | 0.4755 | 105 | 1.81 | 0 | 0 | 0 |
| 680 | 0.6924 | 0.3788 | 90 | 1.55 | 0 | 0 | 0 |
| 720 | 0.6 | 0.282 | 75 | 1.3 | 0 | 0 | 0 |
| 760 | 0.4985 | 0.1904 | 60 | 1.04 | 0 | 0 | 0 |
| 800 | 0.3868 | 0.1051 | 45 | 0.78 | 0 | 0 | 0 |
| 840 | 0.266 | 0.0385 | 30 | 0.52 | 0 | 0 | 0 |
| 880 | 0.1371 | 0.0104 | 15 | 0.26 | 0 | 0 | 0 |
| 920 | 0.0 | 0.0 | 0 | 0.0 | 0 | 0 | 0 |

### 7.2 Handing over to the new page

The overlay must survive the page change. How depends on the site’s routing — check which one the project uses before implementing.

**A) Same-document routing** (e.g. Next.js `Link` / client-side router, any SPA): keep the header and the overlay in the persistent layout so they are not unmounted on navigation.

1. At 240 ms start the client-side navigation.
2. Reset the page scroll to the top underneath the overlay.
3. Continue the timeline from 300 ms once the new route has rendered (if it renders within the 60 ms hold, nothing waits; if not, hold the 300 ms state until it has).

No storage flag is needed in this case.

**B) Full page loads** (separate HTML documents): the old page plays 0–240 ms, then navigates; the new page starts already showing the 240 ms state and plays 240–920 ms. These four rules make it seamless:

1. **The new page’s first paint is already the covered state.** An inline script at the very top of `<head>` (before stylesheets) reads the flag from `sessionStorage`, adds a class to `<html>`, and deletes the flag immediately. That class renders the overlay fully covering, the menu open, social visible, and the tapped item underlined. Browsers keep the old page on screen until the new one can paint, so the swap between the two identical frames is not visible. On a slow connection the selected state simply holds longer.
2. **The reveal is a pure CSS animation with `animation-fill-mode: forwards` that ends closed.** If any later JavaScript fails, the page still uncovers itself instead of staying white.
3. **Back button:** on `pageshow` with `event.persisted === true` (page restored from the back/forward cache), reset the menu to closed immediately. Otherwise the previous page comes back covered.
4. **Only a plain tap starts it.** Do not intercept clicks with Ctrl/Cmd/Shift/Alt, middle clicks, or “open in new tab”; those navigate normally without the flag. With reduced motion, navigate immediately without the flag.

Flag (path B only):

```
sessionStorage key:   "bbl:menu-reveal"
value (JSON):         { "item": "home" | "cakes" | "bespoke" | "gallery" | "about" | "faq" | "contact", "t": <Date.now()> }
ignore the flag if:   older than 5000 ms, or the item does not match the page being loaded
```

Links anywhere else on the site (footer, buttons on the Home page, cards, etc.) never set the flag, so they always open the new page normally, without this animation.

**Same-item variant (Decided 2026-10-21):** tapping the item of the page you are on reloads that page. The same timeline runs, except that 0–240 ms the underline neither retracts nor redraws (it is already under that item); at 240 ms the navigation goes to the same route fresh (path A: a client navigation with fresh data, scrolled to the top, filters and search cleared; path B: a full load of the item’s route, with the flag); 300–920 ms the reverse sequence reveals it. Figma notes `1736:13012` (phone), `1736:13013`, `1736:13014` (tablet).

### 7.3 Prototype note

In the Figma storyboard the page under the circles is a placeholder (“Itt a megnyitott oldal jelenik meg — kódból kerül ide”). The storyboard uses **Cakes** as the example; every menu item behaves the same way.

---

## 7A. ANIM-04 — Header mascot: slide-in on first page load

- **Status:** designed
- **Figma:** section `V2 · Animáció — sütiszörny becsúszás (első betöltés)` (node `1545:10103`), frames `Szörny mobil 1–6`, `Szörny tablet 1–6` (1024 px tablet header, mobile values) and `Szörny desktop 1–6` (the full 1280 px header); prototype flows “Sütiszörny — mobil”, “Sütiszörny — tablet” and “Sütiszörny — desktop”.
- **Trigger:** the **first page load of a visit** (once per browser-tab session). Not on later page loads, not after a reload, not after ANIM-03.
- **Element:** the emblem (the purple “cookie monster” mascot, Figma component `V2 · Logo mark`) in the header. **Its final state is the owner’s header design and must not be changed:** large and tilted 15° clockwise, cropped by the header bar (the bar has `overflow: hidden`).
  - mobile: box 58.41 × 63.72, `transform-origin: 50% 100%`, `left: -17.49px; top: 1.29px` inside the 55 px bar, final `transform: rotate(15deg)`;
  - desktop: box 103.95 × 113.40, `transform-origin: 50% 100%`, `left: -34.77px; top: -17.32px` inside the 77 px bar, final `transform: rotate(15deg)`.
  These values reproduce the Figma header components exactly (`V2 · Nav / Header — mobil v3` `1461:9222`, `V2 · Nav / Header — v3` `1421:9315`).
- **Duration:** 150 ms delay after the first paint + 450 ms motion = 600 ms.
- **What happens:** at first the mascot is hidden behind the lower edge of the header. It slides up into its place from slightly to the left — the direction it already sits in — tilted 10° more than its resting tilt and leaning into the movement, and settles into its designed 15° tilt as it arrives. No pause, no overshoot.
- **Interpolation:** one ease-out curve over the 450 ms: `cubic-bezier(0.5, 1, 0.89, 1)` (ease-out quad). The table below is that curve sampled every 90 ms (the Figma frames).
- **Transform** — `translate` is relative to the final position; `rotate` is the full rotation (designed 15° + the extra lean), `transform-origin: 50% 100%` (bottom centre). Positive rotation = clockwise (the top of the mascot leans right). Figma shows these angles as negative (−25° … −15°) because Figma measures counter-clockwise. CSS: `transform: translate(x, y) rotate(r)`.

| t (ms) | progress | mobile translate (x, y) px | desktop translate (x, y) px | rotate (total) |
|---|---|---|---|---|
| 0 | 0 | −24, 74.1 | −44, 127 | 25° |
| 90 | 0.36 | −15.36, 47.42 | −28.16, 81.28 | 21.4° |
| 180 | 0.64 | −8.64, 26.68 | −15.84, 45.72 | 18.6° |
| 270 | 0.84 | −3.84, 11.86 | −7.04, 20.32 | 16.6° |
| 360 | 0.96 | −0.96, 2.96 | −1.76, 5.08 | 15.4° |
| 450 | 1 | 0, 0 | 0, 0 | 15° |

- **Clipping — it comes from behind the header, never over the page:** on mobile, tablet and desktop the header bar clips its content (`overflow: hidden`), exactly as in the design, so nothing extra is needed. The emblem is cropped by the bar both during the slide and at rest.
- **First-load logic:** an inline script at the top of `<head>` checks `sessionStorage["bbl:mascot-seen"]`. If it is not set, it adds the class `mascot-intro` to `<html>` and sets the key. CSS: `html.mascot-intro .logo-mark { animation: bbl-mascot-in 450ms cubic-bezier(0.5, 1, 0.89, 1) 150ms both; }`. The `both` fill mode keeps the hidden start state during the delay, so the mascot never flashes in its final place first. Without JavaScript nothing animates.
- **Reduced motion:** no animation — the mascot is simply in place.
- **Interaction:** exception to §1.5 — no input lock; the logo link stays clickable during the slide (it does not change the layout).
- **Acceptance:** invisible on the first paint; appears from behind the header’s lower edge (never over the page); ends exactly in the designed position — tilted 15°, large, cropped by the bar; 600 ms in total; plays once per visit (not on the next page, not after a reload); once it has arrived the header looks exactly like the Figma header.

---

## 7B. Small UI motion (from the design and the build spec)

These are not storyboarded; the values below are written on the Figma frames and the build-spec board. Every one stays under 1 s (§1.1) and is removed by `prefers-reduced-motion` (§1.4) unless stated.

| ID | What | Values | Basis (Figma) |
|---|---|---|---|
| UI-01 | ~~Button hover~~ | Replaced by ANIM-07 (2026-10-21): no colour or shadow change, only the 10 % growth. | Decided 2026-10-21 |
| UI-02 | ~~Button pressed~~ | Replaced by ANIM-07 (2026-10-21): back to 1.00 on desktop, 0.90 on a phone while held. | Decided 2026-10-21 |
| UI-03 | Button loading / “Taking payment” | the label swaps, spinner **800 ms linear** loop, shown at least **600 ms** so it never flashes. The status is shown in the button itself (no scrim or sheet; the older scrim-and-sheet frame `1108:9846` is not built). Reduced motion: the spinner sweep stops, the state change stays. | Design + Spec |
| UI-04 | ~~FAQ accordion~~ | Replaced by ANIM-09 (2026-10-21). | Decided 2026-10-21 |
| UI-05 | Calendar day hover / focus | available days follow ANIM-07 (no tint change on hover since 2026-10-21); disabled days do nothing; focus ring 2 px at 3 px offset | Design (`1108:9269`) + Decided 2026-10-21 |
| UI-06 | Hero slides | with 2+ slides in total (the designed hero + at least one active admin slide) the hero advances every N s (admin setting, default 6). Change: crossfade **400 ms ease** (Decided 2026-10-15). One slide in total (only the designed hero, no active admin slide): still, no timer — the designed hero counts as a slide, so one active admin slide makes two. Reduced motion: never advances. Pause while hovered or focused (Decided 2026-10-15). The designed hero is always the first slide (Decided 2026-10-15, `SITE-FLOWS.md` §4.1). **The admin slides themselves are not designed yet:** the owner will design them later and they will be animated (Decided 2026-10-17). Their motion is added to this file then (template §10); until then build only the timer, crossfade, pause and dashes (`SITE-FLOWS.md` §4.1), and launch with the designed hero alone. | Design (`1268:9529`) + Decided |
| UI-07 | Carousels (Home cakes and testimonials; phone and tablet swipe, desktop arrows) | native horizontal scroll with `scroll-snap`; desktop arrows scroll one card with `behavior: smooth`. Reduced motion: the snap stays, no smooth scrolling. | Spec (ACCESSIBILITY) + Proposal |
| UI-08 | Cake-page gallery videos | the active tile’s video autoplays muted and loops when it becomes active — never on hover; a tap unmutes; one video at a time. Reduced motion: nothing autoplays, the cover image shows a play button. | Spec (MEDIA ON A CAKE, `1281:9629`; limits: SITE-FLOWS §9.13) |

---

## 7C. ANIM-05 — Writable fields (incl. the catalogue search): hover grow, press, focus

- **Status:** designed
- **Applies to:** every writable field on the public site (Decided 2026-10-21): the catalogue search field, text / e-mail / phone / postcode / date inputs, textareas (bespoke, contact, complaints, Message Linda), the inscription field, cake-option text fields (`SITE-FLOWS.md` §5.8), the Find my order fields, the checkout fields and the card payment Element area (scale its wrapper; Stripe’s `focus` / `blur` events drive the focus state). Not the admin, not e-mails. Every field also added later (e.g. option text fields Linda creates) follows it. Marked in Figma with the Dev Mode annotation **“Writable field · ANIM-05”** (85 marks; legend `1733:12590`).
- **Figma:** section `V2 · Animáció lépésekben — keresőmező (ANIM-05)` (`1692:12074`) — the search field is the sample for every field (one sample row per behaviour): row A `Keresés · hover 1–10` (hover in and out, `1692:12079`, `1692:12105`, `1692:12131`, `1726:12499` … `1726:12565`, flow “Keresőmező — hover”); row B `Keresés · kattintás 1–5` (desktop press, then focused at 1.00: `1692:12159`, `12185`, `12212`, `12238`, `12290`, flow “Keresőmező — kattintás”); row C `Keresés · telefon 1–10` (phone press and release: `1692:12319`, `12344`, `12369`, `12393`, `12417`, `1725:12487`, `12496`, `12505`, `1739:12711`, `1692:12441`, flow “Keresőmező — telefon”); row D note `1739:12736` (no motion on blur). Component set `V2 · Search field` (`1689:12097`), field masters `630:3004`, `630:3008`, `606:2895`, `810:5851`, `810:5865`, `1493:8741`.
- **Owner rules (2026-10-21, replacing the earlier bounce):** on a desktop the field grows 10 % on hover; a press brings it back to its original size and **it stays at its original size afterwards** while the customer types. On a phone a press shrinks it 10 %; on release it becomes writable (focus) and springs back to its original size.

| Part | Trigger | Duration | Values (t ms → scale) | Easing |
|---|---|---|---|---|
| Hover in | pointer enters (mouse / pen), field not focused | 240 ms | 0 → 1.000 · 60 → 1.058 · 120 → 1.087 · 180 → 1.098 · 240 → 1.100 | `cubic-bezier(0.33, 1, 0.68, 1)` |
| Hover out | pointer leaves, field not focused | 200 ms | 0 → 1.100 · 50 → 1.042 · 100 → 1.013 · 150 → 1.002 · 200 → 1.000 | same |
| Desktop press | `pointerdown` (mouse / pen) | 120 ms | 0 → 1.10 · 40 → 1.03 · 80 → 1.004 · 120 → 1.00 | same |
| Desktop release | `pointerup` inside → focus | — | stays **1.00** while focused (no bounce) | — |
| Phone press | `pointerdown` (touch) | 120 ms | 0 → 1.00 · 40 → 0.93 · 80 → 0.904 · 120 → 0.90 | same |
| Phone release | `pointerup` inside → focus (keyboard opens) | 340 ms | 0 → 0.900 · 80 → 0.985 · 150 → 1.020 · 220 → 0.995 · 290 → 1.002 · 340 → 1.000 | sampled spring, linear between rows |
| Cancel | released outside, finger moved > 10 px, scroll | 200 ms | current → 1.00 (desktop: → 1.10 if the pointer is back on it); no focus | `cubic-bezier(0.33, 1, 0.68, 1)` |
| While focused | typing, hovering | — | 1.00, no hover growth | — |
| Blur | focus leaves | — | no motion (already 1.00); if the pointer is on the field, hover in starts | — |
| Keyboard focus (Tab) | `:focus-visible` | — | no scaling; the focus ring shows | — |

- **Element:** the whole field (border, icon, text, ×) scales as one: `transform: scale(s)`, `transform-origin: 50% 50%`; only `transform` animates (§1.3). Nothing around it moves; while above 1.00 it sits above its neighbours (`position: relative; z-index: 1`); parents must not clip it. Large textareas scale the same way.
- **Focus:** happens the browser’s own way on release (no `preventDefault`); released outside the field, nothing is focused (Cancel). Typing, the caret and the × work at once — no input lock (exception to §1.5).
- **Border by state (as the variants):** Default and Hover ink 20 %, Pressed and Focused 40 %; colour changes are instant. **Focus ring:** keyboard focus only (`:focus-visible`), 2 px at 3 px offset.
- **Reduced motion:** no scaling; focus shows by the border and the focus ring (§1.4).
- **Acceptance:** desktop — hovering a field grows it to 110 % and back; pressing it brings it to 100 %, the caret appears on release and the field stays 100 % while typing; phone — a press shrinks it to 90 %, on release the keyboard opens and the field springs back to 100 %; nothing around it moves; the same on every field of the public site, including fields of content added later from the admin.

---

## 7D. ANIM-06 — Footer mascot: peek in when the footer comes into view

- **Status:** designed
- **Figma:** section `V2 · Animáció — sütiszörny a láblécben (ANIM-06)` (node `1703:13165`): rows `Lábléc szörny mobil 1–6` (`1703:13167`, `13255`, `13343`, `13431`, `13519`, `13607`), `Lábléc szörny tablet 1–6` (`1703:13701`, `13787`, `13873`, `13959`, `14045`, `14131`), `Lábléc szörny desktop 1–6` (`1703:14223`, `14311`, `14399`, `14487`, `14575`, `14663`); prototype flows “Lábléc szörny — mobil / tablet / desktop”. Footer masters: phone `1461:9223` (402 × 1132), tablet `1551:10408` (1024 × 560.4), desktop `1411:9627` (1280 × 594).
- **Owner request (2026-10-21):** the footer mascot moves like the header’s (ANIM-04): when the scroll reaches the point where the whole mascot is on screen — a little before the very bottom of the page — the little cookie monster peeks in. **Once per page load** (Decided 2026-10-21): scrolling away and back does not replay it until a new page loads.
- **Element:** the mascot in the footer’s bottom-right corner — an instance of `V2 · Logo mark`, large, tilted to the left and cropped by the footer’s right and bottom edges (the footer has `overflow: hidden`, exactly as drawn). **Its final state is the owner’s footer design and must not change.** Box (unrotated, from the footer’s top-left; overhang = how far the box sticks out past the footer’s right and bottom edges):

| Footer | Box | left, top | right, bottom overhang | Resting rotation (CSS) |
|---|---|---|---|---|
| Phone | 312.55 × 336.60 | 242.68, 855.79 | 153.24, 60.39 | `rotate(-30deg)` |
| Tablet | 270.98 × 291.82 | 847.32, 315.27 | 94.30, 46.69 | `rotate(-17.55deg)` |
| Desktop | 338.72 × 364.77 | 1059.15, 287.59 | 117.87, 58.36 | `rotate(-17.55deg)` |

- **Transform origin:** `50% 100%` (bottom centre). Figma shows these rotations as positive (+30°, +17.55°); in CSS the lean to the left is negative. The footer grows with its content, so position the box from the footer’s **bottom-right** (right and bottom = minus the overhangs above), not from the top.
- **Trigger:** an `IntersectionObserver` on a static, invisible sentinel covering the mascot’s visible area (the part of its final box inside the footer), `threshold: 0.8`. When it first reports ≥ 80 %, add the class that plays the animation and disconnect. If the page loads with the footer already in view (short pages), it plays right after the first paint. Watch the sentinel, never the moving mascot.
- **Duration:** 150 ms delay + 450 ms motion = 600 ms.
- **What happens:** before the trigger the mascot is hidden outside the footer’s bottom-right corner. It rises diagonally into its place along the line it leans, tilted 10° more than at rest and leaning into the move, and settles into its designed tilt as it arrives. No pause, no overshoot — the same character as ANIM-04.
- **Interpolation:** one ease-out curve over the 450 ms, `cubic-bezier(0.5, 1, 0.89, 1)` (as ANIM-04); the table is that curve sampled every 90 ms (the Figma frames). `translate` is relative to the final position (x right, y down, px).

| t (ms) | progress | phone translate (x, y) | phone rotate | tablet translate (x, y) | desktop translate (x, y) | tablet / desktop rotate |
|---|---|---|---|---|---|---|
| 0 | 0 | 150.5, 260.7 | −40° | 83.8, 265.1 | 104.6, 330.9 | −27.55° |
| 90 | 0.36 | 96.32, 166.85 | −36.4° | 53.63, 169.66 | 66.94, 211.78 | −23.95° |
| 180 | 0.64 | 54.18, 93.85 | −33.6° | 30.17, 95.44 | 37.66, 119.12 | −21.15° |
| 270 | 0.84 | 24.08, 41.71 | −31.6° | 13.41, 42.42 | 16.74, 52.94 | −19.15° |
| 360 | 0.96 | 6.02, 10.43 | −30.4° | 3.35, 10.6 | 4.18, 13.24 | −17.95° |
| 450 | 1 | 0, 0 | −30° | 0, 0 | 0, 0 | −17.55° |

- **Build:** the hidden start state comes only from a class the script adds (`html.js .footer-mascot:not(.is-in)`), so without JavaScript, without `IntersectionObserver`, or if anything fails, the mascot simply sits in place. CSS: `.footer-mascot.is-in { animation: bbl-footer-mascot-in 450ms cubic-bezier(0.5, 1, 0.89, 1) 150ms both; }` with the 0 % keyframe = the t 0 row and 100 % = rest (one curve, so two keyframes suffice; the table is for checking). Breakpoints as `RESPONSIVE.md`: below 768 px phone values, 768–1119 px tablet values, from 1120 px desktop values.
- **Reduced motion:** no animation — the mascot is simply in place and never hidden.
- **Interaction:** no input lock; the mascot is decorative (`aria-hidden="true"`), not a link; the Cookie preferences button beside it stays usable during the motion. The sticky header (`SITE-FLOWS.md` §3.1) does not affect it.
- **Acceptance:** scrolling down, the mascot is not visible until its corner is about 80 % on screen; then it rises in from the bottom-right corner, tilted a little more, and settles exactly into the designed position and crop in 0.6 s; scrolling up and down again does not replay it; a new page replays it; with reduced motion or without JavaScript it is simply there.

---

## 7E. ANIM-07 — Pressable components: hover grow, press, release (all breakpoints)

- **Status:** designed
- **Figma:** section `V2 · Animáció lépésekben — hover, lenyomás, desktop menü aláhúzás (ANIM-07, ANIM-08)` (`1722:12049`): `Hover — desktop menü` (hover in `1722:12054` … `1722:12402`, hover out `1722:12491` … `1722:12839`), `Hover — aktív pont` (`1722:12928` … `1722:13276`), `Gomb — desktop` (20 frames `1724:12428` … `1724:12637`: hover in, press, release, hover out), `Gomb — telefon` (press `1724:12650` … `1724:12677`, release `1724:12686` … `1724:12731`), `Gomb — telefon megszakítás` (`1724:12742` … `1724:12778`). Each row has its prototype flow of the same name.
- **Owner request (2026-10-21):** every pressable component grows 10 % on hover (desktop navigation items **15 %**, owner 2026-10-21), animated, and shrinks back when the pointer leaves; on a desktop a press returns it to its original size while held (hover always comes first, because the pointer reaches the component before it can press it); on a phone, where there is no hover, a press shrinks it 10 % while held; the action happens only on release. Tablet: §1.9.
- **Applies to — every element of these kinds on the public site (Decided 2026-10-21; not the admin, not e-mails):**
  - buttons of every style (solid, outline, text buttons such as “Show the next N”, Apple Pay / Google Pay / Pay, cookie bar and cookie panel buttons, **Cookie preferences**, **Keep holding**, dialog and sheet buttons, × close buttons);
  - standalone links: footer links and **Find my order →**, “→” links (“See full allergen information →”, “Or start a bespoke enquiry →”, “Need to cancel instead? →”), “←” back links, **Change** / **Edit** / **Remove** links, e-mail and phone links shown on their own;
  - **selection controls: the cake-page size options, cake option pills (§5.8 of SITE-FLOWS), catalogue filter pills, delivery / collection choice cards, delivery window pills, available calendar days and the month ‹ › buttons, check boxes and radio rows (box and label together), toggles** — the selected state keeps its colour, hover and press still apply;
  - cards and images that are links or open something: gallery tiles, thumbnails; on cake cards (Home row and catalogue) the **View** button and the **corner button** (ANIM-11) — since 2026-10-22 the card as a whole is not a link;
  - slider cards that are not links — the testimonial cards and the phone About “What do we offer?” cards: hover / press as above; on release they only scroll themselves to the centre of their row (ANIM-10);
  - the slider indicator dashes (ANIM-10);
  - navigation: desktop nav items (text only, the underline stays; click → ANIM-08), the header and footer logo links, the “menu” button, mobile menu items and the menu’s social links, the stepper’s clickable done steps;
  - carousel arrows and dashes, gallery dots, the lightbox ‹ › and ×, the video play button;
  - writable fields (the catalogue search and every other text field) follow ANIM-05 (§7C);
  - **row-shaped pressables** (a whole full-width row is the hit area: FAQ question rows, the phone change-page rows): only the row’s **content** (text and its icon or chevron) grows and reacts to the press; the row box does not scale.

  **Not:** text links inside running sentences (colour change only, Decided 2026-10-21), disabled or busy controls (fully booked or too-soon days, “Taking payment”, locked toggles), plain text inputs other than the search field, decorative images (the mascots, the Home “Special idea?” squares), the admin, e-mails.
- **Marked in Figma:** every pressable is marked with a Dev Mode annotation in the category **“Pressable · ANIM-07”** (on the component masters and on loose layers — over 700 marks on the pages, plus the copies inside the storyboards; row-shaped ones say so in the note); a second category **“Text link · colour only”** is reserved for inline sentence links (none drawn yet). Legend card `1733:12590` next to the build-spec board. When an element is not marked but is one of the kinds above, the rule still applies. In code, give every pressable `data-pressable` (row-shaped: `data-pressable="row"`, inline links none) so one shared helper handles them all.
- **No colour or shadow change on hover** (Decided 2026-10-21; replaces UI-01 / UI-02). Selected / active states keep their own colours — those are states, not hover.
- **Element:** the component scales as one: `transform: scale(s)`, `transform-origin: 50% 50%`. Desktop navigation items: only the **text** scales (a wrapper around the label), the active underline is a sibling and does not change. Nothing around it moves (transform only). A grown component may overlap its neighbours: give it `position: relative; z-index: 1` while it is above 1.00. Containers that clip (carousels, scroll rows, the thumbnail strip) get inner padding of at least 5 % of the item size so a grown item is not cut off.

| Part | Trigger | Duration | Values (t ms → scale) | Easing |
|---|---|---|---|---|
| Desktop nav item (15 %) | hover / press / release of a desktop navigation item’s text | 240 / 200 / 120 / 340 ms | in: 0 → 1.000 · 60 → 1.087 · 120 → 1.131 · 180 → 1.148 · 240 → 1.150; out: 0 → 1.150 · 50 → 1.063 · 100 → 1.019 · 150 → 1.002 · 200 → 1.000; press: 0 → 1.15 · 40 → 1.045 · 80 → 1.006 · 120 → 1.00; release: 0 → 1.000 · 80 → 1.127 · 150 → 1.172 · 220 → 1.144 · 290 → 1.153 · 340 → 1.150 | as the rows below (Figma rows `Hover — desktop menü`, `Hover — aktív pont`, `Desktop menü — lenyomás` `1736:12592` … `1736:12961`) |
| Hover in | pointer enters (mouse / pen, `(hover: hover) and (pointer: fine)`) or keyboard focus | 240 ms | 0 → 1.000 · 60 → 1.058 · 120 → 1.087 · 180 → 1.098 · 240 → 1.100 | `cubic-bezier(0.33, 1, 0.68, 1)` |
| Hover out | pointer leaves / focus leaves | 200 ms | 0 → 1.100 · 50 → 1.042 · 100 → 1.013 · 150 → 1.002 · 200 → 1.000 | `cubic-bezier(0.33, 1, 0.68, 1)` |
| Desktop press | `pointerdown` (mouse / pen), or Space / Enter key down on a focused control | 120 ms | 0 → 1.10 · 40 → 1.03 · 80 → 1.004 · 120 → 1.00 (held) | `cubic-bezier(0.33, 1, 0.68, 1)` |
| Desktop release | `pointerup` inside (the click fires) / key up | 340 ms | 0 → 1.000 · 80 → 1.085 · 150 → 1.115 · 220 → 1.096 · 290 → 1.102 · 340 → 1.100 | sampled spring, linear between rows |
| Phone press | `pointerdown` (touch) | 120 ms | 0 → 1.00 · 40 → 0.93 · 80 → 0.904 · 120 → 0.90 (held) | `cubic-bezier(0.33, 1, 0.68, 1)` |
| Phone release | `pointerup` inside (the tap fires) | 340 ms | 0 → 0.900 · 80 → 0.985 · 150 → 1.020 · 220 → 0.995 · 290 → 1.002 · 340 → 1.000 | sampled spring, linear between rows |
| Cancel | released outside, the finger moved more than 10 px, the page scrolled (`pointercancel`) | 200 ms | current → 1.00 (desktop: → 1.10 if the pointer is back on it) | `cubic-bezier(0.33, 1, 0.68, 1)` |

- **Release = the action:** links and buttons act on the normal `click`, which browsers fire on release inside the element — never on `pointerdown`. A release outside does nothing (Cancel). The release animation starts at the same moment as the action; navigation is not delayed for it (on a full page load it simply is not seen).
- **Keyboard:** focus by Tab = hover in; blur = hover out; Space / Enter key down = press, key up = release. Keep the browser’s own activation (Enter on a link activates on key down — do not change that; only the motion follows the keys).
- **Interruptions:** every new part starts from the current scale (read it from the running animation) and cancels the previous one, so nothing jumps. Hover out during the release spring: continue from the current value to 1.00.
- **Reduced motion:** no scaling at all; hover and press show no motion (the focus ring stays).
- **Build:** one shared helper (e.g. a `usePressable` hook or a delegated listener on `[data-pressable]`) using the Web Animations API with the rows above; hover in / out may be CSS transitions under `@media (hover: hover) and (pointer: fine)`. `will-change: transform` only while animating. `touch-action: manipulation` on pressables so a tap fires without delay.
- **Content added from the admin (Decided 2026-10-21):** a new cake, its sizes and options, gallery photos, FAQ questions, the synced Google reviews, hero slides, page photos, legal texts — and anything the admin lets Linda add later — are rendered with the same shared components (`data-pressable`, the field component), so every element follows ANIM-07 / ANIM-05 without extra work. Links inside admin-written text (legal pages, FAQ answers) are inline sentence links: colour only.
- **Acceptance:** with a mouse, every pressable grows smoothly to 110 % on hover and shrinks back on leave, drops to 100 % while the button is held and springs back to 110 % on release, and acts only on release; on a phone, a press shrinks it to 90 %, release springs back with a tiny overshoot and acts; starting a scroll on a button never triggers it; text links inside sentences only change colour; nothing on the page moves around a growing component; nothing in the admin scales.

## 7F. ANIM-08 — Desktop navigation: the underline slides to the clicked item

- **Status:** designed
- **Figma:** section `1722:12049`: rows `Aláhúzás — jobbra` (Cakes → About Linda, `1723:12232`, `12319`, `12406`, `12493`, `12580`, `12667`, `12754`, `12841`) and `Aláhúzás — balra` (About Linda → Cakes, `1723:12930`, `13017`, `13104`, `13191`, `13278`, `13365`, `13452`, `13539`); flows “Aláhúzás — jobbra / balra”.
- **Owner request (2026-10-21):** when a new menu item is clicked, the underline slides quickly to it, a little fluid — it stretches slightly while moving — and arrives with physics, not a dead stop.
- **Trigger:** release on a non-active desktop navigation item (≥ 1120 px). The press before it is ANIM-07.
- **Duration:** 420 ms.
- **What happens:** the edge on the side of the movement leads and the other edge follows a little behind, so the line stretches (about 2.5 × its short width at most) in the middle of the move; the leading edge overshoots the target end by a few pixels, the trailing edge catches up and overshoots a little too, and both settle — a small squash and stretch, like a drop of liquid. The height (2 px), radius and glow do not change. The clicked item’s text gets SemiBold and the old item’s text Medium at **210 ms** (the item boxes already have the width of their widest state, §8, so nothing shifts). The clicked text plays the ANIM-07 release (back to 1.10 while the pointer stays on it).
- **Interpolation:** sampled, linear between rows. The leading edge follows `lead`, the trailing edge `trail`, both as a fraction of the distance between the old and the new edge positions:

| t (ms) | lead | trail | example right: left, right edge (px) | example left: left, right edge (px) |
|---|---|---|---|---|
| 0 | 0 | 0 | 776, 816 | 1017, 1098 |
| 60 | 0.26 | 0.16 | 814.6, 889.3 | 954.3, 1052.9 |
| 120 | 0.64 | 0.48 | 891.7, 996.5 | 862.8, 962.6 |
| 180 | 0.93 | 0.82 | 973.6, 1078.3 | 792.9, 866.8 |
| 240 | 1.05 | 1.03 | 1024.2, 1112.1 | 764.0, 807.5 |
| 300 | 1.01 | 1.025 | 1023.0, 1100.8 | 773.6, 809.0 |
| 360 | 0.996 | 0.998 | 1016.5, 1096.9 | 777.0, 816.6 |
| 420 | 1 | 1 | 1017, 1098 | 776, 816 |

  Moving right (new item to the right): right edge = old right + (new right − old right) × lead, left edge = old left + (new left − old left) × trail. Moving left: the left edge leads and the right edge trails (mirror). Examples: Cakes (776–816) → About Linda (1017–1098) and back, x in the 1280 px header. Any pair of items works the same way; the edges come from the rendered item boxes.
- **Handing over to the new page:** path A (client-side routing, the default, §11 question 1): the header persists; on release start the navigation and the slide together; the new page renders under the sliding underline. Path B (full page loads): on release store `sessionStorage["bbl:nav-slide"] = { "from": "<old item>", "to": "<new item>", "t": Date.now() }` and navigate; the new page’s inline head script reads and deletes it, draws the underline at the old item on the first paint and plays the slide (ignore it if older than 5000 ms or `to` is not this page’s item). Back / forward: no slide.
- **No active item before** (legal pages, 404, token pages, §3.3): the underline draws at the new item from its left edge, 2 px → full width in 200 ms ease-out (as ANIM-03’s draw), at the same time as the navigation.
- **The current item:** clicking the item of the page you are on reloads that page (fresh, scrolled to the top, filters and search cleared) — no slide, only the ANIM-07 press / release (Decided 2026-10-21). Any other item works the same way from any page: the edges always come from the rendered boxes of the old and the new item.
- **Interruptions:** a second click during the slide starts a new slide from the current edges. A modifier or middle click opens a new tab without any slide.
- **Reduced motion:** the underline jumps to the new item.
- **Acceptance:** clicking another item, the underline leaves at once, stretches a little on the way, overshoots slightly and settles under the new item in about 0.4 s; it is the same height and glow throughout; the weight switch causes no jump; the same in both directions; with reduced motion it simply appears under the new item.

## 7G. ANIM-09 — Drop-down rows: roll open and closed, the arrow flips

- **Status:** designed
- **Figma:** section `V2 · Animáció lépésekben — lenyíló sorok (ANIM-09)` (`1745:12629`): row A desktop open (`1745:12634`, `12670`, `12706`, `12742`, `12778`, `12814`, `12850`, flow “Lenyíló — nyitás”), row B desktop close (`1745:12888` … `1745:13104`, flow “Lenyíló — zárás”), row C phone open and close (`1746:12632` … `12848`, `1746:12884` … `13100`, flow “Lenyíló — telefon”), row D one opens while the open one closes (`1746:13138` … `13354`, flow “Lenyíló — váltás”).
- **Owner request (2026-10-21):** wherever pressing a row shows information in a drop-down, the drop-down rolls out and back smoothly, and the arrow that shows open / closed turns with the same animation as the phone header “menu” button’s arrow (§4.4).
- **Applies to:** every drop-down / accordion row on the public site — today the FAQ question rows (desktop, tablet, phone; Figma: the only drop-downs; the legal pages have none) — and any drop-down added later, including ones created from admin content (§1.8).
- **Trigger:** release on the row (ANIM-07 row-shaped press first: only the text and the arrow react). Opening a FAQ row closes the open one at the same moment (both run together, row D).
- **Duration:** 360 ms to open; closing is the exact reverse, 360 ms.
- **Panel:** the answer is revealed by the growing clip from the top — it “rolls out”; no fade, no slide of the text itself. Content below is pushed down smoothly with it; nothing overlaps. Build: the panel wrapper animates `grid-template-rows: 0fr → 1fr` (inner `overflow: hidden`) with `cubic-bezier(0.65, 0, 0.35, 1)`, 360 ms; with `<details name="faq">` keep the `open` attribute during the closing animation and remove it at the end (or use `::details-content` with `interpolate-size: allow-keywords` where supported). Desktop and tablet: the answer opens in the right column level with its question (`SITE-FLOWS.md` §4.4); phone: under the question.
- **Arrow:** the same flip as the menu arrow — a 3D rotation **without perspective**, here around the horizontal axis (`transform: rotateX(θ)`, `transform-origin: center`), so the chevron squashes vertically, is edge-on at 90° and is mirrored after it: closed points down, open points up. The angle is linear in time (as the menu arrow).

| t (ms) | panel open (0 → 1) | arrow `rotateX` | Figma (desktop open) |
|---|---|---|---|
| 0 | 0 | 0° (points down) | `1745:12634` |
| 60 | 0.027 | 30° | `1745:12670` |
| 120 | 0.149 | 60° | `1745:12706` |
| 180 | 0.500 | 90° (edge-on, thinnest) | `1745:12742` |
| 240 | 0.851 | 120° | `1745:12778` |
| 300 | 0.973 | 150° | `1745:12814` |
| 360 | 1 | 180° (points up) | `1745:12850` |

  Closing: the same rows from 360 back to 0 (panel 1 → 0, arrow 180° → 0°).
- **Interruptions:** pressing the row again mid-way reverses from the current point (no jump). The answer’s content is in the DOM from the start, so search engines and “find in page” see it; a `#question` link opens and scrolls to it without animation.
- **Reduced motion:** instant open / close; the arrow simply shows its end state.
- **Acceptance:** the answer rolls out smoothly in about a third of a second and rolls back the same way; the arrow turns over like the phone menu arrow, thinnest halfway, pointing up when open; opening another question closes the first at the same time; nothing overlaps or jumps.

## 7H. ANIM-10 — Slider position indicator (all sliders) and cards that centre on click

- **Status:** designed
- **Owner request (2026-10-22):** every slider uses the same position indicator — the dashes under the Home hero. At most 5 dashes show at a time (fewer when there are fewer items). The active dash is longer and darker; the dashes next to it are a little larger than the rest. Tapping a dash jumps to its item. With more than 5 items the visible window does not move until the 3rd item; after that each step moves the window so the active dash stays 3rd; when the items run out, the active dash moves on to 4th and 5th. Every change is a smooth size and colour transition. Owner decisions on where: the hero, the testimonials (phone, tablet **and** desktop), the phone About “What do we offer?” cards, the phone cake-page media (replacing the dots; desktop and tablet keep the thumbnail strip), the gallery lightbox (replacing the “3 / 30” counter). **Not** the Home cake carousel (left without on purpose). Same size on every breakpoint (tablet not scaled).
- **Figma:** components `V2 · Slider dash` (`1759:12635`: State Active / Neighbour / Rest × Surface Light / Dark) and `V2 · Slider indicator` (`1759:12772`: Surface × Count 2–5 × Active 1…Count, horizontal auto-layout, gap 6). Placed: hero desktop `1760:12629`, tablet `1760:12633`, phone `1760:12637`; testimonials phone `1760:12641`, tablet `1760:12667`, desktop `1760:12672`; About phone `1760:12645`; cake media phone `1760:12649`; lightbox desktop `1760:12655`, phone `1760:12661` (Dark). Storyboard `V2 · Animáció lépésekben — slider jelző (ANIM-10)` (`1762:12666`): rows A 1→2, B 2→3, C 3→4 (window shifts), D 4→5, E 6→7 and 7→8 (end), F back 4→3, G jump 1→6, H three items, I dark 14→15 of 30, J phone card tap → centre, K desktop card click → centre; flows “Slider jelző — előre / vissza / ugrás / 3 elem / sötét”, “Értékelés középre — telefon / desktop”.

| Dash state | Width × height | Light surface | Dark surface (lightbox) |
|---|---|---|---|
| Active | 37 × 5 | `colour/text-muted` #6F6579 | `colour/paper` #F7F4FA |
| Neighbour (± 1 from the active) | 25 × 5 | #847C90 | #F7F4FA at 70 % |
| Rest | 19 × 5 | #8F889D (was #9A93A8; darkened 2026-10-23 for the 3 : 1 non-text contrast) | #F7F4FA at 45 % |
| Hidden (outside the window) | 0 × 5, opacity 0, its gap collapses | — | — |

  Round ends (radius 2.5), gap 6 between visible dashes. Each dash is a button with a 44 × 44 hit area (the visual stays small), `aria-label="Slide 3 of 8"` (testimonials: “Testimonial 3 of 5”, lightbox: “Photo 3 of 30”, cake media: “Photo or video 3 of 8”), `aria-current="true"` on the active one; hidden dashes are `inert`. Arrow keys move between dashes (one tab stop for the row).
- **Window rule:** N items, active index a (from 0): W = min(N, 5); first visible s = clamp(a − 2, 0, N − W); dashes s … s + W − 1 are visible. So for N = 8: a 0–2 → items 1–5 (active 1st, 2nd, 3rd); a 3 → items 2–6; a 4 → 3–7; a 5–7 → 4–8 (active 3rd, 4th, 5th). With N ≤ 5 nothing is hidden.
- **Transition (every change — swipe, arrow, autoplay, dash press, card click, keyboard):** 360 ms, `cubic-bezier(0.65, 0, 0.35, 1)`. Every dash animates **width, colour and opacity** from its old state to its new one at the same time; a dash leaving the window shrinks to 0 and fades out while a new one grows from 0 and fades in at the other end; the hidden dash’s gap collapses with it. No `translate` is needed: the row is laid out from the dash widths, so the window shift is the widths changing. Sampled for the storyboard: t 0 → 0, 90 → 0.071, 180 → 0.5, 270 → 0.929, 360 → 1 (value = old + (new − old) × progress). A jump over several items is one transition.
- **Alignment:** the hero keeps its left edge (left-aligned under the card, 8 px below on desktop); everywhere else the row is centred under its slider (testimonials 39 px below the cards, lightbox 24 px below the photo). The row width changes slightly with the states (e.g. 143 → 149 px); the fixed edge (left or centre) never moves.
- **What counts as the active item:** hero and lightbox — the shown slide / photo; swipe rows (testimonials, About cards, cake media) — the item nearest the row’s centre after scrolling settles (`scrollsnapchange` where supported, otherwise a scroll-end listener); before any interaction a row is at its drawn start position with the first dash active.
- **Pressing a dash:** ANIM-07 press / release on the dash; on release the slider goes to that item (hero: shows it and restarts the timer; swipe rows: smooth-scroll it to the centre, 360 ms, same easing; lightbox: shows that photo) and the indicator transitions at the same time.
- **Testimonials = all Google reviews (Decided 2026-10-22, `SITE-FLOWS.md` §4.1):** the row can hold hundreds of cards, loaded 6 at a time and with only about one screen of cards in the page. The indicator works on the total count from the start (its window never needs more than the 5 visible dashes); a dash press or card click never jumps further than ±2, so it never waits for far data. A card whose data has not arrived is an empty card shape of the same size; when its data comes it fades in (opacity 0 → 1, 200 ms, `cubic-bezier(0.33, 1, 0.68, 1)`; reduced motion: no fade) — the card never changes size, nothing moves. Scroll snapping, ANIM-07 and the centre-on-click work the same on real and re-created cards.
- **Cards that centre on click (Decided 2026-10-22):** testimonial cards and the phone About cards are pressable (ANIM-07: hover +10 %, press, release). On release the only action is to scroll that card to the centre of its row (360 ms, `cubic-bezier(0.65, 0, 0.35, 1)`), with the indicator following. Every card can reach the centre: the row has side padding of (row width − card width) / 2. On desktop, after the row moves, the pointer may no longer be over the card, so it simply plays the ANIM-07 hover-out.
- **Hero:** with only the designed hero (launch) there is no indicator (`SITE-FLOWS.md` §4.1); with admin slides it follows this rule and the autoplay (UI-06) moves it.
- **Reduced motion:** the dashes change state instantly; carousels jump without smooth scrolling.
- **Acceptance:** at most five dashes; the active one longest and darkest, its neighbours a little longer; on an 8-item slider the window stays until item 3, then shifts with every step keeping the active dash in the middle, and at the end the active dash moves to 4th and 5th; every change is a smooth 0.36 s change of length and colour, with dashes growing in and fading out at the ends; tapping a dash goes to its item; tapping a testimonial or About card centres it and the dashes follow; the same indicator on hero, testimonials, About, phone cake media and the lightbox, same size on every breakpoint.

## 7I. ANIM-11 — Cake card: open into the zoomed video, close

- **Status:** designed
- **Owner request (2026-10-22):** the card picture is the first frame of a separate **card video** (a cake turning on a turntable, full side view, 5 s per turn, seamless loop). The small button in the picture’s corner opens the card into the **open** version the owner designed: the picture grows, zooms in on the cake and the video plays; closed, the picture is zoomed out and still. The video starts only when the card is fully open, cannot be paused and loops without a gap; closing is the same in reverse. Texts that shrink, grow, appear or disappear do so smoothly. The corner arrows animate like the earlier arrow animations, after their hover and press. Only one card is open at a time (Decided 2026-10-22). The big ‹ › arrows of the drawn open frames are removed (Decided 2026-10-22).
- **Figma:** component sets with `State = Closed | Open` — desktop `V2 · Card / Cake — pc v3` `1776:12902` (Open `1776:12891`, from the owner’s `1391:10370`), tablet `1776:12914` (Open `1776:12903`), phone catalogue `1777:12902` (Open `1777:12891`), phone Home card `V2 · Card / Cake — mobil Home v3` `1777:12926` (Open `1777:12915`, from the owner’s `1386:10114`). Every variant uses the layer names Picture, Title, Description, Tiers, Price, Button, Corner icon (a 44 × 44 frame) › Chevrons. Storyboard `V2 · Animáció lépésekben — tortakártya nyitás (ANIM-11)` (`1779:12951`): A desktop open, B desktop close, C phone open, D phone close, E one card closes while another opens, F the icon close-up; flows “Tortakártya — nyitás / zárás (desktop)”, “— nyitás / zárás (telefon)”, “— váltás”. Video layout board `1783:12951`; video rules: `claude/torta-video-szabalyrendszer.md`.
- **The card stays the same size** and stays in its grid / carousel slot; nothing around it moves. Price and the **View** button do not change (View → Customise a design, ANIM-07).
- **Trigger:** release on the corner button (hover +10 % and press first, ANIM-07; hit area 44 × 44; `aria-expanded`, accessible name “Show the {cake} video” / “Close the {cake} video”). Release on an open card’s button closes it. Opening a card while another is open closes the other at the same moment (row E).

**Open** (0–500 ms — slowed from 360 ms, Decided 2026-10-22; picture and positions on `cubic-bezier(0.65, 0, 0.35, 1)`, sampled progress t 0 / 125 / 250 / 375 / 500 → p 0 / 0.071 / 0.5 / 0.929 / 1). **Text rule (owner, 2026-10-22):** letters grow and shrink slowly and smoothly; text that disappears or appears does so with a small fade and shrinks / grows a little:

| Element | Closed → open | Timing |
|---|---|---|
| Picture box | grows downward: desktop 355 × 221 → 355 × 294; tablet 284 × 177 → 284 × 235.2; phone Home 273.9 × 273 → 273.9 × 372.9; phone catalogue 196 × 195 → 196 × 276 | 0–500, eased |
| Picture content | zooms from the **closed crop** to the **open crop** of the square video (table below) — `object-view-box` / a transformed inner element, never a re-layout of the video | 0–500, eased, together with the box |
| Title | scales and moves into the bottom row: desktop 27 px at (9, 225) → 15 px at (17.7, 314); tablet → 14 px at (14.2, 259.4); phone Home → 13 px at (10, 372.9); phone catalogue → 11 px at (10, 276), on its own line above the price. Animate with `transform` (translate + scale from the start box to the end box), swap to the real end size at the end. The **position** follows the picture (p); the **size** follows a gentler curve, `cubic-bezier(0.37, 0, 0.63, 1)` (sampled 0 / 0.146 / 0.5 / 0.854 / 1 — desktop 27 → 25.3 → 21 → 16.8 → 15 px), so the letters grow and shrink slowly, without a jump in the middle | 0–500: position eased (p), size on the gentle curve |
| Description, tiers line | small fade and a slight shrink: opacity 1 → 0.5 → 0 and scale 1 → 0.96 → 0.92 from their top-left corner (`transform`, so the line breaks stay), both on `cubic-bezier(0.37, 0, 0.63, 1)`; gone before the title moves into their place | 0–250 |
| Corner icon chevrons | each chevron flips like the phone menu arrow (§4.4): a 3D rotation without perspective about the axis perpendicular to its own pointing direction (wrap each chevron in an element rotated to its direction, then `rotateY(θ)` inside) — it squashes along its pointing direction, is edge-on at 90° and mirrored after; outward → inward. θ linear in time: 0 / 45 / 90 / 135 / 180° at 0 / 125 / 250 / 375 / 500 ms. Each chevron turns about its own centre | 0–500, linear |
| Video | at 500 ms, when fully open: `play()` from frame 0, muted, `playsinline`, `loop`, no controls; if it is not loaded yet, the still picture stays until it can play through, then it starts | from 500 |

**Close** (the exact reverse): t 0 the video stops and its current frame cross-fades to the still first frame in 120 ms; 120–620 ms the open sequence runs backwards (picture box and crop back, title back to its place and size on the gentle curve, description and tiers fade in softly and grow back from 0.92 to 1 during the last 250 ms, chevrons flip back to outward).

**Crops of the square card video** (normalised x0, y0 – x1, y1; full rules and the AI prompt in `claude/torta-video-szabalyrendszer.md`):

| Card | Closed (aspect) | Open (aspect) |
|---|---|---|
| Desktop and tablet | 0, 0.3783 – 1, 1 (1.608 : 1) | 0.1136, 0.36 – 0.8864, 1 (1.208 : 1) |
| Phone Home | 0, 0 – 1, 1 (1 : 1) | 0.18, 0.1288 – 0.82, 1 (0.735 : 1) |
| Phone catalogue | 0, 0 – 1, 1 (1 : 1) | 0.18, 0.0988 – 0.82, 1 (0.710 : 1) |

  **The cake always sits at the bottom of the picture** (Decided 2026-10-22, phone too): the turntable stands at the bottom of the video and every crop is anchored to the video’s bottom edge (`object-position: 50% 100%` / transform origin at the bottom centre), horizontally centred. Rule for any other size: closed = the largest bottom-anchored crop of the picture’s aspect; open = width max(0.64, 0.64 × r), height = width / r, bottom edge y = 1 (r = open aspect, w / h, 0.64 ≤ r ≤ 1.56). The zoom between them therefore grows upward and inward from the bottom, and the turntable stays on the picture’s bottom edge the whole time.
- **Video playback:** never paused by the user (the owner’s decision); closing the card is the way to stop it (this also covers WCAG 2.2.2). It pauses automatically while the card is off screen or the tab is hidden and resumes where it was. Load the video only on the first open (`preload="none"`, poster = the still first frame); 1080 × 1080 on phones and tablets, 1440 × 1440 on desktop (server renditions). A seamless loop needs a file whose first frame is a key frame and has no start delay (no edit list); test the 149 → 0 jump.
- **Without a card video** the card shows the main photo and no corner button.
- **Reduced motion:** the card opens and closes instantly, and the video does not autoplay: the open card shows the still first frame (the owner may revisit this).
- **Acceptance:** the corner button grows on hover and reacts to the press; on release the picture grows and zooms in smoothly while the title shrinks into the bottom row and the description fades; the chevrons flip inward like the menu arrow; only then does the cake start turning, without a visible restart at the loop; closing stops the video, returns it to the still first frame and reverses everything; opening another card closes the first; the card never changes size; the “Customise a design” page does not show this video.

## 7J. ANIM-12–25 — Surface motion (Decided 2026-10-23)

- **Owner request (2026-10-23):** everything that still appeared or disappeared abruptly gets a motion. Owner decisions (quiz): overlays move **by type** (a dialog fades in and grows 0.96 → 1; a bottom sheet and the cookie bar slide up; the lightbox zooms out of its tile; the scrim fades); the sticky header gets a **faint shadow** when scrolled, no size change; on **Order confirmed** the cookie monster **peeks in once** and stays. The admin hero slides stay with the owner (SITE-FLOWS §14.2).
- **Figma:** section `V2 · Animáció lépésekben — felületi mozgások (ANIM-12–25)` (`1804:13056`), one row per motion, every step a frame with its `t = … ms` label, Smart Animate LINEAR between steps, a named flow per row. The Order confirmed resting design: desktop `643:3478` (mascot `1803:13026` in the clip `1803:13059`), tablet `1558:10938` (`1803:13037`), phone `836:6509` (`1803:13048`; 56 px more room above the card).
- **Shared rules:** transform and opacity only (no layout animation; FLIP for moves); every motion respects `prefers-reduced-motion`: an instant state change, no fades (§1.4); no input lock except on the opener of an overlay that is still opening; focus moves as stated; nothing here exceeds 1 s.

| ID | What moves | Values | Reduced motion |
|---|---|---|---|
| ANIM-12 | Dialog + scrim | Open 240 ms, `cubic-bezier(0.33, 1, 0.68, 1)`: scrim ink 0 → 35 %, dialog opacity 0 → 1 and scale 0.96 → 1 (sampled 0/60/120/180/240: scale 0.960/0.983/0.995/0.999/1, opacity 0/0.58/0.87/0.98/1). Close 160 ms, `cubic-bezier(0.32, 0, 0.67, 0)`: opacity → 0, scale → 0.98, scrim → 0. Focus into the dialog when it appears; back to the opener after closing. | instant |
| ANIM-13 | Bottom sheet + scrim | Open 320 ms, `cubic-bezier(0.32, 0.72, 0, 1)`: translateY 100 % → 0 (sampled 0/80/160/240/320 → 0/0.779/0.955/0.992/1 of the way), scrim 0 → 35 %. Close 240 ms, `cubic-bezier(0.32, 0, 0.67, 0)`. Swipe down: the sheet follows the finger; released past a third of its height or fast → the close runs from there, otherwise it springs back with the open curve. | instant |
| ANIM-14 | Lightbox | Open 320 ms, `cubic-bezier(0.33, 1, 0.68, 1)`: the photo grows from the tile’s box to the lightbox box (FLIP); scrim ink 0 → 88 % linear over 240 ms; controls (×, ‹ ›, dashes, caption) fade in 200–320 ms. Close 280 ms, `cubic-bezier(0.32, 0, 0.67, 0)` back into the tile (only a fade if the tile is off screen); controls out in the first 100 ms. Next / previous 280 ms, `cubic-bezier(0.33, 1, 0.68, 1)`: the current photo slides 24 px the way of the move and fades, the next comes from 24 px and fades in; the indicator follows ANIM-10; a swipe follows the finger. | instant |
| ANIM-15 | Cookie bar | In: 700 ms after first paint (after ANIM-04), 320 ms `cubic-bezier(0.33, 1, 0.68, 1)`: translateY 24 px → 0, opacity 0 → 1. Out on a choice: 200 ms `cubic-bezier(0.32, 0, 0.67, 0)`: down 24 px and fade. Never steals focus; announced as a region. The cookie settings open as ANIM-12 (desktop) or ANIM-13 (phone). | appears / disappears at once |
| ANIM-16 | Catalogue cards | 0–120 ms: leaving cards fade and shrink to 0.98; 80–320 ms: staying cards move to their new places (FLIP), `cubic-bezier(0.65, 0, 0.35, 1)`; 160–320 ms: new cards fade in, 0.98 → 1, `cubic-bezier(0.33, 1, 0.68, 1)`. “Showing x of y” swaps at 160 ms. Live search runs it 150 ms after typing stops; a newer result cancels the running one and starts from the current positions. | instant |
| ANIM-17 | Show the next … | New tiles rise 12 px → 0 and fade in, 240 ms `cubic-bezier(0.33, 1, 0.68, 1)`, 40 ms stagger per tile (at most 6 staggered); the button jumps below the new row; no scroll. | at once |
| ANIM-18 | Checkout step + stepper | Old content fades out 0–120 ms (linear); new content rises 8 px and fades in 120–360 ms, `cubic-bezier(0.33, 1, 0.68, 1)`; the finished step fills and gets its tick with the new content; the connector fills 80–320 ms, `cubic-bezier(0.65, 0, 0.35, 1)`. Back: mirrored. With full page loads only the new content’s rise runs. Focus to the step heading. | at once |
| ANIM-19 | Errors, notices | Field error: the border colour changes at once; the message slides 4 px down into place and fades in, 160 ms `cubic-bezier(0.33, 1, 0.68, 1)`; the space below moves with it. Notice / alert box: the height opens from 0 in 200 ms `cubic-bezier(0.65, 0, 0.35, 1)` (the ANIM-09 technique: a `grid-template-rows` 0fr → 1fr wrapper, no measuring), the content fades in 40–200 ms; out: 120 ms, the content fades while the height closes. `role="status"` / `role="alert"` as SITE-FLOWS says. The hold countdown changes digits without motion. | at once |
| ANIM-20 | Price figures | Old number up 6 px and out, 0–120 ms `cubic-bezier(0.32, 0, 0.67, 0)`; new number from 6 px below, 80–240 ms `cubic-bezier(0.33, 1, 0.68, 1)`. Tabular figures, fixed minimum width; `aria-live="polite"` announces only the final value. | swaps at once |
| ANIM-21 | Calendar month | Old month 24 px the way of the move and out, 0–160 ms `cubic-bezier(0.32, 0, 0.67, 0)`; new from 24 px on the other side, 80–320 ms `cubic-bezier(0.33, 1, 0.68, 1)`; the month name moves with its grid. Focus stays on ‹ ›. | swaps at once |
| ANIM-22 | Cake page main picture | Cross-fade 240 ms `cubic-bezier(0.65, 0, 0.35, 1)`; the thumbnail ring jumps at once; a video starts at the end (UI-08). Phone: native swipe only. | at once |
| ANIM-23 | Photos | After `img.decode()`: opacity 0 → 1 over the placeholder colour, 240 ms `cubic-bezier(0.33, 1, 0.68, 1)`. Not for cached images, the hero image or the largest above-the-fold image. | at once |
| ANIM-24 | Sticky header | scrollY > 0: shadow `0 4px 16px` ink 0 → 10 %, 200 ms `cubic-bezier(0.33, 1, 0.68, 1)`; back to 0 at the top. Only on the crossing. Size and colour never change. | the shadow switches at once |
| ANIM-25 | Order confirmed mascot | Resting: an instance of `V2 · Logo mark`, tilted 8° (Figma; CSS `rotate(-8deg)`), peeking 100 px (desktop), 86 px (tablet, 85 %), 82 px (phone, 70 %) above the order-number card, clipped by a box whose bottom edge is the card’s top edge. Once per order (sessionStorage key = order number; a reload does not replay), 300 ms after first paint, 450 ms `cubic-bezier(0.5, 1, 0.89, 1)` (as ANIM-04 / ANIM-06): rises from fully hidden (+104 / +90 / +86 px) and from 18° to 8° (samples 0/90/180/270/360/450 → 0/0.36/0.64/0.84/0.96/1). Decorative, `aria-hidden`. | sits in place |

- **Acceptance:** every overlay arrives and leaves with its own movement and never pops; filtering and searching never flash the grid; new tiles rise in one after another; steps, prices, months and pictures change without jumps; photos fade in only when they really load; the header shows its shadow only when scrolled; the mascot greets once on Order confirmed and then sits still; with reduced motion all of it is instant.

---

## 8. Static style: active navigation underline (STYLE-01)

Used under the active item in the **desktop navigation** and in the **mobile menu**.

| Property | Value |
|---|---|
| Width | the rendered width of the item’s word (desktop: Home 40, Cakes 40, Bespoke 57, Gallery 48, About Linda 81, FAQ 28, Contact 53 px) |
| Height | 2 px |
| Corner radius | 100 px (fully rounded ends) |
| Fill | `--bbl-accent` `#7a57c2` |
| Glow | `box-shadow: 0 0 5.7px #c9a7e8` |
| Position | absolute, left-aligned with the word; desktop: 2 px below the 18 px text box (top = 20 px); mobile menu: 2 px below the 44 px line box (top = 46 px) |
| Layout | must not change the item’s size (absolute positioning) |

Desktop navigation rules:

- Items: Home · Cakes · Bespoke · Gallery · About Linda · FAQ · Contact, 32 px apart (group width 539 px; the gap was 48 with six items); the group’s right edge sits at x 1243 in the 1280 px header (37 px from the edge).
- The desktop navigation is shown at **1120 px and wider** (all breakpoints: `RESPONSIVE.md` §1); below 1120 px the mobile header with the “menu” button replaces it (owner decision, 2026-10-13). Reason: the desktop header needs about 1115 px (wordmark right edge 491 px + at least a 48 px gap + the 539 px navigation + 37 px right margin); with seven items the gap between items dropped to 32 px so the navigation stays 539 px wide (decided 2026-10-16).
- Active item: Quicksand SemiBold 14 + underline. Other items: Quicksand Medium 14, no underline.
- Each item’s box has the width of its widest state, so switching the active item never shifts the other items.

When an underline animates (ANIM-01/02/03) animate its `width`, left edge fixed; in ANIM-08 both edges move (§7F). Do not use `scaleX`: it squashes the glow.

### 8.1 Animations on tablet (768–1119 px)

The tablet header, the page layout, other tablet widths and the carousels are in `RESPONSIVE.md` §3. On tablet the header is the phone header at full width (“menu” button at the right edge), so all four animations run there.

- **Tablet storyboard (Figma):** section `V2 · Animáció lépésekben — tablet menü (1024 × 1366)` (node `1575:9215`) — the same 16 open, 14 close and 17 select steps on a 1024 × 1366 screen, prototype flow “Tablet menü”. Origin x 1007, y 22; `R_white` 1680, `R_pink` 1704 — exactly what the §4.2 formulas give for this viewport, so it is a check, not a separate rule set. The social block keeps its distance from the bottom of the screen (110 px to the heading).
- **Animations on tablet:** ANIM-01, ANIM-02 and ANIM-03 run unchanged. Their geometry is already computed from the viewport (§4.2), so the circles simply grow larger. The menu content keeps its mobile layout (items block 24 px from the left, 68 px pitch). ANIM-04 uses the **mobile** values (§7A).
- **Tablet in landscape (width 768–1119 px and width > height, e.g. 1024 × 768)** — Figma: section `V2 · Animáció lépésekben — tablet menü, fekvő (1024 × 768)` (node `1578:9779`), flow “Tablet menü — fekvő”. Same circle timings (radii from §4.2: `R_white` 1254, `R_pink` 1278 on 1024 × 768). Two differences (owner decision, 2026-10-13):
  - the menu item block starts at **y 106** instead of 248 (seven items, same centre line as before), so the social block (kept 110 px above the bottom edge) never touches it;
  - **the menu items and the active underline appear one step later than on phone/portrait**, because on the short screen the white circle reaches the lower-left items later. Open timeline (step → items opacity / underline width): 11 → 0 / 2 px, 12 → 0.25 / 34 px, 13 → 0.65 / 74 px, 14 → 1 / full. The social block is unchanged (13–16). ANIM-02 and ANIM-03 mirror this exactly. Total durations do not change.
  - Rule for code: decide at the moment the animation starts (`matchMedia('(min-width: 768px) and (max-width: 1119px) and (orientation: landscape)')`).
- **Rotation while the menu is open:** the menu stays open; the white layer and the layout snap to the new viewport immediately, with no animation (owner decision). If the new width is 1120 px or more (desktop navigation, no “menu” button), the mobile menu closes instantly without animation (Guide rule).

---

## 9. Acceptance checklist

Check every item on a real phone and in a 402 × 902 viewport. Repeat the ANIM-01 – ANIM-04 items in a 1024 × 1366 and an 820 × 1180 viewport (tablet).

- [ ] Each animation finishes in under 1000 ms (ANIM-01 870, ANIM-02 760, ANIM-03 920, ANIM-05 parts 200–460).
- [ ] ANIM-06: the footer mascot is hidden until its corner is about 80 % in view, then rises in from the bottom-right corner in 0.6 s and ends exactly as drawn; once per page load; with reduced motion or without JavaScript it is simply in place.
- [ ] ANIM-05: every writable field (search, checkout, bespoke, contact, inscription, option text fields, card Element) grows to 110 % on hover; a mouse press brings it to 100 % and it stays 100 % while typing; a phone press shrinks it to 90 % and on release it opens for typing and springs back to 100 %; no motion on blur; no scaling with reduced motion.
- [ ] The pink ring is visibly wider in the middle of ANIM-01 than at its end; the open menu is pure white with no pink visible at any corner.
- [ ] The texture inside the pink ring does not zoom while the circle grows.
- [ ] The arrow visibly turns over and is edge-on (thinnest) halfway through the circle phase.
- [ ] Menu items never appear on top of pink; the social block appears only after the screen is fully white.
- [ ] ANIM-02 is the exact reverse of ANIM-01: social fades first, then items + underline, then circles.
- [ ] Tapping the current page’s item in the mobile menu, or clicking it in the desktop navigation, reloads that page (top of the page, filters cleared).
- [ ] ANIM-03: the tapped item is underlined before anything else moves; the new page is revealed under the shrinking circles; no white flash, no flash of the uncovered new page.
- [ ] Back button after ANIM-03 shows the previous page with the menu closed.
- [ ] Footer links and Home page buttons open pages normally, without the menu animation.
- [ ] Ctrl/Cmd-click or middle-click on a menu item opens a new tab normally.
- [ ] With `prefers-reduced-motion: reduce` there is no motion at all.
- [ ] Repeated fast taps on the “menu” button do not break the state.
- [ ] Keyboard: focus moves into the open menu, `Esc` closes it, focus returns to the “menu” button.
- [ ] Browser Back with the menu open closes the menu (ANIM-02) and stays on the page; Back after closing the menu normally goes to the previous page (no extra history step).
- [ ] UI-06: the hero crossfades in 400 ms and does not advance while hovered or focused.
- [ ] No layout shift anywhere when underlines appear or animate.
- [ ] ANIM-04: the mascot is not visible on the first paint, slides in from behind the header’s lower edge, and plays only on the first page load of a visit (not after navigating or reloading).
- [ ] ANIM-04: after arriving, the emblem looks exactly like the Figma header — tilted 15° clockwise, large, cropped by the header bar (mobile, tablet and desktop).
- [ ] Tablet landscape (1024 × 768): menu items start at y 106, appear one step later (never over pink), social block 110 px above the bottom; rotating with the menu open keeps it open and snaps to the new size.
- [ ] ANIM-07: every pressable on the public site grows 10 % on hover (in 240 ms, out 200 ms), drops to 100 % while pressed with a mouse and springs back on release; on touch drops to 90 % and springs back; acts only on release; scrolling never triggers it; text links in sentences only change colour; nothing scales in the admin; tablet with a trackpad/mouse behaves like desktop, with touch like a phone.
- [ ] ANIM-08: the desktop underline slides to the clicked item in 420 ms, stretching slightly and settling with a small overshoot, in both directions; the bold switch causes no shift.
- [ ] UI-03: the spinner shows for at least 600 ms and the button cannot be pressed twice while loading.
- [ ] ANIM-12–25 (§7J): dialogs fade and grow, sheets slide, the lightbox zooms from its tile, the cookie bar slides in after the mascot; filtering moves cards smoothly; Show more staggers; step changes, errors, notices, prices, calendar months and pictures animate as specified; photos fade in on load; the header shadow appears only when scrolled; the Order confirmed mascot greets once; reduced motion respected everywhere.
- [ ] ANIM-11: cake card corner button (hover / press) opens the card in place: picture grows and zooms to the open crop in 500 ms, the cake stays on the picture’s bottom edge, title shrinks slowly into the bottom row, description and tiers fade softly and shrink a little, chevrons flip inward; the video starts only when fully open, loops seamlessly, cannot be paused; closing reverses it via the still first frame; one card open at a time.
- [ ] ANIM-10: one indicator style everywhere (hero, testimonials on all sizes, phone About cards, phone cake media, lightbox); max 5 dashes, window keeps the active 3rd after item 3; 360 ms smooth width/colour changes; tapping a dash or a testimonial / About card centres that item and the dashes follow; not on the Home cake carousel.
- [ ] ANIM-09: a drop-down row rolls open smoothly in 360 ms and closes as the exact reverse; the arrow flips like the phone menu arrow (thinnest halfway) and ends pointing up when open; opening one FAQ row closes the open one at the same time; content below moves, nothing overlaps.
- [ ] UI-06: only the designed hero → no timer; designed hero + 1 or more active admin slides → advances every N s; never advances with reduced motion.
- [ ] UI-07: carousels snap card by card; no arrow buttons on phone and tablet, arrows on desktop.
- [ ] UI-08: gallery videos autoplay muted only when their tile is active, one at a time; nothing autoplays with reduced motion.
- [ ] Tablet (768–1119 px): the tablet header is shown, the “menu” button sits at the right edge, the open menu is pure white in every corner, and ANIM-04 uses the mobile values.

---

## 10. Template for adding a new animation

Copy this block, give it the next free ID, add a row to the animation index (§3.1) and to the interaction map (§3.4), and keep every timing under 1000 ms.

```markdown
## ANIM-XX — <Component>: <what happens>

- **Status:** designed | implemented | verified
- **Figma:** <section / frame names and node IDs>
- **Trigger:** <user action or state change>
- **Duration:** <total ms> (must be < 1000 ms)
- **Elements:** <which elements move, and their Figma layer names>
- **What happens:** <one paragraph in plain words, in order>
- **Interpolation:** <"linear between sampled keyframes" or a named easing per segment>
- **Keyframes:**

| t (ms) | <property> | <property> | … |
|---|---|---|---|

- **Reduced motion:** <instant end state, or a specific alternative>
- **Interaction rules:** <input lock, what interrupts it, focus handling>
- **Acceptance checks:** <bullet list, each observable on screen>
```

---

## 11. Open questions

1. **Routing:** client-side routing (§7.2 A) or full page loads (§7.2 B) — decided 2026-10-15: you decide; both paths are specified and must look the same. There is no codebase yet (2026-10-17): with the default stack (`SITE-FLOWS.md` §0.8) this is path A.
2. ~~About page (mobile) unfinished~~ — resolved 2026-10-14: the page is `M · Page — About Linda` (`1600:10493`).
3. ~~Proposals in §3.4~~ — decided 2026-10-15 (Esc closes, logo tap = Home, social links in a new tab, Back only closes the menu).
4. ~~Desktop hover~~ — decided 2026-10-21: ANIM-07 (the text grows 15 %, the underline stays) and ANIM-08 (the underline slides on click).
5. ~~UI-06 hero slides~~ — decided 2026-10-15: 400 ms crossfade, pauses while hovered or focused.
6. **UI-07 desktop arrows:** smooth scrolling one card per click is a Proposal.
7. **Admin hero slides (UI-06):** the slide designs and their animation come from the owner later (Decided 2026-10-17). Do not invent them.

### Decided (2026-10-13)

- Routes: `/` · `/cakes` · `/bespoke` · `/about` · `/faq` · `/contact` (2026-10-16: `/gallery` added after `/bespoke`).
- Breakpoint: the mobile header replaces the desktop navigation **below 1120 px** (raised from 1024 px so the desktop header always fits; with seven items since 2026-10-16 the item gap is 32 px).
- The about page’s item is called **About Linda** everywhere (navigation and footer).
- Navigation order: Home · Cakes · Bespoke · About Linda · FAQ · Contact (superseded 2026-10-16: Home · Cakes · Bespoke · Gallery · About Linda · FAQ · Contact). Bespoke enquiry and Enquiry sent mark **Bespoke** as active.
- ~~Footer EXPLORE column~~ — removed 2026-10-21: the footer has no navigation (the header is sticky); only a **Find my order →** link stays, under the contact details (`SITE-FLOWS.md` §3.2).
- The header is sticky on every page and breakpoint (2026-10-21, `SITE-FLOWS.md` §3.1); the menu animations are unchanged.
- Tablet storyboards exist for the menu (portrait and landscape) and the mascot; in tablet landscape the menu items appear one step later (§8.1, JSON `landscapeTablet`). Rotation with the menu open: stays open, snaps to the new size.
- In-between tablet widths: fixed type sizes, fluid widths (`RESPONSIVE.md` §3.3).
- Tablet (768–1119 px): the mobile header at full width, and the desktop design scaled 0.8 to 1024 px, text not below 14 px but never larger than on desktop (`RESPONSIVE.md` §3).
- The two desktop pages that still had an old, detached footer (The full range, About Linda) now use the footer component; the old footers are hidden (“… — régi lábléc (rejtve, 2026-10-13)”).
- Every desktop page now uses the navigation component (the four pages with an old, detached header were switched; their old headers are hidden in Figma, named “… — régi fejléc (rejtve, 2026-10-13)”). Ignore hidden layers.

---

## 12. Appendix — keyframe data (JSON)

Same data as the tables in §5–§7, for direct use in code. **Tablet landscape** (768–1119 px wide and width > height, checked when the animation starts): use the same rows but replace `menuOpacity` and `underline` with the values in `landscapeTablet` (keyed by `t`); every other column is unchanged. Each row: `[t, pink, white, arrowDeg, arrowShiftPx, menuOpacity, underline, socialOpacity]`. `selectReverse` starts at 300 ms; ANIM-03’s 0–300 ms phase is defined in §7.1.

```json
{
  "columns": ["t","pink","white","arrowDeg","arrowShiftPx","menuOpacity","underline","socialOpacity"],
  "open": [
    [0, 0.0, 0.0, 0, 0.0, 0, 0, 0],
    [55, 0.1371, 0.0104, 15, 0.26, 0, 0, 0],
    [110, 0.266, 0.0385, 30, 0.52, 0, 0, 0],
    [165, 0.3868, 0.1051, 45, 0.78, 0, 0, 0],
    [220, 0.4985, 0.1904, 60, 1.04, 0, 0, 0],
    [275, 0.6, 0.282, 75, 1.3, 0, 0, 0],
    [330, 0.6924, 0.3788, 90, 1.55, 0, 0, 0],
    [385, 0.7746, 0.4755, 105, 1.81, 0, 0, 0],
    [440, 0.8457, 0.5702, 120, 2.07, 0, 0, 0],
    [495, 0.9056, 0.666, 135, 2.33, 0, 0.0212, 0],
    [550, 0.9523, 0.7627, 150, 2.59, 0.25, 0.3596, 0],
    [605, 0.9858, 0.8751, 165, 2.85, 0.65, 0.7826, 0],
    [660, 1.0, 1.0, 180, 3.11, 1, 1, 0],
    [730, 1.0, 1.0, 180, 3.11, 1, 1, 0.25],
    [800, 1.0, 1.0, 180, 3.11, 1, 1, 0.65],
    [870, 1.0, 1.0, 180, 3.11, 1, 1, 1]
  ],
  "close": [
    [0, 1.0, 1.0, 180, 3.11, 1, 1, 1],
    [100, 1.0, 1.0, 180, 3.11, 1, 1, 0.65],
    [160, 1.0, 1.0, 180, 3.11, 1, 1, 0.25],
    [220, 1.0, 1.0, 180, 3.11, 1, 1, 0],
    [265, 0.9858, 0.8751, 165, 2.85, 0.65, 0.7826, 0],
    [310, 0.9523, 0.7627, 150, 2.59, 0.25, 0.3596, 0],
    [355, 0.9056, 0.666, 135, 2.33, 0, 0.0212, 0],
    [400, 0.8457, 0.5702, 120, 2.07, 0, 0, 0],
    [445, 0.7746, 0.4755, 105, 1.81, 0, 0, 0],
    [490, 0.6924, 0.3788, 90, 1.55, 0, 0, 0],
    [535, 0.6, 0.282, 75, 1.3, 0, 0, 0],
    [580, 0.4985, 0.1904, 60, 1.04, 0, 0, 0],
    [625, 0.3868, 0.1051, 45, 0.78, 0, 0, 0],
    [670, 0.266, 0.0385, 30, 0.52, 0, 0, 0],
    [715, 0.1371, 0.0104, 15, 0.26, 0, 0, 0],
    [760, 0.0, 0.0, 0, 0.0, 0, 0, 0]
  ],
  "selectReverse": [
    [300, 1.0, 1.0, 180, 3.11, 1, 1, 1],
    [350, 1.0, 1.0, 180, 3.11, 1, 1, 0.65],
    [400, 1.0, 1.0, 180, 3.11, 1, 1, 0.25],
    [440, 1.0, 1.0, 180, 3.11, 1, 1, 0],
    [480, 0.9858, 0.8751, 165, 2.85, 0.65, 0.7826, 0],
    [520, 0.9523, 0.7627, 150, 2.59, 0.25, 0.3596, 0],
    [560, 0.9056, 0.666, 135, 2.33, 0, 0.0212, 0],
    [600, 0.8457, 0.5702, 120, 2.07, 0, 0, 0],
    [640, 0.7746, 0.4755, 105, 1.81, 0, 0, 0],
    [680, 0.6924, 0.3788, 90, 1.55, 0, 0, 0],
    [720, 0.6, 0.282, 75, 1.3, 0, 0, 0],
    [760, 0.4985, 0.1904, 60, 1.04, 0, 0, 0],
    [800, 0.3868, 0.1051, 45, 0.78, 0, 0, 0],
    [840, 0.266, 0.0385, 30, 0.52, 0, 0, 0],
    [880, 0.1371, 0.0104, 15, 0.26, 0, 0, 0],
    [920, 0.0, 0.0, 0, 0.0, 0, 0, 0]
  ],
  "footerMascot": {
    "columns": ["t", "progress", "x", "y", "rotateDeg"],
    "delayMs": 150, "durationMs": 450, "easing": "cubic-bezier(0.5, 1, 0.89, 1)", "origin": "50% 100%",
    "phone":   [[0, 0, 150.5, 260.7, -40], [90, 0.36, 96.32, 166.85, -36.4], [180, 0.64, 54.18, 93.85, -33.6], [270, 0.84, 24.08, 41.71, -31.6], [360, 0.96, 6.02, 10.43, -30.4], [450, 1, 0, 0, -30]],
    "tablet":  [[0, 0, 83.8, 265.1, -27.55], [90, 0.36, 53.63, 169.66, -23.95], [180, 0.64, 30.17, 95.44, -21.15], [270, 0.84, 13.41, 42.42, -19.15], [360, 0.96, 3.35, 10.6, -17.95], [450, 1, 0, 0, -17.55]],
    "desktop": [[0, 0, 104.6, 330.9, -27.55], [90, 0.36, 66.94, 211.78, -23.95], [180, 0.64, 37.66, 119.12, -21.15], [270, 0.84, 16.74, 52.94, -19.15], [360, 0.96, 4.18, 13.24, -17.95], [450, 1, 0, 0, -17.55]],
    "trigger": { "sentinel": "visible mascot area", "threshold": 0.8, "oncePerPageLoad": true }
  },
  "pressable": {
    "columns": ["t", "scale"],
    "easing": "cubic-bezier(0.33, 1, 0.68, 1)",
    "hoverIn":  [[0, 1.0], [60, 1.058], [120, 1.087], [180, 1.098], [240, 1.1]],
    "hoverOut": [[0, 1.1], [50, 1.042], [100, 1.013], [150, 1.002], [200, 1.0]],
    "desktopPress":   [[0, 1.1], [40, 1.03], [80, 1.004], [120, 1.0]],
    "desktopRelease": [[0, 1.0], [80, 1.085], [150, 1.115], [220, 1.096], [290, 1.102], [340, 1.1]],
    "phonePress":     [[0, 1.0], [40, 0.93], [80, 0.904], [120, 0.9]],
    "phoneRelease":   [[0, 0.9], [80, 0.985], [150, 1.02], [220, 0.995], [290, 1.002], [340, 1.0]],
    "cancelMs": 200,
    "navItem": {
      "hoverIn":  [[0, 1.0], [60, 1.087], [120, 1.131], [180, 1.148], [240, 1.15]],
      "hoverOut": [[0, 1.15], [50, 1.063], [100, 1.019], [150, 1.002], [200, 1.0]],
      "press":    [[0, 1.15], [40, 1.045], [80, 1.006], [120, 1.0]],
      "release":  [[0, 1.0], [80, 1.127], [150, 1.172], [220, 1.144], [290, 1.153], [340, 1.15]]
    }
  },
  "navUnderlineSlide": {
    "columns": ["t", "lead", "trail"],
    "durationMs": 420, "weightSwitchMs": 210,
    "rows": [[0, 0, 0], [60, 0.26, 0.16], [120, 0.64, 0.48], [180, 0.93, 0.82], [240, 1.05, 1.03], [300, 1.01, 1.025], [360, 0.996, 0.998], [420, 1, 1]]
  },
  "surfaceMotion": {
    "easeOut": "cubic-bezier(0.33, 1, 0.68, 1)", "easeIn": "cubic-bezier(0.32, 0, 0.67, 0)", "easeInOut": "cubic-bezier(0.65, 0, 0.35, 1)", "sheet": "cubic-bezier(0.32, 0.72, 0, 1)",
    "dialog": { "openMs": 240, "closeMs": 160, "scale": [0.96, 1], "closeScale": 0.98, "scrim": 0.35 },
    "sheet": { "openMs": 320, "closeMs": 240, "scrim": 0.35, "swipeCloseFraction": 0.333 },
    "lightbox": { "openMs": 320, "closeMs": 280, "nextMs": 280, "slidePx": 24, "scrim": 0.88, "scrimMs": 240, "controlsIn": [200, 320] },
    "cookieBar": { "delayMs": 700, "inMs": 320, "outMs": 200, "offsetPx": 24 },
    "catalogue": { "leave": [0, 120], "move": [80, 320], "enter": [160, 320], "scale": 0.98, "searchDebounceMs": 150 },
    "showMore": { "ms": 240, "risePx": 12, "staggerMs": 40, "maxStaggered": 6 },
    "stepChange": { "out": [0, 120], "in": [120, 360], "risePx": 8, "connector": [80, 320] },
    "fieldError": { "ms": 160, "slidePx": 4, "outMs": 120 }, "notice": { "heightMs": 200, "fade": [40, 200], "outMs": 120 },
    "price": { "out": [0, 120], "in": [80, 240], "shiftPx": 6 },
    "calendar": { "out": [0, 160], "in": [80, 320], "shiftPx": 24 },
    "media": { "crossfadeMs": 240 }, "photo": { "fadeMs": 240 },
    "headerShadow": { "ms": 200, "shadow": "0 4px 16px rgba(36,27,51,0.10)" },
    "orderMascot": { "delayMs": 300, "ms": 450, "easing": "cubic-bezier(0.5, 1, 0.89, 1)", "restDeg": 8, "startExtraDeg": 10, "hiddenOffsetPx": { "desktop": 104, "tablet": 90, "phone": 86 }, "oncePer": "order" }
  },
  "cakeCard": {
    "openMs": 500, "closeFadeMs": 120, "closeTotalMs": 620, "easing": "cubic-bezier(0.65, 0, 0.35, 1)",
    "progress": [[0, 0], [125, 0.071], [250, 0.5], [375, 0.929], [500, 1]],
    "titleSize": { "easing": "cubic-bezier(0.37, 0, 0.63, 1)", "progress": [[0, 0], [125, 0.146], [250, 0.5], [375, 0.854], [500, 1]] },
    "chevronFlipDeg": [[0, 0], [125, 45], [250, 90], [375, 135], [500, 180]],
    "textFadeOut": { "ms": 250, "easing": "cubic-bezier(0.37, 0, 0.63, 1)", "opacity": [[0, 1], [125, 0.5], [250, 0]], "scale": [[0, 1], [125, 0.96], [250, 0.92]], "origin": "top left" },
    "crops": {
      "anchor": "bottom-centre",
      "desktopTablet": { "closed": [0, 0.3783, 1, 1], "open": [0.1136, 0.36, 0.8864, 1] },
      "phoneHome":     { "closed": [0, 0, 1, 1], "open": [0.18, 0.1288, 0.82, 1] },
      "phoneCatalogue":{ "closed": [0, 0, 1, 1], "open": [0.18, 0.0988, 0.82, 1] }
    },
    "video": { "size": [2160, 2160], "fps": 30, "frames": 150, "loop": true, "startWhenFullyOpen": true, "userPause": false }
  },
  "sliderIndicator": {
    "durationMs": 360, "easing": "cubic-bezier(0.65, 0, 0.35, 1)", "maxVisible": 5, "gap": 6, "height": 5,
    "states": { "active": { "w": 37, "light": "#6F6579", "dark": "#F7F4FA" }, "neighbour": { "w": 25, "light": "#847C90", "dark": "rgba(247,244,250,0.70)" }, "rest": { "w": 19, "light": "#8F889D", "dark": "rgba(247,244,250,0.45)" }, "hidden": { "w": 0, "opacity": 0 } },
    "window": "s = clamp(a - 2, 0, N - min(N, 5))",
    "progress": [[0, 0], [90, 0.071], [180, 0.5], [270, 0.929], [360, 1]]
  },
  "dropDown": {
    "columns": ["t", "panel", "arrowRotateXDeg"],
    "durationMs": 360, "easing": "cubic-bezier(0.65, 0, 0.35, 1)",
    "open": [[0, 0, 0], [60, 0.027, 30], [120, 0.149, 60], [180, 0.5, 90], [240, 0.851, 120], [300, 0.973, 150], [360, 1, 180]],
    "close": "open reversed"
  },
  "writableField": {
    "columns": ["t", "scale"],
    "hoverIn": "pressable.hoverIn", "hoverOut": "pressable.hoverOut",
    "press": { "desktop": "pressable.desktopPress", "phone": "pressable.phonePress" },
    "release": { "desktop": "stay at 1.00 while focused", "phone": "pressable.phoneRelease" },
    "whileFocused": 1.0, "blur": "no motion", "keyboardFocus": "no scaling"
  },
  "landscapeTablet": {
    "columns": ["t","menuOpacity","underline"],
    "open":          [[495, 0, 0.0212], [550, 0, 0.0212], [605, 0.25, 0.3596], [660, 0.65, 0.7826], [730, 1, 1]],
    "close":         [[220, 0.65, 0.7826], [265, 0.25, 0.3596], [310, 0, 0.0212], [355, 0, 0.0212]],
    "selectReverse": [[440, 0.65, 0.7826], [480, 0.25, 0.3596], [520, 0, 0.0212], [560, 0, 0.0212]],
    "menuBlockTop": 106,
    "socialHeadingBottomOffset": 110
  }
}
```
