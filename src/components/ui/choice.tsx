"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { FieldError } from "./field-error";
import styles from "./choice.module.css";

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  error?: string | null;
};

/**
 * Checkbox (V2 · Checkbox 630:3012 / 630:3015, phone 810:5860; error 975:9109) and Radio (not drawn: the checkbox
 * shape made round — Proposal). Box and label are one pressable (ANIM-07). Never pre-ticked by default (UK GDPR).
 */
function Choice({
  type,
  label,
  error,
  id: given,
  className = "",
  ...input
}: ChoiceProps & { type: "checkbox" | "radio" }) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <div className={`${styles.wrap} ${className}`}>
      <label htmlFor={id} className={`${styles.row} hit-44`} data-pressable>
        <input
          {...input}
          id={id}
          type={type}
          className={`${styles.input} visually-hidden`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span
          className={`${styles.box} ${styles[type]} ${error ? styles.boxError : ""}`}
          aria-hidden
        >
          {type === "checkbox" ? (
            <span className={styles.tick}>✓</span>
          ) : (
            <span className={styles.dot} />
          )}
        </span>
        <span className={styles.label}>{label}</span>
      </label>
      <FieldError id={`${id}-error`} message={error} className={styles.error} />
    </div>
  );
}

export function Checkbox(props: ChoiceProps) {
  return <Choice {...props} type="checkbox" />;
}

export function Radio(props: ChoiceProps) {
  return <Choice {...props} type="radio" />;
}
