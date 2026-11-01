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
import { holdMinutes, MAX_EXTENSIONS } from "@/lib/hold";
import { formatLongDate } from "@/lib/london-time";
import { HoldLine } from "./hold-line";
import { WhenCalendar } from "./when-calendar";
import styles from "./checkout.module.css";
import { OrderSummary } from "./order-summary";
import { Stepper } from "./stepper";

type Key = "when" | "details" | "pay";

const BACK: Record<Key, { label: string; href: (cake: string) => string }> = {
  when: { label: "← Back to the cake", href: (cake) => cake },
  details: { label: "← Back to when & where", href: () => stepPath("when") },
  pay: { label: "← Back to your details", href: () => stepPath("details") },
};

/** What a step builds in its own slice (4.1 makes the frame around it). */
const BUILT_IN: Record<Key, string> = {
  when: "4.2b",
  details: "4.3",
  pay: "4.4",
};

type Draft = NonNullable<Awaited<ReturnType<typeof liveDraft>>>;

async function readDraft(): Promise<{
  draft: Draft;
  lines: LineView[];
  cap: CapacityInput;
} | null> {
  // A per-visit render: nothing here may be prerendered (the database client draws random values).
  await connection();
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const draft = await liveDraft(db, id);
    if (!draft) return null;
    return {
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
  if (!found) redirect("/cakes");
  const { draft, lines, cap } = found;
  if (lines.length === 0) return <EmptyOrder />;
  // Step 2 is done once a date was held (the handover joins in 4.2b; step 3's details in 4.3). A hold that ran out
  // still counts: steps 3–4 show “your minutes are up” with chips rather than sending the customer back (§5.5).
  const allowed = allowedStep(step, {
    cakes: lines.length,
    whenDone: draft.holdDate !== null,
    detailsDone: false,
  });
  if (allowed !== step) redirect(stepPath(allowed));
  const now = new Date();
  const hold = liveHold(draft, now);
  const long = (d: string) => formatLongDate(d, cap.today);
  const minutes = holdMinutes();

  const last = lastAdded(lines)!;
  const cakeHref = `/cakes/${last.slug}?line=${last.id}&from=${step}`;
  const n = STEPS.find((s) => s.key === step)!.n;
  return (
    <div className={styles.page}>
      <Stepper current={n} cakeHref={cakeHref} />
      <div className={styles.band}>
        <h1 className={styles.title} tabIndex={-1} data-step-heading>
          {STEP_TITLES[step]}
        </h1>
      </div>
      <div className={styles.body}>
        <div className={styles.main} data-step-body>
          <Link href={BACK[step].href(cakeHref)} className={styles.back}>
            {BACK[step].label}
          </Link>
          {step === "when" ? (
            <WhenStep cap={cap} long={long} minutes={minutes} />
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
          <p className={styles.stub}>
            {step === "when" ? "Delivery or collection" : "This step"} is built
            in slice {BUILT_IN[step]}.
          </p>
        </div>
        {step !== "pay" && (
          <OrderSummary
            lines={lines}
            step={step}
            date={hold ? long(hold.date) : null}
          />
        )}
      </div>
    </div>
  );
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

async function WhenStep({
  cap,
  long,
  minutes,
}: {
  cap: CapacityInput;
  long: (d: string) => string;
  minutes: number;
}) {
  const { months, start } = buildCalendar(cap);
  const settings = await getSiteSettings();
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
    />
  );
}
