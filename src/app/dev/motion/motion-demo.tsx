"use client";

import { useRef, useState } from "react";
import { createInputLock } from "@/motion/input-lock";
import styles from "./motion-page.module.css";

const ACTION_MS = 600;

export function MotionDemo() {
  const [clicks, setClicks] = useState(0);
  const [locked, setLocked] = useState(0);
  const [reduced, setReduced] = useState(false);
  const lock = useRef(createInputLock());

  const onLockedClick = () => {
    const ran = lock.current.run(async () => {
      setLocked((n) => n + 1);
      await new Promise((r) => setTimeout(r, ACTION_MS));
    });
    if (!ran) return;
  };

  const toggleReduced = () => {
    const next = !reduced;
    setReduced(next);
    if (next) document.documentElement.dataset.motion = "reduce";
    else delete document.documentElement.dataset.motion;
  };

  return (
    <div className={styles.page}>
      <h1 className="type-wordmark">Interaction and motion</h1>
      <p>
        Compare with the Figma storyboards ANIM-07 (1722:12049) and ANIM-05
        (1692:12074). With a mouse: hover grows, a press brings it back, the
        release springs. On a phone: a press shrinks it, the release springs
        back.
      </p>

      <section className={styles.row} aria-labelledby="button-h">
        <h2 id="button-h" className="type-heading-sm">
          Button (ANIM-07)
        </h2>
        <button
          type="button"
          className={styles.solid}
          data-pressable
          data-testid="button"
          onClick={() => setClicks((n) => n + 1)}
        >
          Order a cake
        </button>
        <p className="type-meta" aria-live="polite" data-testid="clicks">
          Clicked {clicks} times (the action runs on release)
        </p>
      </section>

      <section className={styles.row} aria-labelledby="nav-h">
        <h2 id="nav-h" className="type-heading-sm">
          Navigation item (grows 15 %)
        </h2>
        <a
          href="#nav-h"
          className={styles.nav}
          data-pressable="nav"
          data-testid="nav"
        >
          <span data-pressable-content>Cakes</span>
        </a>
      </section>

      <section className={styles.row} aria-labelledby="row-h">
        <h2 id="row-h" className="type-heading-sm">
          Row-shaped (only the content grows)
        </h2>
        <button
          type="button"
          className={styles.fullRow}
          data-pressable="row"
          data-testid="row"
        >
          <span data-pressable-content>How far ahead should I order? ⌄</span>
        </button>
      </section>

      <section className={styles.row} aria-labelledby="field-h">
        <h2 id="field-h" className="type-heading-sm">
          Writable field (ANIM-05)
        </h2>
        <label className={styles.label} htmlFor="demo-field">
          YOUR NAME
        </label>
        <div className={styles.field} data-writable data-testid="field">
          <input
            id="demo-field"
            className={styles.input}
            placeholder="Your name"
            autoComplete="off"
          />
        </div>
      </section>

      <section className={styles.row} aria-labelledby="lock-h">
        <h2 id="lock-h" className="type-heading-sm">
          Input lock (A§1.5)
        </h2>
        <button
          type="button"
          className={styles.solid}
          data-pressable
          data-testid="locked"
          onClick={onLockedClick}
        >
          Double-click me
        </button>
        <p className="type-meta" aria-live="polite" data-testid="locked-count">
          Action ran {locked} times (a second click within {ACTION_MS} ms is
          ignored)
        </p>
      </section>

      <section className={styles.row} aria-labelledby="reduce-h">
        <h2 id="reduce-h" className="type-heading-sm">
          Reduced motion (A§1.4)
        </h2>
        <button
          type="button"
          className={styles.outline}
          data-pressable
          aria-pressed={reduced}
          data-testid="reduce"
          onClick={toggleReduced}
        >
          {reduced ? "Reduced motion: on" : "Reduced motion: off"}
        </button>
        <p className="type-meta">
          Also follows the device setting (Reduce motion).
        </p>
      </section>
    </div>
  );
}
