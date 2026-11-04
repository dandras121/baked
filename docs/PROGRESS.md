# Progress — Baked by Linda build

Status: ☐ not started · ◐ in progress / waiting for Bohoka · ☑ accepted.
Branch per phase (`phase-00-foundations`, …), one commit per accepted slice, tag per accepted phase (`phase-00-done`).

## Phase 0 — Foundations

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 0.1 | Repository, tooling, logs | ☑ | 03beb53 | 2026-10-26 |
| 0.2 | Design tokens, fonts, base styles | ☑ | d76830a | 2026-10-26 |
| 0.3 | Layout, breakpoints, page shell skeleton | ☑ | 8f2d8ef | 2026-10-26 |
| 0.4 | Interaction and motion core | ☑ | fa41ed7 | 2026-10-26 |
| 0.5a | Base components: buttons, links, pills, fields, choices (split 2026-10-28) | ☑ | d8eba03 | 2026-10-28 |
| 0.5b | Base components: notices, dialog, bottom sheet | ☑ | c0813bc | 2026-10-28 |
| 0.5c | Base components: slider indicator, drop-down row | ☑ | 378ca3a | 2026-10-28 |
| 0.6 | Data layer, money, time, settings | ☑ | 1855bc6 | 2026-10-28 |

## Phase 1 — The shell on every public page

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 1.1 | Desktop header, navigation, sticky shadow | ☑ | fc152e1 | 2026-10-29 |
| 1.2 | Phone and tablet header, menu overlay | ☑ | 668f1b2, 9d269d8, 61980bc | 2026-10-30 |
| 1.3 | Header mascot | ☑ | c8312e6, 40cdb2e | 2026-10-30 |
| 1.4 | Footer and footer mascot | ☑ | 5971ac9, 53d85a0 | 2026-10-30 |
| 1.5 | Cookie bar, panel, consent | ☑ | 88a3dcd, aad7e8a | 2026-10-30 |
| 1.6 | 404, 500, SEO basics | ☑ | 801c21e | 2026-10-30 |

## Phase 2 — Content pages

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 2.1 | Home: hero and fixed sections | ☑ | ac869c7 | 2026-10-31 “mehet” |
| 2.2 | Home testimonials = Google reviews | ☑ | ac869c7 | 2026-10-31 “mehet” (row starts with the newest in the centre) |
| 2.3 | Home cake row and Special idea | ☑ | ac869c7 | 2026-10-31 “mehet” (ten cakes, indicator under the row) |
| 2.4 | About Linda | ☑ | f729564 | 2026-10-31 “mehet” |
| 2.5 | FAQ | ☑ | eca244d | 2026-10-31 “mehet tovább” |
| 2.6 | Legal pages and Allergen information | ☑ | 850e42e | 2026-10-31 “menj tovább” |
| 2.7 | Contact and Message sent | ☑ | 3297269 | 2026-10-31 “mehet” |
| 2.8a | Gallery: grid, Show the next, photo fade-in (split, CLAUDE.md §4.4) | ☑ | d5c0eb4 | 2026-10-31 “mehet” |
| 2.8b | Gallery lightbox (ANIM-14) | ☑ | a0a2973 | 2026-10-31 “mehet” |

## Phase 3 — Catalogue and cake page

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 3.1 | Cake data model | ✅ accepted 2026-10-31 | 3b4a451 | |
| 3.2 | The full range: grid, filters, pages | ✅ accepted 2026-10-31 | 64bf8e9 | |
| 3.3 | Search field and the result motion | ✅ accepted 2026-10-31 | e7e1751 | |
| 3.4a | Cake card open / close (ANIM-11) | ✅ accepted 2026-10-31 | 7e2c6a5 | |
| 3.4b | Card video | ✅ accepted 2026-10-31 | | |
| 3.5 | Cake page: media | ✅ accepted 2026-10-31 | ca16ef4 | |
| 3.6a | Cake page: sizes, options, price, allergens | ✅ accepted 2026-10-31 | 1f46868 | |
| 3.6b | Cake page: inscription, Add to your order, the draft, the 5-cake cap | ✅ accepted 2026-11-01 | c9682f6 | |
| 3.6c | Cake page: edit mode `?line=`, Save this cake, “Your order was cleared” | ✅ accepted 2026-11-01 | c52ad30 | |

## Phase 4 — Checkout (Stripe test mode)

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 4.1 | Draft, routing, stepper | ✅ accepted 2026-11-01 | 3a1fda8 | |
| 4.2a | Step 2: calendar, capacity, the 20-minute hold | ✅ accepted 2026-11-01 | eb90afe | |
| 4.2b | Step 2: delivery or collection, windows, postcode | ✅ accepted 2026-11-01 | | |
| 4.2c | “My order” floating button and panel (Bohoka 2026-11-01) | ✅ accepted 2026-11-04 | e266b29 | |
| 4.3 | Step 3: your details | ✅ accepted 2026-11-04 | e97175e | |
| 4.4a | Step 4: the review (order, handover, your details, BEFORE YOU PAY, Due today) | ◐ built, waiting for Bohoka | | |
| 4.4b | Step 4: Stripe Express Checkout + card Payment Element, one PaymentIntent per draft | ☐ (needs the Stripe test keys) | | |
| 4.5a | Payment outcomes on the page (decline, 3D Secure, processing, expired hold) | ☐ | | |
| 4.5b | Stripe webhook and reconciliation | ☐ | | |
| 4.6 | Order confirmed and the mascot | ☐ | | |

## Phase 5 — E-mails

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 5.1 | The e-mail system | ☐ | | |
| 5.2 | Order e-mails 1, 2, 3, 3b, 4 | ☐ | | |
| 5.3 | E-mails 5, 6, 8, 12, 13, 15, 16, 17, 18 and unsubscribe | ☐ | | |
| 5.4 | Linda’s and system e-mails | ☐ | | |

## Phase 6 — After ordering

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 6.1 | Token links and the status page | ☐ | | |
| 6.2 | Change your order | ☐ | | |
| 6.3 | Cancel your order | ☐ | | |
| 6.4 | Message Linda and Find my order | ☐ | | |
| 6.5 | Delivery day: Nobody was in | ☐ | | |
| 6.6 | Pay for your cake and Unsubscribe | ☐ | | |

## Phase 7 — Bespoke and complaints

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 7.1 | Bespoke enquiry form | ☐ | | |
| 7.2 | Enquiry sent and Your enquiry | ☐ | | |
| 7.3 | Complaints | ☐ | | |

## Phase 8 — Admin core (desktop layout from 1024 px, phone layout below; no public motion rules)

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 8.1 | Sign in, sessions, roles | ☐ | | |
| 8.2 | Admin shell | ☐ | | |
| 8.3 | Today | ☐ | | |
| 8.4 | Orders and Order detail | ☐ | | |
| 8.5 | Add an order | ☐ | | |
| 8.6 | Change the order | ☐ | | |
| 8.7 | Payment links, Record a payment, Record a refund | ☐ | | |
| 8.8 | Money | ☐ | | |

## Phase 9 — Admin content and settings

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 9.1 | Cakes and Add or edit a cake | ☐ | | |
| 9.2 | Media pipeline and the card video | ☐ | | |
| 9.3 | Availability | ☐ | | |
| 9.4 | Content: FAQ, legal pages, page photos | ☐ | | |
| 9.5 | Gallery admin | ☐ | | |
| 9.6 | Google reviews | ☐ | | |
| 9.7 | Emails, Settings, Team | ☐ | | |
| 9.8 | Enquiries and complaints | ☐ | | |
| 9.9 | Print, CSV, export, delete | ☐ | | |

## Phase 10 — Hardening

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 10.1 | Jobs complete | ☐ | | |
| 10.2 | Privacy, limits, security | ☐ | | |
| 10.3 | SEO | ☐ | | |
| 10.4 | Accessibility and motion acceptance | ☐ | | |
| 10.5 | Performance and devices | ☐ | | |

## Phase 11 — Launch (only with Bohoka)

| Slice | Title | Status | Commit | Accepted by Bohoka |
|---|---|---|---|---|
| 11.1 | Staging | ☐ | | |
| 11.2 | Live configuration | ☐ | | |
| 11.3 | Content and go-live | ☐ | | |

## Current slice

- **Phase 3 accepted 2026-11-01** (Bohoka “haladj”, then the phase-4 answers); tag `phase-03-done` (local).
- **Phase 4 started 2026-11-01** on branch `phase-04-checkout`. Bohoka's answers: (1a) he makes a Stripe test account and puts `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` into Vercel (Preview + Development) — needed from 4.4; (2a) on previews the date hold is 2 minutes, live stays 20; (3a) 4.2 and 4.5 split up front (4.2a / 4.2b, 4.5a / 4.5b); (4a) the checkout uses the plain heading style (thin Fraunces, no capitals, no violet frame), not the drawn caps labels.
- **4.1 Draft, routing, stepper** — built, waiting for Bohoka. `/order/when`, `/order/details`, `/order/pay` (per visit, `instant = false` + `connection()`): no draft → /cakes, a cleared one → /cakes with the message (proxy); 0 cakes → “There is nothing in your order” (1096:9106 · C); a later step before step 2 is complete → step 2 (`src/lib/checkout.ts` allowedStep + tests). The stepper on every step and on the cake page (step 1): completed steps carry a tick and are links (step 1 = edit mode for the last cake added), the current one `aria-current="step"`; phone: four dots and “Step 2 of 4 · When & where”. The order summary column (desktop and tablet) with Edit / Remove (a form, works without JavaScript), “Date · Not chosen yet” and the total. Heading band “Name a day.” / “A few details left.” / “One last look.”; ← back links; ANIM-18 rise on load. The steps' own forms: 4.2a–4.4. Also fixed: the cake page video read reduced motion during hydration (React #418 with reduced motion on). Files: `src/components/checkout/*`, `src/app/(site)/order/{when,details,pay}/page.tsx`, `src/app/(site)/order/actions.ts`, `src/db/draft-repo.ts` (removeLine, lastAdded, summary fields). Tests: `src/lib/checkout.test.ts`, `e2e/checkout-steps.spec.ts`. Later: the phone summary bar and panel (4.2b); the summary's handover row and the hold shrinking on Remove (4.2a/b); the full ANIM-18 cross-step motion and the connector fill with client navigation (4.2a, once a step has a Continue).
- **4.2a Calendar, capacity, the hold** — built, waiting for Bohoka. Step 2: the calendar (the current month and 12 more, opens on the first month with a free day; days as a radio group, arrows by day and week, unavailable days focusable but not choosable; ‹ › with back disabled in the first month, the last month's bespoke line, “Show me {Month} →” for a full month, “no free dates” with the bespoke link), the caption from the lead time, “Continue and I will hold … for 20 minutes.”, Continue / Your details. The server re-checks under one advisory lock and takes the hold (`drafts.hold_*`, migration 0009): same date renews (at most 2 extensions, then kept), another date replaces it, two live holds per connection (a salted hash), B with three nearest dates when the day went. Steps 3–4: “{date} is held for m:ss” from the server's expiry, Keep holding at 2 minutes (when an extension is left and the day is free) or the last-extension line, “Your twenty minutes are up” with chips (the same date first) when it ran out; screen readers hear 5 and 1 minutes. The summary shows the held date; removing the last cake releases the hold. Hold length: 20; 2 on previews (VERCEL_ENV=preview, Bohoka 2a); `BBL_HOLD_MINUTES` overrides for tests. Orders join the counts in 4.6. Files: `src/lib/{capacity,hold}.ts` (+ tests: lead time, daily / weekly caps, closed days, all cakes count, own hold, 13 months across the year end, DST month, nearest dates, caption), `src/db/hold-repo.ts` (+ DB tests: counts, the last slot under two buyers at once, expiry, renewals and the limit, Keep holding, moving, the connection limit, closed / too soon, shrink and release), `src/app/(site)/order/actions.ts`, `src/components/checkout/{when-calendar,hold-line,date-chips,checkout-step}.tsx`. Tests: `e2e/checkout-when.spec.ts` (each test its own connection; spread over later months).
- **4.2b Delivery or collection** — accepted 2026-11-01 (“ha megy minden, jöhet a következő”; full suite green: 733 + the 18 hero tests re-run with the placeholder build, 85 home/checkout green). Also the line under the windows (637:3297): “Free across {area}. I will text you that morning with a tighter window.” Step 2 now has two columns on tablet and desktop (calendar · “How would you like it?”), stacked on the phone. Delivered to you / Collect from me as two cards (the delivery text and the collection address come from Settings); for delivery Address, Town, Postcode (upper case with one space; on blur checked against Settings → postcode districts, ranges with the same letters, numbers inclusive) and the three windows (phone: names only, times in the accessible name). A postcode outside the area shows “I do not deliver to G2 — it is outside Edinburgh & the Lothians.” + “Collection is still open …” and Continue does not go on; Collect clears it. Errors on Continue under each group, focus to the first. Continue validates, takes the hold and saves the handover (migration 0010: drafts.handover / address / town / postcode / delivery_window); step 2 counts as done only with both. Typed address fields stay in the draft when Collect is chosen. Summary: the handover row (“Delivery · evening · Free” / “Collection time · Agreed with Linda”), the delivery charge in the total. Phone: the sticky bar (“£185” · “1 cake · delivery free” · “Held 19:42” · Continue →, which submits step 2), tapping it opens the order as a bottom sheet with Edit / Remove; hidden while the keyboard is open; the page keeps room for it. Fixed on the way: React reset the step-2 form after each submit, unticking the chosen radios while the page still showed them chosen — the form now posts without that reset. Files: `src/lib/handover.ts` (+ tests), `src/components/checkout/{handover-fields,summary-bar,when-calendar,checkout-step,order-summary}.tsx`, `checkout.module.css`, `src/app/(site)/order/actions.ts`, `src/db/{schema,draft-repo}.ts`, `drizzle/0010_handover.sql`. Tests: `src/lib/handover.test.ts`, `e2e/checkout-where.spec.ts`, `e2e/checkout-when.spec.ts` (now chooses collection). Later: the summary follows the saved answers (it changes after Continue, not while typing); the bar's Continue on step 3 arrives with step 3's form (4.3).
- **4.2c My order** — built, waiting for Bohoka. A plain round outline button “My order” (Bohoka: the text only; screen readers also hear the number of cakes) fixed at the bottom left of every public page, Home included, once the order holds a cake; never on the checkout steps. It reads the order from `GET /api/order` (no-store; without the draft cookie it answers at once without the database), so the pages stay static; it reads again after each navigation and right after Add on the cake page. Pressing it opens “Your order” (a dialog; a bottom sheet on touch, ANIM-12/13): every cake with its details and price, Edit (the cake in edit mode, Save comes back to step 2) / Remove (at once, server action; the last one closes the panel and hides the button), the total and “Continue to date and delivery →”. In the last 140 px of a page the button fades away so the footer's last row (“Cookie preferences”) stays free — the footer itself is not changed. Files: `src/components/my-order/*`, `src/lib/my-order.ts` (+ tests), `src/app/api/order/route.ts`, `src/app/(site)/order/actions.ts` (removeFromMyOrder), `src/app/(site)/layout.tsx`, `src/components/cake-page/cake-page.tsx` (the order-changed signal). Tests: `src/lib/my-order.test.ts`, `e2e/my-order.spec.ts`.
- **Bohoka 2026-11-01 (during 4.2c):** (1) the “My order” button steps aside while the phone and tablet menu is open (no menu item for it, his choice); (2) Linda's Facebook page `https://www.facebook.com/share/1Mbri3RQMk/?mibextid=wwXIfr` is now the starting Settings value, and the deploy step fills it once where Settings still have it empty (never over a saved address) — so the menu and the Home social band show Facebook beside Instagram.
- **Bug fix (Bohoka 2026-11-01: “scrolling sometimes freezes, some presses do nothing”).** Cause: a dialog or sheet (`src/components/ui/overlay.tsx`) locks the page's scrolling while open; leaving the page while one was open (Continue / Edit in “My order”, Edit in the phone order sheet, Back) unmounted or hid it before it could unlock, so the page stayed frozen, and a panel hidden by the router kept its “open” state so the next press changed nothing. Fix: the overlay closes itself and releases the lock when it unmounts or is hidden; a link inside it closes it on the way; back on a hidden page a panel left open tells its parent it is closed; the lock is released only when no overlay is open. Tests: `e2e/overlay-leave.spec.ts`.
- **Speed (Bohoka 2026-11-01: “nagyon lassan töltenek az oldalak”).** Measured on the preview: the server answers in 0.15–0.5 s (the cake page 1.2 s only on a cold first hit); throttled (4× CPU, fast 3G) Home paints at 1.8 s, other pages 0.4–0.7 s. Done now: Fraunces instanced to the drawn axes (SOFT 0, WONK 1 fixed; wght 200–700; opsz kept) — 493 KB → 264 KB, outlines within 0.1 % of an em; a cake video no longer fetches until it is the one shown (207 KB less on every cake page). Later (10.5 / launch): the server region (previews run in iad1, Washington — for UK customers lhr1, with the database in the same region); previews also load Vercel's toolbar, the live site does not.
- **4.4 split (CLAUDE.md §4.4, over 600 lines):** 4.4a the review without Stripe; 4.4b the payment (Stripe test keys needed in Vercel and locally).
- **4.4a One last look** — built, waiting for Bohoka. `/order/pay` (step 3 must be done): Your order (one block per cake: name, tiers · serves · options · “inscription” / no message, price, the cake's “Contains …” sentence, Edit → the cake in edit mode returning to step 4, Remove), the handover line (“Delivery · {date}, {window} · Free” / “Collection · {date}, at a time we agree · Free”), Total, Your details (name, e-mail · phone, Change → step 3; delivery address, Change → step 2). BEFORE YOU PAY worked out when the page loads (London): the 14-day exclusion; more than seven days away the tiers as drawn + “Changes and cancelling online until 23:59 two days before your date.” + the earliest-date line; seven days or less “Cancel online until 23:59 on {D-2} for half the price back.”; change window closed (guard) “Changes and cancellation go through me.”; “You pay in full today…”; the kitchen sentence once (Settings minus every cake's allergens; left out when empty). Due today and “Nothing further to pay…”; the payment block is a stub until 4.4b. Phone: the hold line sticks under the stepper. Files: `src/lib/review.ts` (+ tests), `src/components/checkout/review-step.tsx`, `checkout-step.tsx`, `checkout.module.css`, `src/db/draft-repo.ts` (allergenText, allergenKeys). Tests: `src/lib/review.test.ts`, `e2e/checkout-review.spec.ts`.
- **Bohoka 2026-11-04: a cut design element in “Special idea?” on a large screen.** Audit of 11 pages at 1280/1440/1920/2560 (and 402/1024) for decorations cut inside the screen (`.shots/tmp/cut-audit.mjs`): the soft glow behind “We got you.” and “Special idea?” was cut by its section, which on large screens is narrower than the screen. Fix: there the sections let it through and the page clips at the screen edge; the glow picture is now transparent (its off-white ground showed as a faint box once its edges were on screen; over white it looks the same as before).
- **Bohoka 2026-11-04 (after 4.3):** (1) the lightbox on desktop and on a landscape tablet puts the caption box beside the photo, so the photo is as tall as the screen allows (1280×800: 474 → 731 px; landscape iPad 1366×1024: 597 → 870 px; twice would not fit the screen height); (2) every new cake replays the violet pop of “My order” (the button is drawn afresh when the count goes up); (3) on touch screens “My order” opens as a bottom sheet across the whole width (iPad too, both ways round); (4) large screens: above 1280 px the 1280 design grows with the width up to 2560 (--u, --type-scale via tan(atan2()), --page-max 2560, the header's height, emblem, wordmark and menu gaps); (5) found on the way: coming back to a cake page within the site showed the old “Added to your order” panel — the cake page now starts afresh on every visit (`FreshOnVisit`).
- **4.3 Your details** — built, waiting for Bohoka. `/order/details`: How I reach you (name 2–80, e-mail, a mobile — UK 07…/+44 7… or international with its country code, stored in E.164), Who is the cake for? (optional, 80), one line per cake “{Cake} contains …” above the allergy note (optional, 400) with the helper naming the kitchen list from Settings; the consent box shows only while the note has text, never pre-ticked, required then (D16); the terms box (links to /terms and /cancellations in a new tab, required) and the yearly e-mail box (optional), the note under them. Messages under each field (beside the boxes), focus to the first, a message goes when its field is changed. Answers saved when a field is left (a refresh keeps them) and on Continue; a complete Continue records the allergy consent with time and wording, the terms acceptance with the Terms and Cancellations revision ids, the e-mail opt-in with its wording, then step 4; step 4 opens only when step 3 is done. Migration 0011 (drafts: customer_name, email, phone, phone_e164, cake_for, allergy_note, allergy_consent_at/_wording, terms_accepted_at, terms/cancellations_revision_id, marketing_opt_in, marketing_wording). The phone bar's Continue submits step 3 too. Files: `src/lib/details.ts` (+ tests), `src/components/checkout/details-form.tsx`, `checkout-step.tsx`, `checkout.module.css`, `src/app/(site)/order/actions.ts`, `src/db/{schema,draft-repo}.ts`. Tests: `src/lib/details.test.ts`, `e2e/checkout-details.spec.ts`.
- **Bohoka 2026-11-04: “sometimes /cakes shows no search, the menu does not open”; on the iPad in landscape no buttons under the sliders.** Likely cause: a page left open while a new preview went live asked for script parts that no longer exist (pushed many times that day), so React stopped. Fix: `deploymentId` (Vercel deployment id) so navigation from an old page is a full load, and an inline guard that reloads once (at most once a minute) when a script part fails to load (`e2e/stale-version.spec.ts`). Touch screens hide the ‹ › arrows under the Home cake and review rows (landscape iPad shows the desktop layout); the dashes stay. Later (launch): Vercel Skew Protection if the plan has it.
- **Bohoka 2026-11-01: a “My order” button** (new slice 4.2c, after 4.2b): once the draft holds a cake, a very simple floating “My order” button sits at the bottom left of every page — Home included (his explicit answer; the rest of Home stays as it is), not on the checkout steps, which have their own summary. Pressing it opens a small panel (dialog; a bottom sheet on touch) listing every cake in the order with its price, Edit / Remove, the total and “Continue to date and delivery →”, without leaving the page. Not in the docs: logged as Bohoka's decision when built.

- Phase 1 closed 2026-10-30 (gate in the commit “phase 1 review gate”; tag `phase-01-done` local, the git proxy refuses tag pushes).
- **Phase 3 started 2026-10-31** on branch `phase-03-catalogue`. Bohoka's answers: 3.4 and 3.6 are split up front (3.4a card open / close, 3.4b card video; 3.6a sizes, options, price, allergens; 3.6b inscription, add to order, edit mode, limit); the sample catalogue uses the Figma names and drawn values (The Lothian's values where nothing is drawn), 2–3 cakes with options, development and previews only.
- **3.4b Card video** — built, waiting for Bohoka.
- **3.5 Cake page: media** — built, waiting for Bohoka. Files: `src/components/cake-page/*`, `src/lib/cake-page.ts`, `src/db/cake-page-repo.ts`, `src/app/(site)/cakes/[slug]/page.tsx`, sample photos in `public/samples/cake-photos/` (seed: The Lothian 3 photos + the test video, Bramble & Cream 1 photo). Tests: `e2e/cake-page.spec.ts` (arrows stop at the ends, thumbnails, ANIM-22 240 ms, video muted loop / tap to unmute / moving on stops it, reduced motion play button, phone swipe moves the dashes, one-photo and no-photo cakes have no controls, axe). Later: the stepper (4.1); sizes, options, price, allergens (3.6a); the second phone “← Back to the range” at the bottom (3.6b).
- **3.6a Cake page: sizes, options, price, allergens** — built, waiting for Bohoka. Files: `src/lib/cake-config.ts` (+ tests: sizes against the smallest, tier words, price in pence, Includes line, picking rules, allergen line with options and kitchen list), `src/components/cake-page/{cake-page,price-figure}.tsx`, `src/db/cake-page-repo.ts` (options and choices). Tests: `e2e/cake-config.spec.ts`. Later (3.6b): the inscription and its preview, Add to your order with the option checks (“Choose a sponge.”), the draft, edit mode, the 5-cake cap; without JavaScript the price does not update (the order form posts in 3.6b).
- **Design fixes (Bohoka 2026-10-31: “cut-off tops”)** — checked every page at 320–1920 px with three scripted audits: controls cut off by a clipping parent when they grow (ANIM-07), controls painted over by another element, sideways overflow. Fixed: (1) iPhone / iPad zoomed in when a field under 16 px got focus and stayed zoomed, so the page looked cut off — on iOS only the viewport gets maximum-scale=1 (pinch zoom still works there; other browsers keep zoom free); (2) the open phone catalogue card's picture covered the top of View — View is drawn 52 × 28 as in 1777:12896 (44 × 44 hit area) and the bottom row sits above the picture; (3) the phone filter-pill row, the desktop review cards and the cake page thumbnails got room to grow; (4) the Home “View the whole collection” and the review rating link stay above neighbouring blocks. No sideways overflow found. Tests: `e2e/ios-focus-zoom.spec.ts`, “open card: nothing covers the price or View”.
- **3.6b Inscription, Add to your order, draft, cap** — built, waiting for Bohoka. Bohoka accepted 3.1–3.6a and the design fixes 2026-10-31 (“most jó, mehet tovább”). 3.6 was split once more: edit mode and the “cleared” message moved to 3.6c (the slice is still about 1,150 formatted lines with CSS, over the ~600 guide — the parts only work together). Files: `src/lib/order-line.ts` (+ tests: the pipeable set, 24 characters as seen, curly quotes, option errors, the order line, the cap copy), `drizzle/0008_checkout_draft.sql` + `src/db/schema.ts` (drafts, draft_lines), `src/db/draft-repo.ts` (+ DB tests: one draft per cookie, order, 5-cake cap under a row lock incl. two Adds at once, 24-hour expiry), `src/app/(site)/cakes/[slug]/actions.ts` (addToOrder: cap → checks → plain question → add; bbl_session httpOnly 7 days), `src/components/cake-page/{cake-page,cake-order}.tsx`, `src/components/ui/overlay.tsx` (returnFocus), `src/proxy.ts` (/order/* needs a live draft), `/order/when` stand-in (4.2). Tests: `e2e/cake-add.spec.ts` (+ no-JS post).
- **Bohoka 2026-10-31 design requests** — (1) the hero photo runs edge to edge, no frame or rounded corners, the phone slide shorter (402 × 600); (2) the cake page configurator: a coloured card was tried and dropped the same day — Bohoka: simple, white, mostly Quicksand, never a second violet frame; so the configurator is white and all Quicksand, and site-wide the violet focus ring is gone (pressables grow, fields darken their own edge). Files: `src/components/home/hero.module.css`, `src/components/cake-page/cake-page.{tsx,module.css}`, tokens (+2 colour, +1 shadow). `e2e/home.spec.ts`: the “click away” now clicks below the hero (the hero covers the old spot).
- **Bohoka 2026-11-01: simpler cake page** — no numbers, plain Fraunces 500 headings in ink, round outline buttons for sizes and choices (chosen = solid ink), no tier line, preview or hint lines, grey panel edges. Tests updated (`cake-add`, `cake-config`, `cake-page`). Later (3.6c/4.x): the same plain headings on the checkout steps.
- **Bohoka 2026-11-01: the heading style on the other pages** — FAQ, Contact, legal pages, Gallery and the form labels follow the cake page's plain headings. **Rule (Bohoka 2026-11-01): the Home page never changes** — nothing that renders on Home (its sections, header, footer) is restyled without his explicit ask.
- **3.6c Edit mode and the cleared draft** — built, waiting for Bohoka. `/cakes/{slug}?line={id}&from={when|details|pay}` loads that line of the visitor's own draft (size, answers, inscription), the button reads **Save this cake**, saving keeps the line's place and returns to the step (step 2 when unknown); leaving without saving changes nothing; a line that is not theirs shows the normal page. A draft idle for 24 hours is marked `abandoned`; a checkout step then goes to `/cakes?cleared=1` with “Your order was cleared after a day without changes.” (the address is tidied at once), and an Add with that cookie starts a new order and says so in the Added panel. Files: `src/db/draft-repo.ts` (draftStatus, readLine, updateLine + DB tests), `src/app/(site)/cakes/[slug]/actions.ts` (loadLine, edit in addToOrder), `src/lib/order-line.ts` (returnStep + test), `src/components/cake-page/*`, `src/components/catalogue/cleared-notice.tsx`, `src/proxy.ts`. Tests: `e2e/cake-edit.spec.ts`. Later: the Edit links themselves (step 4, the phone panel, “← Back to the cake”) come with phase 4; without JavaScript edit mode shows the normal page (the cake page is static).
- **Phase 3 review gate, 2026-11-01** (Bohoka “haladj ameddig tudsz” after 3.6c):
  - Tests: lint and typecheck clean; 549 unit and database tests; 683 end-to-end (phone, tablet, desktop) green.
  - axe: 0 violations on 78 pages and states at 402 / 1024 / 1280 (every page so far, filtered and searched range, four cake pages, an open cake card, the gallery lightbox, the plain sheet, the added panel, 404).
  - Lighthouse (local production build; performance · accessibility · best practices · SEO, phone / desktop): Home 79 / 99 (100 · 100 · 100); /cakes 86 / 99 (100 · 96 · 100 — best practices: the phone catalogue card's flavour line is drawn at 11 px on a 196 px card, about 10.4 px at 402 wide); The Lothian 90 / 100; Bramble & Cream 91 / 100; Gallery 94 / 100; Contact 93 / 100 (the other categories 100). Phone performance below 90 on Home and /cakes: the largest paint is the pink band texture and the hero photo with the full Fraunces files on simulated slow 4G (Later → 10.5).
  - ANIMATIONS §9, phase-3 lines: ANIM-11 card open / close 500 ms, cake on the bottom edge, title on the gentle curve, fades 250 ms, chevrons, one card at a time, video from frame 0 when fully open, rewinds on close, reduced motion = instant and no video ✓; ANIM-16 filter / search moves cards (leave 120, move 80–320, enter 160–320) ✓; ANIM-17 Show the next stagger ✓; ANIM-20 price figures (out 0–120, in 80–240), instant with reduced motion ✓; ANIM-22 cake media cross-fade 240 ms ✓; ANIM-10 the phone cake media dashes ✓; ANIM-12 / 13 the plain question as dialog / sheet ✓; ANIM-05 the search field, inscription and option text fields ✓; ANIM-07 every new pressable (pills, size and choice buttons, thumbnails, arrows, corner button, View) ✓ — keyboard focus shows as growth, no ring (Bohoka 2026-10-31); UI-08 cake page videos autoplay muted only while active, one at a time, nothing with reduced motion ✓ (gallery videos come with 9.2). Every animation under 1 s ✓; no layout shift (CLS 0 on the cake pages) ✓.
  - Bohoka's design decisions during the phase (DEVIATIONS 2026-10-31 / 11-01): edge-to-edge hero, shorter phone slide; the plain heading style (Fraunces ExtraLight, ink, no numbers or capitals) on the cake page, the lightbox, FAQ, Contact, legal pages, Gallery and form labels; no violet focus ring; the Home page never changes.
  - Files: `src/components/cake-card/card-video.tsx` (fetched on the first open only, 1080 / 1440, starts at 500 ms or when it can play through, loops muted inline without controls, pauses off screen and in a hidden tab, closing cross-fades it to the still in 120 ms and rewinds; reduced motion never starts it), `cake-card.tsx` / CSS (still and video share the crop transform).
  - Tests: `src/lib/card-test-clip.test.ts` (ffprobe: square, 30 fps, 150 frames, key frame at 0, start 0, no audio), `e2e/cake-card.spec.ts` (+4: nothing fetched before the first open, plays only when fully open, loop / muted / no controls / 5 s / the right size, closing stops at frame 0, pauses off screen and resumes, reduced motion never loads).
- **3.4a Cake card open / close (ANIM-11)** — built, waiting for Bohoka.
  - Files: `src/lib/card-crop.ts` (the drawn crops, the rule for any size, the transform that puts a crop into the box), `src/components/cake-card/` (client card: corner button with `aria-expanded`, the open title's place, one open at a time; `card-motion.ts`: Web Animations for the clip, the crop zoom, the title (position on p, size on the gentle curve), the fades and the chevron flip; CSS for both states at every size), `src/lib/home-content.ts` + `src/db/home-repo.ts` (card video in the card data), `src/db/cake-repo.ts` (sample card videos on five cakes), `public/samples/card-video/` (synthetic test clip: 1080 / 1440 MP4, still of frame 0; recipe `scripts/card-test-clip.geq`).
  - Tests: `src/lib/card-crop.test.ts` (drawn crops = JSON, aspect and bottom edge for every card, the rule gives the drawn crops, the transform), `e2e/cake-card.spec.ts` (button only with a card video, 44 px, size and price / View unchanged, title under the grown picture, open crop scale and bottom edge, timings incl. the 120 ms close delay, one open at a time, reduced motion, Home row, axe).
- **3.3 Search field and the result motion** — built, waiting for Bohoka.
  - Files: `src/lib/catalogue-search.ts` (normalising, every word in name / flavour / what it is, name matches first, 2–60 characters, 250 ms, count line), `src/components/catalogue/search-field.tsx`, `use-result-motion.ts` (ANIM-16 with the Web Animations API: leave 0–120, move 80–320, enter 160–320, a newer result starts from where the cards are), `catalogue-grid.tsx` (search, `?q=`, nothing found, Search all designs), `catalogue.ts` (`q` in the address), tokens (+1 colour).
  - Tests: `src/lib/catalogue-search.test.ts`, `e2e/catalogue.spec.ts` (+8: live from 2 characters with `?q=` and the count line, ranking and every word, inside the pill and keeping the text, × and Esc keep the focus, nothing found, shared `?q=`, ANIM-16 timings, reduced motion, axe).
- **3.2 The full range** — built, waiting for Bohoka.
  - Files: `src/lib/catalogue.ts` (designs, offered pills, `?occasion=` / `?shown=`, count line, addresses), `src/db/home-repo.ts` (getCatalogue), `src/components/catalogue/` (page: title, glow, six / three placeholder slots; grid: pills, band, paging, notices), `src/components/cake-card/` (phone catalogue card, 196 × 323 scaled to its column), `public/range/` (band images and their last rows, exported from 1389:10203 and 1443:11132), `src/app/(site)/cakes/page.tsx`, tokens (+1 type).
  - Tests: `src/lib/catalogue.test.ts` (visible / order / categories, offered pills, occasion keys, paging, count line in words and digits, addresses), `e2e/catalogue.spec.ts` (title, pills, 12 in order, 2 / 3 columns without side scroll, filter in place with `?occasion=`, Show the next with focus, ANIM-17 timing and `?shown=24`, shared address and Back from a cake page, unknown occasion, band never rescaled, axe, without JavaScript); `e2e/mobile-menu.spec.ts` (new heading).
  - Not in this slice: the search field (3.3; its place under the pills is kept), the corner button and card video (3.4).
- **3.1 Cake data model** — built, waiting for Bohoka.
  - Files: `src/db/schema.ts` + `drizzle/0007_*` (cakes: allergens, gluten / nut kinds, also contains, categories, inscription switch; cake_options, cake_option_choices, cake_media, cake_card_videos), `src/lib/cakes.ts` (From £, sizes, every rule of §9.13 / §5.8, allergen wording), `src/lib/sample-catalogue.ts` (14 Figma cakes), `src/lib/slug.ts`, `src/db/cake-repo.ts` (insert in one transaction, free slugs, soft delete, sample catalogue, preview replacement of the 2.3 samples), seed and preview setup.
  - Tests: `src/lib/cakes.test.ts` (From £, sorting, name / text / size / option / choice limits, gluten and nut kinds, wording, the catalogue keeps every rule), `src/db/cake-repo.test.ts` (14 in order with options and choices, a rejected cake saves nothing, the database refuses unknown allergens / categories and unnamed gluten / nuts, a deleted cake's address is never reused, hidden and deleted have no page); Home tests updated to the catalogue names.
- **Phase 2 review gate, 2026-10-31** (Bohoka “mehet” on 2.7, 2.8a, 2.8b):
  - Tests: lint, format, typecheck clean; 450 unit and database tests; 504 end-to-end (phone, tablet, desktop) green — the hero timer test once flaky under full load, 9 / 9 alone (→ 10.1). CI green on every phase-2 commit.
  - axe: 0 violations on every page built so far (Home, About, FAQ, the seven legal pages, Contact, Message sent, Gallery and its lightbox, 404, the header, menu, footer and cookie panel).
  - Lighthouse (local production build; performance · accessibility · best practices · SEO): Home phone 78 · 100 · 100 · 100, desktop 99 · 100 · 100 · 100; About 93 / 100; FAQ 95 / 100; Terms 91 / 100; Contact 92 / 100; Gallery 94 / 100 (phone / desktop performance; the other three 100 everywhere). Home phone below 90: fonts and hero image weight (Later → 10.5).
  - ANIMATIONS §9, phase-2 lines: UI-06 crossfade 400 ms, pause on hover / focus, incoming above outgoing, placeholders only in development and previews ✓; ANIM-10 one indicator style (hero, reviews, About phone, cake row, lightbox), ≤ 5 dashes, 360 ms ✓; ANIM-09 FAQ rows 360 ms, exact reverse, one open ✓; UI-07 snap card by card, arrows only on desktop ✓; ANIM-05 on the Contact fields ✓; ANIM-07 on every new pressable (tiles, links, buttons, ‹ ›) ✓; ANIM-14 zoom from the tile ✓; ANIM-17 stagger ✓; ANIM-19 errors ✓; ANIM-23 photo fade ✓; reduced motion = no motion ✓; no layout shift (reviews CLS < 0.01) ✓. Two §9 lines changed by Bohoka's decisions: the tablet ANIM-04 uses the desktop values with the 77 px bar, and the landscape tablet menu items start at y 128 (DEVIATIONS 2026-10-31). UI-08 (gallery videos) has no videos yet (9.2).
  - Tag `phase-02-done` local (the git proxy refuses tag pushes).
- Phase 2 on branch `phase-02-content`. 2.1–2.3 accepted 2026-10-31. Bohoka 2026-10-30: 2.1 stays one slice; on Vercel previews the hero shows the three slides (placeholders 2–3), `?hero=live` shows the live hero alone; production never shows the placeholders.
- Bohoka 2026-10-31: “ha kész menj tovább a következő lépésekre amíg tartanak a tokenek” — 2.6 accepted; the next slices are built one after another, each reported and committed on its own, and Bohoka checks them as they come.
- Tablet header 77 px (Bohoka 2026-10-31, DEVIATIONS); the read-only Figma tools run without a prompt (`.claude/settings.json`).
- **2.8 split in two** (CLAUDE.md §4.4: the whole slice would be well over 600 lines): 2.8a the page, 2.8b the lightbox.
- **2.8b Gallery lightbox (ANIM-14)** — accepted 2026-10-31.
  - Files: `src/components/gallery/lightbox.{tsx,module.css}` (native modal dialog; WAAPI open / close / next; swipe), `src/components/gallery/gallery-grid.tsx` (tiles are buttons; `?photo=` push / replace / Back / Forward; past the loaded tiles), `src/lib/gallery.ts` (photoIndex, stepPhoto, shownFor), tokens (+1 type).
  - Tests: `src/lib/gallery.test.ts` (+3), `e2e/gallery.spec.ts` (+12: open, Esc / ×, Back / Forward, ‹ › and keys without new history entries, ends, dashes ≤ 5 and “Photo n of 30”, past the loaded page, shared link and unknown id, focus never behind, ANIM-14 timings, reduced motion, phone swipe and 44 px hint arrows, axe).
- **2.8a Gallery: grid, Show the next, photo fade-in** — accepted 2026-10-31.
  - Files: `src/lib/gallery.ts` (tiles, paging, intro, 30 sample captions), `src/lib/constants.ts` (OCCASIONS), `src/db/schema.ts` + `drizzle/0006_*` (gallery occasion), `src/db/gallery-repo.ts` (tiles, sample gallery for dev and previews), seed and preview setup, `src/components/gallery/` (page, grid, photo, CSS), `src/app/(site)/gallery/page.tsx`, `/dev/components` (ANIM-23 demo), tokens (+5 type).
  - Tests: `src/lib/gallery.test.ts` (showing only, order, alt, occasion, `?shown=` rules, next N, samples), `e2e/gallery.spec.ts` (title and description, 12 tiles, squares on lilac, one-line captions, 2 / 4 columns, Show the next with focus and no scroll, the end, ANIM-17 timing, reduced motion, shared `?shown=`, ANIM-23 wait and fade, axe, without JavaScript); `e2e/home.spec.ts` (gallery link now shows: the seed has photos), `e2e/mobile-menu.spec.ts` (gallery heading).
- **2.7 Contact and Message sent** — accepted 2026-10-31.
  - Files: `src/lib/contact.ts` (rules, copy, the e-mail to Linda), `src/lib/phone.ts` (E.164, libphonenumber-js), `src/lib/email/adapter.ts` (log only until phase 5), `src/db/schema.ts` + `drizzle/0005_*` (contact_messages, form_sends), `src/db/contact-repo.ts`, `src/app/(site)/contact/{page,actions}.ts(x)`, `src/app/(site)/contact/sent/page.tsx`, `src/components/contact/`, `src/proxy.ts` (Message sent only after a send), `TextArea` counter under the box, tokens (+5 type), `countCharacters` moved to `src/lib/words.ts`.
  - Tests: `src/lib/phone.test.ts`, `src/lib/contact.test.ts` (every rule, copy, the e-mail in London time), `src/db/contact-repo.test.ts` (5 per hour per connection and form, one message per form key, 30-day deletion, hashed connection), `e2e/contact.spec.ts` (details from Settings, empty send, wrong values, live clearing, stored message, sent page, direct opening, honeypot, limit, lost connection, reduced motion, axe, without JavaScript), `e2e/seo.spec.ts` (sent page noindex on its own answer).
  - New dependency: `libphonenumber-js` (phone numbers only; no money, auth, e-mail or uploads).
- **2.6 Legal pages and Allergen information** — accepted 2026-10-31.
  - Files: `src/db/schema.ts` + `drizzle/0004_*` (legal_revisions), `src/db/legal-repo.ts`, `src/lib/legal.ts`, `src/lib/legal-seed.ts`, `src/components/legal/`, `src/app/(site)/legal-route.tsx` and the seven routes, tokens (+7 type).
  - Tests: `src/lib/legal.test.ts` (sections, anchors, format, placeholders, Appendix A), `src/db/legal-repo.test.ts` (seed once, a save is a new revision, the old one kept), `e2e/legal.spec.ts` (every page, On this page jump, cookie panel, ICO links, axe).
  - Still with Linda (§14.1 item 5): the Privacy policy revisions, the analytics provider, the final allergen wording.
- **2.5 FAQ** — accepted 2026-10-31.
  - Files: `src/db/schema.ts` + `drizzle/0003_*` (faq_questions), `src/db/faq-repo.ts`, `src/lib/faq.ts`, `src/components/faq/`, `src/components/ui/drop-down.*` (now `<details>`), `src/app/(site)/faq/page.tsx`, `src/lib/placeholders.ts` (“free”), tokens (+7 type).
  - Tests: `src/lib/faq.test.ts`, `e2e/faq.spec.ts` (order, one open, placeholders, keyboard, #anchor, mailto, axe, without JavaScript), `e2e/slider-dropdown.spec.ts` updated for `<details>`.
- **2.4 About Linda** — accepted 2026-10-31.
  - Files: `src/components/about/` (page, cards, CSS), `src/app/(site)/about/page.tsx`, tokens (+10 type, 1 colour).
  - Tests: `e2e/about.spec.ts` (headings, description from Settings, phone row with indicator and centre on click, side by side and not pressable on tablet / desktop, axe, no side scroll).
- **2.2 Home testimonials = Google reviews** — accepted 2026-10-31.
  - Files: `src/db/schema.ts` + `drizzle/0002_*` (google_reviews, google_rating), `src/db/reviews-repo.ts`, `src/db/fixtures/google-reviews.json`, `src/lib/reviews.ts`, `src/app/api/reviews/route.ts`, `src/components/home/reviews*.{tsx,css}`, seed and preview setup, tokens (+3 type, 2 colour).
  - Tests: `src/lib/reviews.test.ts` (stars, translation dropped, no text, London month, rating format and 30-day rule, cursor / limit, ANIM-10 window with 200), `src/db/reviews-repo.test.ts` (newest first, only with text, every rating, pages without gaps, deleted at next sync), `e2e/reviews.spec.ts` (order, rating name, cut text + Read on Google, ≤ 5 dashes, six per request, one at a time, CLS < 0.01, retry once after 3 s, arrows stop at the last loaded card, empty shape same size, centre on click, API shape).
  - Not in this slice: the daily sync from Google and Check now (12.x / 9.12).
- **2.3 Home cake row and Special idea** — accepted 2026-10-31 (brought forward by Bohoka's answer “Hiányzó blokkok”, 2026-10-30).
  - Files: `src/db/schema.ts` + `drizzle/0001_*` (cakes, cake_sizes, gallery_photos), `src/db/home-repo.ts`, `src/db/seed.ts`, `src/lib/home-content.ts`, `src/components/cake-card/`, `src/components/home/{home-band,cake-carousel,special-idea}.*`, `src/app/(site)/cakes/[slug]/page.tsx` (stand-in), `src/proxy.ts`, tokens (+7 type, 1 colour).
  - Tests: `src/lib/home-content.test.ts` (first five visible in order, smallest size tier line, From = smallest price, picks then newest, hidden never, empty squares, link hidden, alt), `src/db/home-repo.test.ts` (seed, hidden cake, unique live names, size limits, slugs), `e2e/home.spec.ts` (row order and text, View → cake page, arrows / swipe, Special idea), `e2e/seo.spec.ts` (unknown cake = 404).
- **2.1 Home: hero and fixed sections** — accepted 2026-10-31. Fix 1 (Bohoka: “el van csúszva … hero telefonon”): the phone hero text shrinks with the width below 402, so it stays two lines above the supporting line (test at 360 / 375 / 390 / 402). Fix 2 (Bohoka): header wordmark shrinks below 402 so it keeps clear of “menu ›”; “We got you.” / “Local, home baked.” stay one line on iPad; tablet portrait hero is square (Figma 1852:14415, 1852:14437, 1852:14444 added by Claude at Bohoka's request). Next, by Bohoka's answer “Hiányzó blokkok”: the cake row and Special idea (2.3) and the Google reviews (2.2) on Home.
  - Files: `src/components/home/` (hero, hero-slider, home-sections), `src/lib/hero.ts`, `src/app/(site)/page.tsx`, `public/home/*.webp`, tokens (+10 type, 1 colour, 1 shadow), `src/components/ui/social-icons.tsx` (moved out of the mobile menu).
  - Tests: `src/lib/hero.test.ts` (flag, loop, ease samples); `e2e/home.spec.ts` (3 slides, `?hero=live`, 6 s loop, hover / keyboard-focus pause, pause button, reduced motion, crossfade samples 0 / 0.409 / 0.802 / 0.96 / 1 with the incoming slide on top, swipe, Settings town, social band, axe, no side scroll). A production build (`VERCEL_ENV=production`) prerenders the hero with one slide.
  - Proposals: pause button, keyboard-only focus pause, swipe loop, carousel semantics, photo alt, band top without the cake row.

## Later (noticed, belongs to another slice)

- /cakes on the phone, Lighthouse performance 86 (the band texture is the largest paint) and best practices 96 (the catalogue card's 11 px flavour line, as drawn) → 10.5; ask Bohoka about the card text size then.
- The Edit links for a cake in the order (step 4, the phone summary panel, “← Back to the cake” on step 2) and edit mode without JavaScript → 4.1 / 4.4.
- The sample “Pick any you like.” help line on Toppings is sample content; Linda writes her own in the admin → 9.x.
- Home on the phone, Lighthouse performance 78 (LCP 5.0 s on the simulated slow 4G): the two full Fraunces files (normal 118 KB + italic 146 KB) and the 86 KB placeholder hero → subset the fonts (latin, the used axes) and weigh the final hero images → 10.5.
- Flaky under full parallel load (passes alone, 9 / 9): the hero timer test “advances every 6 s” on the tablet project → 10.1.
- Gallery photo upload, focal point crop and the large version → 9.2 / 9.5.

- The daily job (10.1 / §12) must call `purgeContactMessages` (contact messages after 30 days, send counts after a day); Postmark sending of the contact e-mail and its retries → 5.1; `/admin/messages/[id]` → 9.8.
- Production needs `RATE_LIMIT_SALT` set (a long random string) → 11.2.

- The phone order-summary bar and the cookie card stack (§3.3) → slice 4.2 / 4.3.
- The footer links to pages that come later (`/find-my-order`, the legal pages): they 404 until slices 2.6 / 6.4; the 404 page itself → 1.6.

- `e2e/components.spec.ts` “busy” button test (aria-busy on a quick action) failed once in a full local run and passed 3 / 3 on re-run: make its timing robust → slice 10.1 (or the next slice that touches buttons).

- `/` and the stub pages `/cakes`, `/bespoke`, `/gallery`, `/about`, `/faq`, `/contact`, `/terms` (added in 1.1 so the header can be clicked) are replaced by their real pages → slices 2.1, 3.2, 7.1, 2.8, 2.4, 2.5, 2.7, 2.6.
- `/dev/*` pages must not be reachable on the live site (404 in production, or behind admin sign-in) → slice 10.2 (or 11.1 at the latest).
- Launch (11.x): production must use its own database; previews put the Home sample cakes into an empty catalogue (`deploy-setup`, VERCEL_ENV=preview only).
- Flaky under full parallel load (passes alone): the busy-button test → 10.1. (The mascot slide tests were fixed in 2.7: they now hold the slide where it starts, so a slow load cannot end it first.)
- Cake page (3.3): `src/proxy.ts` answers unknown / hidden cake slugs with status 404 (list of visible slugs from the database, kept 60 s). Saving a cake in the admin (9.x) should also clear that list.
- Canonical links, Open Graph images and structured data (§10.12 Other) → with the pages they belong to (2.1 Home, 3.x cake pages) / 10.3.
- Saving Settings must rebuild the 500 page's `site-facts.json` and revalidate the Settings cache → slice 9.x (admin Settings).
- The legacy “Coming soon” files on `main` (`index.html`, `backgrnd.jpg`, `CNAME`, the GitHub Pages workflow and the stray copies in `.github/workflows/`) stay untouched until launch → slice 11.1–11.3 decides how the domain moves to the app.
- Phone type sizes are set per component from the phone frames → each UI slice (1.x onwards).
- The admin does not use the tablet rule (R§5): its layout must set `--type-scale: 1` on `:root` → slice 8.2.
- (Done for the lightbox in 2.8b: a native `<dialog>` in the top layer.) The mobile menu (1.2) is an overlay too: use the browser top layer (`<dialog>` / popover) or portal them outside `.shell`, because the shell is a size container. → 10.4 if the menu needs it.
- The FAQ page uses DropDownGroup / DropDownRow with the stored answers → slice 2.5.
- Favicon and home-screen icons from the logo mark (Lighthouse: /favicon.ico 404) → slice 1.1 (logo SVG export) / 1.6.
- Meta descriptions per page (Lighthouse SEO 90 on /) → slice 1.6 / 10.3.
- ANIMATIONS §3.1 status column (designed → implemented) for ANIM-05, 07, 09, 10, 12, 13, 19 is Bohoka’s document → tell him in the phase summary.
- The seed grows with each table: the Figma cakes → 3.1, sample orders (BBL-2026-0147 …) and customers (Mairi Sinclair …) → 4.6 / 8.4, FAQ → 2.5, reviews fixture → 2.2.
- The kitchen sentence {kitchen_handles} needs customer wording per allergen (“wheat”, “egg” in Figma vs the 14 legal names) → decide in 3.1 with the allergen labels.
- The Facebook page address is not known yet → Linda (§14.1); stored empty.
