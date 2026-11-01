"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { removeFromMyOrder } from "@/app/(site)/order/actions";
import { ButtonLink } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";
import { formatPrice } from "@/lib/money";
import {
  buttonLabel,
  editHref,
  EMPTY_ORDER,
  ORDER_CHANGED,
  showsButton,
  type MyOrder,
} from "@/lib/my-order";
import styles from "./my-order.module.css";

/**
 * “My order” (slice 4.2c, Bohoka 2026-11-01): once the order holds a cake, a simple floating button at the bottom
 * left of every public page (Home too; not on the checkout steps). It opens a panel — a dialog, a bottom sheet on
 * touch — with every cake, its price, Edit / Remove, the total and “Continue to date and delivery →”.
 * The order is read from /api/order, so the pages stay static.
 */
export function MyOrderButton() {
  const pathname = usePathname();
  const [order, setOrder] = useState<MyOrder>(EMPTY_ORDER);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/order", { cache: "no-store" });
      if (r.ok) setOrder((await r.json()) as MyOrder);
    } catch {
      // Offline or the server did not answer: the button keeps what it showed.
    }
  }, []);

  // A panel left open closes on navigation (Continue, Edit): it belongs to the page it was opened on.
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setOpen(false);
  }

  // After each navigation the order is read again.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the answer arrives later, from the network
    void load();
  }, [pathname, load]);

  useEffect(() => {
    const again = () => void load();
    window.addEventListener(ORDER_CHANGED, again);
    window.addEventListener("pageshow", again);
    return () => {
      window.removeEventListener(ORDER_CHANGED, again);
      window.removeEventListener("pageshow", again);
    };
  }, [load]);

  // The last 140 px of the page: the button steps aside for the footer's last row (the footer itself never
  // changes, Bohoka 2026-11-01).
  const [away, setAway] = useState(false);
  useEffect(() => {
    const check = () =>
      setAway(
        window.scrollY + window.innerHeight >
          document.documentElement.scrollHeight - 140,
      );
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [pathname]);

  const n = order.lines.length;
  if (!showsButton(pathname, n) && !open) return null;

  const remove = (id: number) =>
    start(async () => {
      const next = await removeFromMyOrder(id);
      setOrder(next);
      if (next.lines.length === 0) setOpen(false);
    });

  return (
    <>
      {showsButton(pathname, n) && (
        <button
          type="button"
          className={styles.button}
          aria-haspopup="dialog"
          data-away={away || undefined}
          data-pressable
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 20 20" aria-hidden className={styles.icon}>
            <path d="M4 7h12l-1 10H5L4 7Z" />
            <path d="M7.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
          </svg>
          {buttonLabel(n)}
          <span className="visually-hidden">
            {n === 1 ? " cake" : " cakes"}
          </span>
        </button>
      )}
      <Overlay
        open={open}
        onClose={() => setOpen(false)}
        title="Your order"
        classNames={{ panel: styles.panel, body: styles.body }}
      >
        <ul className={styles.lines} aria-busy={pending || undefined}>
          {order.lines.map((l) => (
            <li key={l.id} className={styles.line}>
              <div className={styles.text}>
                <p className={styles.name}>{l.name}</p>
                {l.detail && <p className={styles.detail}>{l.detail}</p>}
                {l.message !== null && (
                  <p className={styles.detail}>
                    {l.message ? `“${l.message}”` : "No message"}
                  </p>
                )}
                <div className={styles.actions}>
                  <NextLink
                    href={editHref(l)}
                    className={styles.action}
                    data-pressable
                    onClick={() => setOpen(false)}
                  >
                    Edit<span className="visually-hidden"> {l.name}</span>
                  </NextLink>
                  <button
                    type="button"
                    className={styles.action}
                    data-pressable
                    disabled={pending}
                    onClick={() => remove(l.id)}
                  >
                    Remove<span className="visually-hidden"> {l.name}</span>
                  </button>
                </div>
              </div>
              <p className={styles.price}>{formatPrice(l.pricePence)}</p>
            </li>
          ))}
        </ul>
        <p className={styles.total}>
          <span>Total</span>
          <span className={styles.totalAmount}>
            {formatPrice(order.totalPence)}
          </span>
        </p>
        <ButtonLink href="/order/when" block>
          Continue to date and delivery →
        </ButtonLink>
      </Overlay>
    </>
  );
}
