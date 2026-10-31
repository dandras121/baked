"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./drop-down.module.css";

type Group = {
  name: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
};
const GroupContext = createContext<Group | null>(null);

/**
 * One row open at a time: opening a row closes the open one at the same moment (ANIM-09 row D).
 * Without JavaScript the rows are native `<details name>`, which the browser keeps to one open too (§4.4).
 */
export function DropDownGroup({
  children,
  name = "faq",
  defaultOpen = null,
}: {
  children: ReactNode;
  name?: string;
  defaultOpen?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen);
  return (
    <GroupContext.Provider value={{ name, openId, setOpenId }}>
      {children}
    </GroupContext.Provider>
  );
}

type DropDownRowProps = {
  /** Stable id; also the #anchor that opens the row (without animation). */
  id: string;
  question: ReactNode;
  children: ReactNode;
};

/**
 * Drop-down row (ANIM-09; FAQ 1745:12629) built as `<details><summary>` (§4.4), so it works without JavaScript and
 * “find in page” opens it. With JavaScript the answer rolls out from the top in 360 ms and back the same way; the
 * row stays a native open `<details>` until its roll back has finished. The chevron turns over around its
 * horizontal axis.
 */
export function DropDownRow({ id, question, children }: DropDownRowProps) {
  const group = useContext(GroupContext);
  const [ownOpen, setOwnOpen] = useState(false);
  const open = group ? group.openId === id : ownOpen;
  const setOpen = (next: boolean) =>
    group ? group.setOpenId(next ? id : null) : setOwnOpen(next);
  const details = useRef<HTMLDetailsElement>(null);
  // `shown` is the native open attribute: on as soon as the row opens, off when the roll back has finished.
  const [shown, setShown] = useState(open);
  const [instant, setInstant] = useState(false);
  if (open && !shown) setShown(true);
  if (!open && shown && typeof window !== "undefined" && isMotionReduced())
    setShown(false);

  // With JavaScript the group keeps one row open itself; the browser's own `name` grouping would cut a
  // closing row short, so it is dropped once the page is live (React does not put it back).
  useEffect(() => {
    details.current?.removeAttribute("name");
  }, []);

  // Desktop and tablet place the answer level with the question: the panel is pulled up by its height.
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    const s = summary.current;
    const d = details.current;
    if (!s || !d) return;
    const ro = new ResizeObserver(() =>
      d.style.setProperty("--question-h", `${s.offsetHeight}px`),
    );
    ro.observe(s);
    return () => ro.disconnect();
  }, []);

  // A #question link opens the row and scrolls to it, without animation — on load and when the hash changes.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      if (decodeURIComponent(window.location.hash.slice(1)) !== id) return;
      frame = requestAnimationFrame(() => {
        setInstant(true);
        setOpen(true);
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView();
          setInstant(false);
        });
      });
    };
    check();
    window.addEventListener("hashchange", check);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <details
      ref={details}
      name={group?.name}
      open={shown}
      className={`${styles.row} ${open ? styles.open : ""} ${instant ? styles.instant : ""}`}
      id={id}
      data-open={open ? "" : undefined}
      // “Find in page” opens a closed row by itself: follow it.
      onToggle={(e) => {
        if (e.currentTarget.open && !open) setOpen(true);
      }}
    >
      <summary
        ref={summary}
        className={styles.question}
        data-pressable="row"
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
      >
        <span className={styles.content} data-pressable-content>
          <span className={styles.text}>{question}</span>
          <svg className={styles.chevron} viewBox="0 0 12 7" aria-hidden>
            <path d="M1 1 6 6 11 1" />
          </svg>
        </span>
      </summary>
      <div
        className={styles.panel}
        inert={!open}
        onTransitionEnd={(e) => {
          if (
            e.target === e.currentTarget &&
            e.propertyName === "grid-template-rows" &&
            !open
          )
            setShown(false);
        }}
      >
        <div className={styles.clip}>
          <div className={styles.answer}>{children}</div>
        </div>
      </div>
    </details>
  );
}
