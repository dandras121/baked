"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./notice.module.css";

type NoticeProps = {
  /** calm: in progress or not the visitor's fault (violet); error: something did not happen (bordó). 983:9087 header. */
  tone?: "calm" | "error";
  title: string;
  children?: ReactNode;
  /** Show the round sign on the left (975:9102 calm ring, 974:9129 error “!”). */
  icon?: boolean;
  /** role="alert" moves the screen reader to it (e.g. the hold ran out, §5.5); otherwise role="status". */
  urgent?: boolean;
  /** ANIM-19: the box opens from 0 height in 200 ms and closes in 120 ms. */
  open?: boolean;
};

export function Notice({
  tone = "calm",
  title,
  children,
  icon = false,
  urgent = false,
  open = true,
}: NoticeProps) {
  const [kept, setKept] = useState(open);
  if (open && !kept) setKept(true);
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setKept(false), 140);
    return () => clearTimeout(timer);
  }, [open]);
  if (!open && !kept) return null;
  return (
    <div className={`${styles.wrap} ${open ? styles.open : ""}`}>
      <div className={styles.clip}>
        <div
          className={`${styles.notice} ${styles[tone]} ${icon ? styles.withIcon : ""}`}
          role={urgent ? "alert" : "status"}
        >
          {icon && (
            <span className={styles.icon} aria-hidden>
              {tone === "error" ? "!" : ""}
            </span>
          )}
          <p className={styles.title}>{title}</p>
          {children && <div className={styles.body}>{children}</div>}
        </div>
      </div>
    </div>
  );
}
