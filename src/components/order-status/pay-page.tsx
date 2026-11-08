"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Link } from "@/components/ui/link";
import { Notice } from "@/components/ui/notice";
import { formatPrice } from "@/lib/money";
import { ChangePayment } from "./change-payment";
import change from "./change.module.css";
import styles from "./delivery.module.css";

type Prepared =
  | { kind: "pay"; clientSecret: string; amountPence: number; linkId: number }
  | { kind: "paid" }
  | { kind: "gone" }
  | { kind: "failed" };

/**
 * M · Pay for your cake (§6.9; 1598:10573, phone 1598:10598): the rows by purpose, Stripe's card field and Pay £…; then
 * “Paid — thank you.” on the same address (“Already paid” when opened again), or “no longer needed”. Card data goes to
 * Stripe only (CLAUDE.md rule 4).
 */
export function PayPage({
  token,
  number,
  statusHref,
  state,
  justPaid,
  paidText,
  rows,
  amountPence,
  what,
  phone,
  publishableKey,
  pay,
  finish,
}: {
  token: string;
  number: string;
  statusHref: string;
  state: "open" | "paid" | "gone";
  justPaid: boolean;
  paidText: string;
  rows: [string, string][];
  amountPence: number;
  what: string;
  phone: string;
  publishableKey: string;
  pay: () => Promise<Prepared>;
  finish: () => Promise<"paid" | "processing" | "failed">;
}) {
  const router = useRouter();
  const tel = `tel:${phone.replace(/[^\d+]/g, "")}`;
  const title = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => title.current?.focus(), [state]);
  const base = `/pay/${token}`;
  const head = (text: string) => (
    <h1 ref={title} tabIndex={-1} className={change.title}>
      {text}
    </h1>
  );

  if (state === "paid")
    return (
      <div className={change.page}>
        {head("Pay for your cake")}
        <Notice icon title={justPaid ? "Paid — thank you." : "Already paid"}>
          <p>{paidText}</p>
        </Notice>
        <div className={change.buttons}>
          <ButtonLink href={statusHref}>See your order →</ButtonLink>
        </div>
      </div>
    );

  if (state === "gone")
    return (
      <div className={change.page}>
        {head("Pay for your cake")}
        <Notice icon title="This payment link is no longer needed.">
          <p>
            Nothing has been taken. Questions? Call{" "}
            <a href={tel} className={styles.noticeLink}>
              {phone}
            </a>
            .
          </p>
        </Notice>
      </div>
    );

  return (
    <div className={change.page}>
      {head("Pay for your cake")}
      <section className={change.panel} aria-labelledby="pay-order">
        <h2 id="pay-order" className={change.label}>
          Order {number}
        </h2>
        <dl className={styles.payRows}>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <ChangePayment
        amountPence={amountPence}
        what={what}
        label="Card details"
        button={`Pay ${formatPrice(amountPence)}`}
        publishableKey={publishableKey}
        prepare={async () => {
          const r = await pay();
          if (r.kind === "pay")
            return {
              kind: "pay",
              clientSecret: r.clientSecret,
              changeId: r.linkId,
              amountPence: r.amountPence,
            };
          if (r.kind === "paid" || r.kind === "gone") router.refresh();
          else setError("Nothing was taken. Please try again.");
          return { kind: "error", outcome: null, errors: {} };
        }}
        finish={async () => {
          const r = await finish();
          if (r === "paid") router.replace(`${base}?paid=1`);
          return r === "paid" ? "saved" : r;
        }}
        returnUrl={() => `${location.origin}${base}?paid=1`}
        onRefused={() => {}}
      />
      <FieldError id="pay-error" message={error} />
      <p className={styles.foot}>
        <Link href={tel}>Prefer to talk? Call Linda on {phone}</Link>
      </p>
    </div>
  );
}
