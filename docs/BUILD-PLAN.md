# BUILD-PLAN.md — Baked by Linda, phase by phase

This is the order of work for Claude Code. It is cut into **phases** and **slices**. Each slice is small enough for Bohoka to check in 10–15 minutes. The working loop, the report format and the rules are in `CLAUDE.md`. This file says **what** each slice is, **what to read**, **what to test** and **how Bohoka checks it**.

**Conventions**
- “§” = a section of `SITE-FLOWS.md`. “ANIM-xx” and “A§” = `ANIMATIONS.md`. “R§” = `RESPONSIVE.md`.
- Figma node ids are in the docs. Page frames for all three breakpoints are in §2. Storyboards are in A§3.1.
- **Every UI slice** includes:
  - the three widths (402 / 1024 / 1280; tablet = desktop × 0.8, R§3.2);
  - the in-between widths R§3.3 names;
  - ANIM-07 / ANIM-05 on every pressable and writable element;
  - reduced motion;
  - keyboard and screen reader;
  - 44 × 44 hit areas;
  - axe with no violations.
- **Every logic slice** includes unit tests for each number, deadline, price, status or permission rule it touches, with the § in the test name.
- Bohoka’s check is written here in English. You write it to him in Hungarian (CLAUDE.md §6).
- Bohoka’s own, more detailed checklist for every slice is `ellenorzes/ELLENORZO-LISTA.md` (Hungarian, same slice numbers). Go through it before every report (CLAUDE.md §4.5).

---

## Phase 0 — Foundations

Goal: a running empty app with the design system, the motion core and the data layer. Nothing visible to customers yet except a component gallery.

### 0.1 Repository, tooling, logs
- **Read:** CLAUDE.md; §0 completely; §0.8.
- **Build:**
  - Next.js (TypeScript strict), lint, format, typecheck, Vitest, Playwright, axe;
  - one command each for dev, test and e2e;
  - CI running all checks;
  - `.env.example`;
  - `docs/PROGRESS.md` (every slice of this plan as a checklist), `docs/PROPOSALS.md`, `docs/DEVIATIONS.md`;
  - a README with how to run it.
- **Tests:** a smoke test page renders; CI green.
- **Bohoka checks:** the app starts; the progress checklist exists and shows slice 0.1 ticked after acceptance.
- **Done when:** a clean clone runs with the README steps.

### 0.2 Design tokens, fonts, base styles
- **Read:** A§2 (tokens); Figma variables (`get_variable_defs`); the style guide section `V2 — Arculattár · v4` (`1490:8656`); §10.13 (contrast); the contrast note in §10.13 (meta grey #756C82, lilac helper #8957B8).
- **Build:**
  - CSS custom properties for colours, type scale, radii, shadows, spacing, motion curves (the named easings of A§2 and ANIM-12–25);
  - self-hosted Quicksand 300/500/600 and Fraunces 300 WOFF2 with `font-display: swap`;
  - base element styles;
  - a `/dev/tokens` page that shows every token with its name.
- **Tests:** a contrast unit test over every text/background token pair used together (≥ 4.5 : 1 text, ≥ 3 : 1 UI).
- **Bohoka checks:** `/dev/tokens` next to the Figma style guide — colours, fonts and sizes match.
- **Done when:** no hard-coded colour or font size outside the token file.

### 0.3 Layout, breakpoints, page shell skeleton
- **Read:** R§1–4 completely; §2.1; §0.6 (absolute positions → flexible layout).
- **Build:**
  - the breakpoint system (phone < 768, tablet 768–1119, desktop ≥ 1120);
  - the tablet type formula (R§3.2);
  - content max width 1280, centred, full-bleed backgrounds (R§4);
  - a page shell with empty header and footer slots;
  - a `/dev/layout` page showing the grid at each width.
- **Tests:** Playwright screenshots of `/dev/layout` at 402, 768, 1024, 1119, 1120, 1280 and 1600.
- **Bohoka checks:** resizing the window changes layout exactly at 768 and 1120.

### 0.4 Interaction and motion core
- **Read:** A§1 (all global rules), A§3.4, ANIM-07 (A§7E), ANIM-05 (A§7C), ANIM-10 (A§7H) values only, A§12 JSON.
- **Build:**
  - input detection per A§1.9: mouse/pen → desktop behaviour, touch → phone behaviour, keyboard focus;
  - a reusable `pressable` behaviour (hover +10 %, nav items +15 %, press, release spring, cancel; actions fire on release);
  - the `writable` field behaviour (ANIM-05);
  - a reduced-motion switch (instant state changes, A§1.4);
  - an input-lock helper (A§1.5);
  - the keyframe data imported from the JSON appendix (one source).
- **Tests:**
  - unit tests on the spring and press tables;
  - Playwright: hover / press / release on a test button with mouse and with touch emulation;
  - with reduced motion, nothing animates.
- **Bohoka checks:** `/dev/motion`: a button and a field behave as in the ANIM-07 / ANIM-05 storyboards (`1722:12049`, `1692:12074`), on desktop and on his phone.

### 0.5 Base components
- **Read:**
  - §0.6;
  - A§7E (the list of every pressable kind);
  - ANIM-09, ANIM-10, ANIM-12, ANIM-13, ANIM-19;
  - the Figma components: buttons, pills, inputs, checkbox (`630:3012`/`630:3015`, phone `810:5860`), slider dash and indicator (`1759:12635`, `1759:12772`), the notice frames, the dialog and sheet frames (`974:9137`, `975:9168`).
- **Build:**
  - Button (solid, outline, text), Link (standalone, inline = colour only), Pill, Input, Textarea with counter, Checkbox, Radio, Select;
  - Notice / Alert (ANIM-19);
  - Field error (ANIM-19);
  - Dialog (ANIM-12) and Bottom sheet (ANIM-13), chosen by input type (R§ overlays rule);
  - Slider indicator (ANIM-10);
  - Drop-down row (ANIM-09);
  - Spinner button state (UI-03).
  - All on a `/dev/components` gallery.
- **Tests:**
  - axe on the gallery;
  - focus trap and focus return for the dialog and the sheet;
  - Esc closes;
  - a sheet swipe-down test;
  - the ANIM-10 window maths (`s = clamp(a−2, 0, N−min(N,5))`);
  - screenshots.
- **Bohoka checks:** `/dev/components` next to the Figma components; open and close a dialog with a mouse, and a sheet on his phone.

### 0.6 Data layer, money, time, settings
- **Read:** §10.1, §10.7, §11 (all variables), §13 (calculated values), §1 (words).
- **Build:**
  - Postgres + migrations;
  - a Settings model (§11.1, §11.2) with the real business facts;
  - money helpers (integer pence, formatting rules §10.7);
  - Europe/London time helpers;
  - deadline functions (§10.1: D-2 23:59, refund tiers from the earliest date);
  - a seed script with the Figma sample content (CLAUDE.md §7);
  - a template-placeholder renderer (§11.8).
- **Tests:**
  - every deadline and refund-tier example in §10.1, including summer/winter time changes;
  - money formatting;
  - placeholder rendering.
- **Bohoka checks:** nothing visual. A one-page Hungarian summary of the rules the tests cover, with the test count.

**Phase 0 review gate:** CLAUDE.md §4.3.

---

## Phase 1 — The shell on every public page

### 1.1 Desktop header, navigation, sticky shadow
- **Read:** §3.1; A§3.2–3.4; STYLE-01 (A§8); ANIM-08 (A§7F); ANIM-24; header component `1421:9315`.
- **Build:**
  - the sticky desktop header with logo SVG (`1541:9603`), seven items, active underline per A§3.3;
  - the underline slide (ANIM-08) on click;
  - the current item reloads the page (A§7F);
  - hover +15 % on items;
  - the scroll shadow (ANIM-24).
- **Tests:**
  - active item per route (table A§3.3);
  - the underline timing against the A§12 data;
  - the reload on the current item;
  - the shadow appears only past 0.
- **Bohoka checks:** at 1280, click between pages and watch the underline slide; scroll and see the shadow.

### 1.2 Phone and tablet header, menu overlay
- **Read:** A§4 (anatomy, origin, radii, arrow flip, behaviour), ANIM-01, ANIM-02, ANIM-03 (path A), A§8.1 (tablet), R§3.1, R§3.4; storyboards `1497:8799`, `1575:9215`, `1578:9779`.
- **Build:**
  - the phone header (`1461:9222`) and tablet header;
  - the menu overlay with the two circles;
  - open, close and select-and-navigate;
  - Esc, Back, logo, social links, current item reloads (A§3.4);
  - rotation with the menu open.
- **Tests:**
  - the keyframe tables vs. computed styles at the sampled times;
  - Back closes only the menu;
  - the input lock;
  - reduced motion.
- **Bohoka checks:** on his phone and a tablet (or the emulator), compare with the storyboard flows in Figma, frame by frame.

### 1.3 Header mascot
- **Read:** ANIM-04 (A§7A); storyboard `1545:10103`.
- **Build:** the first-load-of-visit slide-in on all breakpoints; no JavaScript = in place.
- **Tests:** plays once per visit (sessionStorage); not on later loads; reduced motion.
- **Bohoka checks:** open the site in a new tab: the mascot slides in; navigate: it does not.

### 1.4 Footer and footer mascot
- **Read:** §3.2; ANIM-06 (A§7D); footer masters `1411:9627`, `1551:10408`, `1461:9223`.
- **Build:**
  - the minimised footer (Legal two columns, Food & Compliance from Settings, contact block, Find my order →, Cookie preferences);
  - the footer mascot peek once per page load.
- **Tests:** business facts come from Settings; the IntersectionObserver trigger at 80 %; the crop matches at three widths.
- **Bohoka checks:** scroll to the bottom on each width; the mascot peeks once and sits exactly as drawn.

### 1.5 Cookie bar, panel, consent
- **Read:** §3.3; §10.11; ANIM-15; ANIM-12 / ANIM-13; states section `1003:9096`, `1199:9345`, `1199:9382`.
- **Build:**
  - the bar (in after 700 ms), Accept / Reject / Settings;
  - the panel (dialog on desktop, sheet on phone);
  - the `bbl_consent` cookie;
  - an analytics hook that loads nothing until a provider is chosen (§14.1).
- **Tests:** no non-essential cookie before a choice; withdrawal works without reload; the version bump re-shows the bar.
- **Bohoka checks:** first visit, choices, reopening via Cookie preferences, on phone and desktop.

### 1.6 404, 500, SEO basics
- **Read:** §4.6, §4.7, §10.12, §2 (index / noindex column).
- **Build:**
  - the 404 and 500 pages;
  - titles “Page — Baked by Linda”;
  - `robots.txt`, a sitemap skeleton, `noindex` for the routes marked “no”.
- **Tests:** status codes; the meta robots per route.
- **Bohoka checks:** open a wrong URL on each width.

**Phase 1 review gate.**

---

## Phase 2 — Content pages

### 2.1 Home: hero and fixed sections
- **Read:** §4.1 (all rows except testimonials and the cake row); UI-06; Home frames `518:2687`, `1464:8417`, `1562:12130`.
- **Build:**
  - the designed hero as the fixed first slide (no admin slides yet; §14.2);
  - the static sections;
  - the “We got you.” placeholder ellipse slots (`Placeholder-fast changing cakes-*`);
  - the social band.
- **Tests:** screenshots against Figma at three widths.
- **Bohoka checks:** the Home page next to Figma, top to bottom, at three widths.

### 2.2 Home testimonials = Google reviews
- **Read:** §4.1 testimonials row and the Google rating row; §11.4; §9.12 (Google reviews); ANIM-10 (incl. “Testimonials = all Google reviews”); ANIM-07 (centre on click).
- **Build:**
  - the reviews table and a fixture importer (Business Profile API shape);
  - `GET /api/reviews?after=&limit=6`;
  - the carousel: server-rendered first page (6 / 5 / 3), prefetch within 3 cards, virtualised cards, same-size empty shapes that fade in (ANIM-10 note);
  - cards centre on click;
  - the rating line with the Google attribution;
  - the hide rules (no text, no reviews).
- **Tests:**
  - order newest first;
  - every rating shown;
  - no text → not a card;
  - a long text is cut with “Read on Google →”;
  - one request at a time, retry once;
  - no layout shift (CLS 0);
  - the ANIM-10 window with 200 reviews.
- **Bohoka checks:** swipe or arrow through many reviews on phone and desktop; the dashes stay at most five; no jumps.

### 2.3 Home cake row and Special idea
- **Read:** §4.1 cake row and Special idea rows; the cake card rows in §4.1 (closed card only, no open yet); gallery picks §11.4.
- **Build:**
  - the Home cake carousel with the first five visible cakes (closed cards: View → cake page; corner button hidden until slice 3.4);
  - the Special idea squares from four gallery picks;
  - the link to the gallery.
- **Tests:** visibility and order rules; the empty-gallery rule.
- **Bohoka checks:** the row at three widths; View opens the (placeholder) cake page.

### 2.4 About Linda
- **Read:** §4.3; frames `518:2688`, `1600:10493`, `1562:12372`; ANIM-10 (phone About cards).
- **Build:** the page; the phone card carousel with the indicator and centre-on-click.
- **Bohoka checks:** next to Figma at three widths.

### 2.5 FAQ
- **Read:** §4.4; ANIM-09; frames `658:3996`, `803:5741`, `1559:11372`; the closed-row answers (hidden layers are real content, §0.3); Appendix A.1 FAQ row.
- **Build:**
  - FAQ from the database (categories, order);
  - drop-down rows with ANIM-09 (first row open);
  - templates in answers (§11.8).
- **Tests:** one row open at a time (as A§7G says); keyboard; the template values.
- **Bohoka checks:** open and close rows on phone and desktop; compare with `1745:12629`.

### 2.6 Legal pages and Allergen information
- **Read:** §4.5; Appendix A.1 legal rows; §14.1 item 5 (texts Linda will revise); frames in §2.
- **Build:**
  - the seven legal pages from stored revisions with placeholder chips;
  - “On this page” navigation;
  - the updated date automatic.
- **Tests:** placeholders filled from Settings; the revision stored for later PDFs (§8.1 e-mail 1).
- **Bohoka checks:** each page at phone width; the Appendix A corrections applied.

### 2.7 Contact and Message sent
- **Read:** §7.4; §10.8, §10.9; ANIM-19.
- **Build:**
  - the contact form;
  - validation with ANIM-19;
  - honeypot and rate limit;
  - the message stored and handed to the e-mail adapter (sending arrives in phase 5; log it now);
  - the Message sent page.
- **Tests:** every validation rule; spam limits; the stored message retention (§10.10).
- **Bohoka checks:** send a message with mistakes, then correctly.

### 2.8 Gallery, lightbox, Show more, photo fade-in
- **Read:** §4.8; ANIM-14, ANIM-17, ANIM-23, ANIM-10 (lightbox dashes); frames in §2.
- **Build:**
  - the gallery grid with pages of 12 and Show more;
  - the lightbox (`?photo=<id>`, Back closes, keys, swipe);
  - “I’d like one like this” → bespoke with `?inspired=`.
- **Tests:** the URL state; focus; an unknown id; Show more at the end; the zoom from the tile.
- **Bohoka checks:** open, page through and close the lightbox on phone and desktop; compare with the ANIM-14 storyboard rows.

**Phase 2 review gate.**

---

## Phase 3 — Catalogue and cake page

### 3.1 Cake data model
- **Read:**
  - §9.13 (fields), §5.8 (options), §11.3;
  - §0.6 (photo shapes, focal point);
  - the video rules doc (card video);
  - §1 (snapshot).
- **Build:**
  - the cakes, sizes, options and choices (add-on prices and allergens), allergens (14 + kinds + also contains), categories, visibility, order, photos, videos and card video tables;
  - the seed with the Figma cakes.
- **Tests:** constraints (unique name, limits); “From £” = the smallest size; hidden cakes → 404.
- **Bohoka checks:** a Hungarian table of the seeded cakes, compared with Figma.

### 3.2 The full range: grid, filters, pages
- **Read:** §4.2; frames `599:2721`, `798:5566`, `1557:11293`; the header placeholders `Placeholder-cake from above 1–6-*`; empty states `1108:9860`, `1108:9884`.
- **Build:**
  - the catalogue page: header band with placeholder slots;
  - filter pills (fixed four; hide empty);
  - 12 per page, Show the next N (ANIM-17);
  - “Showing x of y”;
  - the empty states.
- **Tests:** counts and paging; a filter from an old link (§4.2 row); paging with filters.
- **Bohoka checks:** filter and page on three widths.

### 3.3 Search field and the result motion
- **Read:** §4.2 search rows; ANIM-05; ANIM-16; states `1687:11997`, `1687:12083`.
- **Build:**
  - live search (name, flavour, description; name matches first; inside the selected pill; 150 ms debounce);
  - “Search all designs” when nothing is found;
  - ANIM-16 on every result change.
- **Tests:** ranking; inside-pill; no-result path; a newer query cancels the running animation.
- **Bohoka checks:** type in the field on phone and desktop; the cards move smoothly.

### 3.4 Cake card open / close with the card video
- **Read:**
  - ANIM-11 completely;
  - the video rules doc (crops, formulas);
  - card component sets `1776:12902`, `1776:12914`, `1777:12902`, `1777:12926`;
  - storyboard `1779:12951`;
  - §4.1 / §4.2 cake card rows.
- **Build:**
  - the corner button (44 × 44, ANIM-07, `aria-expanded`);
  - the open / close sequence (500 ms; the picture, the bottom-anchored crop zoom, the title with the gentle curve, the description fade + shrink, the chevron flip);
  - the video starts only when fully open, loops seamlessly, pauses off screen;
  - one card open at a time;
  - without a card video: the main photo and no button.
- **Tests:**
  - the crop maths for every card size (the formula);
  - the timing samples vs. the ANIM-11 JSON;
  - only one open;
  - the loop seam (a synthetic test clip);
  - reduced motion = instant, no autoplay.
- **Bohoka checks:** open and close cards on all three widths next to the storyboard flows.

### 3.5 Cake page: media
- **Read:** §5.1 media rows; UI-08; ANIM-22; ANIM-10 (phone dashes); frames `609:2889`, `815:5841`, `1557:11744`.
- **Build:**
  - the main picture with thumbnails and arrows on desktop and tablet (cross-fade);
  - swipe with dashes on the phone;
  - videos muted autoplay with tap to unmute, one at a time.
- **Tests:** a one-photo cake has no controls; video rules; reduced motion → a play button.
- **Bohoka checks:** a cake with several photos and a video on phone and desktop.

### 3.6 Cake page: sizes, options, inscription, price, allergens, add to order
- **Read:**
  - §5.1 completely;
  - §5.8 (options);
  - §10.2 (the draft);
  - ANIM-20;
  - the states in `974:9087` (inscription, “Leave the cake plain?”), `1096:9106` (several cakes, the 7th-cake notice), `1715:11991` (options).
- **Build:**
  - the size radio (the smallest preselected);
  - the options of the four kinds with +£;
  - the inscription with counter and preview, or “Leave the cake plain?” (ANIM-12 / 13);
  - the live price (ANIM-20);
  - the allergen block (the cake’s plus the choices’);
  - Add to order → the draft;
  - edit mode `?line=`;
  - the max-5-cakes notice.
- **Tests:** price arithmetic in pence; allergen union; draft creation and expiry (24 h); edit mode; the limit.
- **Bohoka checks:** configure a cake, add it, edit it; watch the price change.

**Phase 3 review gate.**

---

## Phase 4 — Checkout (Stripe test mode)

### 4.1 Draft, routing, stepper
- **Read:** §5 intro, §5.2–5.4 stepper rows, §10.2; ANIM-18; the stepper components `627:3124`, `812:5951`.
- **Build:**
  - the step routes with redirect rules (opening a step directly);
  - the stepper (completed steps are links);
  - the phone progress dots;
  - the order summary column (desktop and tablet);
  - the step change motion.
- **Tests:** every routing rule of §10.2; two tabs share the draft.
- **Bohoka checks:** move back and forth through the steps.

### 4.2 Step 2: date, window, delivery or collection
- **Read:** §5.2; §10.3 (the hold); §10.4 (capacity); ANIM-21; UI-05; the calendar states in `1102:9278`.
- **Build:**
  - the calendar with day labels, lead time, caps and closed days;
  - the 20-minute hold with its countdown (steps 3–4);
  - delivery windows;
  - postcode area check;
  - collection;
  - “Show me {Month} →” when a month is full.
- **Tests:** capacity with holds; the hold expiry; the extension limits; lead time; DST; the postcode district matcher (§11.1).
- **Bohoka checks:** pick days, full days and closed days; let a hold run out (shortened in the test environment).

### 4.3 Step 3: your details
- **Read:** §5.3; §10.8; ANIM-19; the consent box (D16) and its Figma frame `1797:13110`.
- **Build:**
  - the fields;
  - validation;
  - the allergy note with the consent box (stored with timestamp and wording);
  - marketing consent;
  - international phone numbers.
- **Tests:** every validation; consent storage; the box appears and disappears with the note.
- **Bohoka checks:** fill it wrong, then right, on the phone.

### 4.4 Step 4: review and the payment element
- **Read:** §5.4; §10.6; the Your details block (`1797:13126` / `13136` / `13146`); UI-03.
- **Build:**
  - the review (cakes, handover, your details with Change links, totals, before-you-pay terms);
  - Stripe Express Checkout and the Payment Element in test mode;
  - one PaymentIntent per draft (idempotency key);
  - the in-button status.
- **Tests:** the PaymentIntent created once; amounts match the snapshot; no card data on the server.
- **Bohoka checks:** pay with the Stripe test cards (success).

### 4.5 Every payment outcome
- **Read:** §5.5 completely; §10.6; §12 (reconciliation); states `983:9087`.
- **Build:**
  - decline, 3DS, processing, closed-tab, double-click and expired-hold paths;
  - the webhook handler with signature check;
  - the reconciliation job;
  - “Check this payment” alerts (logged until phase 5).
- **Tests:** each Stripe test card of §5.5; webhook replay is idempotent; reconciliation picks up a missed success.
- **Bohoka checks:** a Hungarian table of every outcome with the test card used; he tries two of them.

### 4.6 Order confirmed and the mascot
- **Read:** §5.6; ANIM-25; frames `643:3478`, `836:6509`, `1558:10938`.
- **Build:**
  - order creation from the snapshot (§1);
  - the confirmed page;
  - the mascot greeting once per order.
- **Tests:** the snapshot is immutable; the greeting plays once (reload: no).
- **Bohoka checks:** complete an order on phone and desktop.

**Phase 4 review gate.**

---

## Phase 5 — E-mails

### 5.1 The e-mail system
- **Read:** §8.4 completely; §8.1 header and footer row; the template section `1128:9106`.
- **Build:**
  - a template framework (header with the PNG logo, footer from the kept business facts, preheader, plain-text part);
  - the Postmark adapter with streams;
  - the send log;
  - never-twice keys;
  - the retry queue;
  - a dev mail catcher;
  - a `/dev/emails` preview page with sample data.
- **Tests:** never-twice; retry deadlines; plain-text generation.
- **Bohoka checks:** `/dev/emails` next to the Figma e-mails.

### 5.2 Order e-mails 1, 2, 3, 3b, 4
- **Read:**
  - §8.1 rows 1–4 and their variants;
  - §8.2;
  - §12 (06:00, 07:00, 08:00 jobs);
  - the full e-mail 1 `1800:13257`;
  - the PDF rule (terms and cancellations revisions).
- **Build:** the templates, triggers and jobs; the PDFs from stored revisions.
- **Tests:** selection rules per order type; the rights paragraph variants by date; job catch-up.
- **Bohoka checks:** place an order in dev and receive e-mail 1 in the mail catcher; trigger the jobs from a dev button.

### 5.3 E-mails 5, 6, 8, 12, 13, 15, 16, 17, 18 and unsubscribe
- **Read:** §8.1 rows and variants; §6.10; frames `1800:12959` (18), `1800:13044` (16), `1800:13148` (17), `1167:9106` / `1167:9144` (5).
- **Build:** each template and trigger; the Google review links (only with a Place ID); the one-click opt-outs.
- **Tests:** consent and suppression rules for 5; no gating in 18; the e-mail 18 timing rules.
- **Bohoka checks:** each e-mail in `/dev/emails`.

### 5.4 Linda’s and system e-mails
- **Read:** §8.3; the board `1800:13441`.
- **Build:** the alerts, the sign-in code and the invite templates; wire the alerts logged in earlier phases.
- **Tests:** one alert per event.
- **Bohoka checks:** the list in `/dev/emails`.

**Phase 5 review gate.**

---

## Phase 6 — After ordering

### 6.1 Token links and the status page
- **Read:** §10.5; §6.1–6.3; states `1036:9106`.
- **Build:**
  - the token issuing, expiry and the second check;
  - the status page states A–E (with the Leave a Google review button `1797:13105` / `13107`).
- **Tests:** the state precedence of §6.2; expiry; `noindex` and `no-referrer`; wrong second-check limits.
- **Bohoka checks:** open the status link of seeded orders in each state.

### 6.2 Change your order
- **Read:** §6.4; ANIM-19; ANIM-20; the A3 editors `1799:12959`, `1799:13052`; states `1036:9222`.
- **Build:**
  - the editors (one open at a time, Undo);
  - size-up with payment;
  - size-down with refund;
  - the date move with its hold;
  - the window closing while open (A2);
  - version checks.
- **Tests:** every money case in pence; the refund-tier base (earliest date); a stale page saves nothing.
- **Bohoka checks:** change size up and down and the date, in test mode.

### 6.3 Cancel your order
- **Read:** §6.6; §10.1 tiers; §10.6 refunds.
- **Build:** the cancel page; Stripe refunds; e-mail 8.
- **Tests:** full, half and none by date; refund failure path.
- **Bohoka checks:** cancel two seeded orders at different dates.

### 6.4 Message Linda and Find my order
- **Read:** §6.5, §6.7.
- **Build:** both pages and e-mail 16.
- **Tests:** rate limits; the order matching rules.
- **Bohoka checks:** find an order by e-mail and by number.

### 6.5 Delivery day: Nobody was in
- **Read:** §6.8; states `1102:9106`, `1199:9206` · G, H.
- **Build:** the choice page; the redelivery payment; e-mail 13 variants.
- **Tests:** after 18:00; closed tomorrow; a second attempt.
- **Bohoka checks:** both choices.

### 6.6 Pay for your cake and Unsubscribe
- **Read:** §6.9, §6.10; frames `1598:10573` / `1598:10598`, `1199:9206` · J.
- **Build:** both token pages.
- **Tests:** link lifetime; nothing changes on GET for unsubscribe.
- **Bohoka checks:** pay a link in test mode; unsubscribe.

**Phase 6 review gate.**

---

## Phase 7 — Bespoke and complaints

### 7.1 Bespoke enquiry form
- **Read:** §7.1; consent boxes (`1797:13114` / `13122` / `13118`); the uploads in §10.10.
- **Build:**
  - the form (pills, dates with warnings, pictures upload via signed URLs, inspired-by card, dietary consent);
  - the send-with-missing summary;
  - spam handling.
- **Tests:** every rule in §7.1; upload limits; retention.
- **Bohoka checks:** send an enquiry with and without pictures on the phone.

### 7.2 Enquiry sent and Your enquiry
- **Read:** §7.2; e-mail 6.
- **Build:** both pages and e-mail 6.
- **Bohoka checks:** the read-only page from e-mail 6.

### 7.3 Complaints
- **Read:** §7.5; e-mail 17.
- **Build:** the form on the Complaints procedure page, the sent page, references, e-mail 17.
- **Bohoka checks:** send a complaint.

**Phase 7 review gate.**

---

## Phase 8 — Admin core (desktop layout from 1024 px, phone layout below; no public motion rules)

### 8.1 Sign in, sessions, roles
- **Read:** §9.1, §9.2, §9.15 (roles, the first Owner), the Helper matrix; frames `Admin / 1`, `1801:13621`, `1801:13646`, mobile 8.
- **Build:** e-mail code sign-in (10 min, 5 tries, 30-day session), the first-Owner bootstrap, role checks on every request.
- **Tests:** the code rules; Helper permissions; session expiry.
- **Bohoka checks:** sign in on the phone and desktop with the dev mail catcher.

### 8.2 Admin shell
- **Read:** §9.1; the sidebar and tab bar components; §9.17 home-screen app (with Not now `1801:13703`).
- **Build:** the layout, navigation, the two-people-at-once version checks, the PWA manifest.
- **Bohoka checks:** move around the admin on the phone and desktop.

### 8.3 Today
- **Read:** §9.3; frames `Admin / 2`, mobile 1, `Admin / 21` (Nobody was in), `Admin / 20` (Send a text).
- **Build:** today’s rows, Mark handed over, Send a text, Nobody was in, Not collected yet, e-mail 4 alignment.
- **Bohoka checks:** today with the seeded orders.

### 8.4 Orders and Order detail
- **Read:** §9.4, §9.5; frames `Admin / 3`, `Admin / 5`, mobile 2, 3.
- **Build:** the list with filters and search; the order detail with every action except those in 8.5–8.7.
- **Bohoka checks:** open the seeded orders.

### 8.5 Add an order
- **Read:** §9.6; frames `Admin / 22`, mobile 23.
- **Build:** the manual order with caps warnings and e-mails switch.
- **Bohoka checks:** add a bespoke order.

### 8.6 Change the order
- **Read:** §9.7; frames `Admin / 18`, mobile 20, `1801:13154` (Add a cake).
- **Build:** Linda’s changes, add or remove a cake, money effects, e-mail 12 / 15.
- **Bohoka checks:** change a paid order.

### 8.7 Payment links, Record a payment, Record a refund
- **Read:** §9.8; §9.5 rows; frames `Admin / 24`, `1801:12967`, `1801:13035`.
- **Build:** the three dialogs (the phone variants as sheets).
- **Bohoka checks:** send a link, pay it in test mode, record cash.

### 8.8 Money
- **Read:** §9.9; §13 (tiles).
- **Build:** the money screen with flags.
- **Bohoka checks:** the totals against the seeded data.

**Phase 8 review gate.**

---

## Phase 9 — Admin content and settings

### 9.1 Cakes and Add or edit a cake
- **Read:** §9.13; §5.8; frames `Admin / 8`, `Admin / 9`, `9b`, `9c`, `1801:13494` (cake allergens), mobile 4, 6, 6b.
- **Build:** the list with drag order; the full form (sizes, options, allergens, categories, visibility); delete and hide.
- **Bohoka checks:** add a cake end to end and see it on the site.

### 9.2 Media pipeline and the card video
- **Read:** §9.13 media rows; the video rules doc (admin upload); `1801:13221`.
- **Build:**
  - photo upload (HEIC), focal point, alt text, reorder, remove;
  - video conversion;
  - card video validation, renditions, key frame at 0 and the frame-0 still;
  - the closed / open crop preview.
- **Tests:** a wrong-size or wrong-length video is refused with the exact text; renditions exist.
- **Bohoka checks:** upload a photo from his phone and a test card video.

### 9.3 Availability
- **Read:** §9.11; §11.2.
- **Build:** caps, lead times, closed days and ranges.
- **Bohoka checks:** close a day and see it closed in checkout.

### 9.4 Content: FAQ, legal pages, page photos
- **Read:** §9.12; §11.8.
- **Build:** the editors with placeholder chips and revisions.
- **Bohoka checks:** edit an FAQ answer and a legal page.

### 9.5 Gallery admin
- **Read:** §9.18.
- **Build:** the gallery management and the Home picks.
- **Bohoka checks:** add, hide and reorder photos.

### 9.6 Google reviews
- **Read:** §9.12 Google reviews row; §11.4; §12; frames `1797:12951`, `1797:13035`.
- **Build:**
  - the Business Profile adapter (OAuth Connect Google, sync, delete removed);
  - the Places fallback (5 reviews);
  - Check now;
  - the read-only screen.
- **Tests:** against recorded API fixtures.
- **Bohoka checks:** the screen with fixtures; the live connection waits for Linda (§14.1).

### 9.7 Emails, Settings, Team
- **Read:** §9.14, §9.15, §9.16; frames `Admin / 14`, `15`, `17`, `1801:13103`.
- **Build:** the switches with send-a-test; every setting with its effect; invites, roles, devices, edit a member.
- **Bohoka checks:** change the delivery charge and see it in checkout.

### 9.8 Enquiries and complaints
- **Read:** §9.10; frames `Admin / 6`, `7`, `1801:13272`, `1801:13318`, `1801:13365`.
- **Build:** the lists, the details, Turn into an order, customer data actions.
- **Bohoka checks:** turn an enquiry into an order.

### 9.9 Print, CSV, export, delete
- **Read:** §9.17; §10.10.
- **Build:** the daily print, CSV, customer export and delete.
- **Tests:** what is kept after a delete (tax records).
- **Bohoka checks:** export and delete a seeded customer.

**Phase 9 review gate.**

---

## Phase 10 — Hardening

### 10.1 Jobs complete
- **Read:** §12 all rows.
- **Build:** every job with keys and catch-up; a `/dev/jobs` page that runs them on demand.
- **Tests:** a job missed overnight runs at start-up.

### 10.2 Privacy, limits, security
- **Read:** §10.9, §10.10, §10.14.
- **Build:** the retention jobs, rate limits, CSRF, CSP (allowing Stripe), headers, logging without personal data.
- **Tests:** a header check; limits; retention.

### 10.3 SEO
- **Read:** §10.12.
- **Build:** titles, descriptions, canonical, sitemap with visible cakes, social cards.

### 10.4 Accessibility and motion acceptance
- **Read:** §10.13; A§9 (the whole checklist); the acceptance lines of every ANIM.
- **Build:** fixes only.
- **Tests:** axe on every route; keyboard-only run-through of checkout; screen reader spot checks; reduced motion on every page.
- **Bohoka checks:** a Hungarian checklist he can tick on his phone.

### 10.5 Performance and devices
- **Build:** image sizes and formats, font loading, LCP, bundle size.
- **Tests:** Lighthouse ≥ 90 on Home, catalogue, cake page and checkout (mobile); Safari iOS, Chrome Android, desktop Chrome / Safari / Firefox / Edge.

**Phase 10 review gate.**

---

## Phase 11 — Launch (only with Bohoka)

### 11.1 Staging
- Deploy to a UK-region host with backups, monitoring and error alerts; staging runs in Stripe test mode.

### 11.2 Live configuration
- Linda’s accounts and keys (§14.1): Stripe live, Postmark domain records, Google Place ID and API, the domain.
- Only with Bohoka present; never paste a secret into a report.

### 11.3 Content and go-live
- Import Linda’s real cakes, photos and texts.
- Final run of A§9 and every acceptance line.
- A real small test order (refunded).
- Go live only after Bohoka writes “indulhat”.

---

## PROGRESS.md template (create in slice 0.1)

```
# Progress — Baked by Linda build

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 0.1 | Repository, tooling, logs | ☐ | | |
| … | (every slice above) | | | |

## Current slice
- Slice:
- Files:
- Tests planned:
- Proposals involved:

## Later (noticed, belongs to another slice)
-
```
