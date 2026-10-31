"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CakeCard } from "@/components/cake-card/cake-card";
import { Link } from "@/components/ui/link";
import { Pill } from "@/components/ui/pill";
import type { Occasion } from "@/lib/constants";
import {
  CATALOGUE_PAGE,
  catalogueHref,
  catalogueShown,
  countLine,
  inOccasion,
  nextCatalogueCount,
  offeredOccasions,
  parseOccasion,
  type CatalogueCake,
} from "@/lib/catalogue";
import { OCCASIONS } from "@/lib/constants";
import styles from "./catalogue.module.css";

const noSubscription = () => () => {};
const param = (name: string) =>
  new URLSearchParams(window.location.search).get(name);

/** New cards rise in after Show the next (ANIM-17), at most 6 staggered by 40 ms. */
const stagger = (i: number) => `${Math.min(i, 5) * 40}ms`;

/**
 * The pills, the grid and its paging (§4.2). Every visible design is in the page (the page is static and the same
 * for everyone); the browser shows the selected occasion 12 at a time and keeps `?occasion=` and `?shown=` in the
 * address (replaceState), so Back from a cake page comes back to the same cards. Without JavaScript every card shows
 * and the pills and paging are not offered.
 */
export function CatalogueGrid({ cakes }: { cakes: CatalogueCake[] }) {
  const askedOccasion = useSyncExternalStore(
    noSubscription,
    () => param("occasion"),
    () => null,
  );
  const askedShown = useSyncExternalStore(
    noSubscription,
    () => param("shown"),
    () => null,
  );
  // null = not chosen here yet: the address decides.
  const [chosen, setChosen] = useState<{ occasion: Occasion | null } | null>(
    null,
  );
  const [chosenShown, setChosenShown] = useState<number | null>(null);
  const [risenFrom, setRisenFrom] = useState<number | null>(null);
  const firstNew = useRef<HTMLDivElement>(null);

  const offered = offeredOccasions(cakes);
  const requested = chosen
    ? chosen.occasion
    : askedOccasion === null
      ? null
      : (parseOccasion(askedOccasion) ?? null);
  // An occasion asked for by an old link may have no visible cake (§4.2): say so instead of an empty grid.
  const missing =
    requested !== null && !offered.some((o) => o.key === requested);
  const list = missing ? [] : inOccasion(cakes, requested);
  const total = list.length;
  const shown =
    chosenShown ??
    (chosen
      ? Math.min(CATALOGUE_PAGE, total)
      : catalogueShown(askedShown, total));
  const next = nextCatalogueCount(shown, total);
  const visible = new Set(list.slice(0, shown).map((c) => c.slug));

  useEffect(() => {
    if (risenFrom === null) return;
    firstNew.current
      ?.querySelector<HTMLElement>("h3 a")
      ?.focus({ preventScroll: true });
  }, [risenFrom]);

  const write = (occasion: Occasion | null, n: number | null) =>
    window.history.replaceState(
      window.history.state,
      "",
      catalogueHref(occasion, n),
    );

  const pick = (occasion: Occasion | null) => {
    setChosen({ occasion });
    setChosenShown(null);
    setRisenFrom(null);
    write(occasion, null);
  };

  const label = OCCASIONS.find((o) => o.key === requested)?.label;

  return (
    <>
      <div className={styles.pills} role="group" aria-label="Occasion">
        <Pill selected={requested === null} onClick={() => pick(null)}>
          All designs
        </Pill>
        {offered.map((o) => (
          <Pill
            key={o.key}
            selected={requested === o.key}
            onClick={() => pick(o.key)}
          >
            {o.label}
          </Pill>
        ))}
      </div>
      <div className={styles.band}>
        <h2 className="visually-hidden">The designs</h2>
        {missing ? (
          <section className={styles.notice} aria-labelledby="none-showing">
            <h2 id="none-showing" className={styles.noticeTitle}>
              No {label?.toLowerCase()} designs are showing
            </h2>
            <p className={styles.noticeText}>
              Nothing in this occasion is showing right now. Everything else is
              still here, and a bespoke enquiry is open whatever the occasion.
            </p>
            <div className={styles.noticeActions}>
              <button
                type="button"
                className={styles.showAll}
                data-pressable
                onClick={() => pick(null)}
              >
                <span data-pressable-content>Show all designs</span>
              </button>
              <Link href="/bespoke">Or start a bespoke enquiry →</Link>
            </div>
          </section>
        ) : (
          <div className={styles.grid} aria-label="Designs" role="list">
            {cakes.map((cake) => {
              const at = list.indexOf(cake);
              const isNew = risenFrom !== null && at >= risenFrom;
              return (
                <div
                  key={cake.slug}
                  role="listitem"
                  ref={at === risenFrom ? firstNew : undefined}
                  className={`${styles.cell} ${isNew ? styles.rise : ""}`}
                  data-hidden={visible.has(cake.slug) ? undefined : ""}
                  style={
                    isNew
                      ? { animationDelay: stagger(at - risenFrom) }
                      : undefined
                  }
                >
                  <CakeCard cake={cake} variant="catalogue" />
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!missing && (
        <div className={styles.paging}>
          <p className={styles.count} aria-live="polite">
            {countLine(shown, total)}
          </p>
          {next > 0 ? (
            <a
              href={catalogueHref(requested, shown + next)}
              className={`${styles.more} hit-44`}
              data-pressable
              onClick={(e) => {
                e.preventDefault();
                const to = shown + next;
                setRisenFrom(shown);
                setChosenShown(to);
                write(requested, to);
              }}
            >
              <span data-pressable-content>Show the next {next}</span>
            </a>
          ) : (
            total <= CATALOGUE_PAGE && (
              <Link href="/bespoke" className={styles.bespoke}>
                Or start a bespoke enquiry →
              </Link>
            )
          )}
        </div>
      )}
    </>
  );
}
