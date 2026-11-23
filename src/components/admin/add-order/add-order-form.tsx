"use client";

import Link from "next/link";
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
import {
  changeDayInfoAction,
  editOrderAction,
} from "@/app/admin/(shell)/orders/[number]/change/actions";
import { carryLine, takeCarriedLine } from "@/components/admin/carry-line";
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
  refundLine,
  type DayInfo,
  type Refund,
} from "@/lib/admin/add-order";
import own from "@/components/admin/change-order/change-order.module.css";
import { formatAdminMoney } from "@/lib/money";
import { UK_ALLERGENS } from "@/lib/constants";
import { inDistricts, outwardCode, WINDOWS } from "@/lib/handover";
import styles from "./add-order.module.css";

type Errors = Partial<Record<keyof Form, string>>;

/** Edit the order (§9.7): a manual order's own form, filled in; Paid so far is not editable. */
export type EditMode = {
  orderId: number;
  number: string;
  version: number;
  initial: Form;
  paidPence: number;
  owner: boolean;
};
const money = (p: number) => formatAdminMoney(p, "breakdown");
// A Helper changes the date, window, address, inscription and collection time only (Decided D9).
const HELPER_FIELDS: (keyof Form)[] = [
  "date",
  "handover",
  "address",
  "town",
  "postcode",
  "window",
  "collectionTime",
  "inscription",
];

/**
 * Add an order (§9.6; desktop 1607:10612, phone 1607:10782): THE CUSTOMER, THE DAY (with the live count and its calm
 * warnings), THE CAKE, MONEY and Customer emails; Save the order (phone: Save). One manual order = one cake.
 */
export function AddOrderForm({
  today,
  districts,
  direct,
  edit,
}: {
  today: string;
  districts: string;
  /** A Blob store is connected: pictures upload straight to it (§7.1). */
  direct: BlobMode;
  edit?: EditMode;
}) {
  const router = useRouter();
  const start0 = edit?.initial ?? EMPTY_FORM;
  const [f, setF] = useState<Form>(start0);
  const [refund, setRefund] = useState<Refund | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [day, setDay] = useState<DayInfo | null>(null);
  const [line, setLine] = useState<string | null>(takeCarriedLine);
  const [signIn, setSignIn] = useState<"no" | "asking" | "back">("no");
  const [saved, setSaved] = useState(false);
  // Add a sketch or photo (§9.6): bound to this form's key, attached on Save.
  const formKey = useRef("");
  const keyOf = () => (formKey.current ||= crypto.randomUUID());
  const [pictures, setPictures] = useState({ ids: [] as string[], pending: 0 });
  const [busy, start] = useTransition();
  const changed = JSON.stringify(f) !== JSON.stringify(start0);
  const dirty = !saved && changed;
  const locked = (k: keyof Form) =>
    !!edit && !edit.owner && !HELPER_FIELDS.includes(k);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // The live count under the date (§9.6); an edited order's own cake does not count against its new day.
  const editId = edit?.orderId;
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return;
    let live = true;
    (editId ? changeDayInfoAction(editId, f.date) : dayInfoAction(f.date)).then(
      (d) => live && setDay(d),
    );
    return () => {
      live = false;
    };
  }, [f.date, editId]);

  const outside =
    f.handover === "delivery" &&
    f.postcode.trim().length >= 5 &&
    !inDistricts(outwardCode(f.postcode), districts);

  const saveEdit = (e: EditMode, confirmRefund: boolean) =>
    start(async () => {
      setLine(null);
      const r = await editOrderAction(
        e.orderId,
        e.version,
        f,
        confirmRefund,
      ).catch(() => ({ kind: "failed" }) as const);
      if (r.kind !== "confirm-refund") setRefund(null);
      if (r.kind === "saved") {
        setSaved(true);
        router.push(`/admin/orders/${e.number}`);
        router.refresh();
        return;
      }
      if (r.kind === "confirm-refund") return setRefund(r);
      if (r.kind === "signed-out") return setSignIn("asking");
      if (r.kind === "invalid") {
        setErrors(r.errors);
        setLine("Nothing was saved — check the fields marked below.");
        document.getElementById(`f-${Object.keys(r.errors)[0]}`)?.focus();
        return;
      }
      if (r.kind === "conflict") {
        // The new version comes in a fresh form; the line goes with it.
        carryLine(r.line);
        setLine(r.line);
        router.refresh();
        return;
      }
      if (r.kind === "owner-only")
        return setLine(
          `${r.warnings.join(" ")} Only the owner can book a full or closed day — nothing was saved.`,
        );
      if (r.kind === "nothing") return setLine("Nothing has changed yet.");
      if (r.kind === "closed")
        return setLine(
          "This order can no longer be changed — nothing was saved.",
        );
      setLine("Nothing was saved — please try again.");
    });

  const save = () =>
    edit
      ? saveEdit(edit, false)
      : start(async () => {
          setLine(null);
          if (pictures.pending) {
            setLine(
              "A picture is still uploading — nothing was saved. Save again once it shows.",
            );
            return;
          }
          const r = await addOrderAction(
            f,
            pictures.ids.length
              ? { formKey: keyOf(), ids: pictures.ids }
              : null,
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
      disabled={locked(k)}
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
      disabled={locked(k)}
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
      {edit ? (
        <>
          <Link href={`/admin/orders/${edit.number}`} className={own.back}>
            ‹ Back to order
          </Link>
          <h1 className={styles.title}>Edit the order</h1>
          <p className={styles.intro}>
            {edit.number} · {edit.initial.name}
            {!edit.owner &&
              " · You can change the day, the handover, the address, the inscription and the collection time."}
          </p>
        </>
      ) : (
        <>
          <div className={styles.head}>
            <h1 className={styles.title}>Add an order</h1>
            {saveButton}
          </div>
          <p className={styles.intro}>
            For a bespoke cake you have agreed by email. It counts against the
            day’s and the week’s caps, and shows on Today.
          </p>
        </>
      )}
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
                disabled={locked("what")}
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
                  disabled={locked("tiers")}
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
            <fieldset className={styles.pillSet} disabled={locked("allergens")}>
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
                disabled={locked("allergyNote")}
                className={`${styles.input} ${styles.area}`}
                value={f.allergyNote}
                maxLength={400}
                onChange={(e) => set("allergyNote", e.target.value)}
              />,
            )}
            {!edit && (
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
            )}
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
              {edit ? (
                <div className={styles.field}>
                  <p className={styles.label} id="f-paid">
                    Paid so far
                  </p>
                  <p className={styles.paid}>{money(edit.paidPence)}</p>
                </div>
              ) : (
                field(
                  "paid",
                  "Paid so far",
                  text("paid", { inputMode: "decimal" }),
                )
              )}
            </div>
            {!edit &&
              f.paid.trim() &&
              f.paid.trim() !== "0" &&
              pills("method", "Paid by", [
                { value: "cash", label: "Cash" },
                { value: "bank", label: "Bank transfer" },
              ])}
            <p className={styles.hint}>
              {edit
                ? "A higher total raises what is still to pay. Money in goes through Record a payment."
                : "Cash or bank transfer received before saving: type it into “Paid so far”. Later money goes through Record a payment."}
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
      {edit ? (
        <div className={styles.editEnd}>
          <Button
            busy={busy && !refund}
            busyLabel="Saving"
            disabled={!changed}
            onClick={save}
            className={own.button}
          >
            {signIn === "back" ? "Save again" : "Save changes"}
          </Button>
          <Link href={`/admin/orders/${edit.number}`} className={own.discard}>
            Discard changes
          </Link>
        </div>
      ) : (
        <div className={styles.end}>{saveButton}</div>
      )}

      {edit && (
        <Overlay
          open={!!refund}
          onClose={() => setRefund(null)}
          title="Save and refund?"
          classNames={{ body: styles.dialogBody }}
        >
          {refund && (
            <>
              <p className={styles.hint}>{refundLine(refund, f.name)}</p>
              <div className={own.buttons}>
                <Button
                  busy={busy}
                  busyLabel="Saving"
                  onClick={() => saveEdit(edit, true)}
                  className={own.button}
                >
                  Save and refund
                </Button>
                <Button variant="secondary" onClick={() => setRefund(null)}>
                  Keep editing
                </Button>
              </div>
            </>
          )}
        </Overlay>
      )}

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
