"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./orders.module.css";

const PHONE = "(max-width: 1023px)";

/** Search (§9.4): filters as you type, from 2 characters after a 300 ms pause; kept in the URL with the filter. */
export function OrderSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  // The URL changed from outside (Back, Clear the search): show its search, unless it is the one just typed.
  const [seen, setSeen] = useState(initial);
  const [sent, setSent] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    if (initial !== sent) setValue(initial);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);
  // The phone's shorter placeholder (948:8869).
  const phone = useSyncExternalStore(
    (on) => {
      const q = window.matchMedia(PHONE);
      q.addEventListener("change", on);
      return () => q.removeEventListener("change", on);
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  );

  const go = (v: string) => {
    const t = v.trim();
    const next = new URLSearchParams(params.toString());
    next.delete("shown");
    if (t.length >= 2) next.set("q", t);
    else next.delete("q");
    setSent(t.length >= 2 ? t : "");
    if (next.toString() === params.toString()) return;
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  return (
    <input
      type="search"
      className={styles.search}
      aria-label="Search orders by name, town or order number"
      placeholder={
        phone
          ? "Search by name or number"
          : "Search by name, town or order number"
      }
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        setValue(v);
        clearTimeout(timer.current ?? undefined);
        timer.current = setTimeout(() => go(v), 300);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          clearTimeout(timer.current ?? undefined);
          go(value);
        }
      }}
    />
  );
}
