"use client";

import { useState } from "react";
import form from "@/components/admin/add-order/add-order.module.css";
import { useReorder } from "@/components/admin/use-reorder";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Overlay } from "@/components/ui/overlay";
import {
  choiceAllergens,
  emptyChoice,
  emptyOption,
  OPTION_TYPES,
  optionSummary,
  typeName,
  type ChoiceForm,
  type OptionErrors,
  type OptionForm,
} from "@/lib/admin/cake-options";
import { CAKE_LIMITS } from "@/lib/cakes";
import { AllergenPicker } from "./allergen-picker";
import styles from "./options.module.css";

const Grip = () => (
  <svg viewBox="0 0 8 14" width="8" height="14" aria-hidden>
    {[1, 7].flatMap((x) =>
      [1, 7, 13].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" />),
    )}
  </svg>
);

/** The admin's switch (no motion, Decided D10): a real role="switch" button. */
function Switch({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelledBy: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} aria-hidden />
    </button>
  );
}

/**
 * OPTIONS (§5.8; 1713:11890, phone 1714:11991): Offer an inscription, the options in Linda's order (⠿), one open
 * editor at a time (label, help line, required / picks / max length, the choices with +£ and Allergens, Done,
 * Remove this option), the folded line otherwise, + Add an option with the four types (up to 6).
 */
export function OptionsCard({
  options,
  onOptions,
  offerInscription,
  onInscription,
  errors = {},
}: {
  options: OptionForm[];
  onOptions: (next: OptionForm[]) => void;
  offerInscription: boolean;
  onInscription: (v: boolean) => void;
  errors?: Record<number, OptionErrors>;
}) {
  const [open, setOpen] = useState<number | null>(() => {
    const bad = Object.keys(errors).map(Number);
    return bad.length ? bad[0] : null;
  });
  const [menu, setMenu] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const order = useReorder(
    options,
    onOptions,
    (o) => o.label || typeName(o.type),
  );
  const shownOpen =
    open ??
    (Object.keys(errors).length ? Number(Object.keys(errors)[0]) : null);
  const setOption = (i: number, patch: Partial<OptionForm>) =>
    onOptions(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  return (
    <section className={form.card} aria-labelledby="options-h">
      <h2 id="options-h" className={form.section}>
        Options
      </h2>
      <p className={form.hint}>
        Extra questions for this cake, asked under the size in this order. A
        choice can add to the price and to the allergens.
      </p>

      <div className={styles.inscription}>
        <div>
          <p id="o-inscription" className={styles.strong}>
            Offer an inscription
          </p>
          <p className={form.hint}>
            Customers can write up to 24 characters on the cake. Switch off for
            products without one.
          </p>
        </div>
        <Switch
          checked={offerInscription}
          onChange={onInscription}
          labelledBy="o-inscription"
        />
      </div>

      <ol className={styles.list}>
        {options.map((o, i) => (
          <li
            key={o.id ?? `new-${i}`}
            ref={order.row(i)}
            className={`${styles.option} ${shownOpen === i ? styles.open : ""}`}
          >
            <div className={styles.optionHead}>
              <button
                id={`o-move-${i}`}
                type="button"
                className={styles.grip}
                {...order.handle(i, (n) => `o-move-${n}`)}
              >
                <Grip />
              </button>
              <span className={styles.tag}>
                {typeName(o.type)}
                {shownOpen === i &&
                  ` — ${OPTION_TYPES.find((t) => t.type === o.type)!.hint}`}
              </span>
              {shownOpen === i ? (
                <span className={styles.count}>
                  Option {i + 1} of {options.length}
                </span>
              ) : (
                <>
                  <span className={styles.summary}>
                    <strong>{o.label || "New option"}</strong>{" "}
                    {optionSummary(o)}
                  </span>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => setOpen(i)}
                  >
                    Edit
                    <span className={styles.visuallyHidden}>
                      {" "}
                      {o.label || "the new option"}
                    </span>
                  </button>
                </>
              )}
            </div>
            {shownOpen === i && (
              <OptionEditor
                i={i}
                o={o}
                errors={errors[i] ?? {}}
                onChange={(patch) => setOption(i, patch)}
                onDone={() => setOpen(null)}
                onRemove={() => setRemoving(i)}
              />
            )}
          </li>
        ))}
      </ol>

      {options.length < CAKE_LIMITS.options && (
        <div className={styles.add}>
          <Button
            variant="outline"
            className={styles.addButton}
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            + Add an option
          </Button>
          <span className={form.hint}>Up to 6 options</span>
          {menu && (
            <ul className={styles.menu} aria-label="What kind of option">
              {OPTION_TYPES.map((t) => (
                <li key={t.type}>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      onOptions([...options, emptyOption(t.type)]);
                      setOpen(options.length);
                      setMenu(false);
                    }}
                  >
                    <strong>{t.name}</strong> — {t.hint}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Overlay
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing !== null ? options[removing]?.label || "this option" : ""}?`}
        description="Orders already placed keep it."
        classNames={{ body: styles.removeBody }}
      >
        <Button
          onClick={() => {
            if (removing === null) return;
            onOptions(options.filter((_, j) => j !== removing));
            setRemoving(null);
            setOpen(null);
          }}
        >
          Remove it
        </Button>
        <Button variant="outline" onClick={() => setRemoving(null)}>
          Keep it
        </Button>
      </Overlay>
    </section>
  );
}

function OptionEditor({
  i,
  o,
  errors,
  onChange,
  onDone,
  onRemove,
}: {
  i: number;
  o: OptionForm;
  errors: OptionErrors;
  onChange: (patch: Partial<OptionForm>) => void;
  onDone: () => void;
  onRemove: () => void;
}) {
  const [picker, setPicker] = useState<number | null>(null);
  const choices = useReorder(
    o.choices,
    (next) => onChange({ choices: next }),
    (c) => c.label || "the choice",
  );
  const setChoice = (j: number, patch: Partial<ChoiceForm>) =>
    onChange({
      choices: o.choices.map((c, k) => (k === j ? { ...c, ...patch } : c)),
    });
  const id = (k: string) => `o${i}-${k}`;
  const counted = (k: "label" | "help", label: string, max: number) => (
    <div className={form.field}>
      <label htmlFor={id(k)} className={form.label}>
        {label}
      </label>
      <span className={styles.counted}>
        <input
          id={id(k)}
          className={form.input}
          value={o[k]}
          maxLength={max}
          aria-invalid={!!errors[k] || undefined}
          aria-describedby={`${id(k)}-count${errors[k] ? ` ${id(k)}-error` : ""}`}
          onChange={(e) => onChange({ [k]: e.target.value })}
        />
        <span id={`${id(k)}-count`} className={styles.counter}>
          {o[k].length} / {max}
        </span>
      </span>
      <FieldError id={`${id(k)}-error`} message={errors[k] ?? null} />
    </div>
  );
  const yes = o.type === "yesno" ? (o.choices[0] ?? emptyChoice()) : null;

  return (
    <div className={styles.editor}>
      <div className={styles.pair}>
        {counted("label", "Label", CAKE_LIMITS.optionLabelMax)}
        {counted(
          "help",
          o.type === "yesno"
            ? "Text beside the tick box (optional)"
            : "Help line (optional)",
          CAKE_LIMITS.optionHelpMax,
        )}
      </div>

      {(o.type === "choice" || o.type === "text") && (
        <div className={styles.required}>
          <Switch
            checked={o.required}
            onChange={(v) => onChange({ required: v })}
            labelledBy={id("required")}
          />
          <p id={id("required")} className={form.hint}>
            <strong className={styles.strong}>Required</strong>{" "}
            {o.type === "choice"
              ? "Customers must pick one before adding the cake to their order."
              : "Customers must fill it in before adding the cake to their order."}
          </p>
        </div>
      )}
      {o.type === "choices" && (
        <div className={styles.pair}>
          {(["minPicks", "maxPicks"] as const).map((k) => (
            <div key={k} className={form.field}>
              <label htmlFor={id(k)} className={form.label}>
                {k === "minPicks" ? "Min picks" : "Max picks"}
              </label>
              <input
                id={id(k)}
                className={`${form.input} ${styles.small}`}
                inputMode="numeric"
                maxLength={2}
                value={o[k]}
                aria-invalid={!!errors.picks || undefined}
                onChange={(e) => onChange({ [k]: e.target.value })}
              />
            </div>
          ))}
          <FieldError id={id("picks-error")} message={errors.picks ?? null} />
        </div>
      )}
      {o.type === "text" && (
        <div className={form.field}>
          <label htmlFor={id("maxLength")} className={form.label}>
            Max length
          </label>
          <input
            id={id("maxLength")}
            className={`${form.input} ${styles.small}`}
            inputMode="numeric"
            maxLength={3}
            value={o.maxLength}
            aria-invalid={!!errors.maxLength || undefined}
            onChange={(e) => onChange({ maxLength: e.target.value })}
          />
          <p className={form.hint}>1 to 200 characters.</p>
          <FieldError
            id={id("maxLength-error")}
            message={errors.maxLength ?? null}
          />
        </div>
      )}

      {yes && (
        <div className={styles.yesRow}>
          <div className={form.field}>
            <label htmlFor={id("yes-price")} className={form.label}>
              Price
            </label>
            <span className={styles.price}>
              <span aria-hidden>+£</span>
              <input
                id={id("yes-price")}
                className={form.input}
                inputMode="decimal"
                value={yes.price}
                aria-invalid={!!errors.choice?.[0]?.price || undefined}
                onChange={(e) =>
                  onChange({ choices: [{ ...yes, price: e.target.value }] })
                }
              />
            </span>
          </div>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setPicker(0)}
          >
            {choiceAllergens(yes)}
          </button>
          <FieldError
            id={id("yes-error")}
            message={
              errors.choice?.[0]?.price ?? errors.choice?.[0]?.allergens ?? null
            }
          />
        </div>
      )}

      {(o.type === "choice" || o.type === "choices") && (
        <>
          <h3 className={form.section}>Choices</h3>
          <ol className={styles.choices}>
            {o.choices.map((c, j) => {
              const ce = errors.choice?.[j] ?? {};
              return (
                <li
                  key={c.id ?? `new-${j}`}
                  ref={choices.row(j)}
                  className={styles.choice}
                >
                  <button
                    id={id(`move-${j}`)}
                    type="button"
                    className={styles.grip}
                    {...choices.handle(j, (n) => id(`move-${n}`))}
                  >
                    <Grip />
                  </button>
                  <input
                    className={form.input}
                    aria-label={`Choice ${j + 1}`}
                    value={c.label}
                    maxLength={40}
                    aria-invalid={!!ce.label || undefined}
                    onChange={(e) => setChoice(j, { label: e.target.value })}
                  />
                  <span className={styles.price}>
                    <span aria-hidden>+£</span>
                    <input
                      className={form.input}
                      aria-label={`Choice ${j + 1}: price`}
                      inputMode="decimal"
                      value={c.price}
                      aria-invalid={!!ce.price || undefined}
                      onChange={(e) => setChoice(j, { price: e.target.value })}
                    />
                  </span>
                  <button
                    type="button"
                    className={`${styles.textButton} ${styles.allergenLink}`}
                    onClick={() => setPicker(j)}
                  >
                    {choiceAllergens(c)}
                    <span className={styles.visuallyHidden}>
                      {" "}
                      — choice {j + 1}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove choice ${j + 1}${c.label ? ` (${c.label})` : ""}`}
                    onClick={() =>
                      onChange({ choices: o.choices.filter((_, k) => k !== j) })
                    }
                  >
                    ×
                  </button>
                  {(ce.label || ce.price || ce.allergens) && (
                    <p className={styles.rowError} role="alert">
                      {[ce.label, ce.price, ce.allergens]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          <FieldError
            id={id("choices-error")}
            message={errors.choices ?? null}
          />
          {o.choices.length < CAKE_LIMITS.choices && (
            <p className={styles.addChoice}>
              <button
                type="button"
                className={styles.textButton}
                onClick={() =>
                  onChange({ choices: [...o.choices, emptyChoice()] })
                }
              >
                + Add a choice
              </button>
              <span className={form.hint}>up to 10</span>
            </p>
          )}
        </>
      )}

      <div className={styles.editorEnd}>
        <Button onClick={onDone}>Done</Button>
        <Button variant="outline" onClick={onRemove}>
          Remove this option
        </Button>
      </div>

      {picker !== null && (
        <AllergenPicker
          id={id(`allergens-${picker}`)}
          open
          onClose={() => setPicker(null)}
          title="Allergens for this choice"
          description={`${(o.type === "yesno" ? o.label : o.choices[picker]?.label) || "This choice"} · added to the cake’s own allergens when a customer picks it.`}
          value={o.choices[picker] ?? emptyChoice()}
          onChange={(patch) =>
            o.type === "yesno"
              ? onChange({
                  choices: [{ ...(o.choices[0] ?? emptyChoice()), ...patch }],
                })
              : setChoice(picker, patch)
          }
          errors={{}}
        />
      )}
    </div>
  );
}
