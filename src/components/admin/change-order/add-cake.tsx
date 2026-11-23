"use client";

import { useState } from "react";
import { OptionBlock } from "@/components/cake-page/option-block";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Overlay } from "@/components/ui/overlay";
import type { AddableCake } from "@/db/admin-change-repo";
import { linePricePence, type Answers } from "@/lib/cake-config";
import { formatPrice } from "@/lib/money";
import {
  inscriptionError,
  INSCRIPTION_MAX,
  optionErrors,
} from "@/lib/order-line";
import styles from "@/components/admin/add-order/add-order.module.css";
import own from "./change-order.module.css";

export type NewCake = {
  slug: string;
  name: string;
  sizeId: number;
  serves: number;
  inscription: string;
  answers: Answers;
  pricePence: number;
};

const EMPTY: Answers = { picks: {}, texts: {} };

/** Add a cake to this order (1801:13154, §9.7): design, size, options, the message; Add it · Not now. */
export function AddCake({
  number,
  designs,
  onAdd,
  className,
}: {
  number: string;
  designs: AddableCake[];
  onAdd: (c: NewCake) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(designs[0]?.slug ?? "");
  const cake = designs.find((d) => d.slug === slug);
  const [sizeId, setSizeId] = useState<number>(cake?.sizes[0]?.id ?? 0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const size = cake?.sizes.find((s) => s.id === sizeId) ?? cake?.sizes[0];
  const pick = (next: string) => {
    const d = designs.find((x) => x.slug === next);
    setSlug(next);
    setSizeId(d?.sizes[0]?.id ?? 0);
    setAnswers(EMPTY);
    setMessage("");
    setError(null);
  };
  const add = () => {
    if (!cake || !size) return;
    const err =
      (cake.offerInscription ? inscriptionError(message) : null) ??
      Object.values(optionErrors(cake.options, answers))[0] ??
      null;
    if (err) return setError(err);
    onAdd({
      slug: cake.slug,
      name: cake.name,
      sizeId: size.id,
      serves: size.serves,
      inscription: cake.offerInscription ? message : "",
      answers,
      pricePence: linePricePence(size, cake.options, answers),
    });
    setOpen(false);
    pick(designs[0]?.slug ?? "");
  };
  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        Add a cake
      </Button>
      <Overlay
        open={open}
        onClose={() => setOpen(false)}
        title="Add a cake to this order"
        description={
          <span className={own.overline}>Change the order · {number}</span>
        }
        classNames={{ body: styles.dialogBody, description: own.words }}
      >
        <div className={styles.field}>
          <label htmlFor="add-design" className={styles.label}>
            Design
          </label>
          <select
            id="add-design"
            className={styles.input}
            value={slug}
            onChange={(e) => pick(e.target.value)}
          >
            {designs.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {cake && (
          <fieldset className={styles.pillSet}>
            <legend className={styles.label}>Size</legend>
            <div className={styles.pills}>
              {cake.sizes.map((s) => (
                <label key={s.id} className={styles.pill}>
                  <input
                    type="radio"
                    name="add-size"
                    checked={size?.id === s.id}
                    onChange={() => setSizeId(s.id)}
                  />
                  <span>
                    Serves {s.serves} · {formatPrice(s.pricePence)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {cake?.options.map((o) => (
          <OptionBlock
            key={o.id}
            option={o}
            answers={answers}
            onChange={setAnswers}
          />
        ))}
        {cake?.offerInscription && (
          <div className={styles.field}>
            <label htmlFor="add-message" className={styles.label}>
              Message on the cake
            </label>
            <input
              id="add-message"
              className={styles.input}
              value={message}
              maxLength={INSCRIPTION_MAX + 10}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        )}
        <FieldError id="add-cake-error" message={error} />
        <p className={styles.hint}>
          Up to 5 cakes per order; a full day shows the usual warning. Every
          cake but the last has a Remove link in Change the order — to remove
          the last one, cancel the order. Money works as Save changes: the
          difference is charged or refunded when the order is saved.
        </p>
        <div className={own.dialogButtons}>
          <Button onClick={add}>Add it</Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Not now
          </Button>
        </div>
      </Overlay>
    </>
  );
}
