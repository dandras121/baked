// ANIM-11: the cake card opens in place and closes (ANIMATIONS §7I). Called right after the card's state changed,
// so the page already shows the new state; every motion runs from the other state to it, with transform, opacity
// and the picture's clip only — the card never changes size and nothing around it moves.
import { CARD_CROPS, cropTransform, type CardKind } from "@/lib/card-crop";
import data from "@/motion/keyframes.json";

const K = data.cakeCard;
/** Picture and positions (p). */
const EASE = K.easing;
/** Text sizes, fades (the gentle curve). */
const GENTLE = K.titleSize.easing;
const OPEN_MS = K.openMs;
/** Closing first cross-fades the video to its still (3.4b); everything else waits for it. */
const CLOSE_DELAY = K.closeFadeMs;
const FADE_MS = K.textFadeOut.ms;

function kind(card: HTMLElement): CardKind {
  const w = window.innerWidth;
  if (w >= 1120) return "desktop";
  if (w >= 768) return "tablet";
  return card.dataset.variant === "catalogue" ? "phoneCatalogue" : "phoneHome";
}

const frameTransform = (
  k: CardKind,
  state: "closed" | "open",
  width: number,
) => {
  const { x, y, s } = cropTransform(CARD_CROPS[k][state], width);
  return `translate(${x}px, ${y}px) scale(${s})`;
};

export function animateCard(card: HTMLElement, how: "open" | "close") {
  for (const a of card.getAnimations({ subtree: true })) a.cancel();
  const opening = how === "open";
  const delay = opening ? 0 : CLOSE_DELAY;
  const k = kind(card);
  const timing = (easing: string, extra: KeyframeAnimationOptions = {}) => ({
    duration: OPEN_MS,
    delay,
    easing,
    fill: "backwards" as const,
    ...extra,
  });
  const order = <T>(closed: T, open: T) =>
    opening ? [closed, open] : [open, closed];

  // Picture box: it grows downward (its clip opens); its content zooms from the closed to the open crop.
  const picture = card.querySelector<HTMLElement>(":scope > div")!;
  const media = card.querySelector<HTMLElement>("[data-media]")!;
  const inset = media.offsetHeight - picture.offsetHeight;
  const [c0, c1] = order(
    `inset(0px 0px ${inset}px 0px)`,
    "inset(0px 0px 0px 0px)",
  );
  media.animate([{ clipPath: c0 }, { clipPath: c1 }], timing(EASE));
  const frame = card.querySelector<HTMLElement>("[data-frame]");
  if (frame) {
    const w = media.offsetWidth;
    const [f0, f1] = order(
      frameTransform(k, "closed", w),
      frameTransform(k, "open", w),
    );
    frame.animate([{ transform: f0 }, { transform: f1 }], timing(EASE));
  }

  // Title: the open title travels between the two places — position on p, size on the gentle curve.
  const title = card.querySelector<HTMLElement>("[data-title]")!;
  const openTitle = card.querySelector<HTMLElement>("[data-open-title]");
  const text = card.querySelector<HTMLElement>("[data-open-title-text]");
  if (openTitle && text) {
    const from = title.getBoundingClientRect();
    const to = openTitle.getBoundingClientRect();
    const scale =
      parseFloat(getComputedStyle(title).fontSize) /
      parseFloat(getComputedStyle(text).fontSize);
    const away = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
    const [t0, t1] = order(away, "translate(0px, 0px)");
    const [s0, s1] = order(`scale(${scale})`, "scale(1)");
    const hold = {
      fill: opening ? ("backwards" as const) : ("forwards" as const),
    };
    const a = openTitle.animate(
      [
        { transform: t0, opacity: 1 },
        { transform: t1, opacity: 1 },
      ],
      timing(EASE, hold),
    );
    text.animate([{ transform: s0 }, { transform: s1 }], timing(GENTLE, hold));
    // Closing: the closed title shows again only when the travelling one has arrived.
    if (!opening) {
      title.animate([{ opacity: 0 }, { opacity: 0 }], {
        duration: OPEN_MS + delay,
      });
      a.finished.then(
        () => card.getAnimations({ subtree: true }).forEach((x) => x.cancel()),
        () => {},
      );
    }
  }

  // Description and tiers: a small fade and a slight shrink from their top-left corner (0–250 open, last 250 close).
  for (const el of card.querySelectorAll<HTMLElement>("[data-fade]")) {
    const frames = [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0.5, transform: "scale(0.96)" },
      { opacity: 0, transform: "scale(0.92)" },
    ];
    el.animate(opening ? frames : [...frames].reverse(), {
      duration: FADE_MS,
      delay: opening ? 0 : delay + OPEN_MS - FADE_MS,
      easing: GENTLE,
      fill: "backwards",
    });
  }

  // Corner chevrons: they flip like the phone menu arrow, outward → inward (linear).
  for (const el of card.querySelectorAll<SVGElement>("[data-chevron]")) {
    const [r0, r1] = order("rotateY(0deg)", "rotateY(180deg)");
    el.animate([{ transform: r0 }, { transform: r1 }], timing("linear"));
  }
}
