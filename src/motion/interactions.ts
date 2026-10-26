// ANIM-07 (pressables) and ANIM-05 (writable fields) for the whole public site, by one delegated listener.
// Mark elements in markup: data-pressable (= button), "nav", "row"; fields: data-writable on the field box.
// For "nav" and "row" only the child [data-pressable-content] scales (§7E). Actions stay on the native click,
// which browsers fire on release inside the element.
import {
  CANCEL_EASING,
  CANCEL_MS,
  rowsFor,
  startFrom,
  toKeyframes,
  type Input,
  type Kind,
  type Part,
} from "./scale-rows";
import { isMotionReduced } from "./reduced-motion";

const SELECTOR = "[data-pressable], [data-writable]";
const MOVE_CANCEL_PX = 10;

type Press = { el: HTMLElement; input: Input; x: number; y: number };

const running = new WeakMap<HTMLElement, Animation>();

function kindOf(el: HTMLElement): Kind {
  if (el.hasAttribute("data-writable")) return "field";
  const v = el.dataset.pressable;
  return v === "nav" || v === "row" ? v : "button";
}

function targetOf(el: HTMLElement): HTMLElement {
  return el.querySelector<HTMLElement>("[data-pressable-content]") ?? el;
}

function currentScale(target: HTMLElement): number {
  const m = getComputedStyle(target).transform;
  if (!m || m === "none") return 1;
  const a = /matrix\(([^,]+)/.exec(m);
  return a ? parseFloat(a[1]) : 1;
}

function isDisabled(el: HTMLElement): boolean {
  return el.matches(":disabled, [aria-disabled='true'], [aria-busy='true']");
}

function settle(target: HTMLElement, scale: number) {
  target.style.transform = Math.abs(scale - 1) < 1e-3 ? "" : `scale(${scale})`;
  target.style.willChange = "";
  if (scale > 1) target.setAttribute("data-raised", "");
  else target.removeAttribute("data-raised");
}

function play(
  target: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  end: number,
) {
  running.get(target)?.cancel();
  if (isMotionReduced()) {
    settle(target, 1);
    return;
  }
  target.style.willChange = "transform";
  target.setAttribute("data-raised", "");
  const animation = target.animate(keyframes, { fill: "forwards", ...options });
  running.set(target, animation);
  animation.onfinish = () => {
    settle(target, end);
    animation.cancel();
    running.delete(target);
  };
}

function runPart(el: HTMLElement, part: Part, input: Input) {
  const target = targetOf(el);
  const rows = rowsFor(kindOf(el), part, input);
  const from = currentScale(target);
  if (!rows) {
    play(
      target,
      [{ transform: `scale(${from})` }, { transform: "scale(1)" }],
      { duration: 1 },
      1,
    );
    return;
  }
  const shaped = startFrom(rows, from);
  const { keyframes, duration } = toKeyframes(shaped);
  play(
    target,
    keyframes,
    { duration, easing: "linear" },
    shaped[shaped.length - 1][1],
  );
}

/** Back to rest (1.00), or to hover size when a mouse is still on it (§7E Cancel). */
function cancel(el: HTMLElement, input: Input, pointerOn: boolean) {
  const target = targetOf(el);
  const kind = kindOf(el);
  const to =
    input === "mouse" &&
    pointerOn &&
    !(kind === "field" && el.matches(":focus-within"))
      ? rowsFor(kind, "hoverIn", "mouse")!.at(-1)![1]
      : 1;
  play(
    target,
    [
      { transform: `scale(${currentScale(target)})` },
      { transform: `scale(${to})` },
    ],
    { duration: CANCEL_MS, easing: CANCEL_EASING },
    to,
  );
}

const canHover = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const closest = (node: EventTarget | null) =>
  node instanceof Element
    ? (node.closest(SELECTOR) as HTMLElement | null)
    : null;

export function installInteractions(doc: Document = document): () => void {
  let press: Press | null = null;
  let keyboardFocus = false;

  const onPointerOver = (e: PointerEvent) => {
    const el = closest(e.target);
    if (!el || e.pointerType === "touch" || !canHover() || isDisabled(el))
      return;
    if (el.contains(e.relatedTarget as Node | null)) return;
    if (press?.el === el) return;
    if (kindOf(el) === "field" && el.matches(":focus-within")) return;
    runPart(el, "hoverIn", "mouse");
  };

  const onPointerOut = (e: PointerEvent) => {
    const el = closest(e.target);
    if (
      !el ||
      e.pointerType === "touch" ||
      el.contains(e.relatedTarget as Node | null)
    )
      return;
    if (press?.el === el) return; // decided on release
    if (kindOf(el) === "field" && el.matches(":focus-within")) return;
    if (el.matches(":focus-visible") && kindOf(el) !== "field") return; // still keyboard-hovered
    runPart(el, "hoverOut", "mouse");
  };

  const onPointerDown = (e: PointerEvent) => {
    const el = closest(e.target);
    if (!el || e.button !== 0 || isDisabled(el)) return;
    const input: Input = e.pointerType === "touch" ? "touch" : "mouse";
    if (
      kindOf(el) === "field" &&
      input === "mouse" &&
      el.matches(":focus-within")
    )
      return; // typing: stays 1.00
    press = { el, input, x: e.clientX, y: e.clientY };
    runPart(el, "press", input);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!press || press.input !== "touch") return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_CANCEL_PX) {
      cancel(press.el, "touch", false);
      press = null;
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!press) return;
    const { el, input } = press;
    press = null;
    const hit = doc.elementFromPoint(e.clientX, e.clientY);
    if (hit && el.contains(hit)) runPart(el, "release", input);
    else cancel(el, input, false);
  };

  const onPointerCancel = () => {
    if (!press) return;
    cancel(press.el, press.input, false);
    press = null;
  };

  // Keyboard: Tab focus = hover in, blur = hover out (pressables only; fields do not scale, §7C).
  const onKeyDownCapture = (e: KeyboardEvent) => {
    if (e.key === "Tab") keyboardFocus = true;
    const el = closest(e.target);
    if (
      !el ||
      e.repeat ||
      kindOf(el) === "field" ||
      (e.key !== " " && e.key !== "Enter")
    )
      return;
    if (isDisabled(el)) return;
    runPart(el, "press", "mouse");
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const el = closest(e.target);
    if (!el || kindOf(el) === "field" || (e.key !== " " && e.key !== "Enter"))
      return;
    if (isDisabled(el)) return;
    runPart(el, "release", "mouse");
  };
  const onFocusIn = (e: FocusEvent) => {
    const el = closest(e.target);
    if (!el || kindOf(el) === "field" || isDisabled(el)) return;
    if (keyboardFocus && (e.target as Element).matches(":focus-visible"))
      runPart(el, "hoverIn", "mouse");
  };
  const onFocusOut = (e: FocusEvent) => {
    const el = closest(e.target);
    if (
      !el ||
      kindOf(el) === "field" ||
      el.contains(e.relatedTarget as Node | null)
    )
      return;
    if (el.matches(":hover") && canHover()) return;
    if (currentScale(targetOf(el)) !== 1) runPart(el, "hoverOut", "mouse");
  };
  const onPointerAny = () => {
    keyboardFocus = false;
  };

  const listeners: [string, EventListener, boolean][] = [
    ["pointerover", onPointerOver as EventListener, false],
    ["pointerout", onPointerOut as EventListener, false],
    ["pointerdown", onPointerAny, true],
    ["pointerdown", onPointerDown as EventListener, false],
    ["pointermove", onPointerMove as EventListener, false],
    ["pointerup", onPointerUp as EventListener, false],
    ["pointercancel", onPointerCancel, false],
    ["scroll", onPointerCancel, true],
    ["keydown", onKeyDownCapture as EventListener, true],
    ["keyup", onKeyUp as EventListener, false],
    ["focusin", onFocusIn as EventListener, false],
    ["focusout", onFocusOut as EventListener, false],
  ];
  for (const [type, fn, capture] of listeners)
    doc.addEventListener(type, fn, capture);
  return () => {
    for (const [type, fn, capture] of listeners)
      doc.removeEventListener(type, fn, capture);
  };
}
