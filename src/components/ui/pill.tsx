import type { ButtonHTMLAttributes } from "react";
import styles from "./pill.module.css";

type PillProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  selected: boolean;
};

/** Filter pill (V2 · Filter pill 599:2717 / 599:2719): a toggle; the selected state keeps its colour, hover and press still apply. */
export function Pill({
  selected,
  className = "",
  children,
  ...rest
}: PillProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-pressed={selected}
      data-pressable
      className={`${styles.pill} hit-44 ${className}`}
    >
      {children}
    </button>
  );
}
