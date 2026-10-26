# CLAUDE.md — how to build Baked by Linda

You are building the website and admin of **Baked by Linda**, a home bakery in Winchburgh, Scotland (owner: Linda Dávid-Vágvölgyi). The design is finished in Figma and the behaviour is fully written down. Your job is to turn it into a production-ready app **in small, checkable steps**. The person you work with is **Bohoka**, the designer. Bohoka is not a programmer, so he checks your work by looking and clicking.

Read this file completely at the start of every session. Then read `docs/BUILD-PLAN.md` and `docs/PROGRESS.md` to see where the work stands. The first message of the first session is `INDITO-PROMPT.md`; later sessions start with the short resume prompt at its end.

**The folder.** The app is built in this same folder, next to these files. Keep them where they are:

```
CLAUDE.md                  this file (read every session)
INDITO-PROMPT.md           Bohoka’s start prompt (Hungarian); read-only
OLVASS-EL.md               Bohoka’s setup notes (Hungarian); read-only (README.md is yours: how to run the app)
docs/                      the specs and the plan; read-only except PROGRESS / PROPOSALS / DEVIATIONS
ellenorzes/                Bohoka’s acceptance checklist (Hungarian); read-only
```

---

## 1. The documents (your sources of truth)

All documents are in `docs/`:

| File | What it is | When you read it |
|---|---|---|
| `docs/SITE-FLOWS.md` | The behaviour spec: every page, button, field, state, e-mail, admin screen, rule, variable and job. **§0 “Start here” is mandatory reading before any code.** | Always; for each slice, the sections named in the plan |
| `docs/RESPONSIVE.md` | Breakpoints (phone < 768, tablet 768–1119, desktop ≥ 1120), the tablet = desktop × 0.8 rule, landscape, admin widths | Every UI slice |
| `docs/ANIMATIONS.md` | Every motion: global rules (§1), tokens (§2), the index and interaction map (§3), ANIM-01 … ANIM-25, the acceptance checklist (§9), the keyframe JSON (§12) | Every slice that has motion; §1 and §3 always |
| `docs/torta-video-szabalyrendszer.md` | The card-video rules: the square video, its crops and the admin upload rules. It has a Hungarian intro and an English prompt; the crop maths is in English. Within the docs it is cited as `claude/torta-video-szabalyrendszer.md`. | Cake card, admin Card video |
| `docs/BUILD-PLAN.md` | The phases and slices you build, in order, each with its inputs, tests and owner check | Always |
| `docs/PROGRESS.md` | The live checklist you keep (you create it in slice 0.1) | Start and end of every slice |
| `docs/PROPOSALS.md` | Your log of every **Proposal** row you built (you create it) | Every slice |
| `docs/DEVIATIONS.md` | Your log of anything you built differently from the docs, and why (you create it) | When it happens |
| `ellenorzes/ELLENORZO-LISTA.md` | **Bohoka’s acceptance checklist** (Hungarian): what he checks after every slice (“Minden szeletnél”), the checks for each slice 0.1–11.3, and the end-of-phase gate (“Szakasz végi kapu”). It is the owner’s view of “done”. See §4.5. | Before every report |

**Precedence (SITE-FLOWS §0.1):**
1. `SITE-FLOWS.md`; inside it, a **Decided** row wins.
2. `RESPONSIVE.md` and `ANIMATIONS.md`, each for its own topic.
3. The Figma build-spec board.
4. The Figma screens.
5. Never Figma sample data.

The checklist in `ellenorzes/` is derived from these documents and adds no rules of its own. If it ever disagrees with them, the documents win: build to the documents and name the difference in the report’s **Eltérések** so Bohoka can update his list.

Where a Figma text disagrees with the docs, the docs win. About 120 known cases are listed in SITE-FLOWS **Appendix A**. When a doc refers to `claude/<name>.md`, the file is `docs/<name>.md`. Other `claude/*.md` notes in the Figma project are history; ignore them.

**Labels (SITE-FLOWS §0.2):**
- **Design**, **Spec** and **Decided** rows: build them exactly.
- **Proposal** rows: build them, and add one line to `docs/PROPOSALS.md`: § reference · what you built · where.
- A case no document covers: choose the simplest behaviour that follows the rules (§0.7), build it, and log it as a Proposal. **Never invent a page, an e-mail, a payment or a price rule.** Ask instead.

## 2. Figma

- File key **`py7HpVoQwoEm9shlxEoCXL`**, page **`0:1`**.
- Every page, state, component and storyboard is named by node id in the docs. Page ids are in SITE-FLOWS §2. Animation storyboards are in ANIMATIONS §3.1.
- If you have the Figma MCP, use it read-only:
  - `get_design_context` and `get_screenshot` on the node ids of the screen you build, at all three breakpoints;
  - `get_variable_defs` for the tokens.
- **Never edit the Figma file.** It belongs to Bohoka.
- If you have no Figma access, stop and ask Bohoka to export the frames or assets you need. List them by node id.
- Dev Mode annotations mark components:
  - **“Pressable · ANIM-07”**: hover / press / release;
  - **“Writable field · ANIM-05”**;
  - **“Text link · colour only”**.
- Ignore what SITE-FLOWS §0.3 tells you to ignore: hidden “régi / rejtve / kivéve” layers, Salvage, Hungarian designer notes, state-card labels, drafts.
- A frame is one moment with sample content (§0.6). Build the behaviour, not the picture. Forms open empty unless the docs name a default.
- Placeholder ellipses named `Placeholder-<what>-desktop|tablet|phone` are slots for future design assets. Build each as an empty decorative image slot of exactly that size and position (§0.6).

## 3. Stack (SITE-FLOWS §0.8, Decided 2026-10-17)

Use the default stack unless a slice gives a reason not to. Log any change in `DEVIATIONS.md` and ask first.

| Part | Choice |
|---|---|
| App | Next.js (App Router, TypeScript, strict), client-side routing (ANIMATIONS ANIM-03 path A) |
| Database | Postgres, with a typed ORM and migrations (Prisma or Drizzle; your pick, logged). All money is stored as integer pence. |
| Files | S3-compatible private bucket, signed URLs; public media through a CDN |
| Media | `sharp` with libheif for photos; ffmpeg for videos (card video: SITE-FLOWS §9.13 and the video rules doc) |
| E-mail | Postmark: transactional stream plus a broadcast stream for e-mail 5. In development, use a local mail catcher or Postmark’s test token; **never e-mail a real customer from dev**. |
| Payments | Stripe, **test mode only** until Bohoka says launch |
| Jobs | A worker or scheduled functions in Europe/London time (SITE-FLOWS §12) |
| Styling | CSS with design tokens (CSS custom properties) from the Figma variables; no UI kit that fights the design |
| Fonts | Quicksand 300/500/600 and Fraunces 300, self-hosted WOFF2 |
| Tests | Vitest (unit and integration), Playwright (end-to-end and screenshots at 402 × 902, 1024 × 1366, 1280 × 800), axe-core (accessibility) |

Secrets live only in environment variables, never in git. Keep `.env.example` up to date with every variable and a one-line comment.

## 4. How you work: one slice at a time

The work is cut into **phases**, and each phase into **slices** (`docs/BUILD-PLAN.md`). A slice is small enough that Bohoka can check it in 10–15 minutes: one screen, or one component family, or one behaviour. **Never start the next slice before Bohoka has accepted the current one.**

### 4.1 At the start of a phase

1. Read the phase in BUILD-PLAN and every doc section it names.
2. Write a **phase plan** in Hungarian and show it to Bohoka. Keep it under one screen:
   - the slices, in order;
   - what each one will show him;
   - the decisions you need from him.
3. Ask those decisions as multiple-choice questions, with the recommended option first. Wait for his OK.

### 4.2 Every slice: the loop

1. **Read.** The doc sections and Figma nodes listed for the slice. Look at the Figma screenshots at all three breakpoints.
2. **Plan, briefly.** Note in `PROGRESS.md`:
   - the slice number;
   - the files you expect to touch;
   - the tests you will write;
   - the Proposal rows involved.
3. **Build.** Only what the slice says. If you notice something that belongs to another slice, write it down under “Later” in `PROGRESS.md` and do not do it now.
4. **Test.**
   - Unit and integration tests for every rule with a number, deadline, price, status or permission in it.
   - Playwright for the user path.
   - axe for accessibility.
   - Screenshots at 402, 1024 and 1280 px wide.
   - Reduced motion on and off, where the slice has motion.
   - Everything must be green, and lint and typecheck must be clean.
5. **Compare with Figma.** Put your screenshot next to the Figma screenshot of the same node at each width. Fix differences in spacing, type, colour, radius or alignment. Anything you cannot match exactly goes into the report with the reason.
6. **Self-check against Bohoka’s checklist** (§4.5). Fix what fails before you report.
7. **Report** to Bohoka, in Hungarian, using the format in §6.
8. **Wait.**
   - Bohoka answers “rendben” / “mehet”: commit, tick the slice in `PROGRESS.md`, start the next slice.
   - He asks for changes (“javítsd: …”): make only those changes, re-test, and report again (a short report: only what changed).
   - On a Proposal (“a §4.2 Proposal jó” / “… ne legyen, maradjon a Figma”) or a deviation (“az eltérés rendben” / “javítsd úgy, ahogy a Figmában van”): act on it and note the decision in `PROPOSALS.md` or `DEVIATIONS.md`.

### 4.3 At the end of a phase (review gate)

- Run the whole test suite, axe on every page built so far, and a Lighthouse run on the main pages (performance, accessibility, best practices, SEO).
- Go through the matching items of ANIMATIONS §9 (acceptance checklist) and the acceptance lines of every ANIM in the phase.
- Write a **phase summary** in Hungarian:
  - what works;
  - every Proposal built in the phase (from `PROPOSALS.md`);
  - deviations;
  - known gaps;
  - a short “how to try it” tour.
- Wait for Bohoka’s OK before the next phase.

### 4.4 Size limits (to keep things checkable)

- One slice touches **one feature**.
- A slice that grows past about 600 changed lines of hand-written code (migrations, generated types and test fixtures excluded) is too big. Stop, split it, and tell Bohoka.
- Never refactor across the codebase inside a feature slice. If a refactor is needed, propose it as its own slice.
- Never change a document in `docs/` except `PROGRESS.md`, `PROPOSALS.md` and `DEVIATIONS.md`, and never change `CLAUDE.md`, `INDITO-PROMPT.md`, `OLVASS-EL.md` or anything in `ellenorzes/`. If a spec looks wrong, say so in the report and ask.

### 4.5 Self-check with Bohoka’s eyes

`ellenorzes/ELLENORZO-LISTA.md` is how the owner will judge the slice. Read it as a fresh pair of eyes — a person who clicks, resizes, uses a real phone and compares with Figma — not as the author of the code.

1. Before every report, go through **“Minden szeletnél”** (every UI slice; logic slices only its Jelentés and Tesztek parts) and the items of **the current slice**.
2. Verify each item yourself wherever a tool can: Playwright at 402 / 1024 / 1280 and the in-between widths, mouse and touch emulation, keyboard only, reduced motion on, axe, screenshots next to Figma, the mail catcher, the Stripe test dashboard, the database.
3. Fix every item that fails before you report. Do not report a slice with a known failing item unless you say so under **Eltérések** with the reason.
4. Items only a person can judge (a real phone, VoiceOver, “feels smooth”) go into **Így nézd meg** as steps for Bohoka, so his check takes 10–15 minutes.
5. At the end of a phase, do the same with **“Szakasz végi kapu”** before the phase summary (§4.3).
6. Never edit the checklist and never tick its boxes. It is Bohoka’s document; your progress lives in `docs/PROGRESS.md`.

## 5. Rules that are never broken

From SITE-FLOWS §0.5 and the docs:

1. Only Stripe confirms a paid order: the `payment_intent.succeeded` webhook or the reconciliation job. The one other way is Linda saving an order in Add an order.
2. Allergens are shown for every cake, everywhere a cake is shown, before and after paying.
3. Nothing beyond essential cookies is set before the visitor chooses.
4. No card data ever touches the server (Stripe Elements only).
5. Every error says what did not happen and what to do next, in words, next to the control.
6. Every animation: under 1 s, `transform` / `opacity` (plus the exceptions the ANIM names), reduced motion = instant, no layout shift (ANIMATIONS §1).
7. Every pressable element on the public site follows ANIM-07, and every writable field follows ANIM-05. This includes content Linda adds from the admin.
8. Every hit area is at least 44 × 44, every text meets its contrast ratio, keyboard and screen reader work (SITE-FLOWS §10.13).
9. Money is integer pence; times are Europe/London; deadlines follow SITE-FLOWS §10.1 exactly.
10. Token pages are `noindex`, `no-referrer`, and expire as SITE-FLOWS §10.5 says.
11. Business facts (name, address, phone, e-mail, hygiene, council) are never typed into pages. They come from Settings (§11.1).
12. Nothing is deleted that the retention rules keep, and nothing is kept longer than they allow (§10.10).

## 6. The report Bohoka gets after each slice

Write it in **Hungarian**, short, in this order:

1. **Kész:** one or two sentences — what the slice delivers.
2. **Így nézd meg:** numbered steps he can follow in the browser:
   - the URL;
   - what to click;
   - what he should see on a phone-width window (402), a tablet width (1024) and desktop (1280);
   - how to turn on reduced motion if relevant.
3. **Képek:** your screenshots next to the Figma ones (at least the 402 and 1280 widths).
4. **Proposal-ök:** the Proposal rows built in this slice (one line each, with the §).
5. **Eltérések:** anything that differs from Figma or the docs, and why. “Nincs” if none.
6. **Kérdés:** only if you need a decision. Ask it as a multiple-choice question with the recommended option first.

Never write a long technical explanation in the report. Put details in the commit message or in `PROGRESS.md`.

## 7. Data during the build

- **Seed data:** a seed script with the Figma sample content. Cakes such as The Lothian, Bramble & Cream, Sugar Peony and the rest of the Figma catalogue; sample orders BBL-2026-0147 and others; sample customers (Mairi Sinclair, …). Business facts are the real ones from SITE-FLOWS §11.1. Re-seeding must be one command.
- **Photos, videos and design-element slots** are not supplied yet. Use neutral placeholders of the exact drawn shape (the placeholder colour from Figma). Never use stock photos.
- **Without a card video**, a cake card shows its main photo and has no corner button (ANIM-11). For testing ANIM-11, generate a synthetic 2160 × 2160, 5 s test clip that follows the video rules.
- **Google reviews:** use a local fixture in the Business Profile API format (many reviews, all star ratings, some long texts, some without text). The live API needs Linda’s approval (§14.1).
- **The hero:** only the fixed, designed first slide. Admin hero slides come later from Bohoka (§14.2): build the data model and the admin page stub only when the plan says so.
- **External accounts** (Stripe, Postmark, Google, hosting) belong to Linda and arrive later. Build against test or sandbox modes and keep every integration behind a small adapter, so live keys are only configuration.

## 8. Git

- One branch per phase (`phase-03-catalogue`), one commit per accepted slice.
- Commit message in English: `slice 3.2: catalogue filter pills and live search (ANIM-16)`, then a few lines on what and where.
- Never commit secrets, `.env`, real customer data or large media.
- Tag each accepted phase: `phase-03-done`.

## 9. When to stop and ask

Ask, with multiple-choice options, before you:
- change the stack;
- add a dependency that touches money, auth, e-mail or uploads;
- skip or reorder a slice;
- build something no document covers that affects money, allergens, legal text, privacy or what a customer is told;
- change any visible copy that the docs or Figma define.

If two documents contradict each other, follow the precedence. Log it in `DEVIATIONS.md`, and mention it in the report.

## 10. Owner and launch facts

- Owner decisions are dated in the docs (“Decided 2026-10-21”). Never overrule one.
- Things only Linda can supply are listed in SITE-FLOWS §14.1: accounts, Google approval, hygiene rating, ADR, legal approval, content. They are tracked outside the code. **Do not block on them.** Use test modes, and leave clear configuration points.
- The launch checklist is the last phase of the plan. Nothing goes live without Bohoka’s explicit “indulhat”.
