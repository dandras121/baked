import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { connect, databaseUrl } from "@/db/client";
import {
  DRAFT_COOKIE,
  draftLineViews,
  lastAdded,
  liveDraft,
  type LineView,
} from "@/db/draft-repo";
import { capacityFor, liveHold } from "@/db/hold-repo";
import { getSiteSettings } from "@/db/site-settings";
import {
  buildCalendar,
  calendarCaption,
  canHold,
  nearestDates,
  type CapacityInput,
} from "@/lib/capacity";
import { allowedStep, STEP_TITLES, stepPath, STEPS } from "@/lib/checkout";
import {
  barLine,
  handoverCharge,
  handoverRow,
  type Handover,
} from "@/lib/handover";
import { holdMinutes, MAX_EXTENSIONS } from "@/lib/hold";
import { formatLongDate } from "@/lib/london-time";
import { formatPrice } from "@/lib/money";
import type { Settings } from "@/lib/settings";
import { allergenLabel } from "@/lib/cakes";
import { detailsDone, kitchenHelper } from "@/lib/details";
import { beforeYouPay, reviewHandoverLine } from "@/lib/review";
import { confirmationState } from "@/db/confirm-repo";
import {
  ensurePaymentIntent,
  settleLock,
  unlockDraft,
  type LockState,
} from "@/db/payment-repo";
import { Notice } from "@/components/ui/notice";
import { PAY_COPY } from "@/lib/pay-copy";
import { gateway, PUBLISHABLE_KEY } from "@/lib/payments";
import { DetailsForm } from "./details-form";
import { ReviewStep } from "./review-step";
import { HoldLine } from "./hold-line";
import { WhenCalendar } from "./when-calendar";
import styles from "./checkout.module.css";
import { OrderSummary, orderTotal } from "./order-summary";
import { StepBody } from "./step-motion";
import { Stepper } from "./stepper";
import { SummaryBar } from "./summary-bar";

type Key = "when" | "details" | "pay";

const BACK: Record<Key, { label: string; href: (cake: string) => string }> = {
  when: { label: "← Back to the cake", href: (cake) => cake },
  details: { label: "← Back to when & where", href: () => stepPath("when") },
  pay: { label: "← Back to your details", href: () => stepPath("details") },
};

/** What a step builds in its own slice (4.1 makes the frame around it). */

type Draft = NonNullable<Awaited<ReturnType<typeof liveDraft>>>;

async function readDraft(): Promise<
  | "confirmed"
  | {
      draft: Draft;
      lines: LineView[];
      cap: CapacityInput;
      lock: LockState;
    }
  | null
> {
  // A per-visit render: nothing here may be prerendered (the database client draws random values).
  await connection();
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const found = await liveDraft(db, id, new Date(), true);
    if (!found) {
      // Back to a step after paying: the confirmation (§5.6).
      if ((await confirmationState(db, id, null)) === "confirmed")
        return "confirmed";
      return null;
    }
    // A draft being paid (§5.5): the PaymentIntent decides what this visit shows.
    const gw = gateway();
    const lock: LockState =
      found.status === "pending"
        ? gw
          ? await settleLock(db, found, gw)
          : (await unlockDraft(db, found.id), { kind: "open" as const })
        : { kind: "open" };
    const draft =
      lock.kind === "open" && found.status === "pending"
        ? { ...found, status: "draft" }
        : found;
    return {
      lock,
      draft,
      lines: await draftLineViews(db, draft.id),
      cap: await capacityFor(db, draft),
    };
  } finally {
    await close();
  }
}

/**
 * A checkout step (§5.2–5.4; desktop 637:3135 / 639:3270 / 641:3382, phone 828:6108 …): the stepper, the heading
 * band, the ← back link, the step's form, and on desktop and tablet the order summary column. Opening a step: no
 * draft → /cakes (src/proxy.ts); 0 cakes → “There is nothing in your order”; a later step before an earlier one is
 * complete → the first incomplete step (§10.2).
 */
export async function CheckoutStep({ step }: { step: Key }) {
  const found = await readDraft();
  if (found === "confirmed") redirect("/order/confirmed");
  if (!found) redirect("/cakes");
  const { draft, lines, cap, lock } = found;
  // Paid (or the bank is still processing it): the confirmation page (§5.5 Refresh / reopen while paying).
  if (lock.kind === "paid") redirect("/order/confirmed");
  // Waiting for the bank check: only step 4 can finish it.
  if (lock.kind === "needs-bank-check" && step !== "pay")
    redirect("/order/pay");
  if (lines.length === 0) return <EmptyOrder />;
  // Step 2 is done once a date was held and the handover saved (step 3's details join in 4.3). A hold that ran out
  // still counts: steps 3–4 show “your minutes are up” with chips rather than sending the customer back (§5.5).
  const allowed = allowedStep(step, {
    cakes: lines.length,
    whenDone: draft.holdDate !== null && draft.handover !== null,
    detailsDone: detailsDone(draft),
  });
  if (allowed !== step) redirect(stepPath(allowed));
  const now = new Date();
  const hold = liveHold(draft, now);
  const long = (d: string) => formatLongDate(d, cap.today);
  const minutes = holdMinutes();
  const settings = await getSiteSettings();
  const charge = handoverCharge(
    draft.handover,
    settings?.deliveryChargePence ?? 0,
  );
  const handover = draft.handover
    ? handoverRow(draft.handover as Handover, draft.deliveryWindow, charge)
    : null;
  // Step 4 creates (once) or updates the draft's PaymentIntent (§5.5); none while payments are switched off.
  const payment =
    step === "pay"
      ? await paymentFor(draft.id)
      : { clientSecret: null, publishableKey: "" };
  const summary = (panel: boolean) => (
    <OrderSummary
      lines={lines}
      step={step}
      date={hold ? long(hold.date) : null}
      handover={handover}
      chargePence={charge}
      panel={panel}
    />
  );

  const last = lastAdded(lines)!;
  const cakeHref = `/cakes/${last.slug}?line=${last.id}&from=${step}`;
  const n = STEPS.find((s) => s.key === step)!.n;
  const paused = lock.kind === "paying-elsewhere";
  return (
    <div className={styles.page}>
      <Stepper current={n} cakeHref={cakeHref} />
      {lock.kind === "paying-elsewhere" && (
        <div className={styles.lockNotice}>
          <Notice title={PAY_COPY.anotherTab} urgent />
        </div>
      )}
      <div className={styles.band}>
        <h1 className={styles.title} tabIndex={-1} data-step-heading>
          {STEP_TITLES[step]}
        </h1>
      </div>
      {/* Being paid in another tab (§5.5): every field and button that changes the order is off until it ends. */}
      <PauseScope paused={paused}>
        <div className={styles.body} data-step={step}>
          <StepBody step={n} className={styles.main}>
            <Link href={BACK[step].href(cakeHref)} className={styles.back}>
              {BACK[step].label}
            </Link>
            {step === "when" ? (
              <WhenStep
                cap={cap}
                long={long}
                minutes={minutes}
                settings={settings}
                draft={draft}
              />
            ) : (
              <HoldLine
                dateLabel={long(draft.holdDate!)}
                expiresAt={hold ? hold.expiresAt.toISOString() : null}
                serverLeft={hold ? hold.expiresAt.getTime() - now.getTime() : 0}
                canKeep={
                  !!hold &&
                  hold.extensions < MAX_EXTENSIONS &&
                  canHold(hold.date, { ...cap, ownHold: null })
                }
                minutes={minutes}
                step={step}
                chips={ranOutChips(draft.holdDate!, cap)}
              />
            )}
            {step === "details" && (
              <DetailsForm
                initial={{
                  name: draft.customerName ?? "",
                  email: draft.email ?? "",
                  phone: draft.phone ?? "",
                  cakeFor: draft.cakeFor ?? "",
                  note: draft.allergyNote ?? "",
                }}
                contains={lines.map((l) => l.contains)}
                kitchenHelper={kitchenHelper(
                  (settings?.kitchenHandles ?? []).map((a) =>
                    allergenLabel(a, { allergens: [] }),
                  ),
                )}
              />
            )}
            {step === "pay" && (
              <ReviewStep
                payment={payment}
                pay={{
                  holdExpiresAt: hold ? hold.expiresAt.toISOString() : null,
                  dateLabel: long(draft.holdDate!),
                  phone: settings?.phone ?? null,
                  pausedHere: paused,
                  bankCheckSecret:
                    lock.kind === "needs-bank-check" ? lock.clientSecret : null,
                }}
                lines={lines}
                handover={reviewHandoverLine({
                  handover: (draft.handover ?? "collection") as Handover,
                  window: draft.deliveryWindow,
                  dateLabel: long(draft.holdDate!),
                  chargePence: charge,
                })}
                totalPence={orderTotal(lines, charge)}
                details={{
                  name: draft.customerName ?? "",
                  email: draft.email ?? "",
                  phone: draft.phone ?? "",
                  address:
                    draft.handover === "delivery"
                      ? [
                          draft.address ?? "",
                          `${draft.town ?? ""} ${draft.postcode ?? ""}`.trim(),
                        ]
                      : null,
                }}
                beforeYouPay={beforeYouPay({
                  // At checkout the earliest date the order has had is the chosen one (§10.1).
                  earliest: draft.holdDate!,
                  date: draft.holdDate!,
                  today: cap.today,
                  kitchenOthers: (settings?.kitchenHandles ?? [])
                    .filter(
                      (a) => !lines.some((l) => l.allergenKeys.includes(a)),
                    )
                    .map((a) => allergenLabel(a, { allergens: [] })),
                })}
              />
            )}
          </StepBody>
          {step !== "pay" && summary(false)}
        </div>
        {step !== "pay" && (
          <SummaryBar
            total={formatPrice(orderTotal(lines, charge))}
            line={barLine(
              lines.length,
              draft.handover,
              settings?.deliveryChargePence ?? 0,
            )}
            expiresAt={hold ? hold.expiresAt.toISOString() : null}
            form="step-form"
          >
            {summary(true)}
          </SummaryBar>
        )}
      </PauseScope>
    </div>
  );
}

/**
 * Only while another tab is paying: a disabled fieldset turns off every field and button inside it. Otherwise no
 * wrapper at all — a layout-free fieldset around the steps left hover trails in Chrome on Windows (Bohoka 2026-11-04).
 */
function PauseScope({
  paused,
  children,
}: {
  paused: boolean;
  children: React.ReactNode;
}) {
  if (!paused) return children;
  return (
    <fieldset className={styles.pauseScope} disabled data-paused>
      {children}
    </fieldset>
  );
}

async function paymentFor(
  draftId: string,
): Promise<{ clientSecret: string | null; publishableKey: string }> {
  const gw = gateway();
  if (!gw || !databaseUrl()) return { clientSecret: null, publishableKey: "" };
  const { db, close } = connect();
  try {
    const intent = await ensurePaymentIntent(db, draftId, gw);
    return {
      clientSecret: intent.clientSecret,
      publishableKey: PUBLISHABLE_KEY(),
    };
  } finally {
    await close();
  }
}

/** “There is nothing in your order” (1096:9106 · C): the last cake was removed. */
function EmptyOrder() {
  return (
    <div className={styles.page}>
      <section className={styles.empty} aria-labelledby="empty-heading">
        <h1
          id="empty-heading"
          className={styles.emptyTitle}
          tabIndex={-1}
          data-step-heading
        >
          There is nothing in your order
        </h1>
        <p className={styles.emptyText}>
          Nothing was charged, and your details are still here if you come back.
        </p>
        <div className={styles.emptyActions}>
          <ButtonLink href="/cakes">Back to the designs →</ButtonLink>
          <ButtonLink href="/bespoke" variant="outline">
            Start a bespoke enquiry
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

/** G's chips: the same date first if it is still free, then the nearest free dates (§5.5 Hold ran out). */
function ranOutChips(date: string, cap: CapacityInput): string[] {
  const free = { ...cap, ownHold: null };
  const same = canHold(date, free) ? [date] : [];
  return [...same, ...nearestDates(date, free, 3 - same.length)].slice(0, 3);
}

function WhenStep({
  cap,
  long,
  minutes,
  settings,
  draft,
}: {
  cap: CapacityInput;
  long: (d: string) => string;
  minutes: number;
  settings: Settings | null;
  draft: Draft;
}) {
  const { months, start } = buildCalendar(cap);
  const longDates = Object.fromEntries(
    months.flatMap((m) => m.days.map((d) => [d.date, long(d.date)])),
  );
  return (
    <WhenCalendar
      months={months}
      start={start}
      initial={cap.ownHold}
      longDates={longDates}
      minutes={minutes}
      caption={calendarCaption(cap.leadTimeDays)}
      phone={settings?.phone ?? null}
      handover={{
        handover: draft.handover ?? "",
        address: draft.address ?? "",
        town: draft.town ?? "",
        postcode: draft.postcode ?? "",
        window: draft.deliveryWindow ?? "",
      }}
      place={{
        area: settings?.deliveryArea ?? "",
        districts: settings?.postcodeDistricts ?? "",
        chargePence: settings?.deliveryChargePence ?? 0,
        address: settings?.addressLine ?? "",
      }}
    />
  );
}
