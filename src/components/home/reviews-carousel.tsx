"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { SliderIndicator } from "@/components/ui/slider-indicator";
import {
  REVIEWS_PAGE,
  starGlyphs,
  starsLabel,
  type ReviewCard,
} from "@/lib/reviews";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./reviews.module.css";

/** Cards kept in the page on each side of the active one (about one screen); the rest are empty slots. */
const WINDOW = 6;
/** Load the next page when the active card is this close to the last loaded one (§4.1). */
const PREFETCH = 3;
const RETRY_MS = 3000;

type Props = { total: number; first: ReviewCard[]; reviewsUrl: string | null };

/**
 * The testimonial row (§4.1, ANIM-10 “Testimonials = all Google reviews”): laid out for every review from
 * the start, so swiping, arrows and the dashes never jump; only the cards near the view are in the page;
 * the next six arrive from /api/reviews when the visitor gets within three cards of the last loaded one.
 * Each card is pressable and on release scrolls itself to the centre.
 */
export function ReviewsCarousel({ total, first, reviewsUrl }: Props) {
  const [cards, setCards] = useState<(ReviewCard | undefined)[]>(() => {
    const all = new Array<ReviewCard | undefined>(total).fill(undefined);
    first.forEach((c, i) => (all[i] = c));
    return all;
  });
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);
  const track = useRef<HTMLUListElement>(null);
  const loaded = cards.findIndex((c) => c === undefined);
  const loadedCount = loaded === -1 ? total : loaded;

  // One request at a time; a failure retries once after 3 s, then the arrows stop at the last loaded card.
  const load = useCallback(async () => {
    if (loading.current || loadedCount >= total) return;
    loading.current = true;
    const attempt = async () => {
      const res = await fetch(
        `/api/reviews?after=${loadedCount}&limit=${REVIEWS_PAGE}`,
      );
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { reviews: ReviewCard[] };
    };
    try {
      let data: { reviews: ReviewCard[] };
      try {
        data = await attempt();
      } catch {
        await new Promise((r) => setTimeout(r, RETRY_MS));
        data = await attempt();
      }
      setCards((prev) => {
        const next = [...prev];
        data.reviews.forEach((c, i) => {
          if (loadedCount + i < next.length) next[loadedCount + i] = c;
        });
        return next;
      });
      setFresh((prev) => new Set([...prev, ...data.reviews.map((c) => c.id)]));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      loading.current = false;
    }
  }, [loadedCount, total]);

  // The latest `load` and position for the scroll handler and for the next page after a load.
  const loadRef = useRef(load);
  const activeRef = useRef(0);
  const loadedRef = useRef(loadedCount);
  useEffect(() => {
    loadRef.current = load;
    loadedRef.current = loadedCount;
    // A page arrived while the visitor was already near its end: fetch the next one.
    if (activeRef.current >= loadedCount - PREFETCH) void load();
  }, [load, loadedCount]);

  /** The distance between two cards, from the layout. */
  const pitch = () => {
    const slots = track.current?.children;
    if (!slots || slots.length < 2) return 1;
    return (
      (slots[1] as HTMLElement).offsetLeft -
      (slots[0] as HTMLElement).offsetLeft
    );
  };

  // The active card is the one nearest the centre.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.min(
          total - 1,
          Math.max(0, Math.round(el.scrollLeft / pitch())),
        );
        activeRef.current = i;
        setActive(i);
        if (i >= loadedRef.current - PREFETCH) void loadRef.current();
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [total]);

  const last = failed ? Math.max(0, loadedCount - 1) : total - 1;

  const go = useCallback(
    (index: number) => {
      const el = track.current;
      if (!el) return;
      const i = Math.min(Math.max(index, 0), last);
      el.scrollTo({
        left: i * pitch(),
        behavior: isMotionReduced() ? "auto" : "smooth",
      });
    },
    [last],
  );

  const several = total > 1;

  return (
    <div className={styles.carousel}>
      <ul ref={track} className={styles.track} aria-label="Google reviews">
        {cards.map((card, i) => {
          const near = Math.abs(i - active) <= WINDOW;
          return (
            <li
              key={i}
              className={styles.slot}
              aria-label={
                card && near ? `Review ${i + 1} of ${total}` : undefined
              }
              aria-hidden={card && near ? undefined : true}
              data-review-slot={i}
            >
              {card && near ? (
                <Review
                  card={card}
                  fresh={fresh.has(card.id)}
                  reviewsUrl={reviewsUrl}
                  onRelease={() => go(i)}
                />
              ) : (
                <div className={`${styles.card} ${styles.shape}`} />
              )}
            </li>
          );
        })}
      </ul>
      {several && (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.prev} hit-44`}
            data-pressable
            aria-label="Previous review"
            aria-disabled={active <= 0 || undefined}
            onClick={() => active > 0 && go(active - 1)}
          >
            <Chevron flip />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.next} hit-44`}
            data-pressable
            aria-label="Next review"
            aria-disabled={active >= last || undefined}
            onClick={() => active < last && go(active + 1)}
          >
            <Chevron />
          </button>
          <div className={styles.indicator}>
            <SliderIndicator
              count={total}
              active={active}
              onSelect={go}
              label={(i, n) => `Review ${i + 1} of ${n}`}
            />
          </div>
        </>
      )}
    </div>
  );
}

const Review = memo(function Review({
  card,
  fresh,
  reviewsUrl,
  onRelease,
}: {
  card: ReviewCard;
  fresh: boolean;
  reviewsUrl: string | null;
  onRelease: () => void;
}) {
  const quote = useRef<HTMLParagraphElement>(null);
  const article = useRef<HTMLElement>(null);

  // A text longer than the drawn four lines is cut, and “Read on Google →” takes the last line (§4.1).
  // Measured again when the web font arrives and whenever the card changes size.
  useLayoutEffect(() => {
    const q = quote.current;
    const a = article.current;
    if (!q || !a) return;
    const measure = () => {
      delete a.dataset.cut;
      if (q.scrollHeight > q.clientHeight + 1) a.dataset.cut = "";
    };
    measure();
    let live = true;
    void document.fonts?.ready.then(() => live && measure());
    const ro = new ResizeObserver(measure);
    ro.observe(a);
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [card.text]);

  return (
    <article
      ref={article}
      className={`${styles.card} ${fresh ? styles.fresh : ""}`}
      data-pressable=""
      data-review-card
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        onRelease();
      }}
    >
      <p ref={quote} className={styles.quote}>
        “{card.text}”
      </p>
      {reviewsUrl && (
        <a
          href={reviewsUrl}
          target="_blank"
          rel="noopener"
          className={styles.readMore}
          data-read-more
        >
          Read on Google →
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      )}
      <footer className={styles.author}>
        <p className={styles.name}>{card.name}</p>
        <p className={styles.meta}>
          <span aria-hidden>
            {starGlyphs(card.stars)} · {card.month}
          </span>
          <span className="visually-hidden">
            {starsLabel(card.stars)} · {card.month}
          </span>
        </p>
      </footer>
    </article>
  );
});

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 9.39 16.78"
      className={styles.chevron}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <path
        d="M1 1L8.39 8.39L1 15.78"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
