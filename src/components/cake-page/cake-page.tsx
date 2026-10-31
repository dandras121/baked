"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/choice";
import { Link } from "@/components/ui/link";
import { TextField } from "@/components/ui/text-field";
import {
  addOnLabel,
  allergenLine,
  includesLine,
  linePricePence,
  NO_ANSWERS,
  priceDetail,
  sizeChoices,
  tierLine,
  tierWords,
  togglePick,
  type Answers,
  type OptionView,
} from "@/lib/cake-config";
import type { CakePageData } from "@/lib/cake-page";
import type { Allergen } from "@/lib/constants";
import { formatPrice } from "@/lib/money";
import { CakeMedia } from "./cake-media";
import styles from "./cake-page.module.css";
import { PriceFigure } from "./price-figure";

const two = (n: number) => String(n).padStart(2, "0");

/**
 * The cake page, step 1 — The cake (§5.1; desktop 609:2889, phone 815:5841; with options 1715:11996). The size
 * (the smallest pre-selected), Linda's options (§5.8), the live price (ANIM-20) and the allergen line, which follows
 * the chosen options. The stepper (4.1) and the inscription and Add to your order (3.6b) come in their own slices.
 */
export function CakePage({
  cake,
  kitchen,
}: {
  cake: CakePageData;
  kitchen: readonly Allergen[];
}) {
  const sizes = sizeChoices(cake.sizes);
  const [sizeId, setSizeId] = useState(sizes[0]?.id);
  const [answers, setAnswers] = useState<Answers>(NO_ANSWERS);
  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0];
  const price = size ? linePricePence(size, cake.options, answers) : 0;
  const includes = includesLine(cake.options, answers);

  return (
    <div className={styles.page}>
      <CakeMedia items={cake.media} name={cake.name} />
      <div className={styles.content}>
        <Link href="/cakes" className={styles.back}>
          ← Back to the range
        </Link>
        {size && <p className={styles.tierLine}>{tierLine(size)}</p>}
        <h1 className={styles.name}>{cake.name}</h1>
        <p className={styles.whatItIs}>{cake.whatItIs}</p>
        {cake.from && <p className={styles.from}>{cake.from}</p>}
        <hr className={styles.rule} />

        {size && (
          <fieldset className={styles.section}>
            <legend className={styles.sectionLabel}>01 · Size</legend>
            {sizes.length === 1 ? (
              <p className={styles.oneSize}>
                Serves {size.serves} · {tierWords(size.tiers)}
              </p>
            ) : (
              <div className={styles.pills} data-kind="size">
                {sizes.map((s) => (
                  <Pill
                    key={s.id}
                    name="size"
                    value={s.id}
                    checked={s.id === size.id}
                    title={s.name}
                    extra={s.extra}
                    detail={tierWords(s.tiers)}
                    onChange={() => setSizeId(s.id)}
                  />
                ))}
              </div>
            )}
          </fieldset>
        )}

        {cake.options.map((o, i) => (
          <OptionBlock
            key={o.id}
            number={i + 2}
            option={o}
            answers={answers}
            onChange={setAnswers}
          />
        ))}

        <hr className={styles.rule} />
        <div className={styles.price}>
          <PriceFigure text={formatPrice(price)} className={styles.amount} />
          {size && (
            <p className={styles.detail}>
              {priceDetail(size, {
                offered: cake.offerInscription,
                text: "",
              })}
            </p>
          )}
        </div>
        {includes && <p className={styles.includes}>{includes}</p>}
      </div>

      <section className={styles.allergens} aria-labelledby="allergens-heading">
        <h2 id="allergens-heading" className={styles.sectionLabel}>
          Allergens in this cake
        </h2>
        <p className={styles.allergenLine} aria-live="polite">
          {allergenLine(cake.allergens, cake.options, answers, kitchen)}
        </p>
        <Link href="/allergens" className={styles.allergenLink}>
          See full allergen information →
        </Link>
      </section>
    </div>
  );
}

/** A size or Choice pill (V2 · Size option 606:2889 / 606:2892): a radio card, ANIM-07. */
function Pill({
  name,
  value,
  checked,
  title,
  extra,
  detail,
  onChange,
  onClick,
}: {
  name: string;
  value: number;
  checked: boolean;
  title: string;
  extra: string;
  detail?: string;
  onChange: () => void;
  onClick?: () => void;
}) {
  return (
    <label
      className={styles.pill}
      data-pressable
      data-checked={checked || undefined}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        onClick={onClick}
        className="visually-hidden"
      />
      <span className={styles.pillName}>{title}</span>
      <span className={styles.pillExtra}>
        {extra}
        {detail && <span className="visually-hidden">, {detail}</span>}
      </span>
    </label>
  );
}

/** One of Linda's options (§5.8): Choice pills, Choices boxes, a Text field or one Yes/no box. */
function OptionBlock({
  number,
  option: o,
  answers,
  onChange,
}: {
  number: number;
  option: OptionView;
  answers: Answers;
  onChange: (a: Answers) => void;
}) {
  const label = `${two(number)} · ${o.label}`;
  const picks = answers.picks[o.id] ?? [];
  const pick = (choiceId: number) => onChange(togglePick(o, answers, choiceId));

  if (o.type === "text")
    return (
      <div className={styles.section}>
        <TextField
          label={label}
          name={`option-${o.id}`}
          max={o.maxLength}
          counterMode="always"
          hint={o.help || undefined}
          value={answers.texts[o.id] ?? ""}
          onChange={(e) =>
            onChange({
              ...answers,
              texts: { ...answers.texts, [o.id]: e.target.value },
            })
          }
        />
      </div>
    );

  return (
    <fieldset className={styles.section}>
      <legend className={styles.sectionLabel}>{label}</legend>
      {o.help && o.type !== "yesno" && <p className={styles.help}>{o.help}</p>}
      {o.type === "choice" && (
        <div className={styles.pills} data-kind="choice">
          {o.choices.map((c) => (
            <Pill
              key={c.id}
              name={`option-${o.id}`}
              value={c.id}
              checked={picks.includes(c.id)}
              title={c.label}
              extra={addOnLabel(c.pricePence)}
              onChange={() => pick(c.id)}
              // An optional Choice is cleared by tapping the selected pill again (§5.8).
              onClick={() => {
                if (!o.required && picks.includes(c.id)) pick(c.id);
              }}
            />
          ))}
        </div>
      )}
      {(o.type === "choices" || o.type === "yesno") && (
        <div className={styles.boxes}>
          {o.choices.map((c) => (
            <Checkbox
              key={c.id}
              name={`option-${o.id}`}
              value={c.id}
              checked={picks.includes(c.id)}
              onChange={() => pick(c.id)}
              label={
                <>
                  {o.type === "yesno" ? o.help || o.label : c.label}
                  {c.pricePence > 0 && (
                    <span className={styles.boxPrice}>
                      {" "}
                      +{formatPrice(c.pricePence)}
                    </span>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}
