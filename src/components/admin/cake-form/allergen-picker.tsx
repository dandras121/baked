"use client";

import form from "@/components/admin/add-order/add-order.module.css";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Overlay } from "@/components/ui/overlay";
import { PICKER } from "@/lib/admin/cake-form";
import type { Allergen } from "@/lib/constants";
import styles from "./cake-form.module.css";

export type AllergenValue = {
  allergens: Allergen[];
  glutenKinds: string;
  nutKinds: string;
  alsoContains: string;
};

/**
 * The 14 allergens (1801:13494 for the cake, 1714:11933 for a choice): two columns, “Which cereals?” / “Which nuts?”
 * when those are ticked (Decided 2026-10-17), Also contains, Done · “{n} ticked”. On touch it is a bottom sheet.
 */
export function AllergenPicker({
  open,
  onClose,
  title,
  description,
  value,
  onChange,
  errors = {},
  id,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  value: AllergenValue;
  onChange: (patch: Partial<AllergenValue>) => void;
  errors?: Partial<Record<"glutenKinds" | "nutKinds" | "alsoContains", string>>;
  /** Field ids must be unique on the page. */
  id: string;
}) {
  const field = (
    k: "glutenKinds" | "nutKinds" | "alsoContains",
    label: string,
    placeholder?: string,
    hint?: string,
  ) => (
    <div className={form.field}>
      <label htmlFor={`${id}-${k}`} className={form.label}>
        {label}
      </label>
      <input
        id={`${id}-${k}`}
        className={form.input}
        value={value[k]}
        maxLength={k === "alsoContains" ? 120 : 60}
        placeholder={placeholder}
        aria-invalid={!!errors[k] || undefined}
        aria-describedby={errors[k] ? `${id}-${k}-error` : undefined}
        onChange={(e) => onChange({ [k]: e.target.value })}
      />
      {hint && <p className={form.hint}>{hint}</p>}
      <FieldError id={`${id}-${k}-error`} message={errors[k] ?? null} />
    </div>
  );
  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      classNames={{ body: styles.pickerBody }}
    >
      <fieldset className={styles.pickerGrid}>
        <legend className={styles.visuallyHidden}>The 14 allergens</legend>
        {PICKER.map((a) => (
          <label key={a.key} className={form.tick}>
            <input
              type="checkbox"
              checked={value.allergens.includes(a.key)}
              onChange={(e) =>
                onChange({
                  allergens: e.target.checked
                    ? [...value.allergens, a.key]
                    : value.allergens.filter((x) => x !== a.key),
                })
              }
            />
            {a.label}
          </label>
        ))}
      </fieldset>
      {value.allergens.includes("cereals containing gluten") &&
        field("glutenKinds", "Which cereals?", "wheat")}
      {value.allergens.includes("nuts") &&
        field("nutKinds", "Which nuts?", "almonds, hazelnuts")}
      {field(
        "alsoContains",
        "Also contains",
        undefined,
        "A free line for anything else.",
      )}
      <div className={styles.pickerEnd}>
        <Button onClick={onClose}>Done</Button>
        <span className={form.hint}>{value.allergens.length} ticked</span>
      </div>
    </Overlay>
  );
}
