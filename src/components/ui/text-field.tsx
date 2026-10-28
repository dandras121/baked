"use client";

import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { FieldError } from "./field-error";
import styles from "./text-field.module.css";

/** Characters as the customer sees them (§5.1): emoji and accented letters count once. */
export function countCharacters(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [
      ...new Intl.Segmenter("en-GB", { granularity: "grapheme" }).segment(
        text.normalize("NFC"),
      ),
    ].length;
  }
  return [...text.normalize("NFC")].length;
}

/** Counters show always, or only from 80 % of the limit (§7.1 Counters, Proposal). */
export function counterVisible(
  count: number,
  max: number,
  mode: "always" | "from80",
): boolean {
  return mode === "always" || count >= Math.ceil(max * 0.8);
}

type FrameProps = {
  label: string;
  /** caps: “YOUR NAME” (V2 · Input 630:3004); plain: “Card number” (checkout fields). */
  labelStyle?: "caps" | "plain";
  hint?: ReactNode;
  error?: string | null;
  counter?: ReactNode;
  id: string;
  children: ReactNode;
};

function Frame({
  label,
  labelStyle = "caps",
  hint,
  error,
  counter,
  id,
  children,
}: FrameProps) {
  return (
    <div className={styles.frame}>
      <label
        htmlFor={id}
        className={`${styles.label} ${styles[labelStyle]} ${error ? styles.labelError : ""}`}
      >
        {label}
      </label>
      <div
        className={`${styles.box} ${error ? styles.boxError : ""}`}
        data-writable
      >
        {children}
        {counter}
      </div>
      <FieldError id={`${id}-error`} message={error} />
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

type CounterProps = {
  /** The limit for the counter “n / max”; typing past it is allowed so the error can say so (§5.1). */
  max?: number;
  counterMode?: "always" | "from80";
};

function useCounter(
  value: unknown,
  defaultValue: unknown,
  max: number | undefined,
  mode: "always" | "from80",
) {
  const [text, setText] = useState(String(value ?? defaultValue ?? ""));
  const count = countCharacters(value !== undefined ? String(value) : text);
  const over = max !== undefined && count > max;
  const counter =
    max !== undefined && counterVisible(count, max, mode) ? (
      <span
        className={`${styles.counter} ${over ? styles.counterOver : ""}`}
        aria-hidden
      >
        {count} / {max}
      </span>
    ) : null;
  const announce =
    max !== undefined ? (
      <span className="visually-hidden" aria-live="polite">
        {over ? `${count} of ${max} characters` : ""}
      </span>
    ) : null;
  return { setText, over, counter, announce };
}

const describedBy = (id: string, hint: unknown, error: unknown) =>
  [error ? `${id}-error` : "", hint ? `${id}-hint` : ""]
    .filter(Boolean)
    .join(" ") || undefined;

type Shared = {
  label: string;
  labelStyle?: "caps" | "plain";
  hint?: ReactNode;
  error?: string | null;
};

export function TextField({
  label,
  labelStyle,
  hint,
  error,
  id: given,
  max,
  counterMode = "always",
  onChange,
  ...input
}: Shared &
  CounterProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "maxLength">) {
  const auto = useId();
  const id = given ?? auto;
  const { setText, over, counter, announce } = useCounter(
    input.value,
    input.defaultValue,
    max,
    counterMode,
  );
  return (
    <Frame {...{ label, labelStyle, hint, error, id, counter }}>
      <input
        {...input}
        id={id}
        className={styles.control}
        aria-invalid={error || over ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(e) => {
          setText(e.target.value);
          onChange?.(e);
        }}
      />
      {announce}
    </Frame>
  );
}

type TextAreaProps = Shared &
  CounterProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "maxLength">;

export function TextArea({
  label,
  labelStyle,
  hint,
  error,
  id: given,
  max,
  counterMode = "always",
  onChange,
  ...area
}: TextAreaProps) {
  const auto = useId();
  const id = given ?? auto;
  const { setText, over, counter, announce } = useCounter(
    area.value,
    area.defaultValue,
    max,
    counterMode,
  );
  return (
    <Frame {...{ label, labelStyle, hint, error, id, counter }}>
      <textarea
        {...area}
        id={id}
        rows={area.rows ?? 4}
        className={`${styles.control} ${styles.area}`}
        aria-invalid={error || over ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(e) => {
          setText(e.target.value);
          onChange?.(e);
        }}
      />
      {announce}
    </Frame>
  );
}

export function Select({
  label,
  labelStyle,
  hint,
  error,
  id: given,
  children,
  ...select
}: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const id = given ?? auto;
  return (
    <Frame {...{ label, labelStyle, hint, error, id }}>
      <select
        {...select}
        id={id}
        className={`${styles.control} ${styles.select}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      >
        {children}
      </select>
      <svg className={styles.chevron} viewBox="0 0 12 8" aria-hidden>
        <path d="M1 1.5 6 6.5 11 1.5" />
      </svg>
    </Frame>
  );
}
