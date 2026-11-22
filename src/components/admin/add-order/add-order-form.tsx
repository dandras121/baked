"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  addOrderAction,
  dayInfoAction,
} from "@/app/admin/(shell)/orders/new/actions";
import { LeaveGuard } from "@/components/admin/leave-guard";
import { SignInAgain } from "@/components/admin/order/sign-in-again";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Overlay } from "@/components/ui/overlay";
import { PictureTiles } from "@/components/uploads/picture-tiles";
import type { BlobMode } from "@/lib/storage";
import {
  dayLine,
  dayWarnings,
  EMPTY_FORM,
  emailHint,
  TIERS,
  type AddOrderForm as Form,
  type DayInfo,
} from "@/lib/admin/add-order";
import { UK_ALLERGENS } from "@/lib/constants";
import { inDistricts, outwardCode, WINDOWS } from "@/lib/handover";
import styles from "./add-order.module.css";

type Errors = Partial<Record<keyof Form, string>>;

/**
 * Add an order (§9.6; desktop 1607:10612, phone 1607:10782): THE CUSTOMER, THE DAY (with the live count and its calm
 * warnings), THE CAKE, MONEY and Customer emails; Save the order (phone: Save). One manual order = one cake.
 */
export function AddOrderForm({
  today,
  districts,
  direct,
}: {
  today: string;
  districts: string;
  /** A Blob store is connected: pictures upload straight to it (§7.1). */
  direct: BlobMode;
}) {
  const router = useRouter();
  const [f, setF] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [day, setDay] = useState<DayInfo | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [signIn, setSignIn] = useState<"no" | "asking" | "back">("no");
  const [saved, setSaved] = useState(false);
  // Add a sketch or photo (§9.6): bound to this form's key, attached on Save.
  const formKey = useRef("");
  const keyOf = () => (formKey.current ||= crypto.randomUUID());
  const [pictures, setPictures] = useState({ ids: [] as string[], pending: 0 });
  const [busy, start] = useTransition();
  const dirty = !saved && JSON.stringify(f) !== JSON.stringify(EMPTY_FORM);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // The live count under the date (§9.6).
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return;
    let live = true;
    dayInfoAction(f.date).then((d) => live && setDay(d));
    return () => {
      live = false;
    };
  }, [f.date]);

  const outside =
    f.handover === "delivery" &&
    f.postcode.trim().length >= 5 &&
    !inDistricts(outwardCode(f.postcode), districts);

  const save = () =>
    start(async () => {
      setLine(null);
      if (pictures.pending) {
        setLine(
          "A picture is still uploading — nothing was saved. Save again once it shows.",
        );
        return;
      }
      const r = await addOrderAction(
        f,
        pictures.ids.length ? { formKey: keyOf(), ids: pictures.ids } : null,
      ).catch(() => ({ kind: "failed" }) as const);
      if (r.kind === "saved") {
        setSaved(true);
        router.push(`/admin/orders/${r.number}?saved=1`);
        return;
      }
      if (r.kind === "signed-out") return setSignIn("asking");
      if (r.kind === "invalid") {
        setErrors(r.errors);
        setLine("Nothing was saved — check the fields marked below.");
        const first = Object.keys(r.errors)[0];
        document.getElementById(`f-${first}`)?.focus();
        return;
      }
      setLine("Nothing was saved — please try again.");
    });

  const field = (
    k: keyof Form,
    label: string,
    input: ReactNode,
    hint?: ReactNode,
  ) => (
    <div className={styles.field}>
      <label htmlFor={`f-${k}`} className={styles.label}>
        {label}
      </label>
      {input}
      {hint && <p className={styles.hint}>{hint}</p>}
      <FieldError id={`f-${k}-error`} message={errors[k] ?? null} />
    </div>
  );
  const text = (
    k: keyof Form,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <input
      id={`f-${k}`}
      className={styles.input}
      value={f[k] as string}
      aria-invalid={!!errors[k] || undefined}
      aria-describedby={errors[k] ? `f-${k}-error` : undefined}
      onChange={(e) => set(k, e.target.value as never)}
      {...extra}
    />
  );
  const pills = <K extends "handover" | "window" | "emails" | "method">(
    k: K,
    legend: string,
    options: { value: string; label: string }[],
  ) => (
    <fieldset
      className={styles.pillSet}
      aria-describedby={errors[k] ? `f-${k}-error` : undefined}
    >
      <legend className={styles.label}>{legend}</legend>
      <div className={styles.pills}>
        {options.map((o, i) => (
          <label key={o.value} className={styles.pill}>
            <input
              id={i === 0 ? `f-${k}` : undefined}
              type="radio"
              name={k}
              checked={f[k] === o.value}
              onChange={() => set(k, o.value as Form[K])}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <FieldError id={`f-${k}-error`} message={errors[k] ?? null} />
    </fieldset>
  );

  const saveButton = (
    <Button
      className={styles.save}
      busy={busy}
      busyLabel="Saving"
      onClick={save}
    >
      {signIn === "back" ? (
        "Save again"
      ) : (
        <>
          <span className={styles.wide}>Save the order</span>
          <span className={styles.narrow}>Save</span>
        </>
      )}
    </Button>
  );

  return (
    <form
      className={styles.page}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <LeaveGuard dirty={dirty} />
      <div className={styles.head}>
        <h1 className={styles.title}>Add an order</h1>
        {saveButton}
      </div>
      <p className={styles.intro}>
        For a bespoke cake you have agreed by email. It counts against the day’s
        and the week’s caps, and shows on Today.
      </p>
      {line && (
        <p className={styles.alert} role="alert">
          {line}
        </p>
      )}
      {signIn === "back" && (
        <p className={styles.hint}>Signed in again — press Save again.</p>
      )}

      <div className={styles.columns}>
        <section className={styles.card} aria-labelledby="customer-h">
          <h2 id="customer-h" className={styles.section}>
            The customer
          </h2>
          <div className={styles.pair}>
            {field(
              "name",
              "Name",
              text("name", { autoComplete: "off", maxLength: 80 }),
            )}
            {field(
              "phone",
              "Phone",
              text("phone", {
                type: "tel",
                inputMode: "tel",
                autoComplete: "off",
              }),
              f.handover === "collection" || f.emails === "off"
                ? "Needed for this order."
                : "Optional.",
            )}
          </div>
          {field(
            "email",
            "Email",
            text("email", { type: "email", autoComplete: "off" }),
            emailHint(f.name),
          )}

          <h2 className={styles.section}>The day</h2>
          {field(
            "date",
            "Date",
            text("date", {
              type: "date",
              min: today,
              className: `${styles.input} ${styles.short}`,
            }),
            day ? (
              <>
                {dayLine(day)}. Counts as one cake against both caps.
                {dayWarnings(day).map((w) => (
                  <span key={w} className={styles.warning}>
                    {w}
                  </span>
                ))}
              </>
            ) : null,
          )}
          {pills("handover", "Handover", [
            { value: "delivery", label: "Delivery" },
            { value: "collection", label: "Collection" },
          ])}
          {f.handover === "delivery" ? (
            <>
              {field(
                "address",
                "Address",
                text("address", { autoComplete: "off" }),
              )}
              <div className={styles.pair}>
                {field("town", "Town", text("town", { autoComplete: "off" }))}
                {field(
                  "postcode",
                  "Postcode",
                  text("postcode", { autoComplete: "off", maxLength: 8 }),
                  outside
                    ? "Outside your delivery area — you can still save."
                    : null,
                )}
              </div>
              {pills(
                "window",
                "Window",
                WINDOWS.map((w) => ({
                  value: w.key,
                  label: `${w.name} ${w.times.replace(/am|pm/g, "").replace(" – ", "–")}`,
                })),
              )}
            </>
          ) : (
            field(
              "collectionTime",
              "Collection time",
              text("collectionTime", {
                maxLength: 40,
                placeholder: "Agreed with Linda",
              }),
              "Optional — shows on Today, in the collection text and on their order page.",
            )
          )}
        </section>

        <div className={styles.side}>
          <section className={styles.card} aria-labelledby="cake-h">
            <h2 id="cake-h" className={styles.section}>
              The cake
            </h2>
            {field(
              "what",
              "What it is",
              <textarea
                id="f-what"
                className={`${styles.input} ${styles.area}`}
                value={f.what}
                maxLength={300}
                aria-invalid={!!errors.what || undefined}
                aria-describedby={errors.what ? "f-what-error" : undefined}
                onChange={(e) => set("what", e.target.value)}
              />,
            )}
            <div className={styles.pair}>
              {field(
                "serves",
                "Serves",
                text("serves", { inputMode: "numeric", maxLength: 3 }),
              )}
              {field(
                "tiers",
                "Tiers",
                <select
                  id="f-tiers"
                  className={styles.input}
                  value={f.tiers}
                  onChange={(e) => set("tiers", e.target.value)}
                >
                  {TIERS.map((t, i) => (
                    <option key={t} value={String(i + 1)}>
                      {t}
                    </option>
                  ))}
                </select>,
              )}
            </div>
            {field(
              "inscription",
              "Inscription",
              text("inscription", { maxLength: 24 }),
              "Leave empty for none.",
            )}
            <fieldset className={styles.pillSet}>
              <legend className={styles.label}>Allergens in this cake</legend>
              <div className={styles.ticks}>
                {UK_ALLERGENS.map((a) => (
                  <label key={a} className={styles.tick}>
                    <input
                      type="checkbox"
                      checked={f.allergens.includes(a)}
                      onChange={(e) =>
                        set(
                          "allergens",
                          e.target.checked
                            ? [...f.allergens, a]
                            : f.allergens.filter((x) => x !== a),
                        )
                      }
                    />
                    {a[0].toUpperCase() + a.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>
            {field(
              "alsoContains",
              "Also contains",
              text("alsoContains", { maxLength: 100 }),
              "Anything else, as you would say it.",
            )}
            {field(
              "allergyNote",
              "Allergy note",
              <textarea
                id="f-allergyNote"
                className={`${styles.input} ${styles.area}`}
                value={f.allergyNote}
                maxLength={400}
                onChange={(e) => set("allergyNote", e.target.value)}
              />,
            )}
            <fieldset className={styles.pillSet}>
              <legend className={styles.label}>A sketch or photo</legend>
              <PictureTiles
                purpose="order"
                formKey={keyOf}
                direct={direct}
                onChange={setPictures}
              />
              <p className={styles.hint}>
                Up to three. Only you see them — never the customer.
              </p>
            </fieldset>
          </section>

          <section className={styles.card} aria-labelledby="money-h">
            <h2 id="money-h" className={styles.section}>
              Money
            </h2>
            <div className={styles.pair}>
              {field(
                "total",
                "Total",
                text("total", { inputMode: "decimal", placeholder: "£" }),
              )}
              {field(
                "paid",
                "Paid so far",
                text("paid", { inputMode: "decimal" }),
              )}
            </div>
            {f.paid.trim() &&
              f.paid.trim() !== "0" &&
              pills("method", "Paid by", [
                { value: "cash", label: "Cash" },
                { value: "bank", label: "Bank transfer" },
              ])}
            <p className={styles.hint}>
              Cash or bank transfer received before saving: type it into “Paid
              so far”. Later money goes through Record a payment.
            </p>
            {pills("emails", "Customer emails", [
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ])}
            <p className={styles.hint}>
              On: two days before, on the day, changes and a missed delivery.
              The confirmation, payment links and cancellations are always sent.
            </p>
          </section>
        </div>
      </div>
      <div className={styles.end}>{saveButton}</div>

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
