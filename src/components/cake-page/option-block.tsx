"use client";

import { Checkbox } from "@/components/ui/choice";
import { FieldError } from "@/components/ui/field-error";
import { TextField } from "@/components/ui/text-field";
import {
  addOnLabel,
  togglePick,
  type Answers,
  type OptionView,
} from "@/lib/cake-config";
import { formatPrice } from "@/lib/money";
import styles from "./cake-page.module.css";

// The cake's size pills and Linda's options (§5.1, §5.8), shared by the cake page and Change your order (§6.4).

/** A size or Choice pill (V2 · Size option 606:2889 / 606:2892): a radio card, ANIM-07. */
export function Pill({
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
      {extra !== "included" && (
        <span className={styles.pillExtra}>{extra}</span>
      )}
      {detail && <span className="visually-hidden">, {detail}</span>}
    </label>
  );
}

/** One of Linda's options (§5.8): Choice pills, Choices boxes, a Text field or one Yes/no box. */
export function OptionBlock({
  option: o,
  answers,
  onChange,
  error,
}: {
  option: OptionView;
  answers: Answers;
  onChange: (a: Answers) => void;
  error?: string;
}) {
  const errorId = `option-${o.id}-error`;
  const label = o.label;
  const picks = answers.picks[o.id] ?? [];
  const pick = (choiceId: number) => onChange(togglePick(o, answers, choiceId));

  if (o.type === "text")
    return (
      <div className={styles.section} data-field={`option-${o.id}`}>
        <input type="hidden" name={`kind-${o.id}`} value="text" />
        <TextField
          label={label}
          labelStyle="heading"
          error={error}
          name={`option-${o.id}`}
          max={o.maxLength}
          counterMode="always"
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
    <fieldset
      className={styles.section}
      data-field={`option-${o.id}`}
      data-error={error ? "" : undefined}
      aria-describedby={error ? errorId : undefined}
    >
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
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
