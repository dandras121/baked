"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./drop-down.module.css";

type Group = { openId: string | null; setOpenId: (id: string | null) => void };
const GroupContext = createContext<Group | null>(null);

/** One row open at a time: opening a row closes the open one at the same moment (ANIM-09 row D). */
export function DropDownGroup({
  children,
  defaultOpen = null,
}: {
  children: ReactNode;
  defaultOpen?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen);
  return (
    <GroupContext.Provider value={{ openId, setOpenId }}>
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
 * Drop-down row (ANIM-09; FAQ 1745:12629): the answer rolls out from the top in 360 ms and back the same way; the
 * chevron turns over around its horizontal axis. The answer is always in the page; closed, it is hidden="until-found"
 * so “find in page” opens it.
 */
export function DropDownRow({ id, question, children }: DropDownRowProps) {
  const group = useContext(GroupContext);
  const [ownOpen, setOwnOpen] = useState(false);
  const open = group ? group.openId === id : ownOpen;
  const setOpen = (next: boolean) =>
    group ? group.setOpenId(next ? id : null) : setOwnOpen(next);
  const panelId = useId();
  const panel = useRef<HTMLDivElement>(null);
  // `findable`: hidden="until-found" once the closing roll has finished.
  const [findable, setFindable] = useState(!open);
  const [instant, setInstant] = useState(false);
  if (open && findable) setFindable(false);

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

  // React writes `hidden` as a plain boolean, so the until-found value is set here.
  useLayoutEffect(() => {
    const el = panel.current;
    if (!el) return;
    if (findable && !open) el.setAttribute("hidden", "until-found");
    else el.removeAttribute("hidden");
  }, [findable, open]);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const onMatch = () => setOpen(true);
    el.addEventListener("beforematch", onMatch);
    return () => el.removeEventListener("beforematch", onMatch);
  });

  return (
    <div
      className={`${styles.row} ${open ? styles.open : ""} ${instant ? styles.instant : ""}`}
      id={id}
    >
      <button
        type="button"
        className={styles.question}
        aria-expanded={open}
        aria-controls={panelId}
        data-pressable="row"
        onClick={() => setOpen(!open)}
      >
        <span className={styles.content} data-pressable-content>
          <span className={styles.text}>{question}</span>
          <svg className={styles.chevron} viewBox="0 0 12 7" aria-hidden>
            <path d="M1 1 6 6 11 1" />
          </svg>
        </span>
      </button>
      <div
        ref={panel}
        id={panelId}
        className={styles.panel}
        hidden={
          findable && !open ? ("until-found" as unknown as boolean) : undefined
        }
        onTransitionEnd={(e) => {
          if (
            e.target === e.currentTarget &&
            e.propertyName === "grid-template-rows" &&
            !open
          )
            setFindable(true);
        }}
      >
        <div className={styles.clip}>
          <div className={styles.answer}>{children}</div>
        </div>
      </div>
    </div>
  );
}
