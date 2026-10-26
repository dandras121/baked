# Baked by Linda — Site Flows (how the whole system behaves)

> **For Claude Code.** This file is the behaviour specification of the whole system: the public website, the order checkout, the customer e-mails, Linda’s admin, every variable and every automatic job. For every button, link, field and state it says what happens, where it leads and what changes.
> Visual details (layout, type, colour, spacing) come from the Figma screens. Animations are in `ANIMATIONS.md`. Breakpoints and the tablet layout are in `RESPONSIVE.md`.

- **Version:** 3.16 — 2026-10-23 (everything from the 10-22 review filled in: text contrast fixed, outdated Figma parts corrected, the missing screens, e-mails and admin pieces drawn, surface motion ANIM-12–25 incl. the Order confirmed mascot — `ANIMATIONS.md` v1.34; 3.15 — 2026-10-22: Google reviews: the Home testimonials are all of Linda’s Google reviews, newest first, loaded a few at a time; a “Leave a Google review” button in the new thank-you e-mail 18, e-mails 1 and 5 and the status page after the date — §4.1, §8.1, §9.12, §11.4; 3.14: the cake sits at the bottom of the card picture on every screen; card opening 500 ms with soft text motion, `ANIMATIONS.md` v1.32; 3.13: cake card: View → Customise a design, the corner button opens the card into its turning card video, ANIM-11; new admin Card video; 3.12: one slider indicator everywhere, ANIM-10; testimonial and About cards centre on click; 3.11: drop-down rows animate, ANIM-09; 3.10: writable fields, nav 15 %, current menu item reloads, admin-added content follows the rules; 3.9: hover / press motion and the desktop underline slide, `ANIMATIONS.md` ANIM-07/08; 3.8: cake options, §5.8; 3.7: sticky header, minimised footer, real business facts, footer mascot ANIM-06; 3.6: catalogue search field, §4.2, restyled and animated — `ANIMATIONS.md` ANIM-05; 3.5: second dry run in five parts: checkout, after-order, e-mails, admin, Figma; 3.4 — 2026-10-17: answers to the Claude Code dry run: build platform §0.8, owner decisions and build-level gaps; 3.3: second full review against Figma; 3.2: §0.6 illustration rules; 3.1: new Gallery page, Home “Special idea?” wired to it, Gallery in the menus and the admin). 3.0 — 2026-10-15 (full review against Figma; owner decisions D1–D19; restructured for building). Changelog: Appendix B.
- **Figma file:** `py7HpVoQwoEm9shlxEoCXL`, page `0:1`.
- **Scope:** everything a builder needs to know about behaviour. If something is not here, see §0.7. What in Figma is only illustration: §0.6.

---

## 0. Start here

### 0.1 Which source wins (precedence)

When two sources disagree, the higher one wins:

1. **This file** (`SITE-FLOWS.md`). Inside this file, a row marked **Decided** beats any other row.
2. `RESPONSIVE.md` (breakpoints, tablet) and `ANIMATIONS.md` (motion) — each for its own topic.
3. The Figma build-spec board **`V2 · Build spec — viselkedés`** (`1152:9106`). It is a summary of this file; it was brought in line with it on 2026-10-15.
4. The Figma screens and state frames.
5. Never: sample data in Figma (names, amounts, counts, dates — see §0.4).
6. Never: older notes in the Figma project (`claude/*.md` other than this file, `RESPONSIVE.md` and `ANIMATIONS.md`). They are history.

Appendix A lists every Figma text known to be outdated and what replaces it.

### 0.2 Labels in the “Basis” column

| Label | Meaning | What you do |
|---|---|---|
| **Design** | Drawn on a Figma screen or state frame (node given). | Build it as drawn. |
| **Spec** | Written on the build-spec board. | Build it exactly. |
| **Decided** | Decided by the owner (Bohoka); the date is given when it matters. | Build it exactly. |
| **Proposal** | Not drawn and not decided; a sensible default written by the reviewer. | Build it, and list every Proposal you built in your report so the owner can confirm or change it. |

A row can carry two labels (e.g. “Design + Proposal”: the screen is drawn, the behaviour around it is a proposal).

### 0.3 What to ignore in Figma

- Hidden layers whose names contain “régi”, “rejtve”, “KIVÉVE” or “kivéve” — old versions.
- **Other hidden layers are real content in a closed state** (e.g. the answers of closed FAQ rows, `658:4037`). Use their text.
- The section `V2 · Salvage — kivett elemek (2026-10-14)` (`1607:10590`): the removed online quote / deposit / balance flow and e-mails 7, 9, 14. Do not build them.
- The loose frame `Frame 33` (`1392:10100`) in the desktop pages section — an old footer draft.
- The frame `Frame 20` (`1311:9961`) inside the Home “We got you.” block is clipped and never visible (“View all 24 designs”, “Order my customisable cakes”). Do not build it.
- Hungarian texts are designer notes. English texts are the product — except English notes written to the developer, which are notes too (e.g. `983:9270` inside the bank window “This window belongs to your bank, not to me…”, `1604:10555` inside the Nobody-was-in dialog “Deliveries only. After sending, the row shows…”). Short grey helper lines inside admin screens written to Linda (e.g. “Forgetting is safe…” `932:8247`) are real helper text.
- Canvas leftovers that are not hidden: the empty frames `1279:9594` and `1279:9613`, the drafts `1391:10370`, `1386:10114`, `1384:10023`, `1287:9850`, `1184:9275`, loose footer texts `1391:10272`–`1391:10279`, the arrow `522:2734`, the source frames `1381:10045` and `1391:10298` (“eredeti”), and the archive frames `524:2687`, `712:4816`, `33:2`. Ignore them. `1367:10114` “Frame 28” (old Special idea) and the text `1588:10485` may already be deleted (both were gone on 2026-10-17).
- The scrim-and-modal “Taking your payment” frame `1108:9846` is an older pattern: build the in-button status (§5.5, `983:9218`).
- Hidden layers that are removed content although their names do not say so: the “Tasting box” footer link (`1411:9619`, `1551:10440`) and the hidden text logo “Baked by Linda” in every e-mail header (`1128:9119`, `1128:9168`, `1128:9214`, `1128:9257`, `1153:9324`, `1155:9318`, `1155:9368`, `1167:9114`, `1167:9152`, `1249:9229`, `1249:9269`, `1598:10539`). Do not build them.
- **State cards** (the sections `974:9087`, `983:9087`, `1036:9106`, `1036:9222`, `1096:9106`, `1102:9106`, `1102:9278`, `1108:9796`, `1199:9206`): the first violet caps line naming the state (“A · BOOKED”, “M · PAY FOR YOUR CAKE”) is a frame label, and the grey paragraph(s) under the buttons that describe the design (“Build spec —”, “Mobile mirror of…”, colours, behaviour) are notes. Neither is built. Product lines in the same grey style that **are** built: `1036:9127`, `1036:9164`, `1036:9200`, `1036:9258`, `1037:9180`, `1037:9205`, `1102:9146`, `1253:9540` (with the corrections of Appendix A). The 760 px white card and its border are presentation only (§2.1). The reference card “THE RULE BEHIND BOTH” `1037:9207` is not a screen.
- More notes in body-copy position: `1108:9910` (its page sizes “fifteen … fourteen” are outdated, §4.2), `1108:9913` (catalogue “fewer than a page”), `1108:9710` (mobile accordion). More leftovers: the empty frame “Social links” `719:4897` and the tablet copy of the clipped Frame 20 `1562:12148`.

### 0.4 Sample data

Every name, amount, date, count and address in Figma is illustration. Always render real data. Known mismatches that are **not** bugs: the reference order BBL-2026-0147 is £185 (one cake) in customer frames and in the admin Orders and Today rows, and £280 (two cakes) in Order detail, Change the order and Money; the catalogue repeats “The Lothian” on every desktop card; the gallery shows “3 / 30” and “Showing 12 of 30” while the admin says “28 showing”; e-mail 12, e-mail 15 and page M use other illustrative amounts; the admin calendar, Today and Availability counts do not add up with each other. Since 2026-10-21 the business facts in Figma are the real ones (Decided 2026-10-21): **Baked by Linda**, a sole trader in Scotland, owner **Linda Dávid-Vágvölgyi**, **20 Church View, Winchburgh, EH52 6SZ**, **info@bakedbylinda.co.uk**, **+44 7884 199103** — still always rendered from Settings (§11.1). Sample *customer* data (Mairi Sinclair, 07700 900 xxx, @example.co.uk, Linlithgow) is correct as it is; archived and hidden frames may still show the old placeholders (“12 High Street”, “01506 000 000”, “hello@…”, ICO “ZA000000”) — ignore them (§0.3).

### 0.5 Rules that must never be broken (they include the board card NON-NEGOTIABLES, `1153:9253`)

1. Only Stripe confirms a paid order — the `payment_intent.succeeded` webhook, or the reconciliation job reading that PaymentIntent from the Stripe API (§12) — or Linda saving an order in Add an order.
2. Allergens are shown for every cake wherever the cake is shown before and after paying. At the handover the customer has them in e-mail 1 and on the status page (linked from every e-mail); no printed allergen card goes with the cake (Decided 2026-10-17).
3. Nothing beyond essential cookies is set before the visitor chooses.
4. No card data ever touches this site’s server (Stripe Elements only: Express Checkout Element + card Payment Element, §5.4).
5. Every error says what did not happen and what to do next, in words, next to the control.

### 0.6 What a Figma frame shows is one moment — what to copy and what not

A frame is a picture of one moment with sample content. Build the behaviour, not the picture:

| In Figma | What it really is | Build rule | Basis |
|---|---|---|---|
| A page drawn under an overlay (gallery lightbox `1633:12049` with the page shifted to y −640; Nobody-was-in dialog `1604:10501` over a copy of Today; phone sheets `1604:10556`, `950:9038`) | An arbitrary scroll position; the underlay is a hand-made copy that can drift from the real page | Every overlay (lightbox, dialog, bottom sheet, cookie panel, menu, phone summary panel, the bank’s 3D Secure window) opens over the page the visitor is on, **at their current scroll position**. Page scroll is locked while it is open; closing it returns to exactly the same position and focus returns to the control that opened it. | Proposal |
| Mini “Screen” mock-ups behind the cookie bar and the payment states (`1003:9103`, `1003:9123`, `983:9252`, `985:9118`…) and phone sheets drawn 354 wide | Illustration inside a presentation card | The cookie bar **is** the floating card as drawn: max 640 px wide, centred, 24 px above the viewport bottom, with its shadow (on the phone the bottom sheet). Phone sheets are full width. Dialogs are centred in the viewport (admin desktop: centred in the content area right of the sidebar). | Design + Proposal |
| Overlays drawn without any page (`1607:10918` Send a payment link, the plain-cake confirm `974:9137` / `975:9168`, the phone summary panel `1102:9148`, the phone lightbox `1637:11792`) | The component only | Send a payment link, Leave the cake plain? and every confirm: a modal dialog (desktop centred, phone bottom sheet) with a scrim. Phone summary panel: bottom sheet. Phone lightbox: full screen. | Proposal |
| Scrim strengths 35 %, 42 %, 45 % in different frames | Drawing variance | Dialogs and sheets: ink at 35 %. Lightbox: ink at 88 %. | Design + Proposal |
| Grey `#d9d9d9` boxes, layers named “Fotó — ide jön a kép” / “placeholder”, the placeholder variable `523:2696` | Empty photo slots | Filled with Linda’s photo from the admin; when there is no photo, the slot shows the placeholder background at the same size (no layout shift). | Design |
| Sample cake, gallery and page photos | Stand-ins for Linda’s photos | Always the admin’s photos (the designed hero slide’s photo is the exception: a fixed asset, §4.1; admin hero slides are not designed yet, §4.1). Each photo box keeps **the shape drawn at each breakpoint** and the photo fills it (`object-fit: cover`) around one focal point Linda sets per photo (default: centre): cake card desktop and tablet 355 × 221 / 284 × 177 (8:5), phone 1:1 — when the cake has a card video, the card shows crops of that square video instead (closed and open crops: `ANIMATIONS.md` ANIM-11, `claude/torta-video-szabalyrendszer.md`) and the focal point is not used; cake page main media desktop 384 × 516, phone 384 × 471, tablet 410 × 549; gallery tiles and Home squares 1:1; Home “We got you.” a circle; lightbox: the whole photo (`object-fit: contain`). Upload at least 1600 px on the long side. | Decided (2026-10-17: the drawn shapes win) |
| Ellipses named `Placeholder-<what>-desktop` / `-tablet` / `-phone` (Full range header: “cake from above 1–6”; Home “We got you.”: “fast changing cakes”) | Slots for design elements the owner will supply later | Build each as a decorative image slot at exactly that position and size per breakpoint (circle crop, `aria-hidden`, empty until the asset arrives — no layout shift). Tablet = desktop × 0.8, as drawn. | Decided 2026-10-23 |
| Real brand assets: the pink header/footer texture, the pink glow behind headings, the West Lothian map `1367:10108`, the e-mail logo PNG `1565:12288`, the logo SVG | Design | Export and use them as they are. | Design |
| Business facts in the copy (phone +44 7884 199103, the address, info@…, @bakedbylinda, Google 4.9 · 63) | Placeholders | Always from Settings (§11.1) or the live source (§11.4). | Decided |
| Names, dates (Saturday 12 September), order numbers, prices, counts (“Showing 15 of 24”, phone “Showing 14 of 24”, “3 / 30”, “30 photos”, stat tiles, calendar counts, character counters “17 / 24”) | Sample data (§0.4) | Always computed from real data at request time; counts in different places that disagree in Figma agree in the build. | Decided |
| A list or grid cut to N rows, a carousel at its first position, a calendar showing September 2026, a frame whose height ends where the drawing ends | One view of something longer | Lists page or load more from data; carousels start at the first item and hold the whole set; the calendar opens on the current or first bookable month; pages grow with their content. | Decided + Proposal |
| One state of something live: hover / focus / pressed, “held for 19:24”, slide “1 of 3”, “3 / 30”, upload progress, storyboard frames, the phone cake page with a play button on a video (`815:5879` — that is the reduced-motion look) | One moment | Build the behaviour from this file and `ANIMATIONS.md`; the values shown are arbitrary. | Design |
| Forms drawn filled in: typed values, selected pills, ticked boxes, an open FAQ row, a selected size / date / window, enabled submit buttons, editors drawn closed | One filled-in moment | Every form opens **empty**: no pill selected, no box ticked, no date chosen — except the defaults this file names (e.g. the smallest size, the first FAQ row open, Analytics off, Delivery and Customer emails On in Add an order, **The rest** in Send a payment link, `?inspired=`, prefills from an enquiry, the second-check retry value) and edit forms, which open with the saved values. Submit buttons follow their own rule (e.g. **Save changes** disabled until something differs). A field that is empty shows nothing or its drawn hint. | Decided |
| Text sizes, including small ones (8–11 px card tier line, footer headings, labels) | Design | Build the drawn sizes. Tablet: `RESPONSIVE.md` §3.2 formula. | Decided (2026-10-17) |
| Controls drawn smaller than 44 × 44 (menu button, carousel arrows, pills, small links) | Visual size | Keep the drawn look; the **hit area** is at least 44 × 44 (padding or a pseudo-element). In dense link lists (footer, “On this page”, admin row links) at least 24 × 24 with spacing (WCAG 2.5.8). | Proposal |
| Text boxes that exactly fit the sample text (names, descriptions, captions, addresses, amounts) | Sample length | Real text can be longer: every text box wraps or follows the truncation rule of its element (cards and list rows: §4.1, §9.1). Nothing is cut off silently; a heading with data in it wraps (`overflow-wrap: anywhere`). | Proposal |
| Absolute positions and fixed heights in frames without auto-layout (all admin screens, most page frames) | Drawing coordinates | Use flexible layout that reproduces the look at the designed widths (`RESPONSIVE.md`). | Proposal |
| Line breaks typed into headings (“Cakes,⏎I have made.”, “Dreams⏎come true.”, “Thank you,⏎Mairi.”) | A typed break | Keep the designed break on the designed width only if the heading is fixed copy; text with data in it (names) wraps naturally. | Proposal |
| Frame widths 402 / 1024 / 1280 | Reference viewports | `RESPONSIVE.md` | Decided |
| Patterns drawn by hand in several places (summary panels, order panels, e-mail headers and footers, admin rows, the step-2 calendar) | Copies that drift | Build each pattern once as a component; where the copies differ, the page named in this file wins. | Proposal |

### 0.7 A case this file does not cover

Choose the simplest behaviour that follows the rules here, build it, and list it in your report as **Proposal**. Never invent a new page, e-mail or payment without listing it.

### 0.8 Build platform — Decided 2026-10-17

There is no codebase yet. The owner leaves the stack to you; this is the default, and any change is listed in your report:

| Part | Default |
|---|---|
| App | Next.js (App Router, TypeScript): public site, checkout, admin and API in one app. Client-side routing, so `ANIMATIONS.md` ANIM-03 path A. |
| Hosting | A UK (London) region. (Cost estimate £20–60 a month at launch — not an owner decision.) |
| Database | Postgres. Every money value in integer pence (§10.7). |
| Files | A private S3-compatible bucket; customer uploads only through short-lived signed URLs (§10.10). Public photos and videos through a CDN. |
| Images and video | `sharp` for photos, with libheif for HEIC (prebuilt `sharp` cannot read HEIC); an ffmpeg worker (or a hosted video service) for videos (§9.13). |
| E-mail | Postmark: one transactional stream for every order, admin and system e-mail; a separate broadcast stream for e-mail 5; open and click tracking off (§8.4). |
| Payments | Stripe (§10.6). |
| Jobs | A small worker or scheduled functions for §12, running in Europe/London time. |
| Fonts | Quicksand and Fraunces self-hosted as WOFF2 (not loaded from Google Fonts). |

---

## 1. Words used in this file

| Word | Meaning |
|---|---|
| **Catalogue order** | An order a customer places and pays online from the ready-made designs (§5). |
| **Manual order** | An order Linda adds herself in the admin (**Add an order**), normally a bespoke cake agreed by e-mail (§7.3). It is one cake. |
| **Bespoke enquiry** | The form a customer sends from `/bespoke`. It is not an order (§7.1). |
| **Cake / line** | One cake in an order: a design, a size and an inscription. A catalogue order has 1–5 lines (Decided D1). |
| **Draft** | A catalogue order still in checkout. Lives in a cookie, 24 hours without activity (§10.2). |
| **Hold** | The 20-minute reservation of a date for a draft, started when step 2 is completed (§10.3). |
| **The date (D)** | The delivery or collection date of an order. “D-2” = two calendar days before it. |
| **Handover** | The delivery or the collection of a cake on its date. |
| **Change window** | The time a customer may change or cancel online: until **23:59 on D-2** (Decided D2). |
| **Caps** | The daily cap and the weekly cap (cakes per day, cakes per Monday–Sunday week), set by Linda (§10.4, §9.11). |
| **Lead time** | The minimum number of days between ordering and the date for catalogue cakes, set by Linda (default 5). |
| **Token link** | A link with an unguessable token instead of a login: status, payment, delivery choice, unsubscribe, enquiry (§10.5). |
| **Second check** | The question the status link asks before showing anything (postcode, or the last four phone digits). |
| **Payment link** | A `/pay/[token]` link Linda sends with e-mail 15 for an amount she chooses. |
| **Snapshot** | The copy of the cake name, flavour, size, tiers, options (labels, answers, add-ons, their allergens), price, allergens, card photo and business facts an order keeps (the business facts only fill the accepted legal revisions and e-mail 1’s key terms and footer; phone, e-mail, address and town on order pages and in later e-mails come from current Settings, §11.1). Taken when Pay locks the draft (§5.5), stored on the draft and kept by the order at confirmation; manual orders: when saved. The card-photo files are copied to order-owned storage, and media are never deleted while an order refers to them. Later admin edits never change it. |
| **Option** | An extra question Linda adds to one cake (Choice, Choices, Text or Yes/no), answered on the cake page; it can add to the price and to the allergens (§5.8). |
| **Owner / Helper** | The two admin roles (§9.15). |
| **Linda** | The business owner, the admin user with the Owner role. |
| **Gallery photo** | One photo of a cake Linda has made, shown on `/gallery`; up to four of them are her Home picks (§4.8, §9.18). |
| **Settings value** | A value Linda sets in admin Settings; in Figma held by the `Content` variable collection (§11). |

---

## 2. Page map and routes

Every public page shares the header, footer and cookie bar (§3). “Index” = listed in the sitemap and indexable; “no” = `noindex`, not in the sitemap.

| Page | Route | Index | Figma desktop | Figma phone | Figma tablet |
|---|---|---|---|---|---|
| Home | `/` | yes | `518:2687` (section) | `1464:8417` | `1562:12130` (see §4.1 note) |
| The full range (catalogue) | `/cakes` | yes | `599:2721` | `798:5566` | `1557:11293` |
| Cake page = order step 1 | `/cakes/[slug]` | yes (visible cakes) | `609:2889` | `815:5841` | `1557:11744` |
| Order step 2 “When & where” | `/order/when` | no | `637:3135` | `828:6108` | `1557:12021` |
| Order step 3 “Your details” | `/order/details` | no | `639:3270` | `832:6265` | `1557:12335` |
| Order step 4 “Review & pay” | `/order/pay` | no | `641:3382` | `834:6395` | `1557:12563` |
| Order confirmed | `/order/confirmed` | no | `643:3478` | `836:6509` | `1558:10938` |
| Bespoke enquiry | `/bespoke` | yes | `660:4068` | `847:8028` | `1559:11694` |
| Gallery | `/gallery` | yes | `1633:11617` (lightbox `1633:12049`, empty `1633:12222`) | `1636:11699` (lightbox `1637:11792`) | `1638:11793` |
| Enquiry sent | `/bespoke/sent` | no | `654:3805` | `839:6936` | `1558:11653` |
| About Linda | `/about` | yes | `518:2688` (section) | `1600:10493` | `1562:12372` |
| FAQ | `/faq` | yes | `658:3996` | `803:5741` | `1559:11372` |
| Contact | `/contact` | yes | `656:3843` | `839:6616` | `1558:11846` |
| Message sent | `/contact/sent` | no | `654:3724` | `839:7071` | `1558:11484` |
| Find my order | `/find-my-order` | yes | `654:3636` | `839:7183` | `1558:11308` |
| Order status | `/my-order/[token]` | no | states `1036:9106` | same section, “Mobile state / …” | — (§2.1) |
| Change / message / cancel | `/my-order/[token]/change` · `/my-order/[token]/message` · `/my-order/[token]/cancel` | no | states `1036:9222` | same section | — |
| Pay for your cake | `/pay/[token]` | no | M `1598:10573` | M `1598:10598` | — |
| Missed delivery choice | `/delivery/[token]` | no | `1199:9206` · G, H; `1102:9106` (E) | — | — |
| Unsubscribe | `/unsubscribe/[token]` | no | `1199:9206` · J | `1199:9408` | — |
| Your enquiry (read-only) | `/my-enquiry/[token]` | no | `1609:10885` | `1609:11066` | `1609:11227` |
| Complaints procedure (with the form) | `/complaints` | yes | `666:4722` | `844:8217` | `1560:12262` |
| Complaint sent | `/complaints/sent` | no | `1253:9529` (`1199:9206` · L) | `1253:9542` | — |
| Terms and conditions | `/terms` | yes | `664:4192` | `844:7228` | `1559:12071` |
| Privacy policy | `/privacy` | yes | `664:4364` | `844:7429` | `1559:12331` |
| Cookie policy | `/cookies` | yes | `664:4501` | `844:7595` | `1559:12556` |
| Delivery & collection | `/delivery-and-collection` | yes | `664:4624` | `844:7747` | `1559:12767` |
| Cancellations & refunds | `/cancellations` | yes | `666:4476` | `844:7913` | `1560:11840` |
| Accessibility statement | `/accessibility` | yes | `666:4599` | `844:8065` | `1560:12051` |
| Allergen information | `/allergens` | yes | `666:4845` | `844:8369` | `1560:12531` |
| Not found | any unknown URL — HTTP **404** | no | `654:3550` | `839:7303` | `1558:11134` |
| Server error | any failed full page load — HTTP **500** | no | `1608:10783` | `1608:10885` | `1608:10968` |
| Admin | `/admin/…` (§9.1) | no (also disallowed in `robots.txt`) | section `932:8143` | same section | — (Decided D10) |

The active navigation item of each page is listed in `ANIMATIONS.md` §3.3 (Your enquiry → Bespoke; 404 and 500 → none).

### 2.1 Pages without a phone or tablet frame — Decided (2026-10-13/15) + Proposal

- **Tablet (768–1119 px):** every page without a tablet frame (token pages, state cards) is the desktop design scaled 0.8, as `RESPONSIVE.md` §3.2 says for all pages.
- **Phone:** a state without a phone frame uses the desktop state card content at full width with 24 px side gutters (as the drawn phone states) and the same order of elements. (Proposal)
- **State cards** (the 760 px cards in the state sections) are never shown alone. Their white rounded frame and border are presentation only: the content sits directly on the page background inside the normal page shell (header, footer, no photo band), max width 760 px, centred, 64 px under the header. No display heading is added: the card’s serif heading is the page’s h1. Where a card has none, the h1 is: G “Collecting it today”, H “Redelivery tomorrow”, J “You’re off the list”, L “Complaint sent”, M “Pay for your cake”, Too many requests “Nothing new has been sent”. Focus moves to the h1 on load. (Proposal)

---

## 3. On every public page

### 3.1 Header

| Element | Result | Basis |
|---|---|---|
| Logo mark and wordmark | `/` | Design |
| Desktop navigation (≥ 1120 px): Home · Cakes · Bespoke · Gallery · About Linda · FAQ · Contact (gap 32 px; header variant Active=Gallery `1632:11132`) | `/` · `/cakes` · `/bespoke` · `/gallery` · `/about` · `/faq` · `/contact`. The current page’s item is underlined (STYLE-01) and carries `aria-current="page"`. Hover: the item’s text grows 15 %, the underline stays (`ANIMATIONS.md` ANIM-07); clicking another item slides the underline to it (ANIM-08), from any item to any item; clicking the item of the page you are on reloads that page (fresh, scrolled to the top, filters and search cleared; Decided 2026-10-21). | Decided (Gallery: 2026-10-16) + Proposal (aria) |
| **menu** button (< 1120 px: phone and tablet) | Opens the menu (ANIM-01). Items as above. The current page’s item reloads that page (ANIM-03 same-item variant; Decided 2026-10-21, replacing “only closes the menu”). Esc closes; the logo goes Home; Back only closes the menu (`ANIMATIONS.md` §3.4). Without JavaScript the menu is a `<details>` disclosure that opens the same list without animation (the footer has no navigation since 2026-10-21). | Decided + Proposal (no JS) |
| Menu: Instagram / Facebook | The profile in a new tab (`rel="noopener"`). Each link is hidden when its URL in Settings is empty. | Decided |
| First page load of a visit | The mascot slides in (ANIM-04). | Decided |
| Scrolling | The header is **sticky** (Decided 2026-10-21): on every public page and breakpoint it stays at the top of the screen and the page scrolls under it (`position: sticky; top: 0`; above the page content, below the open menu, dialogs, sheets, the lightbox and the cookie panel). In-page anchors and focus moves keep clear of it (`scroll-padding-top` = the header height: phone and tablet 55 px, desktop 77 px). Other sticky elements sit under it, never behind it. The other sticky elements on public pages are the phone order-summary bar on steps 2–3 (§5.4), the phone hold line on step 4 while the hold runs (§5.4) and the cookie bar until a choice is made. On steps 2–3 the hold line is not sticky; on the phone the summary bar shows the countdown (“Held 19:24”) the whole time the hold runs (§5.4). | Proposal |

Menu panel: if the viewport is shorter than the menu content (seven items + social block), the panel scrolls inside itself; the header bar stays fixed. The social heading is hidden when both social URLs are empty. (Proposal)

### 3.2 Footer (desktop master `1411:9627`; phone master `1461:9223`; tablet `1551:10408`) — minimised 2026-10-21

| Element | Result | Basis |
|---|---|---|
| Logo / wordmark | `/` | Proposal |
| No navigation | The footer has no site navigation: the sticky header carries it (§3.1). | Decided 2026-10-21 |
| **Find my order →** under the contact block (phone `1704:11808`, desktop `1704:11809`, tablet `1704:11810`) | `/find-my-order` (§6.7). The only footer entry to that page. | Decided 2026-10-21 |
| LEGAL (phone `1699:12315`, desktop `1701:12124`, tablet `1701:12129`): a centred heading over two columns — left, left-aligned: Privacy policy · Cookie policy · Terms & conditions · Delivery & collection; right, right-aligned: Cancellations & refunds · Accessibility statement · Complaints procedure · Allergen information | the legal pages of §2. Build the two columns as one list in reading order (left column first) for screen readers. | Design + Decided 2026-10-21 (layout, the owner’s arrangement) |
| E-mail address · phone number (here and in every “email me” / “call me” line on any page) | `mailto:` · `tel:` | Design + Decided |
| Address | plain text from Settings (`business/address-line`, `address-region`) | Design |
| “see Cancellations & refunds” inside the small print | `/cancellations` | Proposal |
| © year | the current year, computed | Proposal |
| **Cookie preferences** button | Opens the cookie panel with the stored choice (`1199:9206` · I). Before any choice it opens the same panel with Analytics off; the bar stays until a choice is saved. Without JavaScript it is a link to `/cookies#changing-your-mind`. | Design + Proposal |
| FOOD & COMPLIANCE block | text only (council registration and hygiene rating from Settings; the allergen line). No ICO number (Decided 2026-10-21). Its heading has the same style as LEGAL (centred). | Design + Decided 2026-10-21 |
| Mascot (bottom-right, cropped by the footer edges as drawn) | Decorative (`aria-hidden`), not a link. Peeks in once per page load when the footer comes into view: `ANIMATIONS.md` ANIM-06. | Decided 2026-10-21 |

The footer has no social links (the social links are in the menu and the Home social band).

Footer details: the address block’s third line “Scotland” is fixed copy (the jurisdiction). The small print names the legal name from Settings (“…the trading name of {legal_name}, a sole trader based in Scotland…”). The tagline “…Edinburgh and the Lothians…” (`1411:9620`) uses `{delivery_area}`. The hidden “Tasting box” link is not built (§0.3). (Proposal)

### 3.3 Cookie bar and panel (`1003:9096`; reopened `1199:9345`, phone `1199:9382`)

| Situation | Behaviour | Basis |
|---|---|---|
| First visit, no valid choice stored | Desktop and tablet (≥ 768 px): the bar (`1003:9112`) with **Accept all** · **Essential only** · **Settings**. Phone: the bottom sheet (`1004:9096`) with the same buttons. **Accept all** and **Essential only** are identical buttons, side by side, same size. | Design + Spec |
| **Accept all** / **Essential only** | Store the choice and close the bar. | Spec |
| **Settings** | Opens the panel: Essential (locked on) and Analytics (off; its line reads “Off until you switch it on.”, or “Currently on.” when on) · **Accept all** · **Essential only** · **Save my choices** (stores the toggles). | Design |
| Closing the panel without choosing (Esc, or the scrim on the panel) | Nothing is stored. First visit: the bar shows again. Reopened from the footer: nothing changes. Focus is trapped in the open panel and returns to the control that opened it. | Proposal |
| The bar / phone sheet itself | Not modal: no focus trap, the page stays usable and scrollable behind it (the dimming on the phone sheet is visual only). It stays on every page until a choice is stored. With the phone order-summary bar on screen the two stack: the bar stays at the bottom, the cookie card sits directly above it, both visible, and the page padding equals both heights. The open menu covers both. | Proposal |
| What is stored | First-party cookie `bbl_consent` = `{"v":1,"analytics":<true or false>,"ts":"<ISO time>"}`, 12 months, `Secure; SameSite=Lax`. Missing, expired or an older `v` → the bar shows again. Raise `v` whenever the cookie list changes. | Proposal (the 12 months come from the Cookie policy, `664:4570`) |
| Analytics switched off later | Stops analytics at once and deletes its cookies; no reload needed. | Proposal |
| Without JavaScript | The bar is not rendered; only essential cookies are ever set. | Proposal |
| **Cookie policy** link (bar and panel) | `/cookies` | Design |

The analytics provider is not chosen yet (§14.1). Until it is, the Analytics toggle stores the choice but loads nothing.

| Topic | Rule | Basis |
|---|---|---|
| One panel | Build one panel component with the layout of the first-visit panel B (`1003:9135`: Accept all and Essential only side by side). Before a choice is stored it uses B’s intro and footnote; when reopened with a stored choice it uses I’s intro (“Here’s what you’re currently sharing…”, `1199:9345`). | Proposal |
| Bar copy | Desktop and tablet: the desktop body (`1003:9114`); phone: the shorter phone body (`1004:9108`). Both as drawn. | Design |
| Page padding | While the bar or sheet shows, the page gets bottom padding and `scroll-padding-bottom` equal to its height, so the end of the page and every focused control stay visible (WCAG 2.4.11). | Proposal |

---

## 4. Browsing

### 4.1 Home (`/`)

Tablet note: the “Special idea?” section of the tablet Home is now the current design (`1642:11949`; the old one is hidden). The tablet testimonials now have the indicator (`1760:12667`, 2026-10-22).

| Element | Result | Basis |
|---|---|---|
| **Hero** | The designed hero (big wordmark, “What’s your dream cake?”, **Start enquiry**, **About Linda**) is always the **first, fixed slide**. Linda’s active admin slides (§11.4) follow it in her order. With no active admin slide the designed hero is shown alone: no dashes, no timer. **The admin slides are not designed yet:** the owner will design them himself later and they will be animated (Decided 2026-10-17). At launch the designed hero is shown alone; build the slide mechanics (timer, crossfade, pause, dashes — `ANIMATIONS.md` UI-06) so the slides can be added later, but do not design or invent slide layouts. | Decided D15 + Decided 2026-10-17 |
| Hero **Start enquiry** · **About Linda** | `/bespoke` · `/about` | Design |
| Hero indicator (desktop `1760:12629`, tablet `1760:12633`, phone `1760:12637`; the old loose dashes are hidden) | The shared slider indicator (`ANIMATIONS.md` ANIM-10, Decided 2026-10-22): at most 5 dashes, active longest and darkest, its neighbours a little longer, the window keeps the active dash 3rd after item 3. Each dash is a button: 44 × 44 target, `aria-label="Slide 2 of 3"`, `aria-current` on the active one. Choosing one shows that slide and restarts the timer. Swipe on phone and tablet. Not shown while only the designed hero exists. Same size on every breakpoint. | Design + Decided 2026-10-22 + Proposal (target, aria) |
| Hero timer | With 2+ slides in total (the designed hero counts as one, so one active admin slide is enough) the hero advances every N seconds (The hero, §9.12; default 6) with a 400 ms crossfade; it pauses while hovered or focused; with reduced motion it never advances (`ANIMATIONS.md` UI-06). A small pause/play button sits beside the dashes (WCAG 2.2.2). | Decided + Proposal (pause button) |
| “We got you.” block | Photo + text; no links. | Design |
| “Try my recipes.” cake row | The first five **visible** designs in Linda’s order. When all cards fit the width it is a static row (no arrows, no swipe); otherwise a carousel: desktop arrows (disabled with `aria-disabled` at the first / last card, no looping), phone and tablet swipe. With 0 visible designs the whole block (heading, subline, **View the whole collection**, row, arrows) is not rendered. | Spec + Decided + Proposal |
| Cake card (component: desktop `1487:8534`, tablet `1553:10842`, phone `1473:8701`; the phone Home row uses the phone card at 274 px wide — the hand-built frames `1381:10001` are copies) | Since 2026-10-22 each card has a **Closed** and an **Open** variant (sets: desktop `1776:12902`, tablet `1776:12914`, phone catalogue `1777:12902`, phone Home `1777:12926`). **View** (and the cake name) go to `/cakes/[slug]`, Customise a design (pressable, ANIM-07); the rest of the card is not a link. The **corner button** (44 × 44, ANIM-07 hover / press, `aria-expanded`, “Show the {cake} video” / “Close the {cake} video”) opens the card in place into its open version: the picture grows and zooms in on the cake, the title moves into the bottom row, the description fades, and when fully open the **card video** (§9.13) plays, looping, muted, with no controls — the user cannot pause it; pressing the button again closes it (`ANIMATIONS.md` ANIM-11). One card open at a time: opening another closes the first. The card keeps its size; nothing around it moves. A cake with no card video shows its main photo and has no corner button. The ‹ › arrows drawn on the open frames are removed (Decided 2026-10-22). Closed content: picture = the card video’s first frame, zoomed out (§0.6) · name (up to 2 lines, then ellipsis) · the cake’s **Flavour** line (§9.13; up to 2 lines, ellipsis) · tier line of the **smallest** size (“TWO TIERS · SERVES 24”) · “From £{smallest price}”. Cards in one row share the tallest card’s height. | Design + Decided (Flavour 2026-10-17; card video and open / close 2026-10-22) + Proposal |
| **View the whole collection** | `/cakes` | Design |
| “Special idea?” (desktop `1588:10482`, phone `1443:9297`, tablet `1642:11949`) **Start enquiry** | `/bespoke` | Design |
| “Special idea?” four squares (“Gallery pick 1–4”) | Linda’s four Home picks from the gallery, in her order (§9.18); when fewer than four are picked, the newest showing gallery photos fill the rest; with fewer than four showing photos in the gallery, an empty square shows the placeholder background. Square crop; alt text = the photo’s alt text (or caption). **Not links.** | Decided (2026-10-16) |
| “take a look at my previous works gallery ›” (`1588:10489`, phone `1588:10525`, tablet `1642:11958`) | `/gallery` (text and arrow are one link). Hidden when the gallery has no showing photo. | Decided (2026-10-16) |
| Testimonials “Thoughts on my work.” — **Linda’s Google reviews** (Decided 2026-10-22) | The cards are **all of Linda’s Google reviews that have text, newest first** — no fixed number, no picking, no hiding: every star rating shows (Decided 2026-10-22; the UK DMCC Act 2024 bans hiding negative reviews or giving positive ones more prominence). Linda’s hand-written testimonials are gone. Source and sync: §11.4. **Card** (the drawn card, content mapped): quote = the review text in the reviewer’s own language (a “(Translated by Google)” part is dropped); name = the reviewer’s name as Google shows it; the drawn “occasion · place” line = the stars and the month (“★★★★★ · March 2026”; accessible “Rated 5 out of 5 · March 2026”). Reviews with stars but no text are not cards (they still count in the rating line). Linda’s replies are not shown. Every card has the same height as drawn; a longer text is cut at the drawn quote height with “…” and a **Read on Google →** text link (new tab, Linda’s reviews on Google). The rating line above the cards (“★ 4.9 · 63 Google reviews”) is the Google attribution; no extra line under the cards (2026-10-23). Figma cards show the stars + month line since 2026-10-23 (masters `701:4791`, phone `701:4810`). **Scrolling:** desktop shows three cards, tablet three plus a peek, phone one plus a peek; back and forth through every review, no looping; desktop arrows (disabled at the ends, 40 % opacity), phone and tablet swipe; the slider indicator under the cards (phone `1760:12641`, tablet `1760:12667`, desktop `1760:12672`; ANIM-10 — its 5-dash window works for any number). **Each card is pressable** (ANIM-07); on release it only scrolls itself to the centre and the indicator follows (Decided 2026-10-22); the row has side padding so every card can reach the centre; it starts at the newest review. **Loading — only what the next few cards need** (Decided 2026-10-22): the page arrives with the first page of reviews already in it (desktop 6, tablet 5, phone 3 — the visible cards and the next ones); when the visitor gets within 3 cards of the last loaded one, the next 6 come from `GET /api/reviews?after={cursor}&limit=6` (text only: id, stars, name, month, text — about 1–2 kB, no photos, no Google script), one request at a time, kept in memory for the page view. The row is laid out for the total count from the start, so swiping, arrows and the indicator never jump; a card not loaded yet is an empty card shape of the same size that fills in when its data arrives (no layout shift). Only the cards within about one screen of the view are in the page; the rest are dropped and re-created from memory when needed. A failed request retries once after 3 s; while it fails, the not-loaded cards stay as shapes and the arrows stop at the last loaded card. With one review: no arrows, no indicator; fewer than fit: centred. With no review with text (or before the first sync) the whole section (heading and rating line included) is not rendered. | Decided 2026-10-22 + Proposal |
| Google rating line “★ 4.9 · 63 Google reviews” under the heading (desktop `1614:11111`, tablet `1614:11112`, phone `1614:11113`) | The live score and review count (§11.4). A link to Linda’s Google reviews in a new tab. Hidden until a first value has been fetched, and hidden again while the last successful fetch is more than 30 days old. The word “Google” in the line is the required attribution — never remove it. | Decided D13 (2026-10-15) + Proposal (link) |
| “Local, home baked.” | Text; the town comes from Settings (Winchburgh). | Decided D14 |
| “Check out our social media”: @bakedbylinda · Baked by Linda (`1373:10130`) | Instagram / Facebook profile in a new tab; each hidden when its URL is empty; both empty → the whole band is hidden. | Design + Decided |

| Topic | Rule | Basis |
|---|---|---|
| Designed hero photo | The photo of the fixed first slide is a fixed asset exported from Figma (`1339:9947`; tablet `1562:12136`; phone `1381:10082`), not an admin field. It is also the default share image (§10.12). | Decided (2026-10-17) |
| Phone hero line | The phone hero has its own shorter supporting line (“Turn your sweetest ideas into something deliciously real.”, `1381:10093` in the phone hero frame `1381:10074`); desktop and tablet the long one. Both as drawn. | Design |
| Cake row | Desktop shows three cards and a peek of the fourth at 1280 px; the row holds five. Fewer than three: left-aligned with the section’s text. | Design + Proposal |
| Google rating format | “★ {4.9} · {63} Google reviews”: one decimal, thousands separators, “1 Google review” in the singular. Accessible name: “Rated 4.9 out of 5 from 63 Google reviews”; the star is decorative. | Proposal |

### 4.2 The full range (`/cakes`)

| Element | Result | Basis |
|---|---|---|
| Filter pills: All designs · Birthdays · Kids’ parties · Weddings · Corporate | Filter the grid in place (no page load). The four categories are fixed; a cake can be in several. A category with no visible cake is not offered. | Spec + Proposal |
| Phone filter pills | One row that scrolls sideways. | Design |
| **Search field** under the pills (desktop `1689:12121`, tablet `1689:12130`, phone `1689:12139`; component set `V2 · Search field` `1689:12097`) | A full pill (radius `radius/pill`), faint 1 px border (ink 20 %; hover 30 %, focused 40 %), Fraunces Regular (desktop 16, phone 15). Desktop 680 × 48 centred on the pill row (it overhangs the row by 46 px each side; Decided 2026-10-21), tablet ×0.8, phone full content width. Motion: `ANIMATIONS.md` ANIM-05, as every writable field (hover grows it 10 %; a mouse press brings it back to its size and it stays so while typing; on a phone a press shrinks it 10 % and on release it opens for typing and springs back; Decided 2026-10-21). Placeholder “Search by name or flavour”, magnifier on the left, **×** on the right once something is typed. Matches the cake’s **name, Flavour and “What it is”** (§9.13) of visible cakes only; cards whose name matches come first, then the others, each group in catalogue order. Searches **inside the selected pill** (All designs = everything). Filters the grid **while typing**: from 2 characters, 250 ms after the last key; under 2 characters the normal list shows. **×** or Esc clears it and keeps focus in the field; changing the pill keeps the search text. | Decided 2026-10-21 (what it searches, inside the pill, live) + Design + Proposal (timing, order) |
| Search results (`1687:11944`, phone `1687:12025`; field drawn Focused) | The count line reads “{N} designs for “{text}”” (one: “1 design for …”; digits, as drawn), shown above the grid in the drawn place; more than 12 results page as usual (“Showing 12 of 15 for “{text}””). The bespoke link under the grid stays. | Design + Proposal |
| Nothing found (`1687:11997`, phone `1687:12083`) | Heading “No designs match “{text}”” · “Try another word, or ask me for it as a bespoke cake.” · **Search all designs** (only when a pill other than All designs is selected: switches to All designs and keeps the text; hidden otherwise) · **Start a bespoke enquiry** (`/bespoke`). The live region announces “No designs match”. | Design + Proposal |
| Cake card | As on Home: View → Customise a design, the corner button opens / closes the card video (ANIM-11); one card open at a time on the page. | Design + Decided 2026-10-22 |
| Count line “Showing 15 of 24” (phone “Showing 14 of 24”) | Counts of the current filter (pill and search). After the last page of a multi-page list: “Showing 24 of 24” and no button. One page or less: see below. | Design + Proposal |
| **Show the next N** | Appends the next page. N = min(page size, cards still to come). Page size **12** on every breakpoint (desktop and tablet 3 × 4, phone 2 × 6; Decided 2026-10-17 — the drawn counts are sample copy: desktop and tablet “Showing 15 of 24” · “Show the next 9” (`601:2868`, `1173:9159`), phone “Showing 14 of 24” · “Show the next 10” (`798:5691`, `798:5693`)). Focus moves to the first new card. Hidden when nothing remains. | Decided + Spec |
| Page size on the server | The server renders exactly `shown` cards (default 12); the same URL shows the same cards on every device. | Proposal |
| URL state | Filter, search and loaded pages live in the URL (`/cakes?occasion=weddings&q=choc&shown=24`, updated with `history.replaceState`). Back from a cake page restores filter, search text, cards and scroll position. Changing the filter or the search resets to one page. Without JavaScript the pills and **Show the next** are plain links to those URLs. `/cakes?…` is canonical to `/cakes`. | Proposal |
| A requested category with no visible cake (old link, or the last one was hidden meanwhile) (`1108:9860`) | “No {occasion} designs are showing” · “Nothing in this occasion is showing right now. Everything else is still here, and a bespoke enquiry is open whatever the occasion.” · **Show all designs** (resets the filter) · **Or start a bespoke enquiry →**. The wedding sentence in Figma (`1108:9877`) is sample copy. | Design + Proposal (copy) |
| No visible designs at all (`1108:9884`) | “The range is being photographed” · **Start a bespoke enquiry** · **Or call me** (`tel:`). No filter row, no count. | Design |
| A hidden or deleted cake’s URL | The 404 page. | Decided |
| A renamed cake | The slug is fixed when the cake is first saved; renaming does not change it. | Proposal |

| Topic | Rule | Basis |
|---|---|---|
| Phone grid | 2 columns, 16 px outer gutters, 10 px gap, cards scale with the width (the drawn 3 px edges in `798:5566` are a drawing error). | Proposal |
| Fewer than a page / exactly a page | The count line stays in its usual place under the grid and reads “{N} designs” (words one to nine — “One design”, “Seven designs”; digits from 10 — “12 designs”) — the large “Seven designs” heading in `1108:9898` shows the copy, not the place. No paging button; **Or start a bespoke enquiry →** under it. | Proposal |
| Paging control | Desktop and tablet: “Show the next N” as a text link (as drawn); phone: the pill button (as drawn). | Design |
| Texture band | The pink texture behind the grid grows with the grid (`background-size: cover`); its drawn height is the sample length. | Proposal |
| Filter on load | Opening `/cakes?occasion=…` selects that pill; on the phone the pill row scrolls it into view. | Proposal |
| Search matching | Case-insensitive, accents ignored (“creme” finds “Crème”), curly and straight quotes treated alike; several words must all match (in any of the three fields, any order); spaces at the ends ignored; at most 60 characters. Matching runs on the server (`/cakes?q=`), so the same URL gives the same cards everywhere; the live typing only fetches that URL. Results with `noindex` are not needed: `/cakes?…` is canonical to `/cakes` (above). | Proposal |
| Search field build | `<form role="search" action="/cakes">` with an `<input type="search" name="q">` and the visually hidden label “Search the cakes” (as drawn); the pill choice travels with it. Without JavaScript Enter submits the form. Results changes are announced in a polite live region (“3 designs for choc”). Phone: the keyboard’s Search key closes the keyboard; text size as drawn, like every other field (§10.13). Hit areas 44 × 44 for **×**. The flavour lines on the result cards in the state frames are sample text. | Proposal |

### 4.3 About Linda (`/about`)

| Element | Result | Basis |
|---|---|---|
| “What do we offer?” cards | Not links. Phone: a swipe carousel (scroll-snap) with the slider indicator (`1760:12645`, ANIM-10); each dash is a button (44 × 44 target, `aria-label="Card 2 of 3"`); no autoplay. Each card is pressable (ANIM-07) and on release only scrolls itself to the centre, the indicator following (Decided 2026-10-22). Tablet and desktop: side by side, not pressable. | Design + Decided + Proposal (aria) |
| Everything else | text and photos only | Design |

### 4.4 FAQ (`/faq`)

| Element | Result | Basis |
|---|---|---|
| Questions | Grouped by category in the designed order: Ordering · Paying · Food and allergens · Delivery and collection · After it arrives · About the kitchen. A category with no question is not shown. | Design + Proposal |
| Question row (`1102:9278` · D) | On load the first question is open (as drawn). Opening a row closes the others; tapping the open row closes it (none open is allowed). Build each row as `<details name="faq"><summary>` (works without JavaScript); the whole summary is the 44 px+ target; the chevron is `aria-hidden`. `/faq#<question-slug>` opens and scrolls to that row. Opening and closing: `ANIMATIONS.md` ANIM-09 (the answer rolls out and back in 360 ms; the chevron flips like the phone menu arrow — down when closed, up when open; Decided 2026-10-21). The open first row’s arrow on desktop and tablet was drawn pointing down; it was turned up in Figma (`1211:9204`, `1559:11384`) to match. | Design + Proposal + Decided 2026-10-21 |
| Answers | Linda edits them (§9.12). Business values inside answers (delivery area, lead time in words, fee, town, council) are template placeholders (§11.8). | Decided |
| “email me” in the intro | `mailto:` | Proposal |
| **Get in touch** | `/contact` | Design |

The state-section note “V2 FAQ has no live accordion yet” (`1108:9365`) is outdated: the FAQ pages have the accordion.

| Topic | Rule | Basis |
|---|---|---|
| Layout | Desktop and tablet: the answer opens in the right column level with its question (as `658:4031`); the row grows to the answer’s height. Phone: the answer opens under the question. The accordion state frame `1108:9348` shows the motion only. | Design |
| Seed content | The Figma answers (including the hidden ones) are the starting content of the FAQ editor, corrected by Appendix A (e.g. the 48-hour answer). | Decided |
| `{delivery_charge}` | Renders “free” at £0, otherwise “£{x}”. | Proposal |

### 4.5 Legal pages

| Element | Result | Basis |
|---|---|---|
| “On this page” list (desktop and tablet: left column; phone: at the top) | Generated from the section headings of the saved text; anchor ids per the note below this table. A jump scrolls (instantly with reduced motion), offsets for the header, updates the URL hash and moves focus to the heading. | Design + Proposal |
| “LAST UPDATED 24 AUGUST 2026” | Set automatically when Linda saves the page; format “D MONTH YYYY”. | Decided + Proposal (format) |
| “Questions? Email … or call …” | `mailto:` / `tel:` | Decided |
| ico.org.uk and its phone number (Privacy) | new tab · `tel:` | Proposal |
| “the cookie preferences link in the footer” (Cookie policy) | a button that opens the cookie panel | Proposal |
| Complaints procedure form | §7.5 | Design |
| Seed content | The Figma texts of the legal pages are the starting content of the admin editor, corrected before launch by §14.1 and Appendix A.1 (e.g. the 48-hour lines of Terms and Cancellations). | Proposal |

Some legal copy must be revised before launch (§14.1).

Section numbers are generated, not typed; the anchor is the slug of the heading text without the number. The Cookie policy’s section about changing your mind has the fixed id `changing-your-mind`. The “On this page” list is not sticky and has no active state. (Proposal)

### 4.6 Not found (404)

Shown for unknown URLs, hidden or deleted cakes, expired or unknown enquiry links, and unknown payment and delivery links (§10.5). Returns HTTP 404 (never a 200), `noindex`.

| Element | Result | Basis |
|---|---|---|
| **Back to home** | `/` | Design |
| **Browse the designs** | `/cakes` | Design |
| “Looking for something specific? Email …” | `mailto:` | Design |
| Line about checkout (`654:3579`) | “…if you were mid-checkout, your answers are kept for a day.” | Proposal (copy) |

### 4.7 Server error (500)

| Topic | Rule | Basis |
|---|---|---|
| Content | “Something went wrong.” · “Something went wrong on my side. Nothing you did caused it, and nothing was sent or charged …” · **Back to home** · **Call {phone}** (`tel:`) · “Looking for something specific? Email {e-mail}” (`mailto:`), as drawn (`1608:10783`, `1608:10885`, `1608:10968`). Phone: buttons as drawn on the phone frame. | Decided |
| How it is served | A static page built at deploy time and rebuilt whenever Settings are saved (phone and e-mail from the last saved Settings), HTTP 500, `noindex`, no database call. | Proposal |
| When | Only for full page loads that fail. A form sent by script shows the inline “Nothing was sent — please try again.” instead (§10.8). `/order/confirmed` and `/pay/[token]` after a payment never show it: they show “Still processing” (`974:9087` · H), because money may have been taken. | Proposal |

### 4.8 Gallery (`/gallery`) — Decided 2026-10-16

Linda’s previous cakes, managed in admin Gallery (§9.18). Figma: desktop `1633:11617`, lightbox `1633:12049`, empty `1633:12222`; phone `1636:11699`, lightbox `1637:11792`; tablet `1638:11793`; tile component `V2 · Gallery tile` `1633:11616`.

| Element | Result | Basis |
|---|---|---|
| Title band “Cakes I have made.” + intro + **Start a bespoke enquiry** | `/bespoke` | Design |
| Grid | The **Showing** photos in Linda’s gallery order. Square tiles (desktop and tablet 4 columns, phone 2) with the caption under each (one line; longer captions end with an ellipsis). Each tile is a button that opens the lightbox (accessible name = the caption). Every tile has a lilac base under the photo, so transparent photos sit on lilac. | Design + Decided |
| Paging | 12 photos per page on every breakpoint. “Showing 12 of 30” + **Show the next N** (N = min(12, photos still to come)); hidden when nothing remains; focus moves to the first new tile; the URL keeps `?shown=24` (as the catalogue, §4.2). | Decided + Proposal |
| Lightbox (tile, or `/gallery?photo=<id>`) | A dialog over an ink scrim: the photo large, caption, occasion line (if Linda set one), the slider indicator on the dark surface centred 24 px under the photo (desktop `1760:12655`, phone `1760:12661`; max 5 dashes over all showing photos, ANIM-10; it replaces the drawn “3 / 30” counter, now hidden — Decided 2026-10-22; the count stays available to screen readers as “Photo 3 of 30”), ‹ › (arrow keys too; phone: swipe — “Swipe for the next cake”), × close. Opening pushes `?photo=<id>`, so browser Back closes it; Esc and × close; focus is trapped inside and returns to the tile. Moving past the loaded tiles loads the next page. Reduced motion: no slide animation. A direct link with an unknown or hidden id opens the page without the lightbox. | Design + Decided + Proposal |
| **I’d like one like this →** (lightbox) | `/bespoke?inspired=<photo id>` (§7.1). | Decided |
| CTA band “Have an idea of your own?” · **Start a bespoke enquiry** | `/bespoke` | Design |
| No showing photos (`1633:12222`) | “The gallery is being put together.” · **Browse the designs** → `/cakes` · **Start a bespoke enquiry** → `/bespoke`. The Home gallery link is hidden meanwhile. | Design + Proposal |
| Images | Tiles load lazily (square crop around the photo’s focal point, §0.6); the lightbox loads a large version. | Proposal |
| SEO | Indexed; title “Gallery — Baked by Linda”; description = the intro’s first sentence. | Proposal |

| Topic | Rule | Basis |
|---|---|---|
| Caption and occasion | The caption is Linda’s text and includes the year if she wants one (“Digger birthday · 2025”). The lightbox shows the caption, then the occasion (one of the four categories, or nothing). | Decided |
| Phone lightbox controls | The ‹ › beside “Swipe for the next cake” are buttons (44 × 44, “Previous cake” / “Next cake”), so swiping is never the only way. | Proposal |
| Lightbox photo | The whole photo is shown (`object-fit: contain`) on the scrim; a long caption wraps above the button. | Proposal |

---

## 5. Ordering a ready-made cake (catalogue order)

**Shape.** One order holds **1–5 cakes** (Decided D1), one date, one handover (delivery or collection) and one payment. It is paid in full at checkout. There are no add-ons (Decided 2026-10-14). The draft is created by the first **Add to your order** (§10.2).

**Back links** (“← Back to …”): one place on every step — above the form, left, under the stepper (the drawn positions vary: the phone step 1 and step 4 links glued under other text, the desktop step 4 link alone in the right column, are drawing errors). (Proposal)

**State letters** below (A, B, …) refer to the **desktop** state frames; the phone frames of the same state carry the same name but often another letter.

**Focus:** after every step change, focus moves to the step heading (h1): the cake name · “Name a day.” · “A few details left.” · “One last look.” · “Thank you, {first name}.”. After a failed submit, focus moves to the first error.

**Stepper** (steps 1–4): completed steps (✓) are links back to that step with every answer kept; future steps are not clickable (Decided 2026-10-15). On the phone the stepper is four progress dots (not links) plus “Step 2 of 4 · When & where”; the phone uses the ← back links. Step 4’s stepper label is “Payment”; its page title is “Review & pay — Baked by Linda”. With several cakes the step-1 link opens edit mode for the last line added (§5.1). (Proposal)

**Without JavaScript** (Proposal): steps 1–3 work as plain form posts (answers save on submit instead of on blur). The calendar becomes a radio list of each month’s days, unavailable days disabled, and the month buttons become links. The “Leave the cake plain?” sheet becomes a server-side confirm page with the same two buttons. The phone summary bar is replaced by the summary shown inline below the form, and the hold line reads “{Saturday 12 September} is held until {3:42pm}” instead of a countdown. Step 4 shows, in `<noscript>` in place of the payment block: “Card payment needs JavaScript — turn it on, or call me on {phone}.”

### 5.1 Step 1 — The cake (`/cakes/[slug]`)

| Element | Result | Basis |
|---|---|---|
| **← Back to the range** | `/cakes` (filter and position restored, §4.2) | Design |
| Gallery: ‹ › arrows, thumbnails, phone swipe (“Swipe left or right for more photos and videos”) | Changes the main item. Videos: muted autoplay while active, loop; a tap unmutes, a second tap mutes; switching item stops the video; one video plays at a time; with reduced motion nothing autoplays (play button on the cover). A cake with one photo and no video has no strip, arrows, dots or hint. | Spec (MEDIA ON A CAKE; limits: §9.13) + `ANIMATIONS.md` UI-08 |
| Size options (one per size row Linda set, §11.3) | Select one; the smallest is pre-selected (labels and differences: the Sizes row below). The tier label (“TWO TIERS · SERVES 24”) and the price line follow the chosen size. “From £…” always shows the smallest price. | Design + Decided |
| Options (Linda’s per-cake extras, `1715:11996`) | Between the size and the inscription: §5.8. | Decided 2026-10-21 |
| Price line (`611:2961` + `611:2962`) | “£{price including chosen options} · Serves {n} · with inscription”, or “· plain” while the inscription is empty. The inscription is free. | Design + Proposal |
| Inscription field (only when the cake offers one, §5.8) | Up to **24 characters** (Latin letters incl. accents — not Greek, Cyrillic or Chinese, which cannot be assumed pipeable — digits, space and `. , ! ? ' & - ( )`). A live counter “n / 24”. Typing past 24 is possible: the counter turns red, the message “That is a little too long — 24 characters fit on the cake.” appears (`974:9087` · A) and **Add to your order** (or **Save this cake**) is refused. Emoji or other characters: “Emoji and symbols cannot be piped — please use letters and numbers.” Leading/trailing spaces are trimmed; only spaces = empty. No line breaks. Before checking and counting, curly quotes and apostrophes (’ ‘ “ ”) become straight ones and the text is normalised to NFC, so “Mum’s” typed on an iPhone is accepted; characters are counted as the customer sees them (an accented letter = 1). | Design + Decided + Proposal (character set) |
| “HOW IT WILL LOOK” preview | Shows the text as typed. Empty: “No message — the cake goes out plain” (muted). | Design + Proposal |
| Allergen line (`611:2973`) | “Contains {this cake’s allergens, then its ‘Also contains’ text as written}. Made in a kitchen that also handles {kitchen list minus this cake’s allergens}, so I cannot rule out traces of those.” A cake with none of the 14: “Contains none of the 14 regulated allergens. Made in a kitchen that handles {kitchen list}, so I cannot rule out traces of those.” A cake with none of the 14 but an ‘Also contains’ text: “Contains none of the 14 regulated allergens. Also contains {text as written}.” When the kitchen list minus this cake’s allergens is empty, the kitchen sentence is left out. | Decided D17 + Proposal (template) |
| **See full allergen information →** | `/allergens` | Decided |
| **Add to your order** | The 5-cake cap is checked first: with 5 cakes already in the order the “Over the cap” notice (C, below) shows and no sheet. Empty inscription → first the sheet “Leave the cake plain?” (`974:9087` · E): **Yes, keep it plain** adds it; **Add a message** returns focus to the field; Esc = Add a message. Then the block is replaced by “Added to your order” (`1096:9106` · A), same URL; focus to its heading. | Design + Proposal |
| A · “IN YOUR ORDER SO FAR” | Lists every line of the draft and “One date, one delivery …”. | Design |
| A · **Continue to date and delivery →** | Step 2 — or, if the draft already reached step 3 or 4, the furthest step reached (the hold grows to the new cake count, §10.3). | Design + Proposal |
| A · **Add another cake** | `/cakes`; the draft keeps its cakes. | Design |
| Adding a 6th cake (`1199:9241` · C) | “Over the cap” notice instead of A; the size and inscription typed are not added. Copy uses the limit as a template: “Five is the most one order can hold.” **Send an enquiry** → `/bespoke`. **Back to your order** → the furthest step reached. | Design + Decided D1 |
| Edit mode (from step 4, the phone panel, or “← Back to the cake” on step 2) | `/cakes/[slug]?line={id}`: that line’s size and inscription are loaded; the button reads **Save this cake**; no A state; saving returns to the step the customer came from; the line keeps its position. Leaving without saving changes nothing. | Proposal (not drawn) |

| Topic | Rule | Basis |
|---|---|---|
| Main media box | The shape drawn per breakpoint (§0.6); photos and video covers fill it around the focal point. | Decided |
| Thumbnails and dots | One thumbnail per item (up to 8 photos + 2 videos) in a row that scrolls sideways when it does not fit; ‹ › are disabled at the ends (no looping); phone: the slider indicator instead of the drawn dots (`1760:12649`, ANIM-10, Decided 2026-10-22), dashes named “Photo or video 3 of 10” with a 44 × 44 hit area; desktop and tablet keep the thumbnail strip as their indicator. | Proposal |
| Sizes | One size: no picker — the line “Serves {n} · {tiers}” and the price. Two to four: as drawn. More than four: the options wrap to a second row. Differences are always shown against the **smallest** size, which shows “included”. Tier words: “Single tier”, “Two tiers”, “Three tiers”, “{n} tiers”. | Proposal |
| Description | The cake page shows “What it is” in full; the card shows the Flavour line (§4.1). | Decided |

### 5.2 Step 2 — When & where (`/order/when`)

| Element | Result | Basis |
|---|---|---|
| **← Back to the cake** | Step 1 in edit mode for the last line added. | Design + Proposal |
| Calendar | Opens on the first month with a day available for this order. Shows the current month and the 12 following months. Day states and the availability rule: §10.4. Unavailable days are `aria-disabled` but stay focusable; each day is a button named e.g. “Saturday 12 September, available / fully booked / too soon / selected”; arrow keys move by day and week, Enter selects. | Spec + Proposal (opening month, names) |
| Calendar caption (`637:3270`) | “Greyed-out days are too soon (I need {lead time in words}’ notice), already full, or closed.” — e.g. “five days’ notice”; always plural, since the lead time is 3–60 days (Decided 2026-10-17). | Proposal (copy; the drawn text hard-codes “five days” and leaves out full days) |
| Month ‹ › | Back is disabled in the current month. In the last month forward is disabled and “For a date beyond {month year}…” + **Start a bespoke enquiry →** shows (`1102:9278` · A, E). | Design |
| A whole month without an available day (`1102:9278` · B) | When the customer moves into it: a notice + **Show me {Month} →** jumps to the next month with an available day. | Design |
| No available day in the whole range | “There are no free dates in the next twelve months.” + **Start a bespoke enquiry →** | Proposal |
| **Delivered to you** / **Collect from me** | Delivery shows Address, Town, Postcode and the three windows (Morning 9am – 12pm · Afternoon 12 – 4pm · Evening 4 – 7pm). Collection (“20 Church View, Winchburgh — free, at a time we agree”) asks for no address and no time; the summary reads “Collection time — Agreed with Linda” (`1096:9106` · D). Switching keeps typed address fields in the draft but a collection order never saves them. | Design + Decided |
| Address fields | Address 3–100 characters, Town 2–50, Postcode UK format (normalised to upper case with one space). All required for delivery. | Proposal |
| Postcode check (on blur and on Continue) | Delivery is offered when the postcode’s outward code (e.g. EH49) is in Settings → postcode districts (§11.1). Otherwise inline notice under the field (`974:9087` · C): “I do not deliver to {outward code} — it is outside {delivery area}.” + “Collection is still open” (collect, or a courier for boxed single tiers — text only). With Delivery selected, Continue does not proceed while the notice shows; choosing **Collect from me** clears it. | Design + Proposal (copy, rule) |
| Window pills | Select one (required for delivery). | Design |
| Hold line before Continue (`637:3302`) | “Continue and I will hold {Saturday 12 September} for you for 20 minutes.” | Proposal (copy; the drawn text says it is already held) |
| Errors on Continue | Under each group, focus to the first: “Pick a day in the calendar.” · “Choose delivery or collection.” · “Choose a time window.” · “Enter the street address.” · “Enter the town.” · “Enter a full postcode, like EH52 6AA.” | Proposal |
| **Continue to your details** (phone: **Your details**) | The server re-checks the date (§10.4). Available → takes a 20-minute hold (or, on the same date, renews it within the limit of §10.3 and otherwise keeps it as it is — also when the customer’s own held day has become too soon; a different date releases the old hold in the same step) and opens step 3. No longer available → state B below. Two other live holds from the same connection → the limit notice of §10.3 under the button, every answer kept. | Spec + Decided 2026-10-17 (limit) + Proposal |
| B · Date taken while filling in (`974:9104`) | Every answer kept. Up to three chips with the nearest available dates either side (never before the earliest date). A chip selects that date, takes the hold and continues to step 3. No available date: the “no free dates” line above. | Design + Proposal |

| Topic | Rule | Basis |
|---|---|---|
| Order summary (desktop and tablet) | A right-hand column “YOUR ORDER” on steps 2 and 3 (desktop `1674:11944` / `1674:11984`, tablet `1674:12015` / `1674:12055`), styled like the step-4 summary: one block per cake (name, tiers · serves · inscription, price, **Edit** / **Remove**), Date (step 2 before a day is picked: “Not chosen yet”, hidden row `1674:11981`), the handover line, Total. No button inside it. The phone uses the sticky bar instead. | Decided (2026-10-17) |
| Month buttons | ‹ › beside the month name on every breakpoint (desktop `1674:12089` / `1674:12086`, tablet `1674:12095` / `1674:12092`, phone `1217:9221` / `1217:9224`). | Design |
| Day states | The customer’s own live hold shows as Selected, above every other state (also when that day has meanwhile become too soon or full, §10.3). Otherwise one state per day, in this order of precedence: past or too soon (the TooSoon look) > fully booked or closed > available. No “today” marker. | Proposal |
| Window pills | Desktop and tablet show “Morning · 9am – 12pm”; the phone shows the names only (as drawn), with the times in each pill’s accessible name. | Design + Proposal |
| Delivery-area text | “{Delivery charge, capitalised: Free / £x} across {delivery_area}” (`637:3297` and the choice card) is a template. | Proposal |

### 5.3 Step 3 — Your details (`/order/details`)

Shown while the hold runs: under the stepper “{Saturday 12 September} is held for {mm:ss}” (not sticky; on the phone the summary bar also shows “Held {mm:ss}” the whole time the hold runs, §5.4). The countdown runs from the server’s expiry time and is announced to screen readers only at 5 and at 1 minute left. Hold rules: §10.3.

| Element | Result | Basis |
|---|---|---|
| **← Back to when & where** | Step 2 with answers kept; the held day shows as Selected. | Design |
| Name | Required, 2–80. Error: “Please tell me your name.” | Design + Proposal (copy) |
| E-mail | Required, standard format (`974:9087` · A). | Design |
| Phone | Required, a **mobile** number: UK (07… or +44 7…) or international with its country code (+…), stored in E.164 (Decided 2026-10-17). Error: “Please give a mobile number, like 07700 900 000 or +353 85 123 4567 — I text you on the day.” | Decided + Proposal (copy) |
| “Who is the cake for?” | Optional, max 80. | Design + Proposal |
| Allergens of the cakes | Above the allergy field, one line per cake: “{Cake} contains {its allergens, then its ‘Also contains’ text as written}.” — the same content as steps 1 and 4. A cake with none of the 14: “{Cake} contains none of the 14 regulated allergens.” (with an ‘Also contains’ text: “… allergens. Also contains {text}.”). | Spec (NON-NEGOTIABLES) + Proposal (place, copy) |
| 02 · ALLERGIES OR ANYTHING I SHOULD KNOW | Optional, max 400. Helper text as drawn. Shown as ALLERGY NOTE in admin, on the daily list and on print. | Design |
| Allergy consent tick box (only while the allergy field has text) | Required then, never pre-ticked: “I agree to Linda using this to make my cake safely.” Error beside it: “Please tick this so I can use your allergy note.” Stored with timestamp and wording. Emptying the field removes the box. | Decided D16 |
| Terms tick box (required, never pre-ticked) | Label links: “terms and conditions” → `/terms`, “cancellation terms” → `/cancellations` (new tab). Not ticked on Continue: scroll to it and show the message beside it, nothing lost (`974:9087` · I). Stores `terms_accepted_at` and the ids of the Terms and Cancellations revisions shown (§9.12). | Design + Proposal |
| “Send me an email once a year” (optional, never pre-ticked) | Stores marketing consent for this e-mail address (timestamp + the label wording) when the order is confirmed. Enables e-mail 5. Consent is per address (§10.10). | Spec + Proposal |
| Note under the boxes (`639:3359`) | “None of these boxes is ticked for you. The terms box is required; the e-mail box is up to you.” | Proposal (copy) |
| **Continue to payment** | Step 4. Answers are also saved on blur, so a refresh keeps them. | Design + Proposal |

The order summary column of step 2 is shown here too (desktop and tablet). The phone step 3 shows the consent box under its filled allergy note (`1797:13110`, drawn 2026-10-23); the box appears whenever the note has text (Decided D16). The helper line “…a nut-free kitchen” (`639:3347`) names the kitchen list from Settings. (Decided + Proposal)

### 5.4 Step 4 — Review & pay (`/order/pay`)

The hold line and countdown show as on step 3. On the phone step 4 (no summary bar) the hold line is sticky under the stepper while the hold runs.

| Element | Result | Basis |
|---|---|---|
| **← Back to your details** | Step 3 | Design |
| Order lines | One line per cake: “{Name} · {tiers} · serves {n} · “{inscription}”” or “· no message”, its price (top right), and under it “Contains {this cake’s allergens, then its ‘Also contains’ text}.” (none of the 14: as on step 1). Lines wrap; 1–5 lines simply stack. The kitchen sentence appears once, inside the BEFORE YOU PAY box (next row). | Design + Proposal (format) |
| BEFORE YOU PAY box (`641:3471`, phone `834:6470`, tablet `1557:12604`) | Copy with the constants of §11.8 (seven days, 14 days): the 14-day exclusion, the refund tiers, “You pay in full today”, plus the line “Changes and cancelling online until 23:59 two days before your date.” and “If you move your date, the refund counts from the earliest date your order has had.” Allergens: once, after the lines, “Made in a kitchen that also handles {kitchen list minus the allergens of every cake in the order}, so I cannot rule out traces of those.” — left out when that list is empty. The box grows with its content. Refund lines by date (Europe/London, worked out when step 4 loads, §10.1): while a full refund is still possible (the earliest date your order has had − today > 7; at checkout that is the chosen date) the tiers show as drawn; when it is not (every order dated seven days away or less, e.g. one booked at the default 5-day lead time), the tiers are replaced by “Cancel online until 23:59 on {Thursday 10 September} for half the price back.”; if the change window has already closed, both lines are replaced by “Changes and cancellation go through me.” (cannot happen with the 3-day minimum lead time, Decided 2026-10-17; kept as a guard). No line ever names a date that has passed. | Design + Proposal |
| Line **Edit** | Step 1 in edit mode (§5.1). | Spec |
| Line **Remove** | Not the last cake: the line goes, the hold shrinks, the total and the payment amount update; focus moves to the next line or the total. The last cake: the hold is released, the date cleared, and “There is nothing in your order” shows (`1096:9106` · C) with **Back to the designs →** (`/cakes`) and **Start a bespoke enquiry** (`/bespoke`). Step-3 answers stay in the draft. | Spec + Design |
| Handover line | Delivery: “Delivery · {Saturday 12 September}, {morning} · {Free / £x}”. Collection: “Collection · {date}, at a time we agree · Free”. No Edit link; change it with the stepper or ← Back. | Design + Proposal |
| “Your details” block | Name, e-mail and phone with a **Change** link to step 3; the address (delivery only) with a **Change** link to step 2. Drawn 2026-10-23 under the total (desktop `1797:13126`, tablet `1797:13136`, phone `1797:13146`). | Proposal |
| Total | Sum of the size prices (+ the delivery charge if Settings sets one above £0, §11.1). No VAT line. | Spec + Proposal |
| “Nothing further to pay…” box (`641:3481`) | “Nothing further to pay. Your date is booked the moment this goes through.” | Proposal (copy) |
| Payment block (`983:9092`, placed between the total and the Pay button) | The drawn fields are illustration of Stripe’s UI. Build: Stripe’s **Express Checkout Element** (Apple Pay / Google Pay buttons, shown only when the device offers them) above an “or pay by card” divider and a **card-only Payment Element** (no Link, Klarna or bank redirects). Field labels, field errors (e.g. “That card number is not valid”) and any country / postcode field are Stripe’s own; style them only through Stripe’s Appearance API (fonts, colours, radius, focus stroke as drawn). There is no “Name on card” field: the step-3 name is passed as billing name. There is one Pay button for cards (disabled until the card Element is complete); the wallet buttons pay too. | Design + Proposal |
| **Pay £…** | §5.5. | Spec |

**Phone:** steps 2–3 show a sticky summary bar at the bottom (`1102:9148`): “£{total}” · “{n} cakes · delivery {free/£x}” · **Continue →** (submits the current step). Tapping the bar opens the summary panel (a dialog): the lines with **Edit** / **Remove**, then Date / Window or Collection time / To. Step 4 shows the summary inline (`834:6395`). While a hold runs the bar also shows “Held {mm:ss}”. Tablet has no sticky bar: the tablet steps 2–3 show the right-hand summary column and step 4 its inline summary. Bar details: “1 cake” / “{n} cakes”; with Collect chosen “collection free”; the bar hides while the on-screen keyboard is open; the page gets bottom padding equal to the bar so the footer stays reachable; the panel (a bottom sheet) has **Edit** / **Remove** per line although the drawn panel `1102:9148` omits them. (Design + Decided + Proposal)

### 5.5 Paying — every outcome

The PaymentIntent is created once, when step 4 first loads: the server locks the draft row and creates one only when none is stored (idempotency key `create-{draft id}`; metadata `kind=checkout` and the draft id), so two loads at the same moment never create two. Its id is stored on the draft and every later amount change uses a PaymentIntent update; after every server-side amount change the page calls `elements.fetchUpdates()`, so the card form and the wallet sheet show the new amount. (Proposal)

**Pressing Pay** makes one server call, *prepare*, which runs these steps in order (Proposal):

1. Pause and hold: payments paused for this draft or connection (§10.9) → the paused notice; another tab already paying → the second-tab notice; hold expired → the hold-ran-out state. No charge in any of these.
2. Re-check every line and the handover: the cake is still visible (not hidden or deleted), the size still exists, its price, its allergens against the set shown when step 4 loaded, the postcode still in the delivery area, the delivery charge.
3. Anything changed → stop with no charge: the notices of the “Price, size or visibility changed by Linda before Pay” row show, the total and the **Pay £…** label update, the stored allergen sets become the ones now shown, and the customer presses Pay again after reading.
4. Otherwise: update the PaymentIntent amount if needed, take the snapshot (§1) and store it on the draft with its amount, lock the draft (`pending`, `locked_at` = now) and extend the hold so that at least 15 minutes remain (§10.3).

Only then does the page call `stripe.confirmPayment` with `redirect: 'if_required'` and `return_url` = `/order/confirmed`. Wallets: the Express Checkout `click` handler only calls `resolve()` (no server call — Stripe needs it within about a second); prepare runs in the Express Checkout `confirm` event, just before `confirmPayment`; if prepare stops (hold ran out, anything changed, paused) → `event.paymentFailed()` and the same state or notice as for a card.

**After an unlock** (a failed payment or a lapsed lock, back to `draft`): the stored snapshot is no longer used for Pay — the next Pay takes a new one — but it is kept. An edit after that updates the PaymentIntent amount. On `payment_intent.succeeded` the order is built from the latest stored snapshot whose amount equals `amount_received`; if none matches, it is built from the current lines and Linda gets “Check this payment” (§8.3). (Proposal)

| Outcome | What the customer sees | What happens | Basis |
|---|---|---|---|
| Taking payment (E) | Fields lock; the button shows “Taking payment” (at least 600 ms). | `pending`. | Spec + Design |
| Success | `/order/confirmed`. | Only the `payment_intent.succeeded` webhook confirms the order (§10.6). The page polls the order: confirmed within 10 s → the confirmation; otherwise “Still processing” (`974:9087` · H: “Payment received — confirming your order” · “Your payment has gone through, but the confirmation has not reached me yet. This page updates itself — there is nothing you need to do, and you will not be charged twice.”), polling every 5 s for 10 minutes, swapping to the confirmation without reload. After 10 minutes: “This is taking longer than usual. Your payment is safe; the confirmation e-mail arrives as soon as it is through.” + the drawn e-mail line. | Spec + Proposal (copy) |
| Declined (`983:9181`, phone `985:9166`; the older `974:9126` with a **Try another card** button is not built) | An inline notice above the payment block, built from the drawn text (`983:9189` / `983:9190`) as a template: “Your bank declined the payment” · Stripe’s own decline message as a second line (e.g. “Your card has insufficient funds.”) · “Nothing has been taken and {Saturday 12 September} is still held for {n} more minutes. Try another card{, or use Apple Pay / Google Pay}.” — the wallet clause names only the wallet the Express Checkout Element is offering on this device, and is left out when none is · “or call me on {phone}” (`tel:`). The card fields stay editable; Pay is enabled again (until the limit of §10.9). | Back to `draft` (only from `pending`; a status never moves back from `confirmed`, §10.6); same PaymentIntent. | Spec + Design + Proposal (template) |
| 3D Secure (F) | The bank’s own window over the page scrim. | — | Design |
| 3D Secure cancelled or timed out (G, `983:9273`; drawn like a bank dialog, but it is the site’s own inline notice above the payment block after the bank window closes) | “Not confirmed” · cancel: “You cancelled the bank check, so nothing has been taken. {date} is still held for {n} more minutes.” / timeout: the drawn copy · **Try again**: runs prepare first (§5.5 above), then `stripe.handleNextAction` with the client secret if the PaymentIntent still requires action, otherwise `confirmPayment` with the card fields — always the same PaymentIntent. | Back to `draft`. | Design + Proposal (cancel copy) |
| Connection lost during Pay | On reconnect the page reads the PaymentIntent and routes as in the next row. It never invites a second payment while the status is unknown. | — | Proposal |
| Refresh / reopen step 4 while paying | Step 4 first reads the PaymentIntent: succeeded or processing → `/order/confirmed`; requires action → G with **Try again** (after a refresh the card fields are empty, so it uses `stripe.handleNextAction`, never the fields); otherwise ready. | — | Proposal |
| Payment succeeded, browser closed | Nothing. E-mail 1 arrives. | The webhook confirms. For 24 hours the draft cookie leads to `/order/confirmed`; after that the next visit starts empty (§10.2). | Proposal |
| Webhook never arrives | “Still processing” until the polling stops. | The reconciliation job (§12) confirms it from the Stripe API within 10 minutes. | Proposal |
| Payment succeeds after the hold expired or the draft was abandoned | Normal confirmation. | The order is confirmed even if the day is now over its cap. Only when the hold had expired at confirmation **and** the day or its week is now over its cap, closed or too soon do Today and Money show “Booked after its hold ran out — check the day” (and Linda gets “Check this payment”, §8.3); a slow bank check on a day that still has room raises nothing. No automatic refund. | Proposal |
| Duplicate webhook | — | Ignored (keyed on the PaymentIntent id); e-mail 1 is sent once. | Spec |
| Pay pressed with an expired hold (stale tab) | Hold-ran-out state (G in `974:9087`, phone E). | The server checks the hold before confirming; no charge is attempted. | Proposal |
| Price, size or visibility changed by Linda before Pay | Every step load re-prices the draft, and prepare checks again at Pay. Notices at the top of the step, one per change: “The price of {cake} is now £{x}.” · “{cake} is no longer available and was taken out of your order.” (hidden or deleted) · “{cake} in that size is no longer offered and was taken out of your order.” · “The allergen information for {cake} has changed — please read it again before paying.” · “Delivery is now £{x}.” / “Delivery is now free.” A postcode no longer delivered to → step 2 with the postcode notice (§5.2). The last cake taken out → “There is nothing in your order” (§5.4). | Pay stops with no charge whenever anything changed (step 3 of prepare). A stale amount is never charged. | Proposal |
| Second tab while paying | Any step opened in another tab while the draft is locked shows at the top “This order is being paid in another tab — changes are paused until that payment finishes.” Steps 1–3: the fields and the buttons that change the order are disabled. Step 4: Pay and the wallet buttons are disabled. When the lock ends the tab follows on its next load: `/order/confirmed`, or editable again. | The draft is locked while `pending` (§10.2). | Proposal |
| Browser closed during the bank check (or any payment left half-way) | Reopening step 4 routes as above. | “Locked” means `pending` and now < `locked_at` + 15 minutes, or the PaymentIntent is `processing`. After that, on the next step load or prepare, the server reads the PaymentIntent: succeeded → `/order/confirmed`; `processing` → still locked; anything else → unlocked (back to `draft`; the snapshot is no longer used for Pay, see “After an unlock” above), so the customer is never blocked for longer than 15 minutes. | Proposal |
| Stripe Elements do not load | Under its place: “Card payments are not loading. Nothing has been taken and your date is held until {time}. Try again in a minute, or call me on {phone}.” | — | Proposal |

**Hold ran out** (on steps 3–4, `974:9087` · G, phone E): a notice at the top replaces the hold line, focus moves to it (`role="alert"`), Pay is disabled, every answer is kept. Three chips: the same date first if still available, then the nearest available dates. A chip takes a new 20-minute hold and stays on the same step. (Spec + Design)

### 5.6 Order confirmed (`/order/confirmed`)

| Element | Result | Basis |
|---|---|---|
| Heading | “Thank you, {first word of the name}.” | Design |
| WHAT HAPPENS NEXT | Right now: the confirmation e-mail to {e-mail}. Two days before, {Thursday 10 September}: “the last day to change or cancel online” (the drawn `643:3518` copy is replaced by this; the page names no refund tier or refund date, so it never promises a full refund that is no longer possible; hidden when the order was confirmed after 08:00 on D-2). On the date: delivery window + “I will text you that morning with a tighter window”, or for a collection “Collection from {address}, at a time we agree. I will be in touch to arrange it.” (no text line). | Design + Proposal (collection copy) |
| Order number + “Keep this…” | BBL-YYYY-NNNN (§10.7). | Design |
| **Track this order** | `/my-order/[token]` (the second check applies, §6.1). | Design |
| “Something not right? Reply to the confirmation email, or call …” | `tel:` | Design |
| The mascot over the order-number card (2026-10-23) | Decorative `V2 · Logo mark` peeking over the card’s top edge (desktop `1803:13026`, tablet `1803:13037`, phone `1803:13048`); it greets once per order — `ANIMATIONS.md` ANIM-25. `aria-hidden`. | Decided 2026-10-23 |
| “I will text you that morning with a tighter window” | Linda sends this text by hand from the admin (**Send a text**, §9.3). The site sends no SMS. | Decided |
| How the page finds the order | In this order: Stripe’s return parameters `payment_intent` + `payment_intent_client_secret` (after a bank redirect; the server reads that PaymentIntent and checks the client secret), else the `bbl_session` draft, else the signed recent-order cookie. Confirmed → the confirmation, and the page sets the signed recent-order cookie (24 hours), so a refresh within 24 h shows the same order. Paid but not yet confirmed (`pending`, or the PaymentIntent `processing` or succeeded) → “Still processing” (§5.5). Payment failed → `/order/pay`. Nothing found → `/find-my-order`. Back to any `/order/*` step after paying → `/order/confirmed`. | Proposal |

### 5.7 What Linda sees of a checkout

Drafts, pending and abandoned orders never appear in admin Orders, Today or any count. A confirmed order appears at once, and Linda gets the “New order” alert (§8.3). Live holds show in the admin Availability calendar as “+{n} held” (n = cakes in live holds, §9.11). (Decided D8 + Proposal)

---

### 5.8 Cake options — Decided 2026-10-21

Linda can add her own **options** to any cake in the admin (§9.13), for products with unusual needs. Owner decisions (2026-10-21): four types — **Choice** (pick one), **Choices** (tick several), **Text** (a short answer) and **Yes/no** (one tick box); every choice and every Yes/no can add to the price (+£, £0 allowed); the inscription stays but can be switched off per cake; customers can change options after ordering, like the size. Figma: admin `Admin / 9b · Add a cake — options` (`1713:11890`), allergen popover `Admin / 9c` (`1714:11933`), phone `Admin mobile / 6b` (`1714:11991`); customer states in section `V2 · Állapotok — torta opciók` (`1715:11991`): cake page with options `1715:11996` (phone `1716:12085`), option missing `1716:12022`, order line with options `1716:12054`.

| Topic | Rule | Basis |
|---|---|---|
| Types | **Choice**: pills like the size pills, one selected. **Choices**: check boxes. **Text**: a one-line field with a live counter “n / {max}”. **Yes/no**: one check box; its **label** is the short name used in the order (“Gift box”), its **help line** is the text beside the box on the cake page (“Add a gift box”). | Decided 2026-10-21 + Design |
| Settings per option | Label (required, max 40) · help line (optional, max 120) · required on/off (Choice; Text) or min / max picks (Choices, 0–10) · Text: max length 1–200 (default 40). Per choice: label (max 40), price add-on £0–£1,000, allergens it adds (the 14 tick boxes + Also contains; gluten and nuts name their kind as on the cake, §9.13). Up to **6 options per cake** and **10 choices per option**; drag ⠿ to reorder; **Remove this option** asks first (“Remove Sponge? Orders already placed keep it.”). | Decided 2026-10-21 (types, price) + Design + Proposal (limits) |
| On the cake page | Shown between the size and the inscription, in Linda’s order, numbered on from the size (“02 · SPONGE”). A choice shows “+£5”, or “included” at £0 (as the sizes). Start state: a required Choice has nothing selected; an optional Choice has nothing selected and can be cleared by tapping the selected pill again; Choices, Yes/no and Text start empty (§0.6). | Design + Proposal |
| Text answers | Trimmed, curly quotes made straight, NFC, counted as the customer sees them (as the inscription, §5.1); any printable characters except emoji; no line breaks. Over the limit: the counter turns red and **Add to your order** is refused (“That is a little too long — {max} characters fit.”). | Proposal |
| Price | Line price = size price + the add-ons of every chosen option. The price line shows it live with “Includes {Fresh berries +£6} and {Gift box +£8}.” under it when anything is added. “From £…” on cards stays the smallest size price without options. | Decided 2026-10-21 + Design |
| Allergens | The line’s allergens = the cake’s own + those of the chosen options. The cake page allergen line updates as options change (“…— the soya comes with the chocolate sponge”); everywhere else the line simply shows the combined list. The kitchen sentence subtracts the combined list. | Proposal (safety: §0.5 rule 2) |
| Missing or invalid | **Add to your order** checks every option: a required Choice with nothing chosen → “Choose a {label, lower case}.” under it (`1716:12022`), the label and pills in the error colour, focus to the first problem; too few / too many Choices → “Pick at least {n}.” / “Pick up to {n}.”; required Text empty → “Fill in {label, lower case}.” Nothing is added until all are fine. | Design + Proposal |
| Order line | Wherever a line is shown (step-2/3 summary, step 4, confirmation, status page, change page, e-mails 1, 2, 3, 3b, 4, 8, 12, the daily list, Today, Order detail, print), the options follow the size on one line, in Linda’s order: “Sponge: Chocolate · Toppings: Fresh berries, Gold leaf · Name on the topper: “Isla” · Gift box” (`1716:12054`); unanswered optional options are left out; Yes/no shows only its label when ticked. Phone summaries wrap the line. The inscription stays on its own line. | Design + Proposal |
| Edit mode and the draft | Edit mode (§5.1) loads the line’s answers. The draft stores each answer with the option and choice ids (§10.2). | Proposal |
| Linda changes options later | Orders keep their options, prices and allergens in the snapshot (§1). A draft whose option or choice was removed or whose add-on changed is re-priced at the next step load and at Pay (§5.5): “The options of {cake} have changed — please check them.” and the line opens in edit mode from step 4; a new required option does the same. | Proposal |
| Inscription switch | **Offer an inscription** (per cake, on by default). Off: no inscription field, no “HOW IT WILL LOOK” preview, no “Leave the cake plain?” sheet, the price line drops “· with inscription / · plain”, and the change page and Change the order show no Message row for that cake. | Decided 2026-10-21 |
| After ordering | The change page (§6.4) gets an **Options** row per cake with options, editable until 23:59 on D-2 like the size; the money difference = new add-ons − add-ons paid, with the same payment, refund and under-£0.30 rules. Linda: §9.7. Allergens of the new choices show before saving. | Decided 2026-10-21 + Proposal |
| Search and filters | The catalogue search (§4.2) does not search option texts. | Proposal |

## 6. After ordering — status link, changes, payments, delivery day

The status link `/my-order/[token]` is in every customer e-mail about an order. No account, no password (Spec — STATUS LINK). It works until 23:59 on the 30th day after the order’s current date (§10.5).

### 6.1 Opening the status link

| Step | Result | Basis |
|---|---|---|
| First open | A card **Open your order** with one field and **Open my order**. Delivery order: “Delivery postcode” (case and spaces ignored). Collection order: “Last four digits of your phone number” (4 digits, numeric keypad). Below: “Call {phone}” (`tel:`). Nothing personal is shown before the answer. | Spec + Decided + Proposal (card copy) |
| Correct answer | The status page. An httpOnly cookie remembers the answer for that order for 24 hours, so sub-pages, refreshes and the e-mail 2 deep link to `/change` open directly. Opening a sub-page without it shows the check first, then continues to the page asked for. | Proposal |
| Wrong answer (`1199:9211` · A) | “Nothing has opened yet” · the typed value kept · **Try again** · **Call {phone}**. Collection variant text: “This link only unlocks once the last four digits match the phone number on the order. Check what you typed above, or call me on {phone} and I’ll find your order for you.” | Design + Proposal (collection copy) |
| 5 wrong answers on one link within 15 minutes | The field locks for 15 minutes: “Nothing has opened yet — too many tries. Wait 15 minutes, or call me on {phone}.” Also at most 20 wrong answers per IP per hour across all links. | Proposal |
| Expired, revoked (customer deleted, §10.5), unknown or tampered status link (D, `1037:9232`) | “Let me send you a new one”: “Order links work until 30 days after your date. Put in the e-mail you ordered with and, if you have an order still open, a fresh link arrives in a minute. For an older order, e-mail or call me.” · e-mail field (always empty) · **Send me a new link** → F “New link sent” (`1037:9244`): “Check your inbox — it usually arrives within a minute.” · **Find my order** (`1037:9254`) → `/find-my-order`. Sends e-mail 16 only for orders whose link is still valid; the answer never reveals whether an order exists. **Send me a new link** counts against the Find my order limits (§6.7, §10.9): the same per-address counter and the same per-IP counter. | Design + Proposal (copy + limits) |

### 6.2 The status page — which state shows

Evaluated each time the page opens; **the first match wins**:

| # | State (frame) | When |
|---|---|---|
| 1 | E · Cancelled (`1036:9106` · E) | `cancelled` or `refunded` |
| 2 | Nobody was in (`1102:9106`) | the latest delivery attempt (§6.8) has the outcome “nobody in”, no choice yet, not completed — before 23:59 on the day that attempt was recorded the choices; after it “These choices have closed…” (§6.8) |
| 3 | After a missed delivery | the latest delivery attempt has a choice, not completed, and its collection or redelivery day has not passed: collection → the G text; redelivery → “Redelivery {date}, {window}” before that day and the B2 wording on it |
| 4 | C · After the date (`1036:9186`, phone `1056:9106`) | `completed`, or the date has passed |
| 5 | B2 · It is today | the date is today |
| 6 | B · Close to the date | the change window has closed (from 00:00 on D-1) |
| 7 | A · Booked | otherwise (change window open) |

### 6.3 What each state offers

**Catalogue orders:**

| State | Actions → result | Basis |
|---|---|---|
| A · Booked | **Change something** → change page (§6.4) · **Message Linda** → message page · **Need to cancel instead? →** → cancel page. Line “Changes are possible until {Thursday 10 September}. After that the cake is already being made.” (D-2, `1036:9127`). | Design + Decided D2 |
| B · Close to the date | **Message Linda** only. Text: changes and cancellation are closed; message or call Linda. | Design + Decided D3 |
| B2 · It is today | **Message Linda**. Delivery: “Today, {window}” · “It leaves my kitchen today. I will text you when I set off.” Collection: as the NEXT box below. | Design + Proposal (copy) |
| Nobody was in | **I will collect it today** and **Try again tomorrow — £15** (fee £0: “Try again tomorrow — free”, no payment step) → the same `/delivery/[token]` screens, options and rules as e-mail 13 (§6.8): after 18:00 collection is tomorrow; no redelivery option when tomorrow is closed or on a second failed attempt. | Design + Decided D5 + Proposal |
| After a missed delivery | **Message Linda** only; the handover part shows the redelivery date and window, or “Collect from …”. | Proposal |
| C · After the date | **Message Linda** · **Leave a Google review** (secondary button, new tab → the Google review link, §8.1 e-mail 18; Decided 2026-10-22, drawn 2026-10-23: desktop `1797:13105`, phone `1797:13107`; hidden when no Place ID is set) · per catalogue line that is still visible: **Order this cake again** (`1608:10779` / `1608:10781`) → that cake’s page. “Keep this link if you like — it works until {date + 30 days}.” | Design + Proposal (copy) |
| E · Cancelled | **Message Linda** · **Cancellations & refunds** → `/cancellations`. “This order was cancelled on {date}.” · “Your date is back in the calendar.” Refund line: full “£185 back to your card” · half “£92.50 back to your card — half, as the cancellation was inside seven days” (when the earliest date differs from the order’s date: “…inside seven days of the earliest date your order has had”) · none “No refund — the cancellation was on or after your date” · cash/bank “I will return £… the way you paid” · an amount Linda set herself “£{x} back to your card” / “No refund is due”. Before Stripe confirms: “on its way”; after: “refunded on {date}”. (A refund on an order that is not cancelled never shows E — it is a refund line in the money part.) | Design + Proposal (copy) |

**Manual (bespoke) orders** (Decided D7): no **Change something** and no cancel link in any state. In A and B the page says: “Changes and cancellations for a bespoke cake go through me — send me a message.” The Nobody-was-in choices are offered as for catalogue orders (they are not a change or a cancellation) — Proposal, for the owner to confirm. Everything else as above.

**Order panel** (every state after the check):

| Part | Content | Basis |
|---|---|---|
| Lines | See **Order panel rows** below. | Proposal |
| Handover | Delivery: Date · Window · To (address). Collection: Date · **Collect from** 20 Church View, Winchburgh · **Collection time** (“Agreed with Linda”, or the saved time). | Design + Proposal |
| Money | **Total £…**, then **Paid in full** or **Paid so far £… · Still to pay £…**; redelivery: “Redelivery £15 · paid”; refunds: “Refunded £… on {date}”. Every refund line shows, whatever its kind (§10.6), so a goodwill refund reads “Refunded £30 on {date}” while the order stays **Paid in full**. One **Pay £… →** (`/pay/[token]`) per open payment link, each with its purpose before it (“Deposit”, “The rest”, “A difference”, “Redelivery”). “Receipt sent to {e-mail}” only for card payments. | Design + Proposal |

**NEXT box** (eyebrow · title · body) per state:

| State | Delivery | Collection |
|---|---|---|
| A | “NEXT” · “{Saturday 12 September}, {9am – 12pm}” · “I will be with you then. Nothing for you to do until the morning.” | “NEXT” · “{date}, at {time}” or “{date} — collection time to agree” · “I will have it boxed and ready at {address}.” |
| B | “NEXT” · “{date}, {window}” · “I am baking yours now. The details are fixed — message me if something urgent has changed.” | same with the collection title |
| B2 | “TODAY” · “Today, {window}” · “It leaves my kitchen today. I will text you when I set off.” | “TODAY” · “Today, at {time}” / “Today, at the time we agreed” · “It is boxed and ready for you at {address}.” |
| After a missed delivery | “NEXT” · “Redelivery {date}, {window}” · “I will text you when I set off.” | “NEXT” · “Collect it {today/tomorrow} before {6pm / 12 noon}” · “From {address}.” |
| C | “THAT DATE HAS PASSED” · “Anything not right? Message me.” On the date itself, once `completed`: eyebrow “HANDED OVER”, same body (Proposal). | same |

Eyebrow of E: “REFUND ON ITS WAY” (pending; while a refund has failed and Linda’s **Try again** has not yet gone through, the body adds “I am sorting this — nothing for you to do.”), “REFUNDED” (done, with the tick), “NO REFUND” (no tick icon). “Refund receipt sent to {e-mail}” only after Stripe confirms a card refund. (Proposal)

**Order panel rows** (replaces the drawn `1036:9129` sample): per line the card photo 1:1 (manual order: no photo slot), name (manual: What it is), Flavour (catalogue orders only), “{tiers} · serves {n}”, inscription or “No message”, “Contains …”; 1–5 lines stack, no per-line price; “Allergies” = the step-3 allergy note, hidden when empty. Money as above. Status banners (“Message sent…”, “Your change is saved…”) are a violet notice like F `1037:9244` above the order number, gone on the next load. (Proposal)

### 6.4 Change your order (`/my-order/[token]/change`, `1036:9222` · A) — catalogue orders, change window open

| Element | Result | Basis |
|---|---|---|
| **Size** row per cake → **Change** | Opens inline: that cake’s **current** sizes (§11.3), each with the difference against the line’s price paid (§11.6: what was paid for the current size, updated with every size change; e.g. +£55 / −£55). A size Linda has removed cannot be chosen; the current one stays shown as “no longer offered” if it was removed. | Design + Proposal |
| **Message** row per cake → **Change** | The inscription field as on step 1 (24 characters, counter, preview, no emoji); empty → “Leave the cake plain?” (`974:9087` · E). | Design |
| **Date and window** row (one per order) → **Change** | The step-2 calendar and window pills (collection orders: date only). Allowed: available days (§10.4; the order’s own cakes count neither against the new day nor against its week) on or after today + lead time. Checked again at saving; if the day filled meanwhile: “That day has just been taken — nothing has changed. Pick another:” + three nearest available dates; other edits kept. Saving releases the old date and takes the new one; the link lifetime, e-mail 2 and the change window follow the new date. The refund tier keeps counting from the **earliest date the order has had** (Decided 2026-10-17, §10.1; a date the customer chooses counts towards it). | Design + Proposal |
| Phone | The whole row is tappable (Decided). Editors open inline under their row. | Decided |
| Address, allergy note, anything else | Not editable here: **Message Linda**. | Decided |
| **Save changes** | Disabled until something differs. Money: net difference over all cakes. **Up** → the payment block (§5.4) appears for the difference and the button reads **Pay £… and save**; the change is saved only when that payment succeeds (if the browser closes after paying, the webhook applies it). When the change also moves the date, a 20-minute hold (§10.3), owned by the order rather than a draft (§11.6), is taken on the new date as the payment starts; if the day is full when the webhook applies it, the change is applied anyway and flagged “Booked after its hold ran out — check the day”. **Down** → saved at once and the difference is refunded to the card automatically (if the refund call fails, the change stays saved, Money flags “Refund failed — try again” and Linda gets an alert). **£0** → saved. A net difference under £0.30 either way (Stripe’s minimum) counts as £0: nothing is charged or refunded, the order keeps its old total and each line’s price paid stays as it was, and the history notes “Difference under £0.30 waived”. Then the status page with “**Your change is saved.** The details are in your inbox.” (+ “£55 paid today” / “£55 back to your card within 5–10 working days”) and e-mail 12. | Design + Decided + Proposal |
| Payment fails at saving | The §5.5 decline / 3DS notices under the Element: “Nothing has changed and nothing was taken.” Edits kept. | Proposal |
| A size-up payment is in progress | From the moment the payment starts the order is locked, with the same rule as the checkout lock (§5.5), so it lapses as that lock does. Another tab sees “A payment for your change is going through — nothing else can change until it finishes.” + **Back to your order**; Linda sees “Customer payment in progress” and cannot save a change (§9.7). Every customer save carries the order’s version: a save from an out-of-date page changes nothing and shows “Your order changed while this page was open — nothing was saved. Here is how it looks now.” The webhook checks the version again before it applies a paid change; if the order has moved on, the change is not applied, the payment is refunded (kind `excess`, §10.6) and Linda gets an alert. | Proposal |
| The change window closes while on the page (A2, `1036:9260`) | Checked when the payment starts (size up) or at saving. Closed → A2 “Change window closed” · **Message Linda** · **Back to your order**; nothing saved. A size-up payment already started before 23:59 is honoured. | Design + Proposal |
| A change by Linda is waiting for payment | Nothing is editable: “Linda has a change waiting for payment — pay it first or message her.” + **Pay £… →**. | Proposal |
| **Back to your order** | status page | Design |
| Opening `/change` or `/cancel` when not allowed (B, B2, C, E, Nobody was in, manual orders) | `/change` after the window → A2; otherwise both redirect to the status page. `/message` works in every state while the link is valid. | Proposal |

Options (§5.8): an **Options** row per cake that has options → **Change** opens them as on step 1, with the add-on differences. Removing a cake or adding one is not possible here: the customer asks Linda, who can add or remove a cake in Change the order (§9.7).

Editors (drawn 2026-10-23: desktop A3 `1799:12959`, phone A3 `1799:13052`): rows are grouped per cake under the cake’s name, then one “Date and window” row (collection: “Date”). One editor open at a time; an edited row shows the new value and **Undo**. The size editor is a radio list (“Serves 30 · three tiers · +£55”). The payment block (§5.4) sits between the rows and the buttons. On the phone each row ends with a › chevron. The drawn **Save changes** is enabled only because it is a sample moment (§0.6). (Proposal)

### 6.5 Message Linda (`/my-order/[token]/message`, `1036:9222` · B)

| Element | Result | Basis |
|---|---|---|
| Message field | Max 400, counter “n / 400” on desktop and phone. | Design + Proposal (phone counter) |
| **Send message** | Empty or only spaces: “Write a message first — nothing was sent.” Otherwise: an e-mail to `business/email` with the order number, `Reply-To` = the customer; the message is also stored on the order (admin Order detail → MESSAGES). Then the status page with “**Message sent.** I’ll reply to {e-mail} within 24 hours. If it is urgent, call {phone}.” (gone on the next load). Limit: 5 messages per hour per order. Failure: §10.8. | Design + Proposal |
| **Back to your order** | status page | Design |
| Copy | “I answer every message within 24 hours, usually sooner.” (first person; the drawn “She answers…” is outdated) | Proposal (copy) |

The phone frame `1058:9130` draws no visible label: the field has the desktop label “What would you like to tell me?” on every breakpoint. Limit reached: “You have sent five messages in the last hour — nothing was sent. Ring {phone} if it is urgent.” under the button. (Proposal)

### 6.6 Cancel your order (`/my-order/[token]/cancel`, `1036:9222` · C) — catalogue orders, change window open only

| Element | Result | Basis |
|---|---|---|
| Refund shown | The tier of §10.1 (Europe/London): earliest date more than 7 days away → **full**; otherwise **half** (rounded up to the penny). Online cancelling is only possible until 23:59 on D-2 of the current date, so “none” never shows here. When the order was moved and the earliest date differs, the lead line reads “…your refund counts from {earliest date}, the earliest date your order has had, so you are due {full refund / half — £92.50 back}.” Basis = what counts for a refund (§10.6): net paid less any goodwill or dispute refunds, so every refund already made is taken off; a redelivery fee never counts. The refund goes to card charges newest first, each charge refunded at most up to what is left of it. A redelivery fee never exists while online cancelling is open (it comes after the date); when Linda cancels an order with a paid fee (§9.5), the fee is refunded in full on top of the tier amount, as a `fee` refund (§10.6). Lead line: “…is {n} days away, so you are due {full refund / half — £92.50 back}.” Panel: “You paid £185 on 31 August” (several payments: “£240 in total — £185 on 31 Aug, £55 on 3 Sep”). Every refund already made follows as its own line (“£55 back to your card on 5 Sep”), then “Your refund is worked out from £185.” | Design + Spec + Decided D3 + Decided 2026-10-17 + Proposal |
| **Keep my order** | status page | Design |
| **Cancel the order** | First re-checks the change window: closed → A2 “Change window closed” · **Message Linda**; nothing is cancelled. Then the refund is recalculated; if it differs from what was shown, nothing is cancelled and the new amount is shown (“It is now inside seven days, so the refund is £92.50. Cancel anyway?”). Otherwise: status `cancelled`, the date released at once, any open payment link withdrawn, any waiting Linda change dropped, the Stripe refund created immediately (newest charge first across the order’s payments) → state E, e-mail 8, and Linda’s alert (§8.3). Status `refunded` once every refund decided at cancellation is done (§10.6). | Design + Decided D6 |
| Stripe refund call fails | The order stays `cancelled`; admin Money flags “Refund failed — try again”; Linda gets an alert. | Proposal |

### 6.7 Find my order (`/find-my-order`)

| Element | Result | Basis |
|---|---|---|
| **Order number (optional)** + **E-mail** + **Send me the link** | Matching ignores case and spaces; the number may be typed as “BBL-2026-0147”, “bbl20260147” or “0147”. With a number: e-mail 16 for that order if it belongs to that e-mail and its link is still valid. Without: e-mail 16 listing every order of that address whose link is still valid. Always the same answer F “if that address has an order, a link is on its way” — never confirms or denies. Enquiries are not found here. | Spec + Decided + Proposal |
| More than 3 requests per address per hour (`1199:9206` · B) | “Too many requests”. The typed address is kept and the button stays enabled (the drawn disabled button and emptied field in `1199:9227` are a sample moment); a new press checks the limit again. The button keeps the label of the page it is on. On `/find-my-order` the answer F replaces the form in place and F’s **Find my order** link is hidden there. | Spec + Design + Proposal |
| More than 5 requests per IP per hour | B with “Nothing new has been sent. There have been too many requests from this connection in the last hour — try again later, or ring me on {phone}.” | Proposal |
| Honeypot filled | The normal answer F; nothing is sent and nothing is stored. | Proposal |
| The link | There is one status token per order; Find my order re-sends the same link (never a new token). | Proposal |

### 6.8 Delivery day — Nobody was in (`/delivery/[token]`)

| Step | Result | Basis |
|---|---|---|
| Linda (or a Helper) waits 15 minutes at the door, brings the cake back and taps **Nobody was in** (Today or the order; deliveries only), confirms on `Admin / 21` (`1604:10501`, phone `1604:10556`) | Delivery outcome = nobody in. E-mail 13 (`1249:9261`) with **Collect it today — free** and **Redeliver tomorrow — £15**; the status page shows the Nobody-was-in state. The delivery link works until 23:59 on the day the attempt is recorded (§10.5). With customer e-mails off (manual order), the confirm reads “Customer e-mails are off for this order — ring {name} on {phone}.” and no e-mail goes. | Design + Decided + Proposal |
| Opening `/delivery/[token]` (from e-mail 13 or the status page) | Nothing is recorded by opening a link. Without a choice in the URL: both options (as the panel `1102:9131`). | Proposal |
| **Collect** (`?choice=collect`) | “Collect it today from 20 Church View, Winchburgh, before 6pm?” · **Yes, I will collect it** → G “Collecting it today” (`1199:9206` · G). After 18:00 the option reads “Collect it tomorrow — free, before 12 noon” and G says tomorrow. | Design + Proposal |
| **Redeliver** (`?choice=redeliver`) | The window pills (Morning · Afternoon · Evening) for the next day + the payment block (§5.4) for £15 (`ops/second-attempt-fee`; same states as §5.5) + **Pay £15** → H “Redelivery tomorrow — £15” (`1199:9206` · H, Window = the chosen window, “I text a tighter time that morning”) only after the payment succeeds. The redelivery does **not** count against the caps. If the next day is closed, this option is not offered (collection only). With the fee set to £0 it reads “Redeliver tomorrow — free”: the window pills and no payment block, recorded when the window is confirmed (§6.3, §9.14). | Design + Decided D5 + Proposal |
| After a choice | Choices are final; opening the link again shows that choice’s confirmation plus “To change your mind, ring me on {phone}.” The attempt stores the choice and when it was made; a redelivery adds the next attempt (its day and window), which appears on that day’s Today and daily list; e-mail 3 is not sent again. Linda gets an alert (§8.3). | Decided D5 + Proposal |
| No choice by 23:59 | The link and the status page show “These choices have closed. Ring me on {phone} and we will sort it out.” Today shows “No choice yet — ring them”. Linda resolves it in admin. | Proposal |
| A second failed attempt on the redelivery day | **Nobody was in** shows on the redelivery day too (§9.3). It records “nobody in” on that attempt, with a new delivery token; e-mail 13 goes in its one-button form (§8.1) and the status page shows the Nobody-was-in state with free collection only. | Proposal |
| Delivery attempts | Stored as a list on the order, one entry per attempt: day, window, outcome (none yet · nobody in · handed over), choice (none · collect · redeliver), chosen at, the collection day or the redelivery window, and one delivery token per attempt. The first attempt is the order’s date and window; a redelivery adds the next one. The status page (§6.2), Today, Order detail and the daily list read the latest attempt; **Delivered after all** and **Record their choice** (§9.5) act on it. | Proposal |
| Timing | “Today” and “tomorrow” in this flow count from the day Nobody was in is recorded, also when Linda records it a day late. The redelivery day is that day + 1, fixed when e-mail 13 is sent, so a payment that starts at 23:58 and succeeds at 00:02 is still for that day. Choosing Collect cancels a redelivery payment still in progress; one that succeeds anyway is refunded in full as a `fee` refund (§10.6). Collection is offered even when the collection day is closed (closing a day stops new orders, not a pick-up). | Proposal |
| Collect chosen, not picked up | Still `confirmed` the day after the chosen collection day → Today shows it at the top with “Not collected yet — ring them”, exactly as a collection order (§9.3); no e-mail goes to the customer. | Decided 2026-10-17 + Proposal |

Copy: the drawn “this morning” in e-mail 13 and B2 is filled from the window (“this morning / this afternoon / this evening”). (Proposal)

`/delivery/[token]` shows only the heading, WHAT NOW (`1102:9131`) and the buttons — no address, allergy note or e-mail (the order panel drawn in `1102:9106` belongs to the status page only, which has the second check). (Proposal)

### 6.9 Pay for your cake (`/pay/[token]`, M: `1598:10573`, phone `1598:10598`)

| Element | Result | Basis |
|---|---|---|
| Opening the link | No second check (the link was sent to the customer’s e-mail and only takes money). Rows by purpose: **Deposit** — What it is for · Your cake ({what it is}, {date}) · To pay now (“£120 · total £380, paid so far £0”). **The rest** — To pay now (“£260 · this settles your cake”). **Redelivery** — “Redelivery {date}, {window} · £15”. **A difference** linked to a waiting change (§9.7) — as drawn (“New size …”) plus the box “Your order stays as it was until then” (`1598:10590`). **A difference** sent by hand (manual orders) — like The rest, without the box. | Design + Decided + Proposal (row copy) |
| Payment block (§5.4) and **Pay £…** | Same states as §5.5 (metadata `kind=payment_link`; a Redelivery link `kind=redelivery`, §9.8). One PaymentIntent per link (and per redelivery), created when the link is first opened and reused on every later open; it is cancelled in Stripe when the link is withdrawn or expires, so a stale tab cannot pay. | Decided + Proposal |
| Paid | Same URL: “**Paid — thank you.** £55 has been paid for order BBL-…. A receipt is on its way to {e-mail}.” + **See your order →** (`/my-order/[token]`, the second check applies). Paid so far updates; for a difference linked to a waiting change (§9.7) the change is applied and e-mail 12 follows (unless customer e-mails are off, §8.2). Linda gets an alert (§8.3). | Decided + Proposal (copy) |
| Opening it again after paying | The same text titled “**Already paid**”. | Decided |
| Checked in this order: paid first (“Already paid”, above); then link withdrawn by Linda, order cancelled, customer deleted (§10.5) or expired | “This payment link is no longer needed. Nothing has been taken. Questions? Call {phone}.” | Proposal |
| Unknown or tampered token | 404 | Proposal |
| The same link paid twice, or a payment that takes net paid above the total | The excess is refunded automatically and shown in the order history. | Proposal |

The payment block (§5.4) sits between the info box and **Pay £…**. Desktop copy wins over the phone frame (“Call Linda on {phone}”, “£55 — new total”, “Saturday”). (Design + Proposal)

### 6.10 Unsubscribe (`/unsubscribe/[token]`, `1199:9206` · J, phone `1199:9408`)

| Element | Result | Basis |
|---|---|---|
| Opening the link | Nothing changes on load, not even by script (mail scanners such as Safe Links run JavaScript). The page shows “Stop the once-a-year e-mail?”, the line “You will still get e-mails about any order you place.” and a **Stop these emails** button (this first state is not drawn; it uses the J layout). Pressing it POSTs to the same URL (`/unsubscribe/[token]`) and shows J: “I’ve taken this address off the once-a-year e-mail. You will still get e-mails about any order you place.” The mail app’s RFC 8058 one-click POST (`List-Unsubscribe-Post`, §8.4) goes to the same URL and records the withdrawal with no page. That POST endpoint takes no CSRF token: the token in the URL is the credential (§10.14). | Design + Proposal |
| **Turn emails back on** | Stores consent again (timestamp + wording “Turn emails back on — yearly reminder”) and shows: “**You’re back on the list.** One e-mail a year, around the date of your last cake. You can stop it with one click in any of them.” The button becomes **Stop these emails**. | Decided + Proposal (copy) |
| Scope | Per e-mail address, all orders; only e-mail 5 is affected. A spam complaint on e-mail 5 counts as an unsubscribe (§8.4). The suppression list (unsubscribe, spam complaint, deleted customer) blocks only consent older than that event; a newer explicit tick at an order, or **Turn emails back on**, lifts it (Proposal). | Proposal |
| Opening again | J again. Unknown token: “This link didn’t work. Email {e-mail} and I’ll take you off by hand.” | Decided + Proposal |

---

## 7. Bespoke, contact and complaints

**Bespoke is private (Decided 2026-10-14).** The site only takes the enquiry. Linda and the customer agree the design, the date and the price by e-mail. Linda then adds the order herself (**Add an order**, or **Turn into an order** from the enquiry) and sends payment links for whatever they agree, or records cash and bank transfers. There is no online quote, no automatic deposit or balance, no reminder and no pause.

### 7.1 Bespoke enquiry (`/bespoke`)

| Element | Result | Basis |
|---|---|---|
| Intro facts | “Bespoke cakes start at £{bespoke minimum}”, the free-delivery line from `ops/delivery-area`, and HOW FAR AHEAD TO ASK (“{bespoke lead time words}”, weddings “six months or more”) are templates (§11.1, §11.2). | Design + Proposal |
| Single-select pills (occasion, servings, area, budget, finish, flavour) | Tapping the selected pill clears it. **Something else** (occasion) and **Somewhere else** (area) open no extra field: the customer explains in “Anything else” or the venue field. | Design + Proposal |
| Budget pills | The first band reads “£{bespoke minimum} – 250”; the others are fixed; the first band is hidden if the minimum is £250 or more. | Design + Proposal |
| Dietary pills (“select all that apply”) | **None** clears the others; any other clears **None**. **Other** opens no field. Choosing any pill other than None shows the required consent box: “I agree to Linda using this to make my cake safely.” Error beside it: “Please tick this so I can use your dietary answers.” | Design + Decided D16 |
| Date of the event + **My date is still flexible** | The toggle can be used alone (“Flexible — no date yet”) or with a date (“{date} · flexible”). Selectable: tomorrow to 24 months ahead; booked, closed and too-soon days are **not** checked here. | Design + Proposal |
| Date warnings (calm violet, never block) | Fewer than {bespoke lead time in weeks × 7} days from today (default 3 weeks = 21 days, §11.2) → “That is {n} days away — very soon for a bespoke cake. You can still send it; I will tell you within 24 hours whether I can fit it in.” Occasion Wedding and before today + 6 calendar months → the wedding warning (`974:9087` · L, `1608:11052`). Both apply → only the lead-time warning, worded for a wedding. No date → no warning. They recalculate live. | Design + Decided + Proposal (both at once) |
| **I would rather talk it through on the phone** | Marks the enquiry “call me”; the phone number becomes required (“Add a phone number so I can ring you”). | Design + Decided |
| Contact fields | Full name required (2–80). A way to reach the customer is required: a valid e-mail, or a phone number. E-mail format; phone a UK number, or international with its country code (§10.8). | Proposal |
| Venue name or postcode, Anything else (“in your own words”) | Optional text; max 200 / 1,000. | Design + Proposal |
| **Add up to three pictures** (`974:9087` · J) | JPG, PNG or HEIC, max 8 MB each, 3 files. The picker uses `accept="image/jpeg,image/png"`, so an iPhone converts HEIC to JPEG itself; the server still accepts HEIC (e.g. dragged in on a Mac) and converts it; thumbnails come from the server copy (most browsers cannot show HEIC). Uploaded as soon as picked, with progress; each removable. Too big: as drawn. Wrong type: “{file} is not a picture I can open. JPG, PNG or HEIC, up to three pictures.” Upload failed: “{file} did not upload — nothing else was lost. Try again or remove it.” More than 3 picked at once: the first three are kept (“I kept the first three — remove one to swap it.”). Server side: HEIC → JPEG, location data removed, stored privately (admin only), never attached to e-mails. | Design + Proposal |
| **Send my enquiry** with answers missing (`974:9087` · K) | Summary beside the button · **Take me to the first one** · **or send it anyway and I will call you →** (offered only when a phone number is filled in; otherwise “I need a phone number to call you” and only **Take me to the first one**). Name, a way to reach the customer and a required consent box can never be skipped. | Design + Proposal |
| Inspired by a gallery photo (`/bespoke?inspired=<id>`; state M: desktop `1633:12328`, phone `1642:11966`) | At the top of the pictures step a card: the photo’s thumbnail, “INSPIRED BY”, its caption, **Remove ×**, and “You came from my gallery — I will see this picture with your enquiry.” It does not count toward the three pictures. Remove clears it. An unknown or hidden id is ignored. The reference is stored with the enquiry and shown in admin Enquiry detail (§9.10); e-mail 6 and Your enquiry list “Inspired by: {caption}” (Proposal, not drawn). | Decided (2026-10-16) + Design |
| **Send my enquiry** | Waits for unfinished uploads (“Waiting for 1 picture…”). The button disables on the first press; a repeat with the same form key returns the same reference. → `/bespoke/sent` + e-mail 6 (if an e-mail was given) + Linda’s “New enquiry” alert (§8.3); the enquiry appears in admin Enquiries as **New**. A missing answer shows as “Not answered” everywhere; an enquiry sent with gaps is marked “Sent with gaps”. | Design + Spec + Decided D8 |
| Spam | Honeypot (a field with a meaningless name and `autocomplete="off"`, so autofill never fills it) filled → the normal sent page, stored as “Possible spam” (hidden from New, no e-mail 6, deleted after 30 days; Linda can rescue it, §9.10). Rate limit (§10.9) → under the button: “Too many messages from this connection in the last hour — nothing was sent. Please try again later, or email {e-mail}.” | Decided + Proposal |
| No e-mail given | No e-mail 6 and no `/my-enquiry` link; the sent page still shows the reference; admin shows “No e-mail — ring {phone}”. | Proposal |

| Topic | Rule | Basis |
|---|---|---|
| Date field | A native date input (`type=date`, min tomorrow, max today + 24 months) beside the Flexible toggle; a native input cannot be formatted, so the long date shows as a line under it (“Saturday 20 June 2027”). | Proposal |
| Wedding warning | “That is {n} months away — weddings are usually booked about six months ahead.” (n = whole calendar months, at least 1, in words up to ten). Both warnings: “That is {n} days away — very soon for a wedding cake. You can still send it; I will tell you within 24 hours whether I can fit it in.” | Proposal |
| Finish and flavour | Block “06 · FINISH AND FLAVOUR” holds two single-select pill groups (Finish, Flavour) with the pills as drawn, each with its own accessible group name. | Design + Proposal |
| Missing answers (K) | The summary lists unanswered: occasion, date (unless Flexible is on), servings, area, budget, finish, flavour, and e-mail when only a phone was given. Venue, Anything else, dietary and pictures never count. Heading: “{n} things still need you” / “One thing still needs you”. A live date warning repeats as the last line “Also: …”. | Proposal |
| Picture control | The square tiles drawn on the page are the pattern (also on Complaints): empty tile “+”, uploading tile with a progress ring, added tile with the thumbnail and ×; the add tile hides at three. The J state (`975:9114`) shows only the error copy. | Proposal |
| Counters | Venue (200) and Anything else (1,000) show a counter from 80 % of the limit. | Proposal |
| Dietary consent | The drawn page has “No nuts” selected but no consent box: the box appears whenever a dietary pill other than None is chosen (D16). Drawn 2026-10-23: desktop `1797:13114`, tablet `1797:13122`, phone `1797:13118`. | Decided |

### 7.2 Enquiry sent (`/bespoke/sent`) and Your enquiry (`/my-enquiry/[token]`)

| Element | Result | Basis |
|---|---|---|
| Enquiry sent | Shows the reference BBL-YYYY-E-NNNN (§10.7). “No reply by this time tomorrow? … call me on {phone}” → `tel:`. **Browse the ready-made range** → `/cakes` · **Back to home** → `/`. Opened directly without a submission → `/bespoke`; a refresh keeps the reference for 10 minutes. | Design + Proposal |
| Your enquiry (from e-mail 6 **See what I have written down**; `1609:10885` / `1609:11066` / `1609:11227`) | Shows every answer exactly as sent (“Not answered” for gaps), “Inspired by: {caption}” with the thumbnail when the enquiry came from the gallery (Proposal; not drawn), “How to reach you” (“A phone call · {phone}” or “By email · {e-mail}”), how many pictures were attached, and “Sent {Monday 31 August}”. Nothing can be edited. No second check — also for the dietary answers (health data): the link goes only to the address that sent the enquiry, and the Privacy policy says so (§14.1; owner to confirm). The phone text follows the desktop copy (“Your enquiry.”, “…or use Email Linda about it.”). | Decided + Proposal |
| **Email Linda about it** | `mailto:` {business e-mail}, subject “Enquiry {reference}” | Decided |
| **Back to home** | `/` | Design |
| Link lifetime | 12 months from sending. Expired, deleted or tampered → the 404 page. | Decided |

### 7.3 After the enquiry — handled by Linda

| Step | What happens | Basis |
|---|---|---|
| Linda replies | Enquiry detail **Reply by email** → her own mail app (`mailto:` the customer, subject “Your cake enquiry — {reference}”). The enquiry becomes **Replied** (from New only). | Decided |
| They agree | **Turn into an order** → Add an order, prefilled (§9.6). The enquiry becomes **Ordered** when that order is saved. | Decided |
| The order | A manual order: one cake; counts 1 against both caps; shows on Today; customer e-mails per §8.2 (Customer e-mails On/Off). | Decided |
| Money | Payment links from the order (Deposit · The rest · A difference) → e-mail 15 → `/pay/[token]`. Cash or bank transfer: “Paid so far” in Add an order, later **Record a payment** (§9.5). | Decided + Proposal (Record a payment) |
| Changes later | By e-mail; Linda edits the order (§9.7). The customer cannot change or cancel a manual order online. | Decided D7 |
| Linda cannot take it | **Close this enquiry** — nothing is sent; she tells the customer in her own e-mail. | Decided |

### 7.4 Contact (`/contact`) and Message sent (`/contact/sent`)

| Element | Result | Basis |
|---|---|---|
| Fields | Name (required, 2–80), e-mail (required), phone (optional; a UK number, or international with its country code, §10.8), message (required, max 400). | Design + Decided + Proposal |
| **Send message** | An e-mail to `business/email`: From “Baked by Linda website”, `Reply-To` the customer, subject “Website message — {name}”, with every field, the time and the page it came from. The message is stored for 30 days (retries stop after 24 hours, §8.4) and shown at `/admin/messages/[id]` (read-only, Owner). No acknowledgement e-mail to the customer. → `/contact/sent`. | Decided + Proposal |
| Message sent | “If it is urgent, call {phone}” → `tel:` · **Back to the designs** → `/cakes`. Opened directly → `/contact`. | Design + Proposal |
| Spam | Honeypot filled (as §7.1) → the normal `/contact/sent` page; nothing is sent and nothing is stored. Rate limit (§10.9) → the §7.1 copy under the button. | Proposal |

The sidebar “THE DETAILS” (`656:3843`): e-mail, phone and the address from Settings; “Delivery — {delivery_area}”; “Collection by arrangement — Most days, including evenings” is fixed copy. The heading reads “Tell me about it.” (first person; the drawn “Tell us” is outdated). (Proposal)

### 7.5 Complaints (`/complaints`, the form on the Complaints procedure page)

| Element | Result | Basis |
|---|---|---|
| Fields | Order number (optional, loosely checked against BBL-YYYY-NNNN), name (required), e-mail (required), what’s wrong (required, max 400), pictures 0–3 (rules as §7.1), “What would help” pills (Repair · Replacement cake · Partial refund · Full refund; optional, single). | Design + Proposal |
| **Send my complaint** | An e-mail to `business/email` (`Reply-To` the customer, subject “Complaint {BBL-YYYY-C-NNNN} — {order number or ‘no order number’} — {name}”, a link to `/admin/complaints/[ref]` (ref = the complaint reference) — a read-only admin page, signed in, Owner only, with the complaint, contact details, the matched order and the pictures; included in customer export and delete, §9.17) + e-mail 17 “Complaint received” to the customer (Decided D18). If the order number matches an order with the same e-mail, the order gets a note “Complaint received {date}” and the e-mail links to it; otherwise it is never rejected (“Order number not found”). → `/complaints/sent`. | Design + Decided D18 + Proposal |
| Complaint sent (`1253:9529`, phone `1253:9542`) | The reference: every complaint gets its own BBL-YYYY-C-NNNN (§10.7), so two complaints about one order never share one; when an order matched, its number shows next to it (“BBL-2026-C-0004 · order BBL-2026-0147”); the summary line = reference + the first 60 characters of what’s wrong. **Back to home** → `/`. Opened directly → `/complaints`. | Design + Proposal |
| Refunds that follow | Linda decides; a goodwill refund is done in Stripe (**Refund in Stripe**, §9.5) and recorded on the order as a refund line of kind `goodwill` (§10.6: it never makes the customer owe money; the order status does not change). | Decided D6 + Proposal |
| Spam | Honeypot filled (as §7.1) → the normal sent page; no e-mail to Linda and no e-mail 17; the complaint is kept 30 days as possible spam (§10.10), then deleted. Rate limit (§10.9) → the §7.1 copy under the button. | Proposal |

---

## 8. E-mails

Figma: customer e-mails in section `1128:9106`; admin Emails screen `962:9022` / `965:9062`. E-mail numbers are IDs (7, 9, 14 were removed with the private bespoke flow; 10 and 11 never existed).

### 8.1 Customer e-mails and Linda’s daily list

Subjects and preview lines are the Figma inbox texts (sample values in braces). “Switchable” = Linda can turn it off on the Emails screen.

| # | Name · Figma | Sent when | Subject · preview | Buttons / links → destination | Switchable |
|---|---|---|---|---|---|
| 1 | Order confirmed · `1128:9111` | Catalogue: the `payment_intent.succeeded` webhook confirms the order. Manual: Linda saves the order — always, also when its customer e-mails are Off, like 8 and 15 (Decided 2026-10-17). | “Your cake is booked — {Saturday 12 September}” (several cakes: “Your cakes are booked — {Saturday 12 September}”) · “Order {BBL-2026-0147} · everything you need is in here” | **See your order** → `/my-order/[token]`. Must also contain (the full version is drawn as `1800:13257`, 2026-10-23): one block per cake with name, flavour, size, inscription and its allergens; the handover (delivery window and address, or “Collection · 20 Church View, Winchburgh · at a time we agree”); the timeline (Booked = today · In the kitchen = D-1 · With you / Ready to collect = D); the cancellation rights with real dates, worked out at confirmation from the earliest date the order has had (§10.1; at confirmation, its date) — one of three variants (Proposal): full-refund deadline still ahead (today is on or before D-8): “Change or cancel online until 23:59 on {Thursday 10 September}. Cancel by {Friday 4 September} for a full refund, after that for half; after {Thursday 10 September} changes and cancellation go through me.”; full-refund deadline already passed, change window still open: “Change online until 23:59 on {Thursday 10 September}. Cancelling online now gives a half refund, until 23:59 on {Thursday 10 September}. After that, changes and cancellation go through me.”; change window already closed: only “Changes and cancellation go through me.” The first two end with “Refunds count from the earliest date your order has had, so moving your date later does not change them.”; manual orders: “To change anything, just reply to this e-mail.”) and links to `/cancellations` and `/terms`. **Durable record (Decided 2026-10-17; Consumer Contracts Regulations):** the e-mail itself also states the key terms — who sells (trading name, legal name, address, phone, e-mail), the total and how it was paid, delivery or collection, that a made-to-order cake has no 14-day cancellation right, the refund tiers, and how to complain — and attaches the accepted revisions of Terms and Cancellations as PDFs (`terms-{revision}.pdf`, `cancellations-{revision}.pdf`, generated from the stored revision with its placeholders filled from the business facts kept with the order at confirmation, never from today’s Settings; one PDF is cached per revision and facts version, so a resend attaches the same file — Proposal). Manual orders: the current revisions. The key-terms text and the footer use the same kept business facts (Proposal). | no |
| 2 | Two days before · `1128:9160` | 08:00 on D-2 — the last day the customer can change (Decided D2). Not sent if the order was confirmed after that moment (selection: §12). A date change saved after 08:00 on the new date’s D-2 (that same day) sends it at once for the new date; none goes when the new D-2 has already passed (Proposal). | “Your cake is being made for {Saturday}” · “Last chance to change anything — today” | Catalogue: **Change something** → `/my-order/[token]/change`. Manual: **See your order** → `/my-order/[token]` and “If anything has changed, reply to this e-mail today.” | no |
| 3 | On the day — delivery · `1128:9206` | 07:00 on the date (not for a manual order created after 07:00 that day; not again on a redelivery day). | “Today — your cake arrives between {9am and 12pm}” · “Keep your phone nearby” | **See your order** · “My number {phone}” (`tel:`) | yes |
| 3b | On the day — collection · `1128:9249` | 07:00 on the date | Saved time that reads as a time (the §9.3 rule, e.g. “12 noon”, “14:30”): “Today — ready to collect at {12 noon}”; other saved text: “Today — ready to collect ({after work})” (Proposal); none: “Today — ready to collect at the time we agreed” · “20 Church View, Winchburgh” | **See your order** · My number (`tel:`) · Where (plain text) | yes |
| 4 | Your daily list (to every active team member’s e-mail) · `1155:9360` | 06:00, whenever Today (§9.3) has any row at that moment: handovers (incl. redeliveries), “No choice yet” and “Not collected yet” rows (Proposal) | “Today: {3} cakes out” (no handover today: “Today: {2} to ring”) · “Tap to mark each one done” | Per handover: **Send a text →** (`sms:` as admin Today, §9.3) · **Mark as handed over →** opens that order in the admin (sign-in if needed) with **Mark handed over** ready — opening the link changes nothing · customer phone numbers (`tel:`). Each handover shows name, window or collection time, cakes, allergy note; no money. | yes |
| 5 | A year later (marketing) · `1167:9106` | 10:00 on the date one year later (29 Feb → 28 Feb). Only catalogue orders that are confirmed or completed, whose date has passed and that are not cancelled or refunded (a forgotten **Mark handed over** must not stop it), for an address that is opted in (§10.10; a newer explicit consent lifts the suppression list, §6.10); at most one per address in any 30 days; never for manual orders. Switching it back on sends nothing late (anniversaries that fell while it was off are skipped). Late sends: the 10:00 job also picks eligible anniversaries of the last 7 days that have no never-twice key yet (§12), so a day the worker was down is caught up; when one address has several eligible orders on the same day, the newest order’s goes (Proposal). | “Is it nearly that time again?” · “A year since {name}’s cake — no rush, just so I am on your list” | **See this year’s designs** → `/cakes` · each design tile → that cake’s page · **Stop these emails** → `/unsubscribe/[token]`. Hero photo = the snapshot’s card photo (alt “Last year’s cake for {name}”). “A few that are new this year” = up to three visible cakes created in the last 12 months, newest first, not the one ordered; filled with the first visible designs if fewer; hidden if none. First sentence generated (“This time last year I made {cake} for {who it was for, or ‘your celebration’}.”), then Linda’s “A year later” note. 5b (`1167:9144`) is how it looks with images blocked — not a separate send. | yes |
| 6 | Enquiry received · `1153:9316` | The bespoke form is sent with an e-mail address | “Your enquiry is with me” · “{BBL-2026-E-0312} · nothing is charged and nothing is committed” (an enquiry from the gallery also lists “Inspired by: {caption}” — Proposal, not drawn) | **See what I have written down** → `/my-enquiry/[token]`. Lists the answers chosen from pills and the date, never free text: no name in the greeting (“Hello,”), no venue, no Anything else — those show on `/my-enquiry/[token]` (Proposal; so the form cannot be used to send other people’s text from Linda’s domain; limit per address §8.4). Call-me version: “I will ring you within 24 hours to talk it through.” Sent-with-gaps version: “A few answers were left open — I will ask when we talk.” | no |
| 8 | Cancelled · `1155:9310` | An order is cancelled (by the customer or Linda) — once. Again only if the refund Stripe confirms differs from what the first e-mail said. Never for a refund on a live order. | “Your order is cancelled — £185 on its way back” (no refund: “Your order is cancelled”) · “{BBL-…} · refunded in full / half refunded” | **See the designs** → `/cakes`. Variants: the §8.1 variants table below. | no |
| 12 | Your change is saved · `1249:9221` | A change is saved: by the customer (after the size-up payment, or at once for £0 / size-down), or by Linda (at once if the total does not rise or the order is not fully paid; after payment if it rises on a fully paid order). | Up: “Your change is saved — £55 paid today”. Down: “Your change is saved — £55 on its way back”. No money: “Your change is saved”. | Old → new for every changed line; **New total** = the total after the change; the money line · **Back to my order** → `/my-order/[token]` | no |
| 13 | I missed you · `1249:9261` | Linda or a Helper confirms **Nobody was in**. One delivery token per attempt: a second **Nobody was in** (on the redelivery day) makes a new token and a new e-mail 13; the first token keeps showing its own choice (Proposal) | “I missed you {this morning / this afternoon / this evening} — your cake is safe” · “{BBL-…} · free collection or £15 redelivery” | **Collect it today — free** → `/delivery/[token]?choice=collect` · **Redeliver tomorrow — £15** → `/delivery/[token]?choice=redeliver` (both open a confirm screen, §6.8). Redelivery button left out if tomorrow is closed. | no |
| 15 | Pay for your cake · `1598:10530` | Linda sends a payment link (Deposit · The rest · A difference · Redelivery), or saves a change on a fully paid order that raises the total | Waiting change: “One step left — £55 to finish your change” (preview “{BBL-…} · Linda has updated your order”). Deposit: “Your deposit for {Saturday 20 June}”. The rest: “The rest for your cake”. A difference sent by hand: “£{x} for your cake”. Redelivery: “Your redelivery on {date} — £15”. Other previews: “{BBL-…} · a secure link to pay” | **Pay £…** → `/pay/[token]` (§6.9) · “Questions? Just reply to this email.” | no |
| 16 | Your order link | Find my order, or the expired-link screen D (§6.1, §6.7) | “Your link to order {BBL-…}” (several: “Your order links”) · “Here is the link you asked for” | One block per order (number, date, cakes, **See your order** → `/my-order/[token]`). Footer: “You asked for this on my website. If it wasn’t you, ignore it — nothing changes.” Figma `1800:13044`. | no |
| 17 | Complaint received | A complaint is sent (§7.5) | “Complaint received — {reference}” · “I will reply within one working day” | States the reference (every complaint has its own BBL-YYYY-C-NNNN, also two about one order), the matched order number if any, the date sent and the promise; never repeats what was written (name, what’s wrong, What would help): “Your complaint is with me exactly as you sent it.” (Proposal; limit per address §8.4). No buttons. Figma `1800:13148`. | no |
| 18 | Thank you — how was it? (Decided 2026-10-22) · `1800:12959` | 10:00 on the day after the cake was handed over: the day after **Mark handed over** (or after a redelivery), or, if nobody marked it, 10:00 two days after the date. Not sent for a cancelled or fully refunded order, nor while a “Nobody was in” choice or a “Not collected yet” row is open; once per order. Catalogue and manual orders (manual only with customer e-mails On). | “Thank you, {first name} — I hope it went down well” · “If you have a minute, a Google review helps a small kitchen like mine” | **Leave a Google review** → `https://search.google.com/local/writereview?placeid={Place ID}` (§11.4) · “Something not right? Just reply to this e-mail — I want to know.” · **See your order** → `/my-order/[token]`. Rules: the same e-mail to every customer — never ask first whether they were happy and send only the happy ones to Google (Google forbids “review gating”); no reward or discount for a review (banned by the DMCC Act); no offers or other marketing in it, and a one-click “No more thank-you e-mails” link at the foot (suppresses e-mail 18 for that address). Without a Place ID it is not sent. | yes |

The admin Emails screen lists the twelve rows drawn there (1, 2, 3, 3b, 4, 5, 5b, 6, 8, 12, 13, 15) plus **18 Thank you** (switchable, on by default — Decided 2026-10-22; row added to `Admin / 17` and phone 11 on 2026-10-23, the heading now says thirteen). E-mails 16, 17 and the e-mails of §8.3 are always on and not listed there.

**Variants that are not drawn** (Proposal; every heading is the subject without the amount unless stated):

| E-mail | Variant | Content |
|---|---|---|
| 1 | Manual order | Intro “I have put {date} in the diary.”; rows as §8.2 with “Paid so far £x · Still to pay £y”; the drawn “The details can be changed until…” (`1128:9154`) is replaced by “nothing, until I write again on {D-2}.” in every version — left out when no e-mail 2 will go (confirmed after 08:00 on D-2, or a manual order with customer e-mails Off), as on the confirmation page (§5.6) — the change rights live only in the rights paragraph. Design line: catalogue “{name} · {flavour} · serves {n} · {tiers}”; manual “{what it is} · serves {n}”. |
| 1 | Google review (Decided 2026-10-22; drawn in `1800:13257`) | Above the footer, a small block in every version: “Once you have had your cake, a Google review would mean a lot.” · **Leave a Google review →** (the e-mail 18 link). Left out when no Place ID is set. |
| 2 | Collection | Rows: Date · Collection: {time / at the time we agreed} · Where: {address}; “Allergies noted” hidden when empty. |
| 3 | Copy | “Keep your phone to hand — I text you when I set off.” (not “I ring when I am outside”). |
| 4 | Rows | Same rows and order as admin Today at 06:00 (§9.3), including the “Not collected yet” rows (Decided 2026-10-17): {window or “Collection {time / time not set}”} · {name} · {phone}; then the cakes with their flavour (comma-separated, “×n”) · {address or “from the kitchen”}; then “Allergy note: …” when present. Subject count = cakes going out today (deliveries, collections and redeliveries); with no handover the subject is “Today: {n} to ring” (n = the flagged rows) and the preview “Nothing goes out — just calls to make”. No money. |
| 5 | Details | Cake = the order’s first line; {name} = “who for”, else the customer’s first name; the line “{lead_time_words} for a ready-made design, {bespoke_lead_time_words} for something bespoke.” is a template; hero = the card photo cropped 2:1 at 1200 × 600; tiles 4:5 at 336 × 420; 1–2 tiles left-aligned at the same width; eyebrow “A YEAR AGO TODAY”, or “A YEAR AGO” when sent late. |
| 5 | Google review (Decided 2026-10-22; drawn in `1167:9106` and `1167:9144`) | A modest text link above the footer: “Did you enjoy it? **Leave a Google review →**” (the e-mail 18 link). Left out when no Place ID is set. |
| 6 | Rows | In form order: Occasion · Servings · Date · Where (area only) · Budget · Finish · Flavour · Dietary · Pictures (“{n} attached” — never the files) · How to reach you (“A phone call” or “By email” — never the number or address typed) · Inspired by (Linda’s own caption); gaps “Not answered”. Free text (name, venue, Anything else) is never repeated; one line instead: “Your own words are written down on the page — See what I have written down.” Steps: “Enquiry sent · today / I reply · within 24 hours / We agree it by e-mail / Booked in”. Text: “I check the diary and reply. Nothing is booked and nothing is charged until we have agreed it.” |
| 8 | Variants | **Full** (as drawn). **Half**: “£{x} on its way back — half, as it was inside seven days.” (when the earliest date differs from the order’s date: “…half, as it was inside seven days of the earliest date your order has had.”) **None** (Linda only): subject “Your order is cancelled”, no Refund / To rows, no timeline. **Linda’s own amount**: “£{x} back to your card” or “No refund is due”. **Cash / bank**: “I will return £{y} the way you paid”, no timeline. **Card + by hand**: two lines, “£{x} back to your card · £{y} I will give back by hand”. Subject and preview always use the total refund: “Your order is cancelled — £{x+y} on its way back” · “{BBL-…} · £{x+y} refunded” (also for Linda’s own amount; £0: “Your order is cancelled”). **Cancelled by Linda**: intro “I have had to cancel your order…”, no “book it again” line. **Several payments**: one refund line per payment. **Manual order**: no **See the designs** button. The card-only line “Most banks show it within 5–10 working days” only for card refunds. |
| 12 | Variants | Preview “{BBL} · {first change in words}”. “Staying the same” lists the unchanged fields among size, message, date, window, address; left out when more than three changed. Money line: up “Charged to your card today £x”; down “Back to your card £x — within 5–10 working days”; Linda’s change on a part-paid order “Still to pay £x”; £0 no line. When the date changed, a line gives the new deadline: “You can change or cancel online until 23:59 on {D-2}.” (catalogue order, window open) or “Changes and cancellation go through me.” Not sent when only the collection time changed (§9.5). |
| 13 | Late / closed | Sent after 18:00: button “Collect it tomorrow — free”, body “Collect it free from {town} tomorrow before 12 noon, or I can bring it back tomorrow for £{fee} — just choose below.” Tomorrow closed, or a second attempt: one button, and the body drops the redelivery clause. The time word (“this morning”) follows the window. |
| 15 | Bodies | Rows mirror page M (§6.9). **Deposit**: Order · Your cake ({what it is}, {date}) · Total · Paid so far · To pay now. **The rest**: Order · Total · Paid so far · To pay now (“this settles your cake”). **Redelivery**: Order · Redelivery {date}, {window} · To pay now £{fee}. **Difference by hand**: as The rest. The box “Until it’s paid” only for a waiting change; otherwise “Questions? Just reply to this email.” With customer e-mails off, “and you’ll get a confirmation” is left out. Preview in the first person: “{BBL} · I have updated your order”. |
| 17 | Promise | “I will reply within one working day” (as the Complaints procedure). No buttons, no links. |

### 8.2 Which e-mails an order gets

| E-mail | Catalogue order | Manual order, customer e-mails **On** | Manual order, customer e-mails **Off** (Decided D11) |
|---|---|---|---|
| 1 Order confirmed | yes | yes — bespoke version: rows What it is · Serves · Date · Delivery or Collection · Total · Paid so far · Still to pay; “To change anything, just reply to this e-mail.”; no “changes until” line | **yes** — the bespoke version (Decided 2026-10-17) |
| 2 Two days before | yes | yes — bespoke version (§8.1) | no |
| 3 / 3b On the day | if switched on | if switched on | no |
| 4 Daily list (team) | yes | yes | yes |
| 5 A year later | consent only | never | never |
| 8 Cancelled | yes | yes — bespoke version | **yes** |
| 12 Change saved | yes | yes | no |
| 13 I missed you | yes | yes | no (Linda rings) |
| 15 Pay for your cake | when Linda raises the total or sends a redelivery link | yes | **yes** |
| 16 Your order link | on request | on request | on request |
| 18 Thank you (Google review) | if switched on | if switched on | no |

Switching a manual order’s customer e-mails from Off to On later sends only the e-mails that fall due after that moment (e-mail 1 has always gone). (Proposal)

Money that moves with no customer e-mail (Proposal): a stray or excess payment refunded automatically (not a change’s refund, which e-mail 12 states), the £15 refund on **Delivered after all**, and **Record a payment**. For card money Stripe’s own receipt is enough; a stray or excess refund also sends Linda “Check this payment” (§8.3).

Order detail always offers **Copy the order link** (§9.5), so with e-mails Off Linda can send it herself.

### 8.3 E-mails to Linda and system e-mails (Decided D8 + Proposal; board `1800:13441`, drawn 2026-10-23)

All go to `business/email`, except the sign-in code and the invite (to the person). Plain, short, no images. Every alert is logged, and its never-twice key is the id of the event that triggered it (§8.4).

| E-mail | Sent when | Content |
|---|---|---|
| New enquiry | a bespoke enquiry arrives (not spam) | “New enquiry {ref} — {occasion}, {date or ‘flexible’}” + link to the admin enquiry |
| New order | a catalogue order is confirmed | “New order {BBL-…} — {date}, {n} cakes, £{total}” + link to the order |
| Customer changed or cancelled | a customer saves a change or cancels | subject “Customer changed {BBL} — {what}” / “Customer cancelled {BBL} — £{refund}” + link to the order |
| Payment received / missed-delivery choice | a payment link is paid; a customer chooses collect or redeliver | subject “Paid £{x} — {BBL}” / “{BBL}: they will {collect today / take redelivery {date}}” + link to the order |
| Check this payment | a Stripe payment has no order, its amount matches no snapshot of its draft (§5.5), an order was booked after its hold ran out onto a day or week that is now over its cap, closed or too soon (§5.5), or a stray or excess payment was refunded automatically (§8.2) | subject “Check this payment — £{amount}” + link to Money |
| Website message · Message Linda · Complaint | the forms of §6.5, §7.4, §7.5 | as described there; the Website message alert also links to the stored message (`/admin/messages/[id]`, read-only, Owner — Proposal) |
| Refund failed / e-mail bounced | a Stripe refund call fails; a customer e-mail bounces | subject “Refund failed — {BBL}” / “E-mail bounced — {name}” + link |
| Payment disputed | `charge.dispute.created` (and `charge.dispute.closed`) | subject “Payment disputed — {BBL} — respond in Stripe by {date}” / “Dispute closed — {BBL} — {won / lost}” + link to the order |
| Sign-in code | an admin asks for a code (§9.2) | “Your Baked by Linda sign-in code: 419 ···” · “It works for ten minutes. If you did not ask for it, ignore this e-mail.” |
| Team invite | the Owner invites someone (§9.15) | “Linda has added you to Baked by Linda” + a link valid 7 days to the **Join the team** page (§9.2) |

### 8.4 Rules for every e-mail

| Topic | Rule | Basis |
|---|---|---|
| Sender | From “Baked by Linda <info@{domain}>” (domain `bakedbylinda.co.uk`) (display name as in every frame). Customer e-mails: `Reply-To` = `business/email`. E-mails to Linda (§6.5, §7.4, §7.5, §8.3): `Reply-To` = the customer. The site never reads that mailbox. | Design + Proposal |
| Format | Multipart: HTML (600 px, buttons in HTML/CSS, never images) + a plain-text part from the same template (“See your order: {url}”). Every image has alt text (logo: “Baked by Linda”). Fonts: headings Fraunces Light → Georgia, “Times New Roman”, serif; everything else Quicksand (400 / 500 / 600) → -apple-system, “Segoe UI”, Roboto, Arial, sans-serif; the layout must hold with the fallbacks (the canvas notes naming Cormorant and Inter are outdated). | Proposal |
| Layout | Table-based, fluid up to 600 px, centred, no absolute positioning (the frames are absolute drawings). Under 480 px the label / value rows stack (label above value), e-mail 5 tiles become one column and buttons go full width. Values wrap and are never cut (long addresses, “What changed”, £1,234.50). Frame heights are drawing only. One shared header and one shared footer partial (the hand-drawn copies differ slightly; the footer wraps naturally). Tested in Gmail (web, iOS, Android), Apple Mail and Outlook (Windows new and classic, iOS). | Proposal |
| Dark mode | `<meta name="color-scheme" content="light">` and `supported-color-schemes`; the pink header is a `bgcolor` cell; the logo PNG keeps a light outline or sits on the pink cell; buttons are bordered cells (2 px ink border + fill) so they stay visible when a client inverts colours. | Proposal |
| Images and icons | Icons are PNG at 2× (40 × 40 shown), `alt=""`; every image is an absolute HTTPS URL with width and height. A missing photo hides its slot (the e-mail 5 hero) or tile. | Proposal |
| Preheader | The preview text is a hidden preheader at the top of the body, padded so body text does not follow it in the inbox. 5b’s preview line (`1167:9149`) is a note, not a preheader. | Proposal |
| Timeline | Steps and dates as e-mail 1 (Booked = the confirmation date; In the kitchen = D-1; With you / Ready to collect = D; the last step has no date and is never filled). Filled = steps whose date is on or before the send date plus the step the e-mail is about (2: Booked and In the kitchen; 3 / 3b: up to With you / Ready to collect). Collection orders say Ready to collect / Collected. E-mails 6 and 8 have their own steps as drawn. | Proposal |
| Windows | E-mails write “{start} – {end}” with both am/pm suffixes (“9am – 12pm”); subject 3: “between {start} and {end}”. | Proposal |
| Header and footer | Header: logo (PNG, links to `/`) and the town label “Winchburgh” (Settings → Town, §11.1). Footer template: “{trading name} is the trading name of {legal name}, a sole trader in Scotland. {address line}, {region} · {phone}” (`tel:`). Customer e-mails end with “— {sign-off}” above the footer (Settings → Emails; not drawn). | Design + Proposal |
| Unsubscribe | E-mail 5 carries `List-Unsubscribe: <https://{domain}/unsubscribe/[token]>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058). The mail app’s one-click POST goes to that same URL and records the withdrawal at once, with no page; the endpoint takes no CSRF token (the token is the credential). The **Stop these emails** link in the body only opens page J; its **Stop these emails** button POSTs to the same URL (§6.10). On the Postmark broadcast stream Postmark’s own unsubscribe link is off (custom unsubscribe handling), so the site’s list is the only one. | Proposal |
| Tracking | No open or click tracking in any e-mail. | Proposal |
| Attachments | Only e-mail 1 has attachments: the two legal PDFs (§8.1). Customer pictures are never attached. | Decided 2026-10-17 |
| Links | Opening a link in an e-mail never changes data (mail scanners open links): it opens a page with a confirm button. | Proposal |
| Dates and money | Dates show the year only when it is not the current year. Money as §10.7. | Proposal |
| Stripe receipts | Stripe’s own receipt e-mail is on for every card payment (`receipt_email` = the order e-mail). | Proposal |
| Never twice | Every send is recorded as (order or enquiry, e-mail number, version); version = the order id for 1 (catalogue and manual), the date for 2/3/3b, the cancellation id + refund amount for 8, the change id for 12, the delivery token for 13 (one per attempt), the link id for 15, the request id for 16. Other keys: 4 = (team member, date); 5 = (order, anniversary year); 6 = the enquiry reference; 17 = the complaint’s own reference (BBL-YYYY-C-NNNN — every complaint has its own, also two about one order); alerts (§8.3) = the id of the triggering event. Keys are kept as long as their order, enquiry or complaint exists; they are not pruned with the 30-day send log. A date change makes a new version, so 2 and 3 go again for the new date (2 at once when the new D-2 is today after 08:00, §8.1). Linda’s **Send the email**, **Send the link** and **Save the order** ignore double taps for 10 seconds. | Spec + Proposal |
| Late jobs | A daily job that runs late still sends until each e-mail’s deadline (Failures row below; e-mail 5 within 7 days — the 10:00 job picks up missed anniversaries itself, §12; 3 / 3b never for an order created after 07:00 that day). Otherwise it skips and logs. | Proposal |
| Failures | The mail provider is retried with backoff until the e-mail’s deadline (sign-in code 10 minutes; 13 until 23:59 that day; 2 until 23:59 on D-2; 3 until the window starts; 3b until 12:00; 4 until 12:00; 5 within 7 days; all others 24 hours); each retry renders the e-mail again, so time-dependent copy is current (e-mail 13 retried after 18:00 gets the late variant). “Failed — too late” = no attempt could be made before the deadline (e.g. the worker was down); “Failed” = attempts were made and the last one before the deadline failed; after the deadline nothing is sent either way. A “Failed” e-mail raises a Today flag: on the order’s row for a customer e-mail; for e-mail 4 or an alert of §8.3, a line at the top, Owner only (“An e-mail to you was not sent — {subject}” → the item it was about). Bounces: only a hard bounce or a spam complaint flags the order or enquiry (“E-mail bounced”); a soft bounce is retried like any failure; Postmark’s “inactive recipient” answer counts as a hard bounce, with no retries. The Emails log offers **Fix and send** (§9.16), which also reactivates the address in Postmark. A spam complaint on e-mail 5 counts as an unsubscribe (§6.10). | Design + Proposal |
| Logging | The send log (§9.16) records every customer e-mail, e-mail 4 and every alert of §8.3 (alerts and e-mail 4: Owner only); sign-in codes are not logged. | Proposal |
| Send again | On a cancelled or refunded order only 8 and 16 can be sent again. E-mails 8, 12, 13 and 15 are rendered again from their stored event (the cancellation, the change, the delivery attempt, the link), never from today’s order; e-mail 1 from the order’s snapshot and kept business facts, with the same accepted PDFs; the others with today’s data. | Proposal |
| Form e-mails 6 and 17 | Never repeat the customer’s free text (§8.1). At most 2 of e-mails 6 and 17 together go to one recipient address in any 24 hours; a further submission is still stored and alerts Linda, with no customer e-mail. A submission with the honeypot filled (any form) sends no customer e-mail and no alert. | Proposal |

---

## 9. Admin (Linda’s side)

Figma section `V2 · Admin` (`932:8143`). Desktop screens `Admin / 1–25` (10 and 23 do not exist; 20 is a spec frame, 21 a confirm popover; `Admin / 5 · fragment — collection order` `1607:10904` is part of 5). Phone screens `Admin mobile / 1–24` and `24b` (15 does not exist). Not drawn and to be built from this file: the phone e-mail step and the desktop code step of sign-in, the phone Send a payment link (a bottom sheet), Record a payment, Edit the order (manual orders), every confirm dialog listed below, Invite and Remove, the FAQ / testimonial / legal-page editors, the Today and search empty states. Also not drawn (Proposal): **Copy the order link** (§9.5), **Remove** on a by-hand payment line, the sign-in dialog after a session ends (§9.2), **× Remove** on cake photos and videos (§9.13). **Drawn 2026-10-23** (section `V2 · Admin — pótlások (2026-10-23)` `1801:13704`, unless stated): desktop sign-in code step `1801:13621`, phone sign-in e-mail step `1801:13646` (in the admin section), Record a payment `1801:12967`, Record a refund given back `1801:13035`, Edit a team member `1801:13103`, Add a cake to the order `1801:13154`, Allergens in this cake `1801:13494`, Card video `1801:13221`, Customer data on Enquiry detail `1801:13272`, Complaints list `1801:13318` and a complaint `1801:13365`, Not now on the home-screen sheet `1801:13703`, Google reviews `1797:12951` / phone `1797:13035`.

| Screen | Desktop | Phone |
|---|---|---|
| Sign in | `Admin / 1` `932:8144` | `Admin mobile / 8` `950:9002` (code step) |
| Today | `Admin / 2` `932:8165` | `Admin mobile / 1` `948:8761` |
| Orders | `Admin / 3` `934:8201` | `Admin mobile / 3` `948:8869` |
| Money | `Admin / 4` `934:8321` | `Admin mobile / 14` `1251:9519` |
| Order detail | `Admin / 5` `936:8285` (+ fragment `1607:10904`) | `Admin mobile / 2` `948:8816` |
| Enquiries · Enquiry detail | `Admin / 6` `936:8383` · `Admin / 7` `936:8459` | `Admin mobile / 12` `1251:9371` · `13` `1253:9642` |
| Cakes · Add or edit a cake | `Admin / 8` `940:8399` · `Admin / 9` `940:8507` | `Admin mobile / 4` `948:8933` · `6` `950:8886` |
| Availability | `Admin / 11` `942:8513` | `Admin mobile / 5` `948:8997` |
| Gallery (+ the five-on-Home notice) | `Admin / 25` `1633:11774` (notice `1639:11953`) | `Admin mobile / 24` `1640:11889` · `24b` Edit photo `1640:12148` |
| Content · The hero · Testimonials | `Admin / 12` `942:8671` · `19` `1268:9529` · `13` `942:8770` | `Admin mobile / 16` `1253:9555` · `21` `1270:9569` · `17` `1251:9873` |
| Settings | `Admin / 14` `944:8627` | `Admin mobile / 18` `1251:9944` |
| Team and access | `Admin / 15` `944:8721` | `Admin mobile / 19` `1251:10026` |
| Empty states | `Admin / 16` `944:8821` | — |
| Emails | `Admin / 17` `962:9022` | `Admin mobile / 11` `965:9062` |
| Change the order | `Admin / 18` `1250:9221` | `Admin mobile / 20` `1251:9261` |
| Send a text — what opens (spec) | `Admin / 20` `1598:10472` | — |
| Nobody was in — confirm | `Admin / 21` `1604:10501` | `Admin mobile / 22` `1604:10556` |
| Add an order | `Admin / 22` `1607:10612` | `Admin mobile / 23` `1607:10782` |
| Send a payment link | `Admin / 24` `1607:10918` | — (bottom sheet, same fields) |
| More (phone menu) | — | `Admin mobile / 7` `950:8939` |
| Put it on the home screen | — | `Admin mobile / 9` `950:9038` · `10` `950:9071` |

### 9.1 Rules for the whole admin

| Topic | Rule | Basis |
|---|---|---|
| Layout | From 1024 px: the desktop layout (sidebar `930:8062`, 220 px, fluid content). Below 1024 px: the phone layout (top bar `946:8775`, tab bar `946:8789`), content centred, max 640 px. The tablet 0.8 rule does not apply. No motion beyond focus and hover states. | Decided D10 |
| Routes | `/admin` → `/admin/today` (signed in) or `/admin/sign-in`. `/admin/today` · `/admin/orders` · `/admin/orders/new` · `/admin/orders/[number]` · `/admin/orders/[number]/change` (Change the order; for a manual order: Edit the order) · `/admin/money` · `/admin/enquiries` · `/admin/enquiries/[ref]` · `/admin/complaints` (list, §9.10) · `/admin/complaints/[ref]` (read-only, §7.5; Owner only) · `/admin/messages/[id]` (website message, read-only, §7.4; Owner only) · `/admin/join/[token]` (Join the team, §9.2) · `/admin/cakes` · `/admin/cakes/new` · `/admin/cakes/[id]` · `/admin/availability` · `/admin/content` · `/admin/content/faq/new` · `/admin/content/faq/[id]` · `/admin/content/legal/[slug]` · `/admin/content/hero` (not at launch: 404 until it is built, §9.12) · `/admin/gallery` · `/admin/testimonials` (the read-only Google reviews screen; `/new` and `/[id]` removed 2026-10-22) · `/admin/emails` · `/admin/settings` · `/admin/team` · `/admin/more` (phone; from 1024 px it redirects to Today). Signed out → sign-in, then back to the URL asked for (a page, not a save: a save sent after the session ended is handled as in §9.2). | Proposal |
| Sidebar (desktop) | Logo → Today. Today · Orders · Money · Enquiries · Cakes · Availability · Content · Gallery · Testimonials (label “Google reviews” since 2026-10-22) · Emails · Settings · Team (Gallery: variant Active=Gallery `1633:11337`). The active item is the screen or its parent (Order detail, Change, Add an order → Orders; Enquiry detail → Enquiries; Add or edit a cake → Cakes; The hero → Content). Footer: name, role, **sign out** (ends this device’s session). | Design + Proposal |
| Tab bar (phone) | Today · Orders · Cakes · More. **More** lists Enquiries (“{n} waiting” = New) · Money (“£{x} to pay”) · Availability (“{n} of {cap} left” this week) · Content (“{n} questions”) · Gallery (“{30} · {4} on Home”) · Google reviews (“{n} on Google”) · Emails (“{n} · {b} bounce”, last 30 days) · Settings · Team (“{n} people”) · **Sign out**. A screen reached from More highlights More. Top bar: logo → Today. | Design + Proposal |
| Saving | Every form keeps its inputs on failure and shows under the button “Nothing was saved — please try again.” A successful save shows “Saved.” Leaving a form with unsaved changes asks “Leave without saving?” · **Leave** · **Stay**. A Stripe failure where nothing is saved until Stripe answers (**Send a payment link**, §9.8): “Stripe did not answer — nothing was sent. Try again in a minute.” A refund never undoes what it belongs to: the cancellation or change is saved first, the refund is then created with an idempotency key, and if Stripe fails the order stays as saved and Money flags “Refund failed — try again” (§9.5, §9.7, §9.9). | Proposal |
| Two people at once | Every record that can be edited has a version: orders, cakes, Settings, FAQ questions, legal pages, page photos, gallery photos, enquiries (status), availability (caps, lead times, closed days) and team members. Saving an out-of-date version is refused: “{Name} changed this at {10:42} — here is the new version”, with the unsaved inputs kept beside it; when the change did not come from a team member: “The customer changed this at {10:42}…” (a change or a choice on the status or delivery page), “A payment updated this at {10:42}…” (Stripe), “The site updated this at {10:42}…” (an automatic job). Controls that save at once change one field each and the last save wins, with no version check: **Collection time** (on blur), the gallery star, drag order, the e-mail switches, Showing / Hidden, Close / Open a day. Two rules are checked inside one database transaction, so they hold when two people act at the same moment: at most 4 Home picks (the later star gets the notice of §9.18), and at least one Owner (the later of two Owners removing or demoting each other gets “There must be at least one owner — nothing was changed.”). **Mark handed over** and **Nobody was in** are idempotent: a second tap or device shows the existing result. | Proposal |
| History | Every admin action on an order is recorded (time, person, what changed) and listed at the bottom of Order detail under HISTORY (plain list). Settings and Team changes are logged the same way (no screen). | Proposal |
| Search with no match | “Nothing matches “{text}”” · **Clear the search** | Proposal |
| Money format | Two decimals (£280.00) in money breakdowns and amount fields (Order detail MONEY, Change the order, Money TO PAY / PAID, Send a payment link, Add an order); tiles, subtitles, list cells and price labels show whole pounds when the pence are 0 (£1,390, “£185 · paid”, “from £185”), otherwise two decimals. | Design (as drawn) |
| Layout at smaller widths | All desktop frames are 1280 wide. Content: 40 px padding, max width 1180, left-aligned. Below 1200 px viewport the two-column screens (Order detail, Add an order, Change the order, Enquiry detail, Gallery, Availability) stack the side card under the main card; the Orders table drops WHERE, then CAKE; Today rows move their buttons to a second line. | Proposal |
| Sidebar and scrolling | The sidebar is fixed to the viewport height; its item list scrolls inside it if needed and its footer (name, sign out) stays at the bottom. Only the content area scrolls. Long forms repeat their primary button at the end; the Gallery edit panel is sticky. Phone: the tab bar is fixed to the bottom (safe-area padding), content padded above it, sheets and dialogs above the tab bar, the top bar scrolls away. | Proposal |
| Long values | Row cells are one line with an ellipsis (the full value in the accessible name and a tooltip); phone rows: title one line, second line at most two; detail screens wrap and never cut; the sidebar footer name one line. | Proposal |
| Lists | Lists load 20 rows first, labelled “Showing {n} of {total}”. Filter, search and loaded count live in the URL (`?filter=&q=&shown=`), so Back returns to the same view. Search sits above the list (desktop: its own row under the filter pills). Cakes loads all rows (no paging); drag works within loaded rows. | Proposal |
| Phone active tab | Follows the sidebar parent: Order detail, Change / Edit the order, Add an order → Orders; Add or edit a cake → Cakes; every screen opened from More → More. The drawn `948:8816` and `1251:9261` highlight Today only because they were opened from Today. | Proposal |
| Phone back links | Every screen that is not a tab root shows “‹ Back to {the screen it was opened from}”: More, cakes, orders, enquiry, order, Content, Gallery…; opened directly, the sidebar parent. | Proposal |
| Phone parity | Phone screens have every desktop block in one column unless this file says otherwise (the drawn phone Order detail is cut: build MONEY, For / Marketing, the full cake lines and the subtitle as on desktop; its title is the order number). Export CSV, Send me a test and the Emails “Sending” and “Where replies go” cards are desktop only. | Proposal |
| Helper sidebar | Today · Orders and the footer “{name} · Helper · sign out”; phone tab bar Today · Orders · More (More lists only Sign out). Desktop detail screens also show the back link. Variant Active=None is not used; every screen uses its own active item. | Proposal |
| Roles | Owner sees everything; Helper per §9.15. A hidden control is not rendered (never shown disabled). A Helper opening an owner-only URL goes to Today with “That page is for the owner.” | Decided + Proposal |

### 9.2 Sign in (`Admin / 1`, mobile 8)

| Element | Result | Basis |
|---|---|---|
| E-mail → **Send me a code** | Always moves to the code step with the same wording; a code is sent only if the address belongs to a team member (nothing reveals whether it does). At most 5 code requests per hour per address from one IP, 10 per hour per address in all, and 20 per IP, so a stranger cannot lock Linda out from one connection; over: “Too many codes asked for — try again in an hour.” | Design + Proposal |
| Code step | 6 boxes; pasting fills all six; signs in on the 6th digit or **Sign in**; `inputmode="numeric"`, `autocomplete="one-time-code"`. Valid 10 minutes, 5 tries. Wrong: “That code is not right — {n} tries left.” Used up: “That code is used up. Nothing has been signed in.” · **Send me a new code**. Expired: “That code has run out.” · **Resend the code**. Resending invalidates earlier codes. **Wrong address? Start again** → the e-mail step. | Design + Decided + Proposal |
| Session | Stored on the server; the cookie (`__Host-bbl_admin`, httpOnly, Secure, SameSite=Lax) holds only a random id, and every sign-in issues a new id. 30 days from sign-in (not extended by use). Sign out, **Sign out** on a device and **Remove from the team** delete the session on the server, so they work at once. During its last 24 hours a quiet line under the top bar reads “Your sign-in ends {today at 14:20} — sign in again to carry on without a break.” · **Sign in again**. After it: “For safety, please sign in again.” A save sent after the session ended loses nothing: the page keeps every input, opens sign-in in a dialog (e-mail and code steps) and then offers **Save again**; a page load goes to sign-in and back (Proposal). A new device shows under Team → signed-in devices; no e-mail is sent. | Decided + Proposal |
| Invited person | The invite link (§8.3) opens a **Join the team** page (“Join Baked by Linda as {Helper / Owner}”) with one button; pressing **Join the team** signs them in and activates their row (opening the link alone changes nothing, §8.4). Used or expired: “This invite has been used or has run out — ask Linda for a new one.” | Proposal |

### 9.3 Today (`Admin / 2`, mobile 1)

| Element | Result | Who | Basis |
|---|---|---|---|
| Stat tiles (desktop only): out today · this week · new enquiries · taken this week · still to pay | Definitions §13. Not links. | Owner (Helper: out today, this week only) | Design + Proposal |
| Subtitle “{Three} going out today · {one} collection · {one} payment still open” | Each part left out when 0; the payment part hidden for a Helper. | both | Design + Proposal |
| Rows | Orders dated today (confirmed or completed) plus today’s redeliveries and missed-delivery collections due today; plus earlier Nobody-was-in orders with no choice and not completed; plus collections dated yesterday or earlier that are still `confirmed` (Decided 2026-10-17) and, the same way, missed deliveries whose chosen collection day was yesterday or earlier and that are still `confirmed` (Decided 2026-10-17 + Proposal, §6.8), at the top with the flag “Not collected yet — ring them” (**Send a text**, `tel:`, **Mark handed over**; the Owner can cancel from the order); no e-mail goes to the customer; the other rows sorted by start time (delivery window start, or the collection time when it reads as a time such as “12 noon” or “14:30”; other collections last, in booking order) — as drawn. A row (outside its buttons) → Order detail. Flags shown on the row: “Booked after its hold ran out — check the day” (**Checked** clears it, for both roles; it clears itself after the order’s date), “Change waiting for payment”, “E-mail bounced”, “No choice yet — ring them”, “Not collected yet — ring them”. | both | Design + Proposal |
| **Send a text** (component `1598:10477` / `1598:10481`; desktop also shows the number) | `sms:{phone in E.164}?&body=…` (this form works on both iOS and Android) with a ready-written text: delivery = first name + the booked window (Linda narrows it before sending); collection = first name + agreed time + address (`Admin / 20`, `1598:10472`). Hidden without a phone number and for a number that is not a mobile (§10.8; Proposal); `tel:` still shows. A page cannot tell whether `sms:` opened anything, so the text is always copied to the clipboard as well (“Text copied”) and then the link opens. | both | Decided |
| **Mark handed over** (shown on or after the date while `confirmed`) | `completed`. The row then shows “Handed over {time}” · **Undo** until 23:59 that day (back to `confirmed`). | both | Design + Decided + Proposal (undo) |
| **Nobody was in** (deliveries only) | Popover `Admin / 21` (phone 22): **Send the email** → e-mail 13 and the outcome “nobody in” on the current delivery attempt (§6.8); **Not yet** / Esc closes. Row: “Nobody was in · email sent”, then “Collecting today” / “Redelivery {13 Sep} · £15 paid” (Helper: “Redelivery {13 Sep} · paid”). | both (Decided D9) | Design + Decided + Proposal |
| Empty | “Nothing going out today. Next: {Saturday 19 September} · {2} cakes.” + **See all orders** | both | Proposal |

Subtitle counts: “{n} going out today” = handovers today (orders); “{c} collection(s)” = collections among them; “{p} payment(s) still open” = today’s orders with still to pay > 0 (Helper: left out). The phone’s shorter subtitle (“Three going out · one collection · one payment open”) is as drawn. Heading = today’s date. Row cake text: the first cake, “+{n}” for more. **Nobody was in** shows while `confirmed` and the current delivery attempt has no outcome yet: from the order’s date for the first attempt, and on the redelivery day for a redelivery (§6.8). A second Nobody was in sends e-mail 13 with free collection only. Its dialog copy uses `ops/second-attempt-fee`; for a Helper “brought back tomorrow (paid)”; when tomorrow is closed “collect it today for free”. **Send a text** always signs as Linda (“it’s Linda from Baked by Linda”). (Decided + Proposal)

### 9.4 Orders (`Admin / 3`, mobile 3)

| Element | Result | Who | Basis |
|---|---|---|---|
| Subtitle “{42} this year · £{6,020} taken · £{240} still to pay” | §13 | Owner | Design |
| Search (“Search by name, town or order number”; phone “…name or number”) | Filters as you type (from 2 characters, 300 ms pause): name, town, postcode, order number (with or without “BBL-”), e-mail, phone; combines with the filter. | both | Design + Proposal |
| Filters | **All** · **This week** (date Mon–Sun this week) · **Upcoming** (date today or later, not cancelled or refunded) · **Completed** · **Cancelled** (`cancelled` or `refunded`) · **To pay** (still to pay > 0). Phone: All · This week · To pay. | Owner (Helper: no To pay) | Design + Proposal (Cancelled replaces “Refunded”) |
| Order | Upcoming by date ascending, then past by date descending. | both | Proposal |
| Columns | DATE · CUSTOMER · CAKE (first cake, “+1” for more) · WHERE (town, or “Collection”) · PAID (“£185 · paid”, “£80 of £320”, “£140 · refunded”, “refund pending”) · STATUS tag (Confirmed · Completed · Cancelled · Refunded) · →. Phone: date, name, cake · town, money. | PAID: Owner | Design + Proposal |
| Row | Order detail | both | Design |
| **Show 20 more** · “Showing {8} of {42}” | Pages of 20 for the current filter and search. | both | Design |
| **Export CSV** | §9.17 | Owner | Design |
| **Add an order** (desktop) / **Add** (phone) | §9.6 | Owner | Design |

### 9.5 Order detail (`Admin / 5`, mobile 2)

| Element | Result | Who | Basis |
|---|---|---|---|
| Header | Order number; subtitle name · payment state · total · method and date of the last payment; status tag. | both (money: Owner) | Design + Proposal |
| Cakes | One block per cake: tiers · serves · flavour · inscription · allergens. | both | Design + Spec |
| WHERE AND WHEN | Date, window or **Collection time** field (collection orders, `1607:10904`): free text, max 40 (e.g. “12 noon”), saves on blur, empty = “Agreed with Linda” (Send a text then says “at the time we agreed”; the status page and e-mail 3b use their “time we agreed” wording); shown on Today, the collection text, e-mail 3b and the status page; no e-mail is sent. One line per delivery attempt with an outcome (“Nobody was in {12 Sep} · chose redelivery {13 Sep}, morning · £15 paid”). | both (Collection time: Decided D9) | Design + Decided + Proposal |
| Allergy note, For, Marketing (“Agreed {date} · wording stored” / “No”) | Read-only. | both (Marketing: Owner) | Design |
| Note (`936:8374`) | Catalogue: “{Mairi} can change the date, size or message herself until 23:59 on {Thursday 10 September} (two days before). After that she messages you. You can change anything at any time.” Manual: “{Mairi} cannot change or cancel online — she messages you.” | both | Proposal (copy) |
| MONEY | Total, one line per cake, one line per payment (“Deposit £80.00 · Stripe · 1 Sep”, “Cash £100.00 · 9 Sep”), refunds as negative lines, the Stripe reference per payment, open payment links (“Link · The rest · £240.00 · sent 1 Sep” with **Copy the link** and **Cancel this link**), then **Still to pay £…**. On an order that is not cancelled or refunded, a by-hand payment line (Cash or Bank transfer, including the Paid so far line of Add an order) has **Remove**: confirm “Remove the £{100.00} cash payment of {9 Sep}? Still to pay goes back up. It stays listed in HISTORY.” · **Remove it** · **Keep it**; no e-mail. Stripe lines cannot be removed (a card refund goes through Stripe). | Owner | Design + Proposal |
| MESSAGES | Messages the customer sent through Message Linda; complaint notes. | both | Proposal |
| **Mark handed over** · **Nobody was in** | As on Today. **Delivered after all** (after Nobody was in): sets `completed`, closes the customer’s choices (both links then show “This was sorted — thank you”); a paid £15 is refunded automatically when the Owner does it — when a Helper does it, Money flags “£15 redelivery to refund”. **Record their choice** (Owner; after Nobody was in, e.g. agreed by phone): Collect (day) · Redeliver (date, window; send a £15 payment link or waive it) — closes the customer’s choices. It also replaces a choice already made (the earlier one stays in HISTORY): from a paid redelivery to Collect, the £15 is refunded automatically (a `fee` refund, §10.6) and an open redelivery link is withdrawn; from Collect to Redeliver, as above. Delivered after all and Record their choice act on the latest delivery attempt (§6.8). | both (Record their choice: Owner) | Design + Proposal |
| **Change the order** | §9.7 | Owner; Helper limited (§9.15) | Design + Decided D9 |
| **Message the customer** | `mailto:` the customer, subject “Your order {BBL-…}”. | both | Proposal |
| **Copy the order link** | Copies `/my-order/[token]`. | both | Decided D11 |
| **Send a payment link** | §9.8 | Owner | Design |
| **Record a payment** (`1801:12967`; while still to pay > 0) | Amount (£0.01 up to still to pay; above: “That is more than the £{240} still to pay.”) · Cash or Bank transfer · date (today or earlier) → a payment line; still to pay updates. A mistake is undone with **Remove** on the line (MONEY). | Owner | Proposal |
| **Refund in Stripe** | Opens this order’s payments in the Stripe dashboard (new tab): the payment itself when the order has one card payment, otherwise a dashboard search for the order number (every PaymentIntent carries the order number in its description and `metadata.order`). A refund made there arrives by the `charge.refunded` webhook and appears as a refund line; it does not change the status unless the order is cancelled. Copy under it: “Refund in Stripe opens this order’s payments in Stripe. A refund shows here once Stripe confirms it. Cancelling the order refunds automatically.” | Owner | Design + Decided D6 |
| **Cancel the order** | Confirm dialog: “Cancel {BBL-…}?” The refund the terms give today (full / half / none on or after the date — the §10.1 tiers on what counts for a refund, §10.6) is proposed and Linda can change it (£0 – paid): “£{x} back to the card · £{y} to give back by hand” (the refund goes to card payments first, newest first, up to what was paid by card; the rest is by hand). Linda’s own amount gives e-mail 8 the custom wording “£{x} back to your card” (or “No refund is due” for £0). **Cancel and refund £{x}** · **Keep the order**. Then: `cancelled`, date released, open links withdrawn, Stripe refund created at once, e-mail 8 (also with customer e-mails off). Cannot be undone. The cancellation is saved first; if Stripe then fails, the order stays cancelled, Money flags “Refund failed — try again” (**Try again** reuses the same idempotency key) and e-mail 8 still says the refund is on its way. A paid redelivery fee: §10.6. | Owner | Design + Decided D6, D7 + Proposal (editable amount on catalogue orders) |
| **Record a refund given back** (`1801:13035`; any order with a by-hand part still to give back: a cancellation, or a manual order whose total was lowered below what was paid, §9.7) | Amount (£0.01 up to the by-hand part still open) · Cash or Bank transfer · date → a negative line of the same kind as the refund it completes (§10.6); on a cancelled order it counts toward `refunded`. The Money flag “£{y} to give back by hand” clears when the whole part is recorded. | Owner | Decided D7 + Proposal |
| Refund if cancelled today | “£{x} refund if cancelled today” under MONEY (§13). | Owner | Design |
| **Print the order** | §9.17 | both | Design |
| **Export this customer’s data** · **Delete this customer** | §9.17 (the same two buttons are on Enquiry detail and the complaint page, §9.10) | Owner | Design + Proposal |
| Cancelled or refunded order | Only Message the customer, Copy the order link, Print, Refund in Stripe, Record a refund given back (while a by-hand part is open), Export, Delete remain. | — | Proposal |

| Topic | Rule | Basis |
|---|---|---|
| Send a payment link | Shown only while still to pay > 0 (the Redelivery kind comes from Record their choice). | Proposal |
| Completed order | Message the customer, Copy the order link, Print, Refund in Stripe, Record a payment, Send a payment link (while still to pay > 0), Export, Delete; Undo while allowed. | Proposal |
| MONEY extras | A “Delivery £x” line when a charge applies; “Still to pay” always shown (£0.00); the ‘none’ tier reads “No refund if cancelled today”; Stripe reference = the PaymentIntent id shown as its first 6 and last 4 characters, linking to Stripe. | Proposal |
| Collection fragment `1607:10904` | Delivery row → “Collection · From {address}”; helper text “Shows on Today, in the collection text and on {first name}’s order page. Leave empty for ‘at the time we agreed’.” | Proposal |
| Cake lines | Allergens per cake (“Contains: …”, drawn `1675:11944` / `1675:11945`) and the status tag (`1675:11946`) are part of the design. | Design |

### 9.6 Add an order (`Admin / 22`, mobile 23)

| Element | Result | Basis |
|---|---|---|
| Customer: name (required, 2–80), e-mail (required; hint under it: “Ask {name} for an e-mail address — payment links and cancellations are sent by e-mail.”, with “the customer” until a name is typed), phone (optional; any UK number, or international with its country code, stored in E.164; required for a collection — the status link checks its last four digits — and when Customer emails is Off, so Linda can ring; without a mobile number **Send a text** is hidden, §10.8) | — | Design + Proposal (phone: any number; hint) |
| The day: date (today or later) with the live count (“That day: {0} of {2} booked · that week: {3} of {9} booked”) | Full or closed days can be chosen, with a calm warning: full day “That day is full ({2} of {2}) — saving puts it at {3} of {2}.” · full week “That week is full ({9} of {9}) — saving puts it at {10} of {9}.” · closed day “That day is closed{ — holiday} — saving books it anyway.” Saving is allowed. | Design + Decided D4 |
| Delivery (default) / Collection | Delivery: address with postcode and window (required). A postcode outside the districts shows “Outside your delivery area” as information; saving is allowed. Collection: **Collection time** (optional). | Design + Proposal |
| The cake: what it is (required, max 300), serves (1–500), tiers, inscription (max 24), allergens (the 14 + “Also contains”), allergy note (max 400), **Add a sketch or photo** (up to 3, JPG/PNG/HEIC, 8 MB each; from an enquiry its pictures are attached already; never shown to the customer) | One manual order = one cake; it counts 1 against both caps. | Design + Decided D17 + Proposal |
| Money: total (£0–£5,000, required), paid so far + method (Cash · Bank transfer; received before saving, ≤ total; saved as one payment line dated the save day) | After saving, Paid so far is read-only (the sum of payments); later cash goes through **Record a payment**. | Design + Proposal |
| **Send a payment link** | Before the first save it reads **Save and send a payment link**: validates, saves, then opens §9.8. | Proposal |
| **Customer emails** On (default) / Off | §8.2. Copy under it: “On: two days before, on the day, changes and a missed delivery. The confirmation, payment links and cancellations are always sent.” | Decided D11 + Decided 2026-10-17 |
| From an enquiry (“FROM ENQUIRY BBL-…”, links back) | Prefill: name, e-mail, phone ← contact; date ← event date (empty if flexible); address ← venue or postcode; what it is ← “in their words”; allergy note ← dietary; serves empty; sketch ← the pictures. An enquiry without an e-mail leaves the e-mail field empty, with its hint; any phone number is taken as it is (§10.8). | Design + Proposal |
| **Save the order** (desktop) / **Save** (phone) | Order detail of the new order with “Order saved”, status `confirmed`, number assigned (§10.7), e-mail 1 (always, also with customer e-mails off — Decided 2026-10-17); the enquiry becomes **Ordered**. | Design + Decided |
| Who | Owner only. | Decided |

Delivery address = address line(s) · town · postcode (its own field, UK format) · window — the drawn single field is a sample. The drawn “Allergies” free-text field is replaced by the 14 tick boxes + Also contains + Allergy note; the inscription field drawn with “None” is simply empty. Phone: the same Customer emails explanation and collection-time helper as desktop; window pills with their times. (Proposal)

### 9.7 Change the order (`Admin / 18`, mobile 20)

**Catalogue orders:**

| Element | Result | Basis |
|---|---|---|
| One block per cake | Size (the cake’s current sizes; a removed size stays shown as “no longer offered”; a deleted design → size read-only) · options (§5.8; a removed choice stays shown as “no longer offered”) · inscription (when offered). Price per line, live. | Design + Proposal |
| **Add a cake** · **Remove** (`1801:13154`; Owner) | Add: a visible design, its size and inscription (up to 5 cakes; a full day gets the §9.6 warning). Remove: any cake but the last (to remove the last, cancel the order). Money as **Save changes**. | Proposal |
| Date and window · handover type · address · collection time | No change-window limit. The date: today or later (an unchanged past date may stay). Full or closed days: the §9.6 warning, allowed for the Owner; a Helper sees the same warning plus “Only the owner can book a full or closed day.” and cannot save (Decided 2026-10-17). When the date moves later, a tick box **The customer asked for this** appears (Owner and Helper; unticked at first); unticked, the refund counts from the new date (§10.1; Decided 2026-10-17). Outside the districts: information only. Switching collection → delivery adds the current delivery charge (`ops/delivery-charge`); delivery → collection removes the charge the order paid; either shows in the money difference. | Design + Decided D4 + Decided 2026-10-17 + Proposal |
| Name, e-mail, phone | Editable here (needed for **Fix and send**); no e-mail 12 for these. | Proposal |
| Price difference | New size current price − the snapshot price of the old size. | Proposal |
| **Save changes** (disabled until something changes) | Total not higher → saved at once; a rise under £0.30 is saved at once with the total unchanged (“Difference under £0.30 waived”), as §6.4; if what was paid now exceeds the total, the excess is refunded automatically; e-mail 12. Total higher on a **fully paid** order → saved as a **waiting change** (the order stays as it was), e-mail 15 for the difference; when paid the change applies and e-mail 12 follows. Order detail shows “Change waiting for £{55} — link sent {date}” with **Cancel this change**. One waiting change at a time; Change the order is disabled meanwhile. Total higher on an order **not fully paid** → saved at once, still to pay rises, e-mail 12. Refund failure: the change stays saved, Money flags “Refund failed — try again” and Linda gets an alert (as §6.4). **Cancel this change** withdraws its payment link; no e-mail. A waiting change still unpaid at 23:59 on the order’s date is dropped and its link withdrawn. | Design + Decided + Proposal |
| **Discard changes** (drawn “Cancel”) | Back to Order detail. | Proposal (label) |
| Footnote (`1250:9301`) | “Saving sends {Mairi} e-mail 12 with old → new. If the total goes up on a paid order, nothing changes until she pays the difference.” (the drawn text is outdated) | Proposal (copy) |
| Helper | Date, window, handover address, inscription and collection time only; no size, no options, no money shown. Never onto a full or closed day; the **The customer asked for this** tick box shows as for the Owner (both above). | Decided D9 + Decided 2026-10-17 |

**Manual orders** open **Edit the order** instead: the Add an order form with every field editable except Paid so far. Saving sends e-mail 12 (if e-mails are on). A higher total only raises still to pay; no automatic e-mail 15 — Linda sends a link if she wants. A total below what has been paid asks first: “The new total is £{40.00} less than {Mairi} has paid: £{x} goes back to her card now, £{y} you give back by hand.” · **Save and refund** · **Keep editing**. The card part is refunded automatically as in **Save changes** above (card payments newest first); a by-hand part becomes the Money flag “£{y} to give back by hand — {BBL-…}” until **Record a refund given back** covers it (§9.5). The e-mail hint, phone rule and Customer emails copy are those of §9.6; a Helper follows the Helper row above. (Proposal)

Changing today’s order to another date moves it off Today at once.

The drawn frame shows one cake block for a two-cake order: build one block per cake. The note `1250:9295` is replaced as in Appendix A.3 and shown to the Owner only, because it is about money; a Helper sees no note. (Proposal)

### 9.8 Send a payment link (`Admin / 24`; phone: bottom sheet)

| Element | Result | Basis |
|---|---|---|
| What it is for: **Deposit** · **The rest** · **A difference** (· **Redelivery**, only from Record their choice) | Pre-fill: The rest = still to pay; others empty. Redelivery: fixed £15 (`ops/second-attempt-fee`), not limited by still to pay, `kind=redelivery`. | Decided + Proposal |
| **Amount** (shows total, paid so far, still to pay) | £0.30 (Stripe minimum) up to still to pay. Above: “That is more than the £{240} still to pay.” | Decided + Proposal |
| **Send the link** (disabled until valid) | E-mail 15 → `/pay/[token]` (also with customer e-mails off); Order detail shows “Link sent · £{120} · Deposit”. Several open links are allowed; whenever still to pay falls (a payment lands, **Record a payment**, a lowered manual total), any other open link worth more than the new still to pay is withdrawn automatically, except a Redelivery link (§10.6); the same check runs after **Record a payment** and after a manual order’s total is lowered. Paid → paid so far updates by itself. Failure: “Nothing was sent — please try again.” | Decided + Proposal |
| **Not now** | Closes; nothing sent. | Design |
| Link lifetime | Until paid, withdrawn, the order cancelled, the customer deleted, or 23:59 on the 30th day after the order’s date or after the day it was sent, whichever is later, so a link for a past order never starts out expired (a waiting-change link: until 23:59 on the date, §9.7). | Proposal |
| Who | Owner only. | Decided |

Opens with **The rest** selected and the amount = still to pay (from Record their choice: Redelivery, £15). The amount field accepts “120”, “120.5” or “£120.50”. The drawn Deposit / £120 is a sample moment. (Proposal)

### 9.9 Money (`Admin / 4`, mobile 14) — Owner only

| Element | Result | Basis |
|---|---|---|
| Tiles: still to pay · paid this week · unpaid, date within 7 days · taken this year | §13 | Design |
| Rows (confirmed or completed orders with still to pay > 0) | Order number or name → Order detail. LINK SENT: the latest open link (“Sent 1 Sep · £240”, several: “Sent 1 Sep +1”) or “—”. **Send a payment link** → §9.8. | Design + Proposal |
| “PAID IN FULL, NOTHING TO DO · {39} orders” | Text. | Design |
| Flags | “Stripe payment has no order” (`1201:9227`) with **Open in Stripe** (that PaymentIntent, new tab) and **Dismiss** (confirm); it clears itself on a full refund. “Refund failed — try again” with **Try again** (same idempotency key); it clears when the refund goes through. “Booked after its hold ran out — {BBL-…}” with **Checked**; it clears on Checked or after the order’s date. “£15 redelivery to refund — {BBL-…}” (raised when a Helper presses Delivered after all on a paid redelivery) with **Refund £15** (refunds the redelivery payment as a `fee` refund, §10.6) and **Dismiss** (confirm “Keep the £15? Nothing is refunded.”); it clears on either. “£{y} to give back by hand — {BBL-…}” (a cancellation or a lowered manual total with a by-hand part) → the order’s **Record a refund given back**; it clears when the whole part is recorded. Every flag links to its order and has an action that clears it. “Disputed — respond in Stripe by {date}” (until closed, §10.6). | Design + Proposal |
| Note (`934:8410`) | “Marking a payment by hand is for cash or bank transfer” → **Record a payment** on the order. | Design + Proposal |

Subtitle “£{Σ still to pay} still to pay across {n} orders”; the paid-in-full line covers this calendar year’s confirmed and completed orders with still to pay = 0 (count · Σ totals); LINK SENT shows date and amount; rows sorted by date ascending. (Proposal)

### 9.10 Enquiries (`Admin / 6`, `7`, mobile 12, 13) — Owner only

| Element | Result | Basis |
|---|---|---|
| Header “{2} waiting · oldest {4 hours} ago” | waiting = New; with none: “Nothing waiting”. | Design + Proposal |
| List | Newest first; New and Replied on top, Ordered and Closed under “Earlier”. Filters All · New · Replied · Ordered · Closed · **Possible spam** (shown only when there is any; opening one shows **Not spam** → it moves to New, and the New enquiry alert and e-mail 6 go then). **Show 20 more**. **Open** or the row → detail (opening does not change the status). | Design + Proposal |
| Detail | Every answer (“Not answered” for gaps), the reference, e-mail (`mailto:`), phone (`tel:`), “Prefers: A phone call”, “Inspired by: {caption}” with a 40×40 thumbnail (`1640:12335`, phone `1640:12339`), “Sent with gaps”, “Has ordered before: BBL-…” when the e-mail matches an order, “That day: {2} of {2} booked”. Pictures as thumbnails → full image in a new tab, **Download**. | Design + Proposal |
| **Reply by email** | §7.3 (New → Replied). Without an e-mail: replaced by the phone number (`tel:`). | Decided |
| **Turn into an order** | Add an order prefilled; Ordered when saved; the detail then links “Order BBL-…” and no longer offers this button. | Decided |
| **Close this enquiry** | Confirm “Close this enquiry? Nothing is sent to {Mairi}.” · **Close it** · **Keep it**. A closed enquiry shows **Reopen** (back to its previous status). | Decided + Proposal |
| Deletion | An enquiry that did not become an order is deleted with its pictures 12 months after it was sent; the drawn note “Closed enquiries are deleted after 12 months” (`1607:10601`) is outdated. | Decided |
| **Export this customer’s data** · **Delete this customer** (Enquiry detail; `1801:13272`) | As on Order detail (§9.17); the customer is everyone with that e-mail address (§10.10). An enquiry without an e-mail offers **Delete this enquiry** instead (confirm “Delete this enquiry and its pictures? This cannot be undone.”). | Proposal |
| Complaints (list `1801:13318`, complaint `1801:13365`) | A **Complaints ({n})** link under the list opens `/admin/complaints`: every complaint, newest first (reference · name · order number or “No order” · date); a row → `/admin/complaints/[ref]` (§7.5), which also has **Export this customer’s data** · **Delete this customer**. So a complaint whose e-mail was lost is still reachable. | Proposal |

Row: name; occasion · date (or “flexible”) · servings · budget (gaps left out); age “{n} hours / days ago” up to 6 days, then the date; dates show the year when it is not the current year. (Proposal)

### 9.11 Availability (`Admin / 11`, mobile 5) — Owner only

| Element | Result | Basis |
|---|---|---|
| HOW MANY (daily cap, weekly cap) · HOW SOON (ready-made lead time, bespoke lead time) | Tapping opens inline fields: daily cap 1–20, weekly cap 1–100 (≥ daily cap), ready-made lead time 3–60 days (default 5; Decided 2026-10-17), bespoke lead time 1–26 weeks (default 3; it is the warning threshold, and the words are generated as “{n} to {n+1} weeks”, e.g. “three to four weeks”) · **Save** · **Cancel**. Lowering a cap cancels nothing (§10.4). | Design + Decided + Decided 2026-10-17 + Proposal (editing) |
| Calendar | ‹ › months beside the month name (desktop `1671:11954` / `1671:11957`, phone `1671:11960` / `1671:11963`), 12 ahead. Day labels: free · “{n} of {cap}” · full · “+{n} held” · closed · too soon · past (greyed, count still shown); today has a ring, not a fill. Every state has words as well as colour; the phone shows the same labels (or a legend under the calendar) and each day’s accessible name says it (“Saturday 12 September: 1 of 2 booked”). The legend “WHAT THE COLOURS MEAN” gets swatches. Each HOW MANY / HOW SOON card has a **Change** link (Linda’s own bookings are not limited by lead time). Tapping a day lists its orders and offers **Close this day** / **Open this day**. Week = Monday–Sunday. | Design + Proposal |
| **Close a day** · **Close a range** | Date(s) + optional note (“holiday”). A day with orders can be closed: “{Saturday 12 Sep} has {2} cakes booked — they stay booked; no new orders.” Reopen with **Open this day / range**. Closed days are stored one by one: a range closes each of its days with the same note, so **Open this day** inside a range opens that day only and the rest stay closed. Customers see closed days as fully booked. | Design + Spec + Proposal |
| “{6} of {9} slots left this week” | §13 | Design |

### 9.12 Content, The hero, Testimonials (`Admin / 12`, `19`, `13`; mobile 16, 21, 17) — Owner only

| Element | Result | Basis |
|---|---|---|
| FAQ: **Add a question** · **Edit** (`/admin/content/faq/new`, `/admin/content/faq/[id]`) | Form: question (max 140) · category (§4.4) · answer (plain text with links and placeholders, max 2,000) · **Save** · **Delete this question** (confirm). Drag to reorder within a category. | Design + Proposal |
| Legal pages (all 8): **Edit** (`/admin/content/legal/[slug]`) | Text editor with a small format: headings (two levels), paragraphs, bulleted and numbered lists, links and bold; pasted text is cleaned to that format and anything else dropped (headings become the “On this page” anchors; placeholders allowed, §11.8) · **Save** sets “updated {date}” and creates a new revision; revisions are never changed or deleted (orders and e-mail 1 point to the ones accepted, §5.3, §8.1). Saving Settings never creates a revision (§11.1). | Design + Decided + Proposal |
| Page photos | One row per page with a photo band: **Replace** → upload (JPG/PNG, at least 2560 px wide for page bands) → set the focal point by dragging on the preview → live at once. Also the Home photo slots: “We got you.” circle and the About Linda photos — each with alt text. (The four “Special idea?” squares come from the gallery, §9.18.) A missing photo shows the brand background in the same box. | Design + Proposal |
| **Edit the hero** → The hero (`1268:9529`) | **Not built at launch** (Decided 2026-10-17): the slide designs come from the owner later, animated; the theme list in the drawn form (“LOVE — Valentine’s theme”…) is a placeholder. The row is hidden and `/admin/content/hero` returns 404 until then. For reference only (the real fields come with the owner’s slide designs, §11.4), the drawn form has: Slides: drag to reorder · “Shown on the site” toggle (saves at once) · tap to edit: theme component, headline (max 40), supporting line (max 120), button on/off, label (max 24), link (internal page picker, §2) · **Add a slide** · **Delete this slide** (confirm). Slide duration 3–15 s (default 6). The designed hero is always first and is not listed (Decided D15). | Design + Decided + Proposal |
| Testimonials → **Google reviews** (Decided 2026-10-22; the drawn form `Admin / 13`, mobile 17 is outdated, Appendix A.3) | Read-only: “{63} reviews on Google · {58} with text show on the site” · the score · “Last checked {time}” and **Check now** (sync at once, at most once a minute) · the list, newest first (stars, name, date, text) as the site shows it. Nothing can be added, edited, hidden or reordered here. **Reply on Google →** and **Report a review on Google →** open Linda’s Business Profile (new tab); a review Google removes disappears at the next sync. **Connect Google** (Owner, once): signs Linda’s Google account in (OAuth, scope `business.manage`) and picks the business; shows “Connected as {account}” · **Disconnect**. Not connected yet: “Showing the 5 reviews Google shares without a connection” (§11.4). | Decided + Proposal |

Hero: “/” in a headline = a line break on desktop; slides reorder with ↑ / ↓ buttons (as drawn) and drag; slide counts exclude the designed hero; the settings panel opens on the first slide. The drawn helper “One active slide: … still image — no timer” (`1269:9571`, phone `1272:9679`) is outdated (Appendix A.3). Content: all FAQs listed under category headings with ⠿ per row; all 8 legal pages; page photos as labelled rows with Replace and alt text (not the drawn thumbnail strip). Testimonials rows get ⠿ handles. (Proposal)

### 9.13 Cakes and Add or edit a cake (`Admin / 8`, `9`; mobile 4, 6) — Owner only

| Element | Result | Basis |
|---|---|---|
| Header “{26} designs · {24} showing” | §11.3 | Design |
| Filters (desktop): All · Showing · Hidden · one per category | In place. | Design |
| Search “Search by name or flavour” | Matches name, Flavour and “What it is”. | Design + Proposal |
| Drag ⠿ (desktop and phone) | Reorders the catalogue (the Home row shows the first five visible). Only with All and no search (otherwise the handles hide). Keyboard: focus the handle, arrow up/down. Saves at once. | Decided + Proposal |
| **Edit** / row · **Add a cake** | Add or edit a cake. Title: “Add a cake” or the cake’s name. | Design |
| Showing / Hidden tag | Read-only; change it in the cake’s visibility. | Proposal |
| Fields | Name (required, 2–60, unique among cakes not deleted) · What it is (required, max 300) · **Flavour** (required, max 60; shown on the card, the order, the e-mails, the daily list and print; desktop label `1671:11944` / field `1671:11945`, phone `1671:11949` / `1671:11950`) · **Sizes** block: one row per size (serves · tiers · price), **+ Add a size**, **Remove** (the first row has none, so a cake always has a size; change it by editing); serves 1–500; price £1–£5,000; no two rows with the same serves; sorted by serves on save; each size keeps its own id, so editing its serves, tiers or price keeps it the same size for drafts and orders · **Allergens**: the 14 UK allergens as tick boxes + “Also contains” (free line); ticking **Cereals containing gluten** or **Tree nuts** requires naming which (a short field, e.g. “wheat”, “almonds, hazelnuts”), and every allergen line then names them (“gluten (wheat)”, “tree nuts (almonds)”; Decided 2026-10-17) — the same rule wherever the 14 boxes are set (Add an order, Settings kitchen list) · categories (several) · visibility · **Options** card (below the Sizes block, `1713:11890`, phone `1714:11991`): the **Offer an inscription** switch, the option rows (⠿, type tag, one-line summary, **Edit**), one open editor at a time (label, help line, required, choices with label · “+£” price · **Allergens** popover `1714:11933` · ×, **+ Add a choice**, **Done**, **Remove this option**), **+ Add an option** with the four types and “Up to 6 options” (§5.8). | Design + Decided D17 + Proposal |
| Photos and videos (the phone has the same fields as desktop) | Up to 8 photos (JPG/PNG/HEIC — HEIC converted on the server, previews from the converted copy; max 15 MB, at least 1600 px on the long side; the first = card photo; shapes per §0.6) and 2 videos. Videos (Decided 2026-10-17): the owner makes every cake video with AI to one template, so they share one shape and length; the file size is not known yet. Until it is (Proposal): accept MP4 or MOV (H.264 or HEVC) up to 500 MB and at most 60 s; the server converts each to H.264 + AAC MP4, at most 1080 × 1640, for the site; while it works the tile shows “Preparing the video…” and the cake can still be saved (the video appears on the site once ready). The cover is taken from the first frame automatically; **Change the cover** replaces it with an uploaded picture. **Replace the main photo** · **Make the main photo** · **Add photos** · **Add a video** · **Change the cover** · reorder (upload order = gallery order). The limits are named next to the buttons before they are reached. Alt text per photo (**Describe this photo**; empty = the cake’s name). Errors: “That video is 620 MB — the limit is 500 MB. Nothing was added.” / “That video is longer than a minute. Nothing was added.” At the limit the button is disabled with “Up to 8 photos and 2 videos”. A cake cannot be Showing without a photo (“Add a photo before showing it on the site”). Each photo and video has **× Remove** (confirm “Remove this photo? Orders already placed keep their copy.” · **Remove it** · **Keep it**). Removing the last photo of a Showing cake is refused: “Hide the cake first — a cake on the site needs a photo.” A video the server cannot convert leaves the tiles with “That video could not be prepared — nothing was added.” (Proposal) | Spec + Decided + Proposal |
| **Card video** — “Add photo / video” (Decided 2026-10-22; `1801:13221`) | One per cake, separate from the cake page’s photos and videos: it shows **only on the cake card** (closed: its first frame, still; open: playing, ANIM-11), never on the Customise a design page. Made with AI to the mandatory rules in `claude/torta-video-szabalyrendszer.md`. Upload: MP4 or MOV, square, at least 1440 × 1440, 4.9–5.1 s; otherwise “The card video must be a square video of about 5 seconds, at least 1440 × 1440.” The server keeps no sound and makes 1080 × 1080 and 1440 × 1440 web versions (H.264, key frame on frame 0, no start delay, so the loop is seamless) and a 1440 × 1440 still of frame 0. **Replace** and **Remove**; with none, the card uses the main photo and has no corner button. Preview: the closed and open card crops side by side. | Decided + Proposal |
| **Save** | Back to Cakes with “Saved”; live from the next page load. | Design |
| **Delete this design** | Confirm: “Delete {The Lothian} for good? It leaves the site now; past orders keep their copy. To take it off for a while, hide it instead.” · **Delete it** · **Hide it instead** · **Keep it**. A deleted cake is kept out of sight (soft delete), not erased: its slug is never given to another cake, and its name can be used again. | Design + Proposal |
| A cake hidden or deleted while in a draft | Removed from the draft at the next step with a notice (§5.5). | Proposal |
| A size removed while in a draft | That line is taken out of the draft at the next step with the “no longer available” notice (§5.5). | Proposal |

Add: empty fields, title “Add a cake”, no Delete, visibility Hidden until it has a photo. Edit: title = the cake’s name, Delete shown (the drawn frame mixes both). Main photo: drag or pinch sets the focal point used by every crop (stored per photo; default centre). (Proposal)

### 9.14 Settings (`Admin / 14`, mobile 18) — Owner only

Groups as drawn: Prices · Delivery (area, charge, second attempt, beyond the area, postcode districts) · Business details (trading name, legal name, phone, e-mail, address, town, hygiene rating, council — no ICO field since 2026-10-21) · Allergens and social (kitchen also handles, Instagram, Facebook). Fields and their effects: §11.1. **Save** applies from the next page load. Validation: phone UK or international (shown exactly as saved, e.g. “+44 7884 199103”); e-mail format; delivery charge £0–£1,000 (£0 shows as “Free”); second-attempt fee £0, or £0.30 (Stripe’s minimum) to £1,000 — £0 makes the redelivery free (§6.8); bespoke minimum £1–£5,000 (never “Free”); postcode districts a comma list of outward codes or ranges (“EH1–EH42, EH47”), error “EH1–EH42 or EH47 are fine; “Edinburgh” is not”; Instagram “@handle” or URL → stored as the profile URL with the handle as label; Facebook a full `https://facebook.com/…` URL plus its label. Address for service = two fields (street and town · region and postcode). The lead times are set in Availability (§9.11: ready-made 3–60 days, default 5, Decided 2026-10-17). Phone, e-mail, address and town are read from Settings whenever they are shown, also for orders already placed; saving Settings never creates a legal revision (§11.1). (Design + Proposal)

### 9.15 Team and access (`Admin / 15`, mobile 19) and roles

| Element | Result | Basis |
|---|---|---|
| **Invite someone** | Name · e-mail · role (Helper or Owner) → the invite e-mail (§8.3). Row: “Invited {date}” · **Resend** · **Withdraw**. An address already on the team: “{Fiona} is already on the team.”; one already invited: “{Fiona} already has an invite — use Resend.” Nothing is sent. | Design + Proposal |
| **Change access** | Helper · Owner · **Remove from the team** (confirm “{Fiona} will be signed out on all devices now.”). Takes effect on that person’s next request. The last Owner cannot be removed or made a Helper (checked inside one transaction, §9.1); you cannot remove yourself. | Design + Proposal |
| Signed-in devices | Device (browser and OS), place (city from the host’s IP-location header at sign-in; left out when the host gives none), last used. **Sign out** ends that session (your own → sign-in). | Design + Proposal |
| **Edit** a member (Owner; `1801:13103`) | Name (2–80) and e-mail. A new e-mail must not be on the team already; codes go to the new address from then on, and that person stays signed in. | Proposal |
| The first Owner | Created once, when the team is empty, from the deploy settings `ADMIN_OWNER_EMAIL` and `ADMIN_OWNER_NAME`; that person signs in with a code like anyone else. The settings are ignored once anyone is on the team. | Proposal |
| A removed or renamed person in HISTORY | HISTORY stores the name as it was when the action was taken, so past entries keep it. | Proposal |

**What a Helper can do** (Decided D9; everything else is hidden):

| Screen | Helper |
|---|---|
| Today | rows, **Send a text**, **Mark handed over** (+ Undo), **Nobody was in**; tiles “out today” and “this week” only |
| Orders | list, search, filters except To pay; no PAID column, no money subtitle, no Export, no Add |
| Order detail | cakes, where and when, allergy note, For, MESSAGES, **Collection time**, **Mark handed over**, **Nobody was in**, **Delivered after all**, **Message the customer**, **Copy the order link**, **Print**, **Change the order** / **Edit the order** (date, window, address, inscription, collection time only — never money or size, and never onto a full or closed day, Decided 2026-10-17); **Message the customer**, **Copy the order link** and **Delivered after all** are Proposals |
| Everything else (Money, Add an order, payment links, refunds, cancel, Enquiries, Cakes, Availability, Content, Gallery, Testimonials, Emails, Settings, Team, Export, Delete) | not available |

“You” is a label, not a control. Device: “{browser} on {OS}”; the current device reads “This device”. The Helper description (`944:8806`) is replaced as in Appendix A.3. (Proposal)

### 9.16 Emails (`Admin / 17`, mobile 11) — Owner only

| Element | Result | Basis |
|---|---|---|
| The twelve rows | Trigger, timing, state; toggles for the switchable ones (§8.1) save at once (“Saved”). Corrected texts: Order confirmed — “A customer pays, or you save an order you added”; Two days before — “The last day to change the order”; Cancelled — “An order is cancelled (by the customer or you)”. | Design + Proposal (copy) |
| Sign-off · “A year later” note · **Save** | Desktop only; the phone shows the list and the log. | Design |
| Log (last 30 days) | Customer e-mails, e-mail 4 and the alerts of §8.3 (not sign-in codes), newest first, 25 rows then **Show more**; result Queued · Sent · Delivered · Bounced · Failed; WHO = the customer’s name, else the address. **Send again** renders as §8.4 (Send again); on a cancelled or refunded order only 8 and 16 can be sent again; is logged as a manual send and bypasses the never-twice key; it asks to confirm (“Send “{Order confirmed}” to {Mairi} again?”) and is hidden for 2 after D-2, 3 / 3b after the date, 13 after its link closed, 15 when its link is not open, and 5 when unsubscribed. · **Fix and send** (opens the bounced address; **Save and send** corrects it on the order or enquiry and resends). Read-only on the phone. | Design + Proposal |
| **Send me a test** | Choose one of the eleven sends (5b is not a send); subject prefixed “[Test] ”, sample data from the `demo/*` variables, not logged against any order; sent to the signed-in person: “Test sent to {address}”. | Design + Proposal |
| “Sending” card (domain, SPF / DKIM / DMARC) | Read-only status. | Design + Decided |
| “Where replies go” card (desktop) | Read-only: “Customers’ replies go to {business/email}.” (the `Reply-To` of every customer e-mail, §11.1) · **Change in Settings** → Settings, Business details. | Proposal |

On / Off is a switch with its label (Off = grey “Off”); it works on the phone too; turning one off shows “Saved — no more {name} e-mails until you turn it back on”. (Proposal)

### 9.17 Print, CSV, export, delete, empty states, home-screen app

| Element | Result | Basis |
|---|---|---|
| **Print the order** | Browser print with a print stylesheet, one A4 page: order number, date, window or collection time, name, phone, address, one block per cake (size, tiers, flavour, options, inscription, allergens), allergy note, For. No money, no buttons. | Proposal |
| **Export CSV** (Orders) | `bakedbylinda-orders-YYYY-MM-DD.csv`, UTF-8 with BOM, for every order matching the current filter and search (not only the rows loaded), one row per cake: order number, placed at, date, handover, window or collection time, name, e-mail, phone, address, postcode, cake, serves, tiers, options (“Sponge: Chocolate; Toppings: Fresh berries”), inscription, allergens, allergy note, line price, order total, paid so far, still to pay, refunded, status, marketing consent (yes/no + date). An order’s money columns (order total, paid so far, still to pay, refunded) are filled on its first row only, so a sum never counts an order twice. A cell that starts with `=`, `+`, `-` or `@` is prefixed with `'` so customer text never runs as a spreadsheet formula (the phone column is exempt: it is always a validated E.164 number). | Proposal |
| **Export this customer’s data** (Order detail, Enquiry detail, the complaint page) | A ZIP: `customer.json` + `orders.csv` + uploaded pictures — everything held for that e-mail address (orders, enquiries, complaints, consents, messages, e-mail log). Linda sends it to the customer. Logged. | Spec + Proposal |
| **Delete this customer** (Order detail, Enquiry detail, the complaint page) | Disabled, with the reason under it, while one of the customer’s orders is not completed, cancelled or refunded (“Cancel or complete her upcoming order first.”), has a refund pending or failed (“Wait until her refund has gone through.”), has a by-hand part still to give back (“Record the £{y} you give back by hand first.”) or has still to pay above £0 (“{BBL-…} still has £{x} to pay — settle it first.”). Confirm: “Delete everything about {Mairi Sinclair}? Orders are kept without her name, e-mail, phone and address, because tax law needs them for 6 years. This cannot be undone.” · **Delete her data** · **Keep it**. Removes name, e-mail, phone, address, notes, inscription, pictures, enquiries, complaints and messages; keeps the tax record (number, date, amounts, payment ids); keeps a hashed e-mail on a suppression list so older consent can never restart marketing (§6.10). Order rows then read “Deleted customer”. It also anonymises that customer’s rows in the e-mail send log (address and WHO → “Deleted customer”) and revokes every token of that customer at once (§10.5). | Spec + Proposal |
| Empty states (`Admin / 16`) | **Add a cake to the catalogue** / **Add your first cake** → `/admin/cakes/new` · **See the bespoke page** → `/bespoke` (new tab) · **See all orders** → `/admin/orders`. Each list shows its empty state when it has no rows. Corrected copy: Enquiries “Bespoke enquiries arrive here. Reply from your own inbox; once you have agreed, use Turn into an order.” · Money “Anything still to pay on an order you added yourself appears here.” · Orders “…newest first” → per §9.4 order. | Design + Proposal (copy) |
| Home-screen app (mobile 9, 10) | Shown once after the first sign-in on a phone when not already installed. **Show me how** → the instructions in the note below. **Not now** (`1801:13703`) hides it on that device. Manifest: name “Baked by Linda admin”, start URL `/admin/today`, standalone, the logo mark as icon. No offline mode: offline shows “You’re offline — nothing can be saved until you’re back.” Mobile 9 copy: “After thirty days the site asks you to sign in again with a new code.” On an iPhone the installed app does not share the sign-in with Safari, and e-mail 4 links open in Safari, so Linda may sign in in both; add to mobile 9: “Links from e-mails open in Safari, which may ask you to sign in once there too.” | Design + Proposal |

The four photo squares on the empty states (`944:8865`, `944:8872`, `944:8879`, `944:8886`) show the logo mark on lilac, not uploads. Home-screen app: mobile 10 (`950:9071`) shows how the result looks (the icon on the home screen), not steps; the iPhone steps are the text on mobile 9 (“Tap Share, then ‘Add to Home Screen’”); Android: “Open the browser menu, then ‘Install app’ / ‘Add to Home screen’.” (Proposal)

### 9.18 Gallery (`Admin / 25`, mobile 24 and 24b) — Owner only — Decided 2026-10-16

| Element | Result | Basis |
|---|---|---|
| Header “{30} photos · {28} showing · {4} on Home” · **Add photos** | Upload one or more photos (JPG, PNG or HEIC, max 15 MB, at least 1600 px on the long side; HEIC → JPEG; location data removed). New photos go to the top of the list, Hidden and not on Home, with an empty caption; they can be set to Showing once they have a caption. “{n} on Home” = the photos Linda picked (at most 4). | Design + Proposal |
| Card **ON HOME** | The four Home picks in order (drag to reorder); an empty slot reads “Newest photo fills this” (Proposal). Note: “The Home page shows these four under ‘Special idea?’. Fewer than four? The newest photos fill the gaps.” | Design + Decided + Proposal |
| ALL PHOTOS list | Gallery order (drag ⠿; keyboard: focus the handle, arrow up/down; saves at once). Each row: square thumbnail · caption · occasion · Tag Showing/Hidden · star “On Home” · **Edit**. **Show 20 more**. | Design + Proposal |
| Star “On Home” | Toggles the photo as a Home pick (added at the end of ON HOME). A fifth star shows the notice “Four photos can be on Home — take one off first.” and changes nothing. Hiding a starred photo also removes it from Home. The star on a Hidden photo shows “Show it on the site first.” and changes nothing (Proposal). | Design + Decided + Proposal |
| **Edit** → Edit photo (desktop right panel; phone 24b) | Photo (**Replace photo**; drag on the preview to set the focal point) · caption (required, max 80; shown under the tile and in the lightbox) · occasion (Birthdays · Kids’ parties · Weddings · Corporate · None) · alt text (“Describe this photo”; empty = the caption) · Showing / Hidden · Show on Home · **Save** (live from the next page load) · **Delete this photo** (confirm “Delete this photo for good? It leaves the gallery and the Home page now.” · **Delete it** · **Keep it**). An enquiry that referenced a deleted photo keeps its caption text, and its 40×40 thumbnail shows the placeholder background (§0.6). | Design + Proposal |
| Empty | “No photos yet” · **Add photos**. | Proposal |
| Who | Owner only (§9.15). | Decided |

The edit panel shows “Choose a photo to edit” until **Edit** is pressed (after **Add photos** it opens the first new photo). The star saves at once. The five-on-Home notice shows above ALL PHOTOS until a star is removed or the page reloads. Admin captions are one line with an ellipsis. (Proposal)

---

## 10. Rules that apply everywhere

### 10.1 Time and deadlines

| Rule | Detail | Basis |
|---|---|---|
| Time zone | Every date, deadline, scheduled job and “today” uses **Europe/London** (the scheduler too, not UTC). A day runs 00:00–23:59. | Decided |
| Week | **Monday to Sunday** (weekly cap, “this week” everywhere). | Proposal |
| Change window | Open until **23:59 on D-2** (Saturday cake → Thursday 23:59). Counted in calendar days, so clock changes never shift it. The Settings variable `ops/change-deadline-hours` (48) is replaced by this rule (§11.1). | Decided D2 |
| Refund tiers | Calendar days. **Full** when the order’s **earliest date** (the earliest date it has ever had) − today > 7, so moving the date later never raises the refund (Decided 2026-10-17). Otherwise **half** (rounded up to the penny) while today is before the order’s current date — also when the order was moved later and its earliest date has already passed (Decided 2026-10-17). **None** on or after the current date. Customers can cancel online only while the change window of the current date is open (so full or half); Linda can cancel any time (§9.5). Only dates the customer chose count towards the earliest date: the booked date and their own changes (§6.4). When Linda moves an order later, the refund counts from the new date (the earliest date becomes the new date), unless she ticks “The customer asked for this” (§9.7): then the earliest date stays, and a date she marks as asked for counts like one the customer chose (Decided 2026-10-17). A move by Linda to an earlier date without the tick leaves the earliest date as it was (Proposal). Customer copy calls it “the earliest date your order has had” (Proposal). | Spec + Decided D3 + Decided 2026-10-17 + Proposal |
| Lead time | Earliest selectable date = today + `ops/lead-time-days` calendar days (5 on Monday → Saturday onwards). One value for every catalogue cake: 3–60 days, default 5 (Decided 2026-10-17). At least 3, so the change window (to D-2) is still open when any order is booked and every catalogue order starts in state A. Linda’s own bookings in the admin are not limited by it. | Decided + Decided 2026-10-17 |
| Deadlines in customer copy | The last day for a full refund is the earliest date − 8 days; the last day to change or cancel online is D-2 of the current date. Every text that names them (step 4, e-mail 1, the status page, the cancel page) works them out from those dates at the moment it is shown or sent, and leaves out a day that has passed: full-refund day passed → only the half-refund wording of each text (step 4 §5.4, e-mail 1 §8.1, cancel page §6.6); change window closed → no online line (step 4 and e-mail 1 then say “Changes and cancellation go through me.”). Manual orders never have an online line. | Proposal |
| Link lifetimes | §10.5 | — |

### 10.2 Checkout draft

| Rule | Detail | Basis |
|---|---|---|
| Storage | The draft id lives in an httpOnly cookie `bbl_session` that lasts 7 days, renewed on each visit; the draft itself is deleted after 24 hours without activity, so an old id can still show the “cleared” message. The draft stores: lines (cake, size, option answers with option and choice ids, inscription, position), date, handover, address, window, delivery charge applied, name, e-mail, phone, who for, allergy note, consents (wording + time), the Terms and Cancellations revision ids shown (§5.3), the furthest step reached, hold (with its extension count and the IP address that took it — deleted with the draft), the allergen set of each line shown when step 4 loaded, PaymentIntent id and its current amount, `locked_at`, the snapshots taken at Pay (each with its amount), status, last activity. Answers save on blur. | Decided + Proposal |
| Activity | Any step load or save. 24 hours without activity → the draft is deleted (status `abandoned`, its PaymentIntent cancelled in Stripe). The next step load or save with that cookie shows `/cakes` with “Your order was cleared after a day without changes.” | Decided + Proposal |
| Refresh, Back / Forward, closing the tab | Answers kept; every step is its own URL. | Decided |
| Opening a step directly | No draft → `/cakes`. A draft with 0 cakes → the “There is nothing in your order” state (`1096:9106` · C). A later step before an earlier one is complete → the first incomplete step. A draft whose payment is `processing` or has succeeded, or an order confirmed from this draft in the last 24 hours → `/order/confirmed`. | Decided + Proposal |
| Two tabs | Same draft; the latest save wins — except while a payment is in flight (`pending`): then the draft is locked (§5.5; the lock lapses as described there). | Decided + Proposal |
| After confirmation | The cookie is not cleared. For 24 hours after confirmation it still leads to the confirmed order: every `/order/*` step redirects to `/order/confirmed`, and a new **Add to your order** starts a new draft (a new id in the cookie). After that the old id leads nowhere and a visit starts empty. How `/order/confirmed` finds the order: §5.6. | Proposal |

### 10.3 The 20-minute date hold

| Rule | Detail | Basis |
|---|---|---|
| Start | Completing step 2 (or a chip in B / G) takes a hold of 20 minutes (`ops/hold-minutes`) on that date for all the order’s cakes. Continuing on the same date renews it (this counts as an extension; with none left the hold is kept as it is); a different date releases the old hold in the same transaction. | Spec + Decided 2026-10-17 (limit) |
| Counts | While held, the order’s cakes count against the daily and weekly cap (§10.4). Your own hold never blocks you; returning to step 2 shows the held day as Selected. | Spec + Decided D1 |
| Adding or removing cakes during a hold | Adding (from `/cakes`, up to 5) grows the live hold to the new cake count without a new check — the hold already secured the day (§10.4); the expiry is unchanged. Removing shrinks it; removing the last cake releases it. | Decided D1 + Proposal |
| Pressing Pay | Extends the hold so at least 15 minutes remain (§5.5). This does not count as an extension. | Proposal |
| Limits | A draft’s hold can be extended at most **twice** — by **Keep holding** or by Continue on the same date, each setting the expiry to now + 20 minutes — so it lasts about 60 minutes in total. At most **2 live holds per connection (IP address)**: a draft cannot take a hold while two other drafts from the same IP address hold dates (renewing or moving its own hold is never refused for this). A hold that has run out is gone (the day is back on the calendar); a new one (step 2, or a chip in B / G) re-checks the date and starts a new count. | Decided 2026-10-17 |
| Reaching a limit | No extension left: at 2 minutes left the hold line reads “{Saturday 12 September} is held for {m:ss} more — I can’t hold it any longer, so please pay before then.” (no **Keep holding** button). Third hold from one connection, shown where the hold would be taken (step 2 Continue, a chip), every answer kept: “Two dates are already being held from this connection. Finish one of those orders, or try again once one of the holds has run out — or call me on {phone}.” | Proposal (copy) |
| Running out | With 2 minutes left the hold line offers **Keep holding for 20 more minutes** (only if the date is still available and the draft has an extension left, see Limits). At 0: hold-ran-out state on steps 3–4 (§5.5); on the cake page, `/cakes` or step 2 nothing interrupts — the next step re-checks. | Proposal (WCAG 2.2.1) |
| Ends | On confirmation (it becomes the booking), expiry, removing the last cake, a date change, or draft deletion. Releasing twice does nothing. Every capacity read ignores holds with `expires_at ≤ now`, so expiry needs no job. | Spec + Proposal |
| Midnight during checkout | A live hold is honoured even if its date has meanwhile become “too soon”. Linda closing that day or lowering a cap also honours live holds. Step 2 shows that day as Selected, and Continue keeps the hold (renewing it only within the limit). | Proposal |

### 10.4 Capacity and the calendar (Decided D1)

**A date is available for an order** when all of these hold:

1. the date is on or after today + lead time (§10.1; 3–60 days, default 5, Decided 2026-10-17);
2. the day is not closed;
3. cakes booked on that day + cakes in other customers’ live holds on that day **<** daily cap (at least one free slot);
4. the same sum for its Monday–Sunday week **<** weekly cap.

When the order is booked, **all** its cakes count (a 3-cake order on an empty day with a cap of 2 makes it 3 of 2 — full). An order holds at most **5** cakes.

| Topic | Rule | Basis |
|---|---|---|
| What counts | Confirmed and completed orders’ cakes (each cake one slot), live holds of other customers, a manual order = 1. Cancelled, abandoned and redeliveries do not count. | Decided D1, D5 |
| Customer day states | available · fully booked (also closed days and days without a free slot) · too soon · past · selected. | Spec + Proposal |
| Admin day states | free · “{n} of {cap}” · full · “+{n} held” · closed · too soon · past (§9.11). | Design + Proposal |
| Linda overbooking | Add an order and Change the order may use a full or closed day with a warning (§9.6). The Owner only: a Helper sees the warning but cannot save (“Only the owner can book a full or closed day.”, §9.7). | Decided D4 + Decided 2026-10-17 |
| Lowering a cap | Cancels nothing; the day or week simply shows full. | Decided |
| Concurrency | Taking a hold re-checks the caps inside one transaction (or lock), so two buyers can never both take the last slot. Growing a hold never fails (Decided D1, §10.3) but takes the same lock, so the counts stay consistent. | Decided D1 + Proposal |

### 10.5 Token links

Every token is an opaque random value (at least 128 bits) stored server-side; the expiry is computed on the server, never carried in the token. Every token page is `noindex`, sends `Referrer-Policy: no-referrer`, is disallowed in `robots.txt`, and token URLs are stripped from analytics. Opening a token link (GET) never changes data.

| Link | Valid until | Expired | Unknown / tampered | Already used |
|---|---|---|---|---|
| Status `/my-order/[token]` | 23:59 on the 30th day after the order’s current date (moves with a date change or redelivery; a cancelled order keeps its date; ends at once when the customer is deleted) | D “Let me send you a new one” (§6.1) | D (reveals nothing) | — |
| Payment `/pay/[token]` | paid, withdrawn by Linda, the order cancelled, the customer deleted, or 23:59 on the 30th day after the order’s date or after the day the link was sent, whichever is later (a waiting change: 23:59 on the date) | “This payment link is no longer needed…” (§6.9) | 404 | “Already paid” |
| Delivery `/delivery/[token]` | 23:59 on the day its attempt was recorded (§6.8; one token per attempt) | “These choices have closed…” (§6.8) | 404 | that choice’s confirmation; closed by Linda (**Delivered after all**, **Record their choice**): “This was sorted — thank you” |
| Unsubscribe `/unsubscribe/[token]` | never expires (one per e-mail address) | — | “This link didn’t work…” (§6.10) | J again |
| Enquiry `/my-enquiry/[token]` | 12 months after sending | 404 | 404 | — |

The status link has the second check (§6.1); the others do not. The status token is created at confirmation, with the order number; there is one per order and it is never rotated. A redelivery payment that started before 23:59 is honoured.

Deleting a customer (§9.17, §10.10) revokes every token of that customer at once: status links show D, payment links show “This payment link is no longer needed…” (their PaymentIntents cancelled), delivery and enquiry links show their expired result, and the unsubscribe link shows J without **Turn emails back on** (the hashed address stays suppressed). A payment link checks “Already paid” before anything else, so a paid link never says “Nothing has been taken”. (Proposal)

### 10.6 Order statuses, payments and Stripe

| Status | Set by | Basis |
|---|---|---|
| `draft` | The first **Add to your order**. Also the state after a declined or cancelled payment (only from `pending`, never from `confirmed`). | Spec |
| `pending` | **Pay** pressed; the draft is locked until the PaymentIntent succeeds or fails — or until the lock lapses (§5.5: at `locked_at` + 15 minutes, unless the PaymentIntent is `processing`). | Spec + Proposal |
| `confirmed` | Only the `payment_intent.succeeded` webhook for `kind=checkout` (or the reconciliation job, §12) — or Linda saving an order in Add an order. The number is assigned now (§10.7). | Spec + Decided |
| `completed` | Linda or a Helper taps **Mark handed over** (Today, the order, or the admin page opened from e-mail 4); **Undo** until 23:59 that day returns it to `confirmed`. **Delivered after all** also sets it. | Spec + Decided + Proposal |
| `abandoned` | A draft or pending order deleted by the 24-hour job (its PaymentIntent cancelled). Kept 30 days for reconciliation, then removed. A payment that still succeeds confirms the order (§5.5). | Decided + Proposal |
| `cancelled` | Customer **Cancel the order** (change window open) or Linda **Cancel the order**. Releases the date at once; the refund is created automatically (Decided D6). | Decided |
| `refunded` | A cancelled order whose refunds decided at cancellation are all done (card refunds confirmed by Stripe; by-hand refunds recorded by Linda, §9.5). A cancellation with a £0 refund stays `cancelled`. A refund on a live order (size-down, goodwill, Linda’s excess refund) is a refund line and never changes the status. | Decided |

There is no automatic pause, reminder or balance.

**Payment state** (calculated, never stored). Every money line on an order has a kind. Payments: `order` (checkout, a size-up, a payment link for Deposit · The rest · A difference, **Record a payment**) and `fee` (a redelivery fee, `kind=redelivery`). Refunds: `cancellation`, `change` (a size-down or a lowered total), `excess` (a stray payment or one above the total), `fee` (a redelivery fee given back), `goodwill` and `dispute` (a lost chargeback). A refund that arrives through `charge.refunded` and that the site did not create is `goodwill`. Net paid = `order` payments − `cancellation`, `change` and `excess` refunds. Fee payments and fee refunds never count, so the automatic £15 refund of **Delivered after all** leaves still to pay as it was. Goodwill and dispute refunds are money returned but never count either, so they never make the customer owe money: a £30 goodwill refund on a paid £185 order still shows **Paid in full**, with the refund line (Proposal). **paid** when net paid ≥ total; **part paid** when 0 < net paid < total; **to pay** when net paid = 0 and total > 0; plus “refund pending” while a created refund is not yet confirmed by Stripe. Still to pay = total − net paid, and 0 for `cancelled` and `refunded` orders. What counts for a cancellation refund = net paid − goodwill and dispute refunds, never below £0; the tiers of §10.1 apply to it (§6.6, §9.5). On a cancellation a paid redelivery fee is refunded in full on top of the tier amount, as a `fee` refund. Money “taken” (Today, Orders, Money, §13) = every payment of any kind by payment date − every refund of any kind by refund date. Whenever still to pay falls (a payment, **Record a payment**, a lowered total on a manual order), every open payment link worth more than the new still to pay is withdrawn, except Redelivery links (§9.8). (Proposal)

**Stripe:**

| Topic | Rule | Basis |
|---|---|---|
| Payment methods | Express Checkout Element: Apple Pay, Google Pay; card-only Payment Element: card. Apple Pay domain verification. | Design + Proposal |
| PaymentIntent kinds | `metadata.kind` = `checkout` · `payment_link` · `size_up` (customer change) · `redelivery`; every PaymentIntent also carries `metadata.order` (the order number, or the draft id before confirmation) and the same text in its description; at confirmation the checkout PaymentIntent’s `metadata.order` and description are updated from the draft id to the order number (Refund in Stripe relies on it). Only `checkout` confirms an order; the others add a payment line and apply the waiting change, the redelivery or the paid amount. | Proposal |
| Webhooks | Verify the `Stripe-Signature` header; reject unsigned events. Every handler is idempotent (key: the PaymentIntent id; refunds: the Refund id). Every handler first re-reads the object from Stripe and acts on its current status, so events that arrive out of order do no harm. An order’s status only moves forward (`draft` / `pending` → `confirmed`), never back: a late `payment_intent.payment_failed` from an earlier attempt does nothing once the PaymentIntent has succeeded. | Spec + Proposal |
| Refunds | Automatic through the Stripe API for cancellations, size-downs and excess payments; Linda’s goodwill refunds in the Stripe dashboard (**Refund in Stripe**). `charge.refunded` records the refund line. | Decided D6 |
| Receipts | Stripe receipt e-mails on for every card payment. | Proposal |
| Events handled | `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `refund.updated` and `refund.failed` (a failed refund → the “Refund failed” flag), `charge.dispute.created` and `charge.dispute.closed`. | Proposal |
| Disputes (chargebacks) | Linda gets the alert (§8.3); Money flags “Disputed — respond in Stripe by {date}” until closed. The order status does not change; a lost dispute is recorded as a refund line. | Proposal |
| Refund timing | Stripe usually marks a card refund done within seconds, so “Refunded on {date}” can show at once; the customer copy always says the bank takes 5–10 working days. | Proposal |
| Stray payments | A payment that lands on a cancelled order, through a withdrawn or expired link, or that takes net paid above the total, is refunded automatically and logged on the order. | Proposal |
| Reconciliation | §12 | Proposal |

### 10.7 Money, numbers, dates

| Topic | Rule | Basis |
|---|---|---|
| Storage | Integer pence, GBP only. | Proposal |
| Customer display | £185 when whole, £92.50 otherwise; thousands with a comma (£1,250, £1,250.50). | Design + Proposal |
| Admin display | §9.1 Money format. | Design |
| Phone numbers | Linda’s business phone is shown everywhere exactly as “+44 7884 199103” (Decided 2026-10-21). Customer numbers: UK in national format (07700 900 000), others in international format (+353 85 123 4567). `tel:` and `sms:` links use E.164. | Decided 2026-10-21 + Proposal |
| Short dates | Chips and tight places: “Sat 12 Sep”. | Design |
| VAT | None. Cakes are zero-rated (Terms `664:4256`): no VAT line, no VAT number. | Decided (Terms) |
| Rounding | Half refunds round up to the penny (customer’s favour). | Proposal |
| Order number | `BBL-YYYY-NNNN`: YYYY = year of confirmation; NNNN a sequence per year shared by catalogue and manual orders, zero-padded (5 digits if it ever passes 9999). Assigned at confirmation, so drafts leave no gaps. | Design + Proposal |
| Enquiry reference | `BBL-YYYY-E-NNNN`, assigned on sending. | Design |
| Complaint reference | `BBL-YYYY-C-NNNN`, one per complaint (also when it matches an order), assigned on sending. | Proposal |
| Dates | Customer: “Saturday 12 September” (year added when not the current year). Windows: “Morning · 9am – 12pm”, “Afternoon · 12 – 4pm”, “Evening · 4 – 7pm”. Admin logs: 24-hour times. Times on customer pages: 12-hour, “3:42pm”, “9am”. | Design + Proposal |
| Counts in copy | Singular and plural forms: “1 more minute” / “{n} more minutes”, “1 cake” / “{n} cakes”. Hold minutes are whole minutes left, rounded down, at least 1 (§13). | Proposal |

### 10.8 Forms, validation, errors

| Topic | Rule | Basis |
|---|---|---|
| Error position | Under the field, in words, never in a popup — except the terms tick box, the allergy and dietary consent boxes, and the bespoke send summary, which sit beside their control. Fields get `aria-invalid` and `aria-describedby`. A failed submit moves focus to the first error. | Spec |
| Submit fails (network or server) | Keep every input, re-enable the button, show under it “Nothing was sent — please try again.” Not for Pay (§5.5). | Decided |
| Name | 2–80 characters. | Decided |
| E-mail | Standard format. | Decided |
| Phone | Checkout: a mobile number, UK (07… / +44 7…) or international with its country code, stored in E.164 (§5.3, Decided 2026-10-17). Add an order and Edit the order: any UK number, or international with its country code (Proposal). Other forms: any UK number, or international with its country code. Every phone is stored in E.164. **Send a text** shows only for a mobile number: UK 07… / +44 7…, or an international number whose type in the numbering plan (e.g. libphonenumber) is mobile or unknown (Decided 2026-10-17; the check is a Proposal). | Decided + Decided 2026-10-17 + Proposal |
| Postcode | UK format, normalised (upper case, one space); delivery check by outward code (§11.1). | Decided |
| Inscription | Max 24 characters (§5.1). | Decided |
| Message fields | Max 400. | Decided |
| Double submit | Buttons disable on the first press; forms carry an idempotency key. | Proposal |

### 10.9 Rate limits and spam

| What | Limit | When hit | Basis |
|---|---|---|---|
| Contact, bespoke, complaints, find my order | honeypot field + 5 submissions per hour per IP and form (the screen-D resend on §6.1 counts as Find my order); no captcha | §7.1 copy (Find my order: §6.7) | Decided + Proposal |
| Find my order and the D resend | 3 per e-mail address per hour (one shared counter) | B “Too many requests” | Spec |
| Status second check | 5 wrong per link per 15 minutes; 20 wrong per IP per hour | §6.1 | Proposal |
| Message Linda | 5 per hour per order | inline message | Proposal |
| Admin sign-in | 5 code requests per hour per address from one IP, 10 per hour per address in all, 20 per IP; 5 tries per code | §9.2 | Decided + Proposal |
| Uploads | 3 files × 8 MB (enquiry, complaint, sketch); cake media §9.13 | inline errors | Design + Proposal |
| Pay (checkout) | 5 declined payments per draft per hour and 10 per IP address per hour (card and wallet, counted from `payment_intent.payment_failed`); Stripe Radar’s card-testing rules switched on | Pay and the wallet buttons are disabled with “Payments are paused for this order for an hour — nothing was taken. Call me on {phone}.” The hold is not extended for the pause. | Proposal |
| Date holds | 2 extensions per draft; 2 live holds per IP address | §10.3 | Decided 2026-10-17 |

### 10.10 Privacy, retention, deletion

| Data | Kept | Basis |
|---|---|---|
| Orders | 6 years (tax law); after a customer deletion only the tax record. | Spec |
| Enquiries that did not become an order (and their pictures) | 12 months after sending; ordered ones are kept with their order. | Decided |
| Possible-spam enquiries | 30 days | Proposal |
| Gallery photos | until Linda deletes them | Decided |
| Complaints and their pictures | 6 years, with the order (without a matched order: 6 years from sending); included in customer export and delete (§9.17) | Proposal |
| Contact messages | 30 days on the site (the e-mail stays in Linda’s mailbox) | Proposal |
| E-mail send log | 30 days | Design |
| Google reviews (copy) | while they are on Google: refreshed daily, deleted at the next sync after removal; nothing beyond the fields of §11.4. Privacy policy: name the copy and its source. | Proposal |
| Order messages (§6.5) and manual-order sketches | With the order (6 years); removed by a customer deletion. | Proposal |
| Possible-spam complaints (honeypot filled) | 30 days | Proposal |
| Database backups | Rolled after 30 days, so a clearing or a deletion reaches every copy within 30 days. | Proposal |
| Marketing consent | Per e-mail address: the latest explicit event wins (ticked the box at an order, unsubscribed, turned back on), each kept with timestamp and wording. E-mail 5 goes for any eligible order of that address while it is opted in. Withdrawal honoured at once; a hashed address stays on the suppression list, which blocks only consent older than the unsubscribe, spam complaint or deletion; a newer explicit tick or **Turn emails back on** lifts it (§6.10). | Spec + Proposal |
| Allergy note and dietary answers | Health data. Cleared 90 days after the order’s date (enquiries not ordered: with the enquiry, 12 months); (Decided 2026-10-17 for allergy notes). Proposal: “the order’s date” here is its last handover date — the redelivery date when there was one. Proposal: dietary answers follow the same rule; if a complaint arrives in that time, the clearing waits until 90 days after the complaint. Print, CSV and Order detail then show “Cleared after 90 days”. | Decided + Proposal |
| Allergy and dietary consent | Timestamp and wording with the order or enquiry (Decided D16); kept when the note is cleared. | Decided |
| Card data | Never stored, never logged, never sent to this server. | Spec |
| Uploaded pictures | Private (signed URLs, admin only), location data removed. Uploads never attached to a sent form or saved record are deleted after 24 hours (§12). | Proposal |
| Export and delete | §9.17. Deleting a customer revokes every token of that customer at once (§10.5). It is blocked while one of their orders is not completed, cancelled or refunded, or has a refund pending or failed, a by-hand refund still to give back, or still to pay above £0. | Spec + Proposal |
| “Customer” | Every order, enquiry, consent and message with the same e-mail address (case-insensitive). | Proposal |

### 10.11 Cookies and analytics

Essential cookies: `bbl_session` (the checkout draft id; the cookie lasts 7 days, renewed on each visit, while the draft itself is deleted after 24 hours without activity, §10.2), `bbl_csrf`, `bbl_consent` (12 months), the status-check unlock cookie (24 hours), the signed recent-order cookie (24 hours, §5.6), the admin session `__Host-bbl_admin` (30 days, §9.2), Stripe’s fraud cookies on payment pages. Nothing else before a choice (§3.3). Analytics only after **Accept all**, or after switching Analytics on and pressing **Save my choices**. The Cookie policy text must list these (§14.1). (Spec + Proposal)

### 10.12 SEO

| Topic | Rule | Basis |
|---|---|---|
| Titles | `<title>` “{Page} — Baked by Linda”; Home: “Baked by Linda — Celebration cakes in West Lothian”; cake page: “{Cake name} — Baked by Linda”; legal pages: “{heading} — Baked by Linda”; 404 “Page not found — Baked by Linda”; 500 “Something went wrong — Baked by Linda”. | Decided + Proposal |
| Descriptions | One per public page (Home: the footer tagline; About: its first sentence; legal pages: their intro line; cake pages: “What it is”). | Decided + Proposal |
| Open Graph | Default image = the designed hero image; cake pages: the card photo. | Proposal |
| Sitemap | Public pages with “Index = yes” (§2) and visible cakes; a hidden or deleted cake leaves it at once. | Decided |
| Other | `<html lang="en-GB">`; favicon from `V2 · Logo mark`; canonical URLs; Product structured data on cake pages and LocalBusiness on Home; real HTTP 404 and 500. | Proposal |

### 10.13 Accessibility (from the board card ACCESSIBILITY, `1153:9271`)

**Text contrast (fixed in Figma 2026-10-23):** every text meets 4.5 : 1 (3 : 1 from 24 px, or 18.66 px bold) against its background, controls and their states 3 : 1. The meta grey `colour/meta` is now **#756C82** (was #7C7389, 4.496 : 1); faint text that failed (#9A93A8, #CEBBE3, the 35 %-ink placeholders) became #756C82; lilac helper text on white became **#8957B8**; the slider’s rest dash #8F889D. Placeholders use #756C82, typed text the ink colour. Text on photos (“Added” on upload thumbnails) sits on a scrim or chip so it stays legible on any photo (Proposal). Skip link; visible focus ring (2 px at 3 px offset); every target has a hit area of at least 44 × 44 (checkbox labels and carousel dashes included; the visual size may be smaller; dense link lists at least 24 × 24 with spacing, §0.6); state never shown by colour alone; errors in words (§10.8); focus to the step heading after each step; calendar days with full accessible names and `aria-disabled`; text sizes as drawn (Decided 2026-10-17); 200 % zoom without horizontal scrolling; the on-dark colour token in the footer; reduced motion respected everywhere (`ANIMATIONS.md`). Every pressable on the public site grows 10 % on hover and reacts to the press; actions fire on release (`ANIMATIONS.md` ANIM-07, Decided 2026-10-21) — including every selection control (size and option pills, filter pills, window pills, calendar days, check boxes); in Figma each one carries the Dev Mode annotation “Pressable · ANIM-07” (legend `1733:12590`); the admin has no scaling. Every writable field follows ANIM-05 (marked “Writable field · ANIM-05”). Everything Linda adds from the admin — cakes, sizes, options, gallery photos, FAQ, testimonials, hero slides, page photos, legal texts and anything added later — renders through the same shared components, so it follows these rules automatically (Decided 2026-10-21); never render admin content with one-off markup. The site aims at WCAG 2.2 AA, as the Accessibility statement says. (Spec) In the admin, a session that ends never loses typed input and its end is announced a day ahead (§9.2), as WCAG 2.2 asks for timed sessions. (Proposal)

### 10.14 Security

CSRF token on every POST; cookies httpOnly + Secure + SameSite=Lax; HTTPS only; a Content Security Policy that allows Stripe; no personal data and no tokens in logs; admin routes require a session and the role check on the server for every request. Admin sessions are stored on the server, with a new id at every sign-in (§9.2). Every admin page, admin response and export is sent with `Cache-Control: no-store`. Every page sends `Content-Security-Policy: frame-ancestors 'none'` (and `X-Frame-Options: DENY`), so no other site can frame it. Signed URLs for private uploads (§10.10) are made per view, for a signed-in admin only, and last 5 minutes. Code requests are limited per address and per IP (§9.2), so nobody can lock Linda out from one connection. Fonts are self-hosted (§0.8), so no visitor request goes to Google Fonts. (Proposal)

---

## 11. Variables — what changes, who changes it, where it shows

Every value below is **data**, never copy typed into a page. The Figma variable collection **Content** holds 36 variables: 27 business / ops / price / allergen / catalogue values and 9 `demo/*` sample values (customer name, e-mail, phone, order and enquiry reference, date, window, address, total — design illustration and test fixtures only, never production data). In the built site the values come from the database, the admin or a calculation. The other Figma collections (“Baked by Linda”, “Brand v2”) are design tokens.

An admin change applies **from the next page load** and never rewrites orders already confirmed: an order keeps its snapshot (§1).

### 11.1 Business facts — admin Settings (§9.14)

| Variable | Demo value | Shows / affects | Basis |
|---|---|---|---|
| `business/trading-name` · `legal-name` | Baked by Linda · Linda Dávid-Vágvölgyi (owner’s full name, English order; Decided 2026-10-21) | header alt text, footer, legal pages, e-mail footers, page titles | Design + Decided |
| `business/phone` | +44 7884 199103 (Decided 2026-10-21) | footer, Contact, every “call me” line and `tel:` link, 404, 500 (at deploy), payment errors, M | Design |
| `business/email` | info@bakedbylinda.co.uk (Decided 2026-10-21) | footer, Contact, `mailto:` links, `Reply-To` of every customer e-mail, receives the forms and the alerts to Linda (§8.3) | Design |
| `business/address-line` · `address-region` | 20 Church View, Winchburgh · EH52 6SZ (registered address; jurisdiction Scotland; Decided 2026-10-21) | footer, legal pages, e-mail footers, the collection address (step 2, status page, e-mail 3b, Send a text, §6.8) | Design + Decided D14 |
| `business/hygiene-rating` · `council` | Pass · West Lothian Council (no ICO number field, Decided 2026-10-21) | footer FOOD & COMPLIANCE, Privacy policy, Allergen information | Design + Decided |
| `business/instagram` + Facebook (admin field only) | @bakedbylinda · Baked by Linda | menu social links, Home social band; stored as URL + label | Design + Decided |
| `ops/delivery-area` | Edinburgh & the Lothians | step 2 notice, Bespoke page, FAQ, Delivery page | Design |
| Postcode districts (admin field only) | EH1–EH42, EH47–EH55 | delivery is offered when the postcode’s outward code equals a listed district or falls in a listed range (same letters, numbers inclusive) | Decided + Proposal (matching) |
| Beyond the area (admin field only) | Collection or courier | step 2 notice | Design |
| `ops/delivery-charge` | Free | step 2, step 4 handover line and total, Delivery page. Above £0 it is added once per delivery order. | Design + Proposal |
| `ops/second-attempt-fee` | £15 | e-mail 13, Nobody-was-in state, the redelivery payment, H. £0, or at least £0.30 (Stripe’s minimum); £0 makes the redelivery free, with no payment step (§6.3, §6.8). | Design + Decided + Proposal |
| `price/bespoke-minimum` | £160 | Bespoke page, FAQ, the first budget pill. £1–£5,000; never shown as “Free”. | Design + Proposal |
| `allergen/kitchen-handles` | nuts, wheat, egg, milk, soya and sesame | the kitchen sentence on cake pages, step 4, the Allergen page, FAQ. Set as tick boxes of the 14 UK allergens (like the cakes, Decided D17). Figma page copy that omits sesame is sample. | Decided + Proposal |
| `ops/change-deadline-hours` | 48 | **replaced** by the rule “until 23:59 on D-2” (§10.1); keep the variable unused | Decided D2 |
| `price/deposit-share` · `price/tasting-box` (and the old “Balance due” field) | — | **unused** (marked UNUSED in Figma; hidden in Settings). Do not build. | Decided |
| Town (admin field only) | Winchburgh | `{town}`: the e-mail header label, Home “Local, home baked.”, the FAQ and legal placeholders | Decided D14 + Proposal |

Which value an order uses (Proposal): the operational facts — phone, e-mail, collection address and town — always come from current Settings, also for orders already placed (e-mail 3b, **Send a text**, the status page, §6.8), so a move or a new number reaches every order at once. The business facts in an order’s snapshot (§1) are used only for e-mail 1: its key terms, its footer and the placeholders of the legal revisions it accepted (§8.1). Saving Settings never creates a legal revision.

### 11.2 Capacity — admin Availability (§9.11)

| Variable | Demo value | Shows / affects | Basis |
|---|---|---|---|
| `ops/daily-cap` | 2 | §10.4 | Decided |
| `ops/weekly-cap` | 9 | §10.4; “{6} of {9} slots left this week” | Spec + Design |
| `ops/lead-time-days` | 5 (default; 3–60) | earliest date (§10.1); “too soon” days | Decided + Decided 2026-10-17 (range) |
| `ops/hold-minutes` | 20 (fixed) | the date hold (§10.3) | Spec |
| `ops/status-link-days` | 30 (fixed) | the status-link lifetime (§10.5) | Spec |
| `ops/lead-time-words` | five days | **generated** from the number (three–sixty in words), never typed: FAQ, Terms, Delivery page, calendar caption | Proposal |
| Bespoke lead time (admin field only) | 3 weeks (1–26) · “three to four weeks” | the bespoke date warning threshold (21 days) and the words on the Bespoke page, FAQ, Availability | Design + Decided + Proposal (range) |
| Closed days and ranges | 21–22 Sep | not offered; shown to customers as fully booked; stored one day at a time (a range closes each of its days, §9.11) | Spec + Proposal |
| Max cakes per order | 5 (fixed) | §5, the “over the cap” notice | Decided D1 |

### 11.3 The catalogue — admin Cakes (§9.13)

| Value | Shows / affects | Basis |
|---|---|---|
| Name, What it is | card (name), cake page, summary, e-mails, admin | Design |
| Flavour (max 60) | the card’s description line, order panel, Order detail, e-mails, daily list, print | Decided (2026-10-17) |
| Sizes (per cake: serves · tiers · price) | cake page options (the smallest pre-selected; “From £…” = the smallest price), tier label, change-page options, Linda’s Change the order | Decided |
| Options (per cake: type, label, help line, required / min–max, max length, choices with add-on price and allergens, order) + **Offer an inscription** (on/off) | cake page, line price, line allergens, every order line, change page, e-mails, CSV (§5.8) | Decided 2026-10-21 + Proposal |
| Allergens (14 tick boxes + Also contains) | cake page, step 3, step 4, status page, e-mail 1, daily list, print, Order detail | Decided D17 + Spec |
| Categories (fixed four; several per cake) | catalogue filter | Spec + Proposal |
| Visibility | hidden = off the catalogue, the Home row, the counts and the sitemap; its URL returns 404; orders placed are not affected | Spec + Decided |
| Order (drag) | catalogue order; the Home row = the first five visible | Decided |
| Photos, videos, covers, alt text | card, gallery, summary, e-mails, daily list (§9.13) | Spec + Decided |
| Card video (one per cake) | the cake card only: closed still (frame 0) and the open, looping video (ANIM-11); not on the cake page | Decided 2026-10-22 |
| `catalogue/page-size` | 12 on every breakpoint (fixed) | Decided 2026-10-17 |
| `catalogue/visible-count` · `total-count` | **calculated** (demo 24 · 26): “Showing 12 of 24”, admin “26 designs · 24 showing” | Spec |

### 11.4 Content — admin Content, The hero, Testimonials (§9.12)

| Value | Shows / affects | Basis |
|---|---|---|
| FAQ questions (question, category, answer, order) | FAQ page | Design |
| Legal page texts + “updated” date | the 8 policy pages | Design + Decided |
| Page photos and Home photo slots (with alt text) | the top band of each page; Home “We got you.” and About photos | Design + Proposal |
| Gallery photos (photo, caption, occasion, alt text, Showing/Hidden, gallery order, Home pick + order) | `/gallery`, the lightbox, the Home “Special idea?” squares, the bespoke “Inspired by” card, admin | Decided (2026-10-16) |
| Hero slides — fields come with the owner’s slide designs (drawn sample: theme, headline, supporting line, button, label, link, shown, order) + slide duration (default 6 s) | Home hero after the fixed designed slide; none at launch | Design + Decided D15 + Decided 2026-10-17 |
| Google reviews (review id, stars, reviewer name, text, created / updated time) | Home “Thoughts on my work.” cards, admin Google reviews | **automatic** (Decided 2026-10-22): synced daily at 03:00 and on **Check now** from the **Google Business Profile API** — `accounts.locations.reviews.list`, `orderBy=updateTime desc`, `pageSize=50`, following `nextPageToken` to the end — with Linda’s connected account (§9.12, §14.1). New and edited reviews are upserted, ones no longer on Google are deleted. Stored: only the fields listed (no photos, no profile links). The site serves them from its own database (`/api/reviews`, §4.1), never from Google in the visitor’s browser. **Until the connection exists** (the API needs Google’s approval, §14.1): the Places API (New) Place Details `reviews` field — at most 5 reviews that Google chooses — shown newest first with a **See all reviews on Google →** link after the last card. |
| (was) Testimonials typed by Linda | removed 2026-10-22; existing rows are not migrated | Decided 2026-10-22 |
| Google score and review count | **automatic** (Decided 2026-10-17): with the Business Profile connection, from the same daily review sync (`averageRating`, `totalReviewCount`, 2026-10-22); otherwise fetched once a day from the Google **Places API (New)** — Place Details, fields `rating` and `userRatingCount` — with the Place ID and an API key (§14.1). Stored with its fetch date; if a fetch fails the last value stays, but it is hidden once the last successful fetch is more than 30 days old (Google’s terms); hidden until a first value exists. Shown with the word “Google” as attribution. Home rating line, admin Testimonials. | Decided D13 + Decided 2026-10-17 |

### 11.5 E-mails and team — admin Emails, Team (§9.15, §9.16)

| Value | Shows / affects | Basis |
|---|---|---|
| On/off for 3, 3b, 4, 5 | whether the job sends it; switching back on sends nothing late | Design |
| Sign-off | “— {sign-off}” above the footer of every customer e-mail; 1–40 characters, empty = no sign-off line | Design + Proposal |
| “A year later” note | e-mail 5 body after the generated first sentence; max 300 characters, may be empty; default as Appendix A.3 | Design + Proposal |
| Sending domain, SPF / DKIM / DMARC | set up once; read-only status | Design + Decided |
| Send log | automatic, 30 days; customer e-mails, e-mail 4 and alerts; the never-twice keys are kept as long as their order, enquiry or complaint (§8.4) | Design + Proposal |
| People, roles, devices | §9.15 | Design + Decided D9 |

### 11.6 One order — what changes it and what it changes

| Value | Changed by | Shows / affects | Basis |
|---|---|---|---|
| Status | §10.6 | status page, admin filters, Money, capacity | Spec + Decided |
| Status page state | calculated, §6.2 | which actions the status page offers | Decided |
| Lines (cake, size, options, inscription) | customer: steps 1–4; change page (size, options, inscription) until 23:59 on D-2. Linda: §9.7 any time | total, caps, summary, e-mails, daily list | Decided |
| Date and window | customer: step 2; change page until D-2. Linda / Helper: any time | calendar, e-mails 1–4, link lifetime, change window, refund tier (full only through the earliest date, §10.1) | Decided |
| Handover type and address | customer: step 2 only (afterwards Message Linda). Owner: type and address (§9.7). Helper: address only. | daily list, Send a text, status page | Decided |
| Collection time | Linda / Helper (§9.5) | Today, e-mail 3b, status page, Send a text | Decided |
| Total, price difference, refunds | §6.4, §9.7, §10.6 (a difference under £0.30 is waived and leaves the total as it was) | summary, Pay button, e-mails 12 and 15, M, Money | Decided + Proposal |
| Business facts version (trading name, legal name, address, postcode, phone, e-mail kept at confirmation) | set at confirmation; never changed | e-mail 1, its key terms and PDFs, **Send again** of e-mail 1 (§8.1, §8.4) | Proposal |
| Delivery attempts (a list: day, outcome, choice, chosen at, one token each) | §6.8 | e-mail 13, status page, Today, redelivery date and window | Decided D5 + Proposal |
| Earliest date | set at booking; lowered by a customer date change or by a Linda move marked “The customer asked for this”; set to the new date when Linda moves the order later without that tick (§10.1) | refund tier, cancel page lead line, e-mail 8 | Decided 2026-10-17 |
| Line price paid | set at confirmation from the snapshot price; every size change (customer or Linda) sets it to the new size’s current price | every later size difference, total | Proposal |
| Money lines (payments and refunds, each with its kind) | checkout, payment links, size-ups, redelivery, Record a payment, refunds (§10.6) | net paid, still to pay, what counts for a refund, taken | Proposal |
| Change hold | a 20-minute hold owned by the order (not a draft) while a customer’s size-up payment that also moves the date is in flight (§6.4) | capacity of the new day and week | Proposal |
| Lock and version | the size-up lock (§6.4); a version number raised by every saved change | stale saves refused, webhook re-check | Proposal |
| Marketing consent | step 3; unsubscribe; Turn emails back on | e-mail 5 | Spec |
| Allergy note + allergy consent, who for | customer at step 3; afterwards Message Linda | admin, daily list, print | Design + Decided D16 |
| Messages, complaint notes | §6.5, §7.5 | Order detail MESSAGES | Proposal |

### 11.7 Bespoke — enquiry and manual order

| Value | Rule | Basis |
|---|---|---|
| Enquiry answers | §7.1; “Not answered” for gaps | Design |
| Enquiry status | New → Replied → Ordered, or Closed (Reopen returns to the previous status) | Decided + Proposal |
| Manual order | §9.6; one cake | Decided |
| Paid so far / still to pay | payment links (automatic), Record a payment, refunds — net paid by line kind (§10.6) | Decided + Proposal |
| Payment link | §9.8 | Decided |
| Customer e-mails | On / Off per order (§8.2) | Decided D11 |

### 11.8 Templates inside text

Sentences that contain a business value are templates, never typed copy. Texts Linda edits (FAQ answers, legal pages) support placeholders, shown in the editor as chips that cannot be edited: `{trading_name}`, `{legal_name}`, `{phone}`, `{email}`, `{address}`, `{postcode}`, `{town}`, `{delivery_area}`, `{delivery_charge}`, `{second_attempt_fee}`, `{lead_time_words}`, `{bespoke_lead_time_words}`, `{bespoke_minimum}`, `{kitchen_handles}`, `{council}`, `{hygiene_rating}`. Fixed rules that appear in copy (two days before, seven days, 14 days, 20 minutes, 30 days, five cakes, 6pm, 12 noon, 15 minutes, 5–10 working days, 90 days) are written as constants in one place. (Spec + Proposal) A revision rendered for an order (e-mail 1 and its PDFs, §8.1) fills its placeholders from the business facts kept with that order at confirmation; the public legal pages use the current Settings. (Proposal)

---

## 12. Automatic jobs (Europe/London)

Each run is keyed (job + date) and marked done only when it completes; on start-up and every 15 minutes a job whose time has passed today and is not done runs again from the start (late limits §8.4). The per-send never-twice keys (§8.4) make a re-run, a crash halfway or a second worker safe. If the host’s scheduler only knows UTC, it fires the 15-minute loop and the app decides each time in London time. Selection for e-mails 2, 3 and 3b: orders that are `confirmed`, have customer e-mails On, have an e-mail address (not a deleted customer) and whose `confirmed_at` (not the draft’s creation) is before the job time. (Proposal)

| When | What | Basis |
|---|---|---|
| 06:00 | E-mail 4 to the team (if switched on) whenever Today has any row at 06:00 — handovers, “No choice yet” or “Not collected yet” (§8.1) | Spec + Proposal |
| 07:00 | E-mail 3 / 3b for today’s orders (if switched on; selection as above) | Spec + Proposal |
| 08:00 | E-mail 2 for orders whose D-2 is today (selection as above); a date change saved later that day onto a D-2 of today sends it at once (§8.1) | Decided D2 + Proposal |
| 10:00 | E-mail 5 for eligible orders (§8.1, consent only) whose anniversary falls today or in the 6 days before and has no never-twice key yet (days the switch was off are skipped); one address with several on the same day gets the newest order’s | Proposal (time) + Proposal |
| Every 10 minutes | Reconciliation: read from Stripe every PaymentIntent the site created in the last 48 hours, of every kind (§10.6), and apply any missed success, failure or refund; also list Stripe’s succeeded payments of the same 48 hours and flag one with no order (“Stripe payment has no order”) | Proposal |
| Every 15 minutes | Cancel in Stripe the PaymentIntents of every link kind — payment links, redelivery payments and customer size-up payments — that have expired, been withdrawn or been dropped — a customer size-up left unpaid when the change window closes, a redelivery payment when the customer chose Collect, a waiting-change link at 23:59 on the order’s date (§9.7), any other payment link at 23:59 on the 30th day after the order’s date or after the day it was sent, whichever is later (§10.5). Whether a link is still valid, and whether a waiting change has been dropped (23:59 on the order’s date), is always decided when it is read (§10.5, §9.7), so nothing waits for this job; the job only cancels the PaymentIntent | Proposal |
| Every hour | Delete drafts with 24 hours without activity (`abandoned`, PaymentIntent cancelled); the draft is also treated as gone on access once 24 hours have passed | Decided + Proposal |
| Daily 03:00 | Sync the Google reviews and the score (§11.4); clear allergy notes and dietary answers 90 days after the order’s date (§10.10); delete uploads never attached after 24 hours; remove abandoned records after 30 days; delete enquiries (and pictures) 12 months after sending unless ordered; delete possible-spam enquiries after 30 days; delete contact messages after 30 days; delete possible-spam complaints after 30 days and complaints 6 years after sending (with their order when one matched); prune the send log after 30 days (never-twice keys stay as long as their order, enquiry or complaint, §8.4); delete orders after 6 years | Decided + Proposal |
| Continuously | Mail retry queue (until each e-mail’s deadline, §8.4) | Proposal |

Holds need no job: capacity reads ignore expired holds (§10.3).

---

## 13. Calculated display values (never stored, never typed)

| Value | Definition |
|---|---|
| “From £…” | the cake’s smallest size price |
| Size differences (+£55) | cake page: size price − the smallest size’s price; change page: new size price − the price paid for the current size |
| Total, still to pay, payment state | §10.6 |
| Hold countdown | expiry − now, from the server |
| “{n} more minutes” (hold) | whole minutes left, rounded down, at least 1; “1 more minute” in the singular (§10.7) |
| Last day to change or cancel online | the order’s current date − 2 days, until 23:59 (§10.1) |
| Full refund still possible | the earliest date your order has had − today > 7 (last day: that date − 8, until 23:59, §10.1; at checkout it is the chosen date); if not, step 4 shows the half-refund line (§5.4) |
| **Pay £…** label | the draft’s total as last re-priced by the server (§5.5) |
| Catalogue counts | visible cakes (filtered) |
| Day states | §10.4 |
| “{6} of {9} slots left this week” | max(0, weekly cap − cakes counted this week (Mon–Sun) as in §10.4: confirmed and completed orders plus live holds; redeliveries never count) |
| Today tiles | **out today** = cakes with today’s date (confirmed or completed orders) + redeliveries due today; **this week** = cakes dated Mon–Sun this week in confirmed or completed orders (cancelled and refunded orders never count); **new enquiries** = enquiries in New; **taken this week** = money taken (§10.6) Mon–Sun: payments by payment date minus refunds by refund date; **still to pay** = Σ still to pay over confirmed and completed orders |
| Orders subtitle | “{n} this year” = orders confirmed this calendar year that are `confirmed` or `completed` (not cancelled or refunded) · “£… taken” = money taken this calendar year (§10.6) · “£… still to pay” |
| Money tiles | still to pay (as Today) · **paid this week** (= taken this week) · unpaid, date within 7 days (Σ still to pay of confirmed and completed orders dated from today to today + 6) · taken this year |
| “£… refund if cancelled today” (Order detail) | §10.1 tiers on what counts for a refund (§10.6), plus any paid redelivery fee in full |
| More menu counts | §9.1 |

---

## 14. Before launch, and open questions

### 14.1 The owner supplies before launch

1. ~~The business address, phone, e-mail and legal name~~ — supplied 2026-10-21 (§11.1). Still to confirm: the food hygiene rating and the council registration line.
2. The analytics provider (Cookie policy and Privacy policy still say “[to be confirmed before launch]”) — until then no analytics loads.
3. The ADR provider name and web address (Complaints procedure, `666:4785`).
4. The Google Place ID of Linda’s business and a Google Maps Platform API key with the Places API (New) enabled (for the rating, the review link and the 5-review fallback, §11.4). For **all** reviews (Decided 2026-10-22): a Google Cloud project with Business Profile API access requested and approved — Google requires a Business Profile verified and active for 60+ days with the website on it, and the request sent from an owner or manager e-mail; until approval the quota shows 0 — then Linda clicks **Connect Google** once (§9.12).
5. Legal copy to revise in the admin editor: Cookie policy (list the cookies of §10.11; `bbl_session` lasts 7 days, not “until you close the browser”); Privacy policy (the allergy/dietary consent boxes now exist, Decided D16; allergy notes cleared 90 days after the date and marketing consent per e-mail address, §10.10; complaints and contact retention, §10.10; the enquiry link shows the dietary answers without a second check and is sent only to the address that sent the enquiry, §7.2); Terms (`664:4262`) and the Cancellations page (`666:4527`, phone `844:7959`, tablet `1560:11866`; its seed copy still says “up to 48 hours”, Appendix A.1): changes and cancellation online until 23:59 two days before the date; the refund counts from the earliest date the order has had, and Linda moving the date later never counts against the customer unless the customer asked for it (§10.1); “or design” removed; Accessibility statement (no “quote in large print”; one review date).
6. Stripe live keys, webhook secret, Apple Pay domain verification; the mail provider account (Postmark by default, §0.8); the sending domain records; the hosting account.

### 14.2 Open questions (on purpose)

1. ~~Desktop navigation hover state~~ — decided 2026-10-21 (`ANIMATIONS.md` ANIM-07, ANIM-08).
2. **Admin hero slides** — the owner designs them later, animated (Decided 2026-10-17; §4.1, §9.12). Until then the designed hero is shown alone.

Everything else is decided or written as a Proposal.

---

## Appendix A — Figma texts that are outdated (build the text on the right)

The owner chose to leave screen copy as it is in Figma (Decided D19); this file wins. Spelling mistakes were fixed in Figma on 2026-10-15, the business town changed to Winchburgh and the build-spec board updated. Sample values in braces.

### A.1 Customer screens

| Figma node(s) | Drawn text | Build instead | Section |
|---|---|---|---|
| `637:3302` · `828:6277` · `1557:12106` (step 2) | “… is held for you for 20 minutes” (before Continue) | “Continue and I will hold {date} for you for 20 minutes.” | §5.2 |
| `637:3270` (phone `828:6232`, tablet `1557:12079`) and the calendar states | “…inside my five days’ notice, or the week is already full” | “Greyed-out days are too soon (I need {lead time in words}’ notice), already full, or closed.” | §5.2 |
| `1199:9241` (over the cap; texts `1199:9246` · `9248` · `9250` · `9256` and the note `1199:9260`) | “Adding a seventh”, “Six is the most one order can hold.”, “…orders stop at six”, “six cakes per order” | “Adding a sixth”, “Five is the most one order can hold.”, “…orders stop at five” (the limit as a template) | §5.1 |
| `983:9252` · `983:9273` | “Review and pay” | stepper “Payment”, page title “Review & pay” | §5 |
| `974:9147` (desktop F) | the hold line is drawn on step 2 only | the hold line on steps 3–4 under the stepper | §5.3 |
| `975:9099` · `975:9188` (Still processing; heading `975:9103`) | “Still checking with your bank” | “Payment received — confirming your order” and the rest of the §5.5 copy | §5.5 |
| `983:9189` · `983:9190` (Declined) | “Your bank declined the payment” · “Nothing has been taken and Saturday 12 September is still held for 18 more minutes. Try another card, or use Apple Pay.” | the §5.5 Declined copy, built as a template: the date and minutes from the hold; a wallet is named only when the device offers it | §5.5 |
| `985:9235` (phone “Not confirmed”) | the button still reads “Taking payment” | the button reads **Pay £…** | §5.5 |
| `654:3579` (404) | checkout line | “…if you were mid-checkout, your answers are kept for a day.” | §4.6 |
| `1036:9270` (A2) · `1037:9213` (rule card) | “Changes to the size, message or design…” | “The size, message, date and delivery window can be changed until 23:59 two days before your date.” | §6.4 |
| `1036:9200` · `1056:9140` (C) | “it works for 30 days” | “it works until {date + 30 days}” | §6.3 |
| `1037:9236` (D) · `1037:9252` (F) | “Status links last 30 days…” · instruction text on the sent screen | the §6.1 copy | §6.1 |
| `1037:9239` (D) | e-mail field prefilled | always empty | §6.1 |
| `1037:9168` · `1058:9134` (Message Linda) | “She answers every message…” | “I answer every message within 24 hours, usually sooner.” | §6.5 |
| `1058:9130` (phone Message Linda) | no counter | “n / 400” counter | §6.5 |
| `1037:9260` · `1037:9270` (E) | “You cancelled on…” · “…it is still free at the moment” | “This order was cancelled on {date}.” · “Your date is back in the calendar.” | §6.3 |
| `1037:9200` · `1037:9267` · `1199:9317` · `1199:9323` | “card you paid with” / “Paid in full already” for every order | the money variants of §6.3 | §6.3 |
| `1255:9533` · `1249:9265` · `1249:9279` | “this morning” | from the window: this morning / afternoon / evening | §6.8 |
| `1199:9333` (H) | “Window — You choose a time” | “Window — {chosen window}; I text a tighter time that morning.” | §6.8 |
| `1199:9378` (J) | “…you won’t hear from me again unless you ask.” | “I’ve taken this address off the once-a-year e-mail. You will still get e-mails about any order you place.” | §6.10 |
| `1598:10548` · `1598:10580` (e-mail 15, M) | “now serves 24” | sample; build from the waiting change | §6.9 |
| `847:8028` (phone Bespoke) | hints and picture-tile states missing | as desktop (“select all that apply”, budget hint, “in your own words…”, Added / + tiles) | §7.1 |
| `1609:11066` (phone Your enquiry) | “Your enquiry, in writing.” · “To add anything, reply to my email.” | the desktop copy | §7.2 |
| `1108:9877` | wedding-specific “No matches” copy | the general copy of §4.2 | §4.2 |
| `1108:9365` | “V2 FAQ has no live accordion yet” | obsolete note | §4.4 |
| `664:4552` (Cookie policy) | `bbl_session` “disappears when you close the browser”; “There are two” | §10.11 cookie list | §14.1 |
| `664:4558` · `664:4429` · `666:4785` | “[to be confirmed before launch]” placeholders | owner supplies (§14.1) | §14.1 |
| `664:4262` (Terms) | “size, message or design … up to 48 hours” | “two days before the date”, no “design” | §14.1 |
| `666:4527` · phone `844:7959` · tablet `1560:11866` (Cancellations page, seed copy) | “Size, message and small design changes are possible up to 48 hours before your date…” | “The size, message, date and delivery window can be changed online until 23:59 two days before your date. You can cancel online until the same time: more than seven days before your date, a full refund; from seven days to two days before, half. After that, cancelling goes through me. If your date moves, the refund counts from the earliest date your order has had — and if I move your date later without you asking, that never counts against you.” | §4.5, §14.1 |
| `666:4662` (Accessibility) | “a quote in large print” | remove | §14.1 |
| `1562:12233` (tablet Home) | testimonials without dashes | done 2026-10-22 (`1760:12667`) | §4.1 |
| FAQ answers “Is a deposit needed for bespoke?” and “How do I pay?” (desktop, phone, tablet; hidden; **fixed in Figma 2026-10-23**) | described the removed online quote / deposit flow (“quoted first”) | “For a bespoke cake we agree the details by e-mail first. Then I send you a secure payment link — for a deposit or the full price, as we agreed.” / “Ready-made cakes are paid in full when you order, by card, Apple Pay or Google Pay. For bespoke cakes I send you a payment link once we have agreed the details.” | §4.4, §7.3 |
| `658:4037` · `803:5777` · `1559:11390` (FAQ answer, hidden) | “Yes, up to 48 hours before your date…” | “Yes, until 23:59 two days before your date. After that the cake is already being made — ring me.” | §4.4 |
| `639:3359` · `832:6347` · `1557:12363` (step 3, under the boxes) | “Neither box is ticked for you…” | “None of these boxes is ticked for you. The terms box is required; the e-mail box is up to you.” | §5.3 |
| `643:3518` · `836:6543` · `1558:10953` (Order confirmed, WHAT HAPPENS NEXT) | “I will email you nearer the time to remind you…” | Two days before: “the last day to change anything” (the §5.6 copy) | §5.6 |
| `643:3529` · `836:6554` · `1558:10964` (Order confirmed) | “Changes are free until 48 hours before.” | “You can change the size, message, date or window until 23:59 on {Thursday 10 September}.” | §5.6 |
| `1036:9292` (A2) | “Cancelling is still possible, but it is no longer free…” | “Cancelling is closed online now too — message me or ring {phone}.” | §6.4 |
| `1036:9164` · `1055:9179` (B) | “The design is fixed now…” | “Changes and cancelling closed on {Thursday 10 September}. Message me, or ring {phone} if something urgent has changed.” | §6.3 |
| `1037:9205` (cancel page) | the refund ladder up to the day | “More than seven days before your date: full refund. From seven days to two days before: half. After that, cancelling goes through me. If you move your date, the refund counts from the earliest date your order has had. None of this affects your statutory rights.” | §6.6 |
| `1037:9180` · `1058:9143` | “a reply can take a few hours” | “If it is urgent, call {phone}.” | §6.5 |
| `654:3665` · `839:7207` · `1558:11312` (Find my order) | “It works for 30 days from your delivery date.” | “It works until 30 days after your date.” | §6.7 |
| `1056:9146` · `1056:9149` (phone D) · `1255:9569` (phone B2) | old link copy, prefilled e-mail · “this morning” | §6.1 copy, empty field · from the window | §6.1, §6.3 |
| `1199:9343` (H) · `1102:9140` | “at a time that suits you” | “{window}” | §6.8 |
| `1058:9145` (phone cancel) | no “You paid £185 on 31 August”; plain button | as desktop (`1037:9182`), maroon **Cancel the order** | §6.6 |
| `974:9102` · `974:9121` · `975:9156` | inscription error copy; postcode copy naming “Aberdeen” | §5.1 copy; “I do not deliver to {outward code} — it is outside {delivery area}.” | §5.1, §5.2 |
| `641:3481` · `834:6482` · `1557:12614` | “…held…” | “Nothing further to pay. Your date is booked the moment this goes through.” | §5.4 |
| `1098:9171` · `983:*` / `985:*` “Name on card” | “Inscription · Included” row; a Name on card field | not built | §5.4 |
| `1638:11815` · `1633:12053` · `1633:12264` | “Cakes I have⏎made.” | “Cakes,⏎I have made.” | §4.8 |
| `1609:11070` (phone Your enquiry) | “sent 31 August” | “sent Monday 31 August” | §7.2 |
| `844:8217` (phone Complaints) · `1252:9521` | picture tiles without states; section heading 12 px | as desktop; 15 px like the other phone legal headings | §7.5 |
| `1598:10598` (phone M) | “Sat …”, “£55 · new total”, “Call …” | the desktop copy | §6.9 |
| `656:3843` (Contact; text `656:3870`, phone `839:6638`, tablet `1558:11848`) | “Tell us about it.” | “Tell me about it.” | §7.4 |

### A.2 E-mails

| Figma node(s) | Drawn | Build instead |
|---|---|---|
| `1128:9164` · `1128:9165` · `1128:9171` (e-mail 2) | “this week” · “Last chance … — Thursday” · “tell me by Thursday” | “…being made for {Saturday}” · “— today” · “today is the last day to change anything” |
| `1128:9111` (e-mail 1) | no allergens, no cancellation rights, one cake, delivery only | the §8.1 content list |
| `1128:9217` (e-mail 3) | “I am setting off this morning” | from the window |
| `1155:9384` · `1155:9387` (e-mail 4) | “their page simply stays on ‘in the kitchen’”; note about one-tap completion | “Forget to tap? Nothing breaks — their page still reads correctly. A collection you have not marked shows on Today the next day as “Not collected yet”.”; the link opens the admin order |
| `1167:9119` (e-mail 5) | “…for Mairi’s birthday” (occasion is not collected) | the generated first sentence of §8.1 |
| `1153:9316` (e-mail 6) | “within 24 hours with a sketch and a price” | “I will reply within 24 hours.” |
| `1249:9245` (e-mail 12) | “New total £185” after a size-up | New total = the total after the change |
| `1128:9109` (section note) | “A tíz levél” (ten e-mails) | §8.1 |
| `1128:9154` (e-mail 1) | “The details can be changed until Thursday 10 September” | “nothing, until I write again on {D-2}.” |
| `1128:9200` (e-mail 2) | “After Thursday the design is fixed” | “I bake and decorate over the next two days. After today the size, message, date and window are fixed.” |
| `1128:9243` (e-mail 3) | “I ring when I am outside” | “Keep your phone to hand — I text you when I set off.” |
| `1153:9347` · `1153:9359` (e-mail 6) | “Sketch and price / Within 24 hours” · “I check the diary and draw something…” | the §8.1 e-mail 6 steps and text |
| `1167:9137` (e-mail 5) | “Five days for a ready-made design, three to four weeks…” | “{lead_time_words} for a ready-made design, {bespoke_lead_time_words} for something bespoke.” |
| E-mail 1 `1128:9111`, e-mail 5 `1167:9106` | no Google review block | done 2026-10-23: e-mail 5 / 5b have the link; the full e-mail 1 is `1800:13257`; e-mail 18 `1800:12959` |
| `1249:9273` · `1249:9233` | “this morning”; straight apostrophes | from the window; curly quotes everywhere; “What happens now” texts start with a capital |

### A.3 Admin

| Figma node(s) | Drawn | Build instead |
|---|---|---|
| Admin / 9 (`940:8507`; text `1274:9596`) and phone Add a cake `950:8916`, the photo helper | “Pinch or drag to reposition. The 4 : 5 crop is fixed — it is what the card on the site uses.” · phone “Pinch to zoom · the 4 : 5 crop is fixed” | “Drag on the photo to choose the part that always stays in view.” The editor shows the whole photo plus previews of each crop (card 8:5, phone 1:1, cake page, e-mail 2:1) (§0.6) |
| `936:8374` · `1249:9364` (Order detail note) | “…free until 48 hours before…” | the §9.5 note |
| `936:8375` · `1249:9365` | “Refunds happen in Stripe — this link opens the charge.” | the §9.5 copy |
| `1250:9301` · `1251:9315` (Change the order) | “Changes take effect immediately — the customer’s confirmation email updates to match.” | the §9.7 footnote |
| `1250:9300` | “Cancel” | **Discard changes** |
| `934:8201` (Orders) | filter “Refunded”; “£140 · refund due” | filter **Cancelled**; “refund pending” only while Stripe has not confirmed |
| `962:9075` · `962:9081` · `962:9129` (Emails) | old trigger wording | the §9.16 wording |
| `944:8874` · `944:8888` · `944:8867` (empty states) | quote flow; “once you send a payment link”; “newest first”; “You will get an email too.” | §9.17 copy; the alert e-mails of §8.3 make the last one true |
| `1607:10601` | “Closed enquiries are deleted after 12 months” | “Enquiries that do not become an order are deleted 12 months after they were sent.” |
| `1607:10781` (Customer emails) | “On: the confirmation…, two days before, and on the day” | the §9.6 copy |
| `950:9109` (PWA) | “…then a new code arrives in your inbox” | “After thirty days the site asks you to sign in again with a new code.” |
| `1269:9572` (Hero) | “if the arrows are added on the live site” | “…the visitor can still change slides with the dashes, or by swiping on phone and tablet.” |
| `1598:10497` | “Text copied” marked (Proposal) | Decided |
| `944:8710` (Settings) | one “Address for service” field | two fields (§9.14) |
| Add a cake `1274:9631` · phone `1286:9631` (video helper) | “Each video needs a still cover image” | “Each video gets a cover from its first frame; **Change the cover** replaces it.” (§9.13) |
| Add a cake `940:8507` · `950:8886` | allergens as free text | 14 tick boxes + Also contains (Decided D17; the picker is drawn as `1801:13494`) |
| `936:8459` · `1253:9642` (Enquiry detail) | no e-mail, phone or reference | §9.10 |
| `932:8247` · `1604:10543` (Today note) | “the only thing that sets an order to completed” | “…(Delivered after all does too)” |
| `934:8410` · `1251:9560` (Money) | “opens a Stripe payment page” | “opens the payment page on your site” |
| `1607:10733` (Add an order) | “Morning 9–12” | “Morning · 9am – 12pm” |
| `1250:9295` (Change the order) | “If the new total is higher… If it’s lower, I refund it straight away” | “Higher total on a fully paid order: she gets a link for the difference and nothing changes until she pays. Not fully paid: saved now, still to pay rises. Lower: anything paid over the new total is refunded automatically.” |
| `1608:10662` (Settings) | “when a postcode starts with one of these” | “Delivery is offered when the postcode’s district is listed, or falls inside a listed range (EH1–EH42).” |
| `1608:10697` · Town · Facebook (Settings) | kitchen list as free text; no Town field; one Facebook field | 14 tick boxes; a Town field; Facebook URL + label (§9.14) |
| `1608:10707` (Settings) | social links “in the footer” | “Used by the social links in the menu and on the home page.” |
| `1608:10755` (Settings, helper of the whole “Allergens and social” card) | “Used on cake pages, the Allergen information page, the menu, the footer and the home page.” | “Used on cake pages, the Allergen information page, the menu and the home page.” |
| `1269:9571` · `1272:9679` (The hero) | “One active slide: … still image — no timer” | “With one active slide the hero has two (your designed hero first) and changes every {6} seconds; with none, the designed hero shows alone.” |
| `944:8806` · `944:8798` · phone `1251:10084` · `1251:10076` (Team) | the Helper description “Today and orders. May mark a handover and message a customer. Cannot see money, cannot change prices, cannot delete a customer.” | “Today and orders: hand over, Nobody was in, collection time, change date, address and inscription. No money, prices, sizes, export or delete.” (Helpers do see the names, phones, addresses and allergy notes they need for the handover.) |
| `1255:9603` · `962:9099` / `965:9114` · `962:9082` / `965:9099` · `1602:10501` · `1255:9609` (Emails rows) | old trigger / timing wording | “A change is saved — by the customer or you” · “6am whenever Today has a row (a handover or someone to ring), to the whole team” · “8am, two days before” · “You send a payment link, or a change raises a paid order” · “Nobody was in is marked” |
| Emails headings `962:9065` / `965:9091` · `962:9068` · row “Cancelled and refunded” | “Twelve emails, all sent by the site” · “THE TWELVE EMAILS” | “The e-mails customers get about their orders” · “CUSTOMER E-MAILS” · “Cancelled” |
| `962:9133` · `965:9142` | “…cannot be switched off” | “…cannot be switched off here (an order you add yourself can go without the reminder and change e-mails; its confirmation, payment links and cancellation always go)” |
| `962:9141` (A year later note) | sample note | default: “If there is another one coming up, I would love to be part of it — and it does not have to be the same one.” |
| `1598:10497` (Send a text spec) | “(if none is saved yet: ‘today’)” | “at the time we agreed” |
| `1607:10915` (collection fragment) | helper naming “Callum” | the §9.5 helper text |
| `Admin / 13` `942:8770`, mobile 17 `1251:9873` (Testimonials; hidden 2026-10-23) | Add a testimonial form, Showing/Hidden, drag order, “in your own wording” | done: `Admin / 13 · Google reviews` `1797:12951`, phone `1797:13035`; the nav label reads “Google reviews” |

### A.3b Designer notes on the canvas that are outdated

| Figma node(s) | Note says | Valid instead |
|---|---|---|
| `1037:9231` | the refund ladder with online cancelling up to the day; Review & pay “free cancellation until 48 hours” | Online cancelling only until 23:59 on D-2 (full more than 7 days before, half after); later only Linda (§6.6, §9.5) |
| `1108:9859` | “Scrim ink 35 % · sheet 92 % white” vs the drawing | §0.6 scrim rule |
| `1108:9910` (catalogue) | “fifteen on desktop and tablet, fourteen on the phone” | 12 per page on every breakpoint (§4.2) |
| `1108:9365` · `1037:9255` · `1058:9129` | “V2 FAQ has no live accordion yet” · “Not in v1” · “v1 gives no per-row Change link on mobile” | obsolete; this file describes the current behaviour |
| `1128:9205` · `1249:9260` · `1036:9185` | “the design is locked after Thursday” · “within the 48-hour window” · “Inside 48 hours” | the change window closes at 23:59 on D-2 |
| the e-mail font notes naming Cormorant and Inter (`1128:9159`, `1128:9205`, `1128:9248`, `1128:9291`, `1153:9365`, `1155:9359`, `1155:9387`, `1167:9143`, `1167:9186`, `1249:9260`, `1249:9300`, `1598:10568`) | fallbacks for Cormorant / Inter | §8.4 Fonts |

### A.4 Build-spec board (`1152:9106`)

Updated on 2026-10-15 to match this file; **on 2026-10-23 every row below was corrected on the board** (kept for reference):

| Board card · node(s) | Board says | Valid instead |
|---|---|---|
| CATALOGUE | “View all N designs”; a “24 designs” count in the filter row | neither is built (§0.3, §4.2) |
| CATALOGUE `1155:9116` · `1155:9125` · `1155:9113` | “fifteen on desktop and on tablet … fourteen on mobile (two across, seven down)”; “under fifteen … fourteen on the phone”; “Showing 15 of 24” | 12 per page on every breakpoint (desktop and tablet 3 × 4, phone 2 × 6; §4.2) |
| Row label `1155:9160` | “Weekly cap” | it covers both caps (§10.4) |
| DATE HOLD `1153:9134` | “countdown from step 2 onwards” | it shows on steps 3–4 (§5.3) |
| CAPACITY `1153:9185` and the note `1108:9184` | “never render an empty grid — jump” | the full month shows with **Show me {Month} →** (§5.2) |
| MORE THAN ONE CAKE `1155:9167` | “Delivery is free” | a charge is possible (§11.1) |
| PHOTOGRAPHY `1155:9182` · MEDIA ON A CAKE `1281:9639` | “4:5” · “540 × 820” | the drawn shapes win (§0.6) |
| MEDIA ON A CAKE `1281:9645` | “MP4, H.264 … 1080 × 1640px max, 15 seconds max, 15MB max” | the upload limits and the server conversion of §9.13 |
| MEDIA ON A CAKE `1281:9642` | “Every video needs a still cover image” | the cover is taken from the first frame; **Change the cover** replaces it (§9.13) |

---

## Appendix B — Changelog

- **v3.16 — 2026-10-23.** The 2026-10-22 review filled in (owner request). **Contrast:** `colour/meta` #7C7389 → #756C82 and every failing faint text fixed in Figma (§10 accessibility note). **Outdated Figma corrected:** the build-spec board (A.4), the two FAQ answers, the admin Testimonials screen replaced by Google reviews (`1797:12951`, `1797:13035`; nav label), the phone Home open card’s duplicate icon hidden, the testimonial cards’ stars + month line. **Drawn:** consent boxes (phone step 3, bespoke on all sizes), the step-4 “Your details” block, the change-page editors (A3), the status page’s Leave a Google review, e-mails 16, 17, 18, the full e-mail 1, the Google link in 5 / 5b, Linda’s and system e-mails (§8.3 board), and the admin pieces listed in §9 (section `1801:13704`). **Motion:** ANIM-12–25 (`ANIMATIONS.md` §7J; storyboard `1804:13056`), with a new resting design on Order confirmed — the mascot peeking over the order-number card (§5.6). A forwardable list of what Linda must supply was written as a separate Claude doc (“Linda teendői a weboldal indulásáig”).
- **v3.15 — 2026-10-22.** Google reviews (owner request and quiz): no e-mail had a review request — now a **Leave a Google review** button goes into a new e-mail 18 “Thank you” (the day after handover, switchable), e-mail 1, e-mail 5 and the status page after the date; same message to everyone, no incentive (Google’s review-gating ban, DMCC Act). The Home testimonials become **all** of Linda’s Google reviews with text, newest first, every rating shown, Linda’s hand-written testimonials removed; the page loads only the visible cards and the next few (6 at a time from `/api/reviews`) and keeps only about a screen of cards in the page. Source: Google Business Profile API (needs Google’s approval and a one-time **Connect Google**), Places API 5-review fallback until then. Admin Testimonials becomes a read-only Google reviews screen. §4.1, §6.3, §8.1, §8.2, §9.12, §10.10, §11.4, §12, §14.1, Appendix A.
- **v3.14 — 2026-10-22.** Owner requests: the cake sits at the bottom of the card picture on the phone too — the turntable stands at the bottom of the card video and every crop is anchored to the video’s bottom edge (new numbers in `claude/torta-video-szabalyrendszer.md` and `ANIMATIONS.md` ANIM-11; Figma board `1783:12951` redrawn). The card opens in 500 ms instead of 360 ms; the title grows and shrinks on a gentler curve; the description and tiers fade softly and shrink a little when they go and come back (storyboard `1779:12951` retimed).
- **v3.13 — 2026-10-22.** Cake card (owner request): **View** now goes to Customise a design and the rest of the card is no longer one big link; the corner button opens the card in place into the open version the owner designed (desktop `1391:10370`, phone Home `1386:10114`; tablet and phone catalogue open versions drawn to match) — the picture grows and zooms in, the title moves, the description fades, the chevrons flip like the menu arrow, and when fully open a separate **card video** (a cake turning on a turntable, full side view, 5 s per turn, seamless loop, no pause) plays; closing reverses it. One card open at a time; the ‹ › arrows on the open frames are removed. New admin field Card video (§9.13, §11.3); the mandatory AI video rules with the 2160 × 2160 size and the crop maths: `claude/torta-video-szabalyrendszer.md`. Motion: `ANIMATIONS.md` ANIM-11.
- **v3.12 — 2026-10-22.** Slider indicator (owner request): the hero dashes become one shared indicator (`V2 · Slider dash` `1759:12635`, `V2 · Slider indicator` `1759:12772`) on the hero, the testimonials (now also on tablet and desktop), the phone About cards, the phone cake media (instead of dots) and the lightbox (instead of “3 / 30”); not on the Home cake carousel; max 5 dashes with the active kept 3rd; same size on every breakpoint; testimonial and About cards are pressable and centre themselves on click. Details: `ANIMATIONS.md` ANIM-10.
- **v3.11 — 2026-10-21.** Drop-down rows (owner request): the FAQ rows — the only drop-downs on the public site; the legal pages have none — roll open and closed smoothly and the arrow flips like the phone menu arrow (`ANIMATIONS.md` ANIM-09, replaces UI-04). All 16 FAQ answers exist in Figma on every size; the 4 closed rows of the accordion state frames got their answers (hidden). Appendix A: the two FAQ answers that still describe the removed quote flow.
- **v3.10 — 2026-10-21.** Owner decisions: every writable field follows ANIM-05 (hover +10 %; a mouse press returns it to its size and it stays so while typing; a phone press shrinks it 10 % and release opens it and springs back) — replacing the search field’s bounce; desktop nav items grow 15 %; clicking or tapping the current page’s menu item reloads that page in every menu (replaces “only closes the menu”); everything added from the admin follows the same rules. Figma: “Writable field · ANIM-05” annotations (85), ANIM-05 storyboard rebuilt, nav storyboard at 15 %.
- **v3.9 — 2026-10-21.** Owner decisions on motion (details in `ANIMATIONS.md` v1.26): every pressable on the public site grows 10 % on hover (the desktop nav text grows, its underline stays), returns to its size while pressed with a mouse or shrinks 10 % while pressed on touch, and acts on release; hover colour changes dropped; text links inside sentences only change colour; the admin has no scaling; the desktop underline slides to a clicked item with a fluid stretch and a spring; tablets follow the input (mouse / trackpad / keyboard → desktop, touch → phone).
- **v3.8 — 2026-10-21.** Cake options (owner request): Linda adds per-cake options in the admin — Choice, Choices, Text, Yes/no — with +£ add-ons and allergens per choice; the inscription can be switched off per cake; customers can change options after ordering like the size. New §5.8; cake page, change page, Change the order, snapshot, CSV, variables updated. Figma: `1713:11890`, `1714:11933`, `1714:11991`, section `1715:11991`.
- **v3.7 — 2026-10-21.** Owner decisions: the header is sticky on every page; the footer has no navigation — LEGAL as the owner arranged it (centred heading, two columns), FOOD & COMPLIANCE heading in the same style, no ICO number, **Find my order →** under the contact block; the real business facts (Baked by Linda, Linda Dávid-Vágvölgyi, 20 Church View, Winchburgh, EH52 6SZ, Scotland, info@bakedbylinda.co.uk, +44 7884 199103 — this phone format everywhere) replaced the placeholders in Figma and in §11.1; the Settings ICO field removed; the footer mascot peeks in once per page (`ANIMATIONS.md` ANIM-06). Footer masters: phone 402 × 1132, desktop 1280 × 594, tablet 1024 × 560.4.
- **v3.6 — 2026-10-21.** Catalogue search field under the filter pills (owner request; then restyled: full pill, faint border, Fraunces, desktop 680 px, one component set, animation ANIM-05): searches name, Flavour and “What it is”, inside the selected pill, live while typing (owner decisions); results and nothing-found states drawn in Figma (`1687:11944`, `1687:11997`, phone `1687:12025`, `1687:12083`); the three catalogue pages grew to make room (desktop +64 px, tablet +51.2, phone +58); URL `q=`, matching rules and build notes.
- **v3.5 — 2026-10-21.** Second Claude Code dry run, split into five deep reads (checkout and payments; after-order, bespoke and complaints; e-mails and jobs; admin; every Figma id and quoted text — 525 ids checked). Owner decisions (2026-10-17): a date hold can be extended at most twice (about 60 minutes) and at most 2 live holds per connection; minimum lead time 3 days (3–60, default 5); when Linda moves an order later the refund counts from the new date unless she ticks “The customer asked for this”; e-mail 1 always goes for manual orders, also with customer e-mails Off; a Helper cannot save onto a full or closed day; missed-delivery collections also get the “Not collected yet” row. Build-level additions: one *prepare* call at Pay (hold, re-price, allergen check, then lock), out-of-order webhooks never move an order back, how `/order/confirmed` finds the order, card-testing limits, refund-date variants in step 4, confirmation and e-mail 1, money-line kinds (goodwill, dispute and fee refunds outside net paid), delivery attempts as a list with one token each, customer deletion revokes every token and is blocked while money is open, unique complaint references, form e-mails never echo free text, never-twice keys for every e-mail and job, e-mail 4 whenever Today has rows, bounce handling, unsubscribe without a POST on load, admin version checks for every record, manual-order money corrections, every Money flag with a clearing rule, session expiry without losing a form, team setup, cake and gallery editor gaps, admin security headers and sessions, Appendix A completed with the Figma ids found (board CATALOGUE and MEDIA cards, Cancellations seed copy, phone and tablet copies).
- **v3.4 — 2026-10-17.** Answers to a Claude Code dry run (an agent read the three files as the builder and listed every question). Owner decisions: the stack is the builder’s choice with a default (§0.8); the admin hero slides will be designed by the owner later, animated — launch with the designed hero alone, editor hidden; e-mail 1 states the key terms and attaches the Terms and Cancellations PDFs; no printed allergen card (e-mail 1 and the status page); cake videos are AI-made to one template (size not known yet; upload limits as a Proposal: MP4/MOV up to 500 MB and 60 s, converted on the server, cover from the first frame); the refund tier counts from the earliest date the order has had; international mobiles; gluten cereals and tree nuts are named; allergy notes cleared after 90 days; Google rating from the Places API (New) with a 30-day limit and attribution; uncollected collections show on Today the next day; catalogue page size 12 everywhere. Build-level fixes: a half refund at least while online cancelling is open when an order was moved later (owner); the Not collected yet rows also in e-mail 4 (owner); wallet hold check in the Express Checkout `confirm` event; the `pending` lock lapses; snapshot taken at Pay and its photos kept; legal page revisions; HEIC handling; date-change holds for paid changes; reconciliation of every PaymentIntent kind; disputes and refund events; e-mail 5 eligibility; consent per address; Join the team page for invites; Possible spam filter; admin complaints page; orphan upload clean-up; payment-link PaymentIntent lifecycle; sticky rule and cookie stacking; inscription normalising; delivery charge on handover switch; 500 page rebuilt on Settings save; `sms:` form and copy; refund wording 5–10 working days; CSV formula escaping; self-hosted fonts; Helper description and the Admin/9 crop text in Appendix A.
- **v3.3 — 2026-10-17.** Second full review against Figma by six reviewers (shell and browsing, checkout, after-order and bespoke, e-mails, admin desktop, admin phone and breakpoint parity), with the “one moment” lens of §0.6. Owner decisions: drawn text sizes stay (no 12 px floor); a right-hand order summary on desktop/tablet steps 2–3 (drawn); a Flavour field for cakes (drawn); the designed hero photo is a fixed asset. New and corrected rules: forms open empty; photo shapes per breakpoint with a focal point; hit areas vs visual sizes; text-length rules; cookie bar as a floating card with page padding; state cards in the page and their labels/notes; cake card, testimonials, FAQ layout, legal anchors, gallery captions; payment block = Express Checkout + card Element; declined / not-confirmed inline; allergen sentence for several cakes; NEXT box per state; order panel rows; change-page editors; bespoke date, warnings, K, picture tiles; e-mail layout, fonts, dark mode, preheader, timeline, variants of 1, 2, 3, 4, 5, 6, 8, 12, 13, 15, alert subjects, retry deadlines, Send again; admin money format, layout at smaller widths, scrolling, truncation, lists, phone tabs and back links, phone parity, Helper sidebar, Today/Money/Availability definitions. Figma fixes: summary columns, step-2 and Availability month buttons, BEFORE YOU PAY panel, tablet confirmation and step 1, phone FAQ chevrons, tablet testimonial text sizes, Flavour field, handed-over state, Order detail allergens and status tag, admin search placement, Emails gaps, empty-state cards, phone change page / B2 / Your enquiry spacing. Appendix A extended.
- **v3.2 — 2026-10-16.** New §0.6: what a Figma frame shows is one moment (overlays open at the current scroll position, placeholders, sample counts, partial lists, live states, scrim rule); more canvas leftovers and developer notes listed in §0.3; outdated canvas notes in Appendix A.3b.
- **v3.1 — 2026-10-16.** New Gallery page (§4.8) with lightbox, paging, empty state and “I’d like one like this” → bespoke “Inspired by” (§7.1); Gallery in the header (7 items, gap 32), the phone/tablet menu, the footer and the admin (sidebar, More, §9.18, Enquiry detail); Home “Special idea?” wired: four squares = Linda’s Home picks, gallery link → `/gallery` (open question D12 closed); tablet “Special idea?” replaced with the current design; the header’s active underline made visible (it was clipped); bespoke and Enquiry sent copy brought in line with the private flow in Figma.
- **v3.0 — 2026-10-15.** Full review of every element against Figma by six independent audits; rebuilt for building: glossary (§1), precedence (§0.1), one page map with index column (§2), state precedence for the status page (§6.2), every payment outcome (§5.5), token table (§10.5), statuses and Stripe (§10.6), money and numbers (§10.7), rate limits (§10.9), retention (§10.10), per-screen admin tables with a Helper matrix (§9), e-mail table sorted with subjects and per-order-type matrix (§8), jobs with catch-up (§12), calculated values (§13), before-launch list (§14.1), outdated Figma texts (Appendix A). Owner decisions D1–D19: max 5 cakes per order and an order may exceed the daily cap while the day has a free slot; change window until 23:59 on D-2 with e-mail 2 that morning; no online cancel after it; Linda may overbook with a warning; redelivery next day with the customer’s window, outside the caps, not when tomorrow is closed; automatic cancellation refunds; manual orders: message only for the customer, Linda sets the refund; alert e-mails to Linda; Helper may also use Nobody was in, Change the order (no size) and Collection time; admin layout switch at 1024 px; e-mails 15 and 8 still sent when customer e-mails are off; gallery link left open; Google rating on Home (drawn); Winchburgh everywhere (Figma updated); designed hero = fixed first slide; allergy / dietary consent boxes; 14 UK allergens as tick boxes; complaint acknowledgement e-mail 17; board updated and typos fixed in Figma. New: e-mail 16 (order link), e-mail 17, alert and system e-mails. Fixed contradictions: tampered enquiry links (404), `refunded` only for cancelled orders, “£438 still owed”, the e-mail table order and its “Spec” column, the sample-data note, §6.3 cross-reference. The phone order-summary bar is now phone only (the tablet step frames show the summary inline). Then checked by two independent reviews (lifecycles, decisions, lost content; every one of the 283 Figma node ids) and corrected.
- **v2.0 — 2026-10-15.** Bespoke made private by e-mail (online quote, deposit and balance removed); Add an order, payment links, Your enquiry page, 500 page.
- **v1.6** variables section; **v1.5** About Linda phone page; **v1.4** Send a text, e-mail 15, page M; **v1.3–v1.1** audits and owner decisions.
