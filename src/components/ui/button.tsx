"use client";

import NextLink from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import styles from "./button.module.css";

export type ButtonVariant = "solid" | "outline" | "secondary" | "text";
/** md: 50 px (151–600 wide) · card: “View” 88 × 47 · compact: dialog buttons 32 (phone 34) · sm: “Cookie preferences” 131 × 28. */
export type ButtonSize = "md" | "card" | "compact" | "sm";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width (phone 354 × 46). */
  block?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    /** UI-03: the label swaps and a spinner turns; shown at least 600 ms so it never flashes. */
    busy?: boolean;
    busyLabel?: string;
  };

export const MIN_BUSY_MS = 600;

function classes({
  variant = "solid",
  size = "md",
  block,
  className = "",
}: CommonProps) {
  return [
    styles.button,
    styles[variant],
    styles[size],
    block ? styles.block : "",
    "hit-44",
    className,
  ].join(" ");
}

/** Keeps `busy` on for at least MIN_BUSY_MS after it turned on (UI-03). */
function useMinimumBusy(busy: boolean): boolean {
  const [previous, setPrevious] = useState(busy);
  const [holding, setHolding] = useState(false);
  const since = useRef(0);
  if (busy !== previous) {
    setPrevious(busy);
    if (!busy) setHolding(true);
  }
  useEffect(() => {
    if (busy) since.current = performance.now();
  }, [busy]);
  useEffect(() => {
    if (!holding) return;
    const left = Math.max(0, MIN_BUSY_MS - (performance.now() - since.current));
    const timer = setTimeout(() => setHolding(false), left);
    return () => clearTimeout(timer);
  }, [holding]);
  return busy || holding;
}

export function Button({
  variant,
  size,
  block,
  className,
  children,
  busy = false,
  busyLabel,
  type = "button",
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  const showBusy = useMinimumBusy(busy);
  return (
    <button
      {...rest}
      type={type}
      className={classes({ variant, size, block, className, children })}
      data-pressable
      disabled={disabled}
      aria-busy={showBusy || undefined}
      aria-disabled={showBusy || undefined}
      onClick={showBusy ? undefined : onClick}
    >
      {showBusy ? (
        <>
          <span className={styles.spinner} aria-hidden />
          <span>{busyLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

type ButtonLinkProps = CommonProps & { href: string; external?: boolean };

/** A link that looks like a button (e.g. “Start an enquiry”). */
export function ButtonLink({
  href,
  external,
  children,
  ...look
}: ButtonLinkProps) {
  const className = classes({ ...look, children });
  if (external) {
    return (
      <a
        href={href}
        className={className}
        data-pressable
        target="_blank"
        rel="noopener"
      >
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} className={className} data-pressable>
      {children}
    </NextLink>
  );
}
