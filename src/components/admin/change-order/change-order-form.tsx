"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import {
  changeDayInfoAction,
  changeOrderAction,
} from "@/app/admin/(shell)/orders/[number]/change/actions";
import styles from "@/components/admin/add-order/add-order.module.css";
import { LeaveGuard } from "@/components/admin/leave-guard";
import { SignInAgain } from "@/components/admin/order/sign-in-again";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Overlay } from "@/components/ui/overlay";
import { dayLine, dayWarnings, type DayInfo } from "@/lib/admin/add-order";
import {
  newCharge,
  PRICE_NOTE,
  type ChangeForm,
} from "@/lib/admin/change-order";
import { inDistricts, outwardCode, WINDOWS } from "@/lib/handover";
import { formatAdminMoney, formatDifference } from "@/lib/money";
import own from "./change-order.module.css";

type Errors = Partial<Record<keyof ChangeForm, string>>;
const money = (p: number) => formatAdminMoney(p, "breakdown");

/**
 * Change the order (§9.7; 1250:9221, phone 1251:9261) — 8.6a: the order's own fields. WHAT'S CHANGING (date, window,
 * handover, address or collection time; the customer's name, e-mail and phone), PRICE IMPACT for the Owner, Save
 * changes (disabled until something changes) · Discard changes.
 */
export function ChangeOrderForm({
  orderId,
  number,
  version,
  initial,
  owner,
  today,
  districts,
  money: m,
}: {
  orderId: number;
  number: string;
  version: number;
  initial: ChangeForm;
  owner: boolean;
  today: string;
  districts: string;
  money: {
    totalPence: number;
    chargePence: number;
    chargeNowPence: number;
    paidPence: number;
    handover: string;
  };
}) {
  const router = useRouter();
  const [f, setF] = useState<ChangeForm>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [day, setDay] = useState<DayInfo | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [signIn, setSignIn] = useState<"no" | "asking" | "back">("no");
  const [done, setDone] = useState(false);
  const [busy, start] = useTransition();
  const changed =
    JSON.stringify({ ...f, customerAsked: false }) !==
    JSON.stringify({ ...initial, customerAsked: false });
  const first = initial.name.trim().split(/\s+/)[0] || "the customer";
  const set = <K extends keyof ChangeForm>(k: K, v: ChangeForm[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || f.date === initial.date) return;
    let live = true;
    changeDayInfoAction(orderId, f.date).then((d) => live && setDay(d));
    return () => {
      live = false;
    };
  }, [f.date, initial.date, orderId]);
  const moved = f.date !== initial.date;
  const later = moved && f.date > initial.date;
  const warnings = moved && day ? dayWarnings(day) : [];
  const newTotal =
    m.totalPence -
    m.chargePence +
    newCharge(
      { handover: m.handover, deliveryChargePence: m.chargePence },
      f.handover,
      m.chargeNowPence,
    );
  const outside =
    f.handover === "delivery" &&
    f.postcode.trim().length >= 5 &&
    !inDistricts(outwardCode(f.postcode), districts);

  const save = () =>
    start(async () => {
      setLine(null);
      const r = await changeOrderAction(orderId, version, f).catch(
        () => ({ kind: "failed" }) as const,
      );
      if (r.kind === "saved") {
        setDone(true);
        router.push(`/admin/orders/${number}`);
        return;
      }
      if (r.kind === "signed-out") return setSignIn("asking");
      if (r.kind === "invalid") {
        setErrors(r.errors);
        return setLine("Nothing was saved — check the fields marked below.");
      }
      if (r.kind === "conflict") {
        router.refresh();
        return setLine(r.line);
      }
      if (r.kind === "owner-only")
        return setLine(
          `${r.warnings.join(" ")} Only the owner can book a full or closed day — nothing was saved.`,
        );
      if (r.kind === "needs-link")
        return setLine(
          `This raises a fully paid order by ${money(r.pence)} — a change like this waits for a payment link, which comes with the next step. Nothing was saved.`,
        );
      if (r.kind === "nothing") return setLine("Nothing has changed yet.");
      if (r.kind === "closed")
        return setLine(
          "This order can no longer be changed — nothing was saved.",
        );
      setLine("Nothing was saved — please try again.");
    });

  const field = (
    k: keyof ChangeForm,
    label: string,
    input: ReactNode,
    hint?: ReactNode,
  ) => (
    <div className={styles.field}>
      <label htmlFor={`c-${k}`} className={styles.label}>
        {label}
      </label>
      {input}
      {hint && <p className={styles.hint}>{hint}</p>}
      <FieldError id={`c-${k}-error`} message={errors[k] ?? null} />
    </div>
  );
  const text = (
    k: keyof ChangeForm,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <input
      id={`c-${k}`}
      className={styles.input}
      value={f[k] as string}
      aria-invalid={!!errors[k] || undefined}
      aria-describedby={errors[k] ? `c-${k}-error` : undefined}
      onChange={(e) => set(k, e.target.value as never)}
      {...extra}
    />
  );

  const buttons = (
    <div className={own.buttons}>
      <Button
        busy={busy}
        busyLabel="Saving"
        disabled={!changed}
        onClick={save}
        className={own.button}
      >
        {signIn === "back" ? "Save again" : "Save changes"}
      </Button>
      <Link href={`/admin/orders/${number}`} className={`${own.discard}`}>
        Discard changes
      </Link>
    </div>
  );

  return (
    <form
      className={styles.page}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (changed) save();
      }}
    >
      <LeaveGuard dirty={changed && !done} />
      <Link href={`/admin/orders/${number}`} className={own.back}>
        ‹ Back to order
      </Link>
      <h1 className={styles.title}>Change the order</h1>
      <p className={styles.intro}>
        {number} · {initial.name}
      </p>
      {line && (
        <p className={styles.alert} role="alert">
          {line}
        </p>
      )}

      <div className={styles.columns}>
        <section className={styles.card} aria-labelledby="changing-h">
          <h2 id="changing-h" className={styles.section}>
            What’s changing
          </h2>
          <div className={styles.pair}>
            {field(
              "date",
              "Date",
              text("date", { type: "date" }),
              moved && day ? (
                <>
                  {dayLine(day)}.
                  {warnings.map((w) => (
                    <span key={w} className={styles.warning}>
                      {w}
                      {owner
                        ? ""
                        : " Only the owner can book a full or closed day."}
                    </span>
                  ))}
                </>
              ) : null,
            )}
            {f.handover === "delivery"
              ? field(
                  "window",
                  "Window",
                  <select
                    id="c-window"
                    className={styles.input}
                    value={f.window}
                    onChange={(e) => set("window", e.target.value)}
                  >
                    {!f.window && <option value="">Pick a window</option>}
                    {WINDOWS.map((w) => (
                      <option key={w.key} value={w.key}>
                        {w.name} {w.times.replace(" – ", "–")}
                      </option>
                    ))}
                  </select>,
                )
              : field(
                  "collectionTime",
                  "Collection time",
                  text("collectionTime", {
                    maxLength: 40,
                    placeholder: "Agreed with Linda",
                  }),
                )}
          </div>
          {later && (
            <label className={own.tick}>
              <input
                type="checkbox"
                checked={f.customerAsked}
                onChange={(e) => set("customerAsked", e.target.checked)}
              />
              The customer asked for this
              <span className={styles.hint}>
                Unticked, the refund counts from the new date, so {first} loses
                nothing by the move.
              </span>
            </label>
          )}
          <fieldset className={styles.pillSet}>
            <legend className={styles.label}>Handover</legend>
            <div className={styles.pills}>
              {(["delivery", "collection"] as const).map((h) => (
                <label key={h} className={styles.pill}>
                  <input
                    type="radio"
                    name="handover"
                    checked={f.handover === h}
                    onChange={() => set("handover", h)}
                  />
                  <span>{h === "delivery" ? "Delivery" : "Collection"}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {f.handover === "delivery" && (
            <>
              {field("address", "Delivery address", text("address"))}
              <div className={styles.pair}>
                {field("town", "Town", text("town"))}
                {field(
                  "postcode",
                  "Postcode",
                  text("postcode", { maxLength: 8 }),
                  outside
                    ? "Outside your delivery area — you can still save."
                    : null,
                )}
              </div>
            </>
          )}
          <h2 className={styles.section}>The customer</h2>
          <div className={styles.pair}>
            {field("name", "Name", text("name", { maxLength: 80 }))}
            {field("phone", "Phone", text("phone", { type: "tel" }))}
          </div>
          {field(
            "email",
            "Email",
            text("email", { type: "email" }),
            "Name, e-mail and phone alone send no e-mail.",
          )}
        </section>

        <section className={styles.card} aria-labelledby="impact-h">
          {owner ? (
            <>
              <h2 id="impact-h" className={styles.section}>
                Price impact
              </h2>
              <dl className={own.impact}>
                <div>
                  <dt>Current total</dt>
                  <dd>{money(m.totalPence)}</dd>
                </div>
                <div>
                  <dt>New total</dt>
                  <dd>{money(newTotal)}</dd>
                </div>
                <div>
                  <dt>Difference</dt>
                  <dd className={own.diff}>
                    {newTotal === m.totalPence
                      ? "£0.00"
                      : formatDifference(newTotal - m.totalPence)}
                  </dd>
                </div>
              </dl>
              <p className={styles.hint}>{PRICE_NOTE}</p>
            </>
          ) : (
            <h2 id="impact-h" className={styles.section}>
              Save
            </h2>
          )}
          {buttons}
          <p className={styles.hint}>
            Saving sends {first} e-mail 12 with old → new.
            {owner
              ? " If the total goes up on a paid order, nothing changes until it is paid."
              : ""}
          </p>
        </section>
      </div>

      <Overlay
        open={signIn === "asking"}
        onClose={() => setSignIn("no")}
        title="Sign in again"
        classNames={{ body: styles.dialogBody }}
      >
        <SignInAgain onDone={() => setSignIn("back")} />
      </Overlay>
    </form>
  );
}
