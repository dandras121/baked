"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Overlay } from "@/components/ui/overlay";
import { clock } from "@/lib/hold";
import styles from "./checkout.module.css";

/**
 * The phone's sticky summary bar on steps 2–3 (§5 Phone; 1102:9148): “£{total}” · “{n} cakes · delivery free” ·
 * Continue → (submits the step's form). While a hold runs it also shows “Held {mm:ss}”. Tapping the bar opens the
 * summary as a bottom sheet with Edit / Remove per line. The bar hides while the on-screen keyboard is open; the page
 * keeps room for it at the bottom so the footer stays reachable. Tablet and desktop show the column instead.
 */
export function SummaryBar({
  total,
  line,
  expiresAt,
  form,
  children,
}: {
  total: string;
  line: string;
  /** The live hold's end (ISO), or null. */
  expiresAt: string | null;
  /** The id of the form Continue submits; none on a step whose form comes later. */
  form: string | null;
  /** The summary inside the sheet. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const end = new Date(expiresAt).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  // The on-screen keyboard: the visual viewport is much shorter than the layout viewport.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => setKeyboard(window.innerHeight - vv.height > 150);
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, []);

  return (
    <>
      <div className={styles.barSpace} aria-hidden />
      <div
        className={styles.bar}
        data-hidden={keyboard || undefined}
        role="region"
        aria-label="Order summary"
      >
        <button
          type="button"
          className={styles.barSummary}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <span className={styles.barTotal}>{total}</span>
          <span className={styles.barLine}>
            {line}
            {left !== null && left > 0 && (
              <span className={styles.barHeld}> · Held {clock(left)}</span>
            )}
          </span>
          <span className="visually-hidden">, show your order</span>
        </button>
        {form && (
          <button
            type="submit"
            form={form}
            className={styles.barContinue}
            data-pressable
          >
            Continue →
          </button>
        )}
      </div>
      <Overlay
        open={open}
        onClose={() => setOpen(false)}
        title="Your order"
        kind="sheet"
        classNames={{ panel: styles.sheet, body: styles.sheetBody }}
      >
        {children}
      </Overlay>
    </>
  );
}
