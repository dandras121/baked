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
import { allowedStep, STEP_TITLES, stepPath, STEPS } from "@/lib/checkout";
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
const BUILT_IN: Record<Key, string> = { when: "4.2a and 4.2b", details: "4.3", pay: "4.4" };

async function readDraft(): Promise<LineView[] | null> {
  // A per-visit render: nothing here may be prerendered (the database client draws random values).
  await connection();
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const d = await liveDraft(db, id);
    return d ? await draftLineViews(db, d.id) : null;
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
  const lines = await readDraft();
  if (!lines) redirect("/cakes");
  if (lines.length === 0) return <EmptyOrder />;
  // Steps 2 and 3 store nothing yet (4.2a–4.3), so every later step goes back to step 2 for now.
  const allowed = allowedStep(step, { cakes: lines.length, whenDone: false, detailsDone: false });
  if (allowed !== step) redirect(stepPath(allowed));

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
          <p className={styles.stub}>This step is built in slice {BUILT_IN[step]}.</p>
        </div>
        {step !== "pay" && <OrderSummary lines={lines} step={step} date={null} />}
      </div>
    </div>
  );
}

/** “There is nothing in your order” (1096:9106 · C): the last cake was removed. */
function EmptyOrder() {
  return (
    <div className={styles.page}>
      <section className={styles.empty} aria-labelledby="empty-heading">
        <h1 id="empty-heading" className={styles.emptyTitle} tabIndex={-1} data-step-heading>
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
