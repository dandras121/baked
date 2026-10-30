"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import data from "@/motion/keyframes.json";
import { overlayKind } from "@/motion/input-type";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./overlay.module.css";

const m = data.surfaceMotion;
// The JSON appendix names the sheet curve and the sheet timings with the same key; the timings win, so the curve
// is written here (ANIM-13: cubic-bezier(0.32, 0.72, 0, 1)).
const EASE_SHEET = "cubic-bezier(0.32, 0.72, 0, 1)";
const SWIPE_FRACTION = m.sheet.swipeCloseFraction; // a third of the sheet
const FLICK_PX_PER_MS = 0.5; // a fast flick closes too (Proposal)

type OverlayProps = {
  open: boolean;
  /** Esc, scrim, swipe down or an action asked to close; the parent sets open = false. */
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** The buttons; the first one gets the focus. */
  children: ReactNode;
  /** Force a kind (tests, previews); by default it follows the input (RESPONSIVE §1). */
  kind?: "dialog" | "sheet";
  /** Own layout for a panel that is more than a confirm (e.g. the cookie settings). */
  classNames?: {
    panel?: string;
    title?: string;
    description?: string;
    body?: string;
  };
};

type Part = { panel: HTMLElement; scrim: HTMLElement };

function current(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return {
    transform: cs.transform === "none" ? "none" : cs.transform,
    opacity: cs.opacity,
  };
}

/**
 * Dialog (ANIM-12: 240 ms in, scale 0.96 → 1; 160 ms out) and bottom sheet (ANIM-13: 320 ms up; 240 ms down;
 * swipe down to close). A modal <dialog> in the browser's top layer: the page behind is inert (focus stays inside),
 * Esc closes, the page does not scroll, and focus goes back to the opener (SITE-FLOWS §0.6).
 */
export function Overlay({
  open,
  onClose,
  title,
  description,
  children,
  kind: forced,
  classNames = {},
}: OverlayProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [kind, setKind] = useState<"dialog" | "sheet">(forced ?? "dialog");
  const [mounted, setMounted] = useState(open);
  const titleId = useId();
  const descId = useId();

  if (open && !mounted) setMounted(true);

  const parts = (): Part | null =>
    panelRef.current && scrimRef.current
      ? { panel: panelRef.current, scrim: scrimRef.current }
      : null;

  const animateIn = useCallback((p: Part, which: "dialog" | "sheet") => {
    if (isMotionReduced()) return;
    const panelFrom = current(p.panel);
    const scrimFrom = getComputedStyle(p.scrim).opacity;
    if (which === "dialog") {
      p.panel.animate(
        [
          {
            opacity: panelFrom.opacity === "1" ? 0 : panelFrom.opacity,
            transform:
              panelFrom.transform === "none"
                ? "scale(0.96)"
                : panelFrom.transform,
          },
          { opacity: 1, transform: "none" },
        ],
        { duration: m.dialog.openMs, easing: m.easeOut },
      );
    } else {
      p.panel.animate(
        [
          {
            transform:
              panelFrom.transform === "none"
                ? "translateY(100%)"
                : panelFrom.transform,
          },
          { transform: "none" },
        ],
        {
          duration: m.sheet.openMs,
          easing: EASE_SHEET,
        },
      );
    }
    p.scrim.animate(
      [{ opacity: scrimFrom === "1" ? 0 : scrimFrom }, { opacity: 1 }],
      {
        duration: which === "dialog" ? m.dialog.openMs : m.sheet.openMs,
        easing: m.easeOut,
      },
    );
  }, []);

  // Open: choose the kind from the input, show the modal, play the way in.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog || dialog.open) return;
    const which = forced ?? overlayKind(window.innerWidth);
    setKind(which);
    opener.current = document.activeElement;
    document.documentElement.dataset.overlayOpen = "";
    dialog.showModal();
    const p = parts();
    if (p) animateIn(p, which);
  }, [open, mounted, forced, animateIn]);

  // Close: play the way out from where it is, then close the modal and give the focus back.
  useEffect(() => {
    const dialog = ref.current;
    if (open || !dialog?.open) return;
    const p = parts();
    const finish = () => {
      dialog.close();
      delete document.documentElement.dataset.overlayOpen;
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
      setMounted(false);
    };
    if (!p || isMotionReduced()) return finish();
    for (const a of [...p.panel.getAnimations(), ...p.scrim.getAnimations()]) {
      a.commitStyles();
      a.cancel();
    }
    const from = current(p.panel);
    const to =
      kind === "dialog"
        ? { opacity: 0, transform: `scale(${m.dialog.closeScale})` }
        : { opacity: 1, transform: "translateY(100%)" };
    const duration = kind === "dialog" ? m.dialog.closeMs : m.sheet.closeMs;
    const out = p.panel.animate([from, to], {
      duration,
      easing: m.easeIn,
      fill: "forwards",
    });
    p.scrim.animate(
      [{ opacity: getComputedStyle(p.scrim).opacity }, { opacity: 0 }],
      { duration, easing: m.easeIn, fill: "forwards" },
    );
    out.onfinish = () => {
      p.panel.style.transform = "";
      p.panel.style.opacity = "";
      p.scrim.style.opacity = "";
      for (const a of [...p.panel.getAnimations(), ...p.scrim.getAnimations()])
        a.cancel();
      finish();
    };
  }, [open, kind]);

  // Swipe down on the sheet (ANIM-13).
  const drag = useRef<{
    y: number;
    t: number;
    dy: number;
    height: number;
  } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (kind !== "sheet" || e.pointerType !== "touch" || !panelRef.current)
      return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select"))
      return;
    drag.current = {
      y: e.clientY,
      t: e.timeStamp,
      dy: 0,
      height: panelRef.current.offsetHeight,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !panelRef.current || !scrimRef.current) return;
    d.dy = Math.max(0, e.clientY - d.y);
    panelRef.current.style.transform = `translateY(${d.dy}px)`;
    scrimRef.current.style.opacity = String(1 - d.dy / d.height);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !panelRef.current || !scrimRef.current) return;
    const speed = d.dy / Math.max(1, e.timeStamp - d.t);
    if (d.dy > d.height * SWIPE_FRACTION || speed > FLICK_PX_PER_MS) {
      onClose(); // the close runs from here
      return;
    }
    const p = { panel: panelRef.current, scrim: scrimRef.current };
    p.panel.style.transform = "";
    p.scrim.style.opacity = "";
    if (!isMotionReduced()) {
      p.panel.animate(
        [{ transform: `translateY(${d.dy}px)` }, { transform: "none" }],
        {
          duration: m.sheet.openMs,
          easing: EASE_SHEET,
        },
      );
    }
  };

  if (!mounted) return null;
  return (
    <dialog
      ref={ref}
      className={`${styles.overlay} ${styles[kind]}`}
      data-kind={kind}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault(); // Esc: run our own close
        onClose();
      }}
    >
      <div ref={scrimRef} className={styles.scrim} onClick={onClose} />
      <div
        ref={panelRef}
        className={`${styles.panel} ${classNames.panel ?? ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {kind === "sheet" && <span className={styles.grabber} aria-hidden />}
        <h2 id={titleId} className={classNames.title ?? styles.title}>
          {title}
        </h2>
        {description && (
          <div
            id={descId}
            className={classNames.description ?? styles.description}
          >
            {description}
          </div>
        )}
        <div className={classNames.body ?? styles.actions}>{children}</div>
      </div>
    </dialog>
  );
}
