"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CakeCard } from "@/components/cake-card/cake-card";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Pill } from "@/components/ui/pill";
import { OCCASIONS, type Occasion } from "@/lib/constants";
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
import {
  SEARCH,
  searchCakes,
  searchCountLine,
  searchText,
} from "@/lib/catalogue-search";
import { SearchField } from "./search-field";
import { useResultMotion } from "./use-result-motion";
import styles from "./catalogue.module.css";

const noSubscription = () => () => {};
const param = (name: string) =>
  new URLSearchParams(window.location.search).get(name);

/** New cards rise in after Show the next (ANIM-17), at most 6 staggered by 40 ms. */
const stagger = (i: number) => `${Math.min(i, 5) * 40}ms`;

type Chosen = { occasion: Occasion | null; q: string };

/**
 * The pills, the search, the grid and its paging (§4.2). Every visible design is in the page (the page is static
 * and the same for everyone); the browser shows the selected occasion and search 12 at a time and keeps
 * `?occasion=`, `?q=` and `?shown=` in the address (replaceState), so Back from a cake page comes back to the
 * same cards. Every result change moves the cards (ANIM-16); Show the next lets new cards rise in (ANIM-17).
 * Without JavaScript every card shows and the pills, search and paging are not offered.
 */
export function CatalogueGrid({ cakes }: { cakes: CatalogueCake[] }) {
  const asked = useSyncExternalStore(
    noSubscription,
    () => window.location.search,
    () => "",
  );
  const fromAddress: Chosen = {
    occasion: asked ? (parseOccasion(param("occasion")) ?? null) : null,
    q: asked ? (param("q") ?? "") : "",
  };
  const askedOccasionKey = asked ? param("occasion") : null;
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [chosenShown, setChosenShown] = useState<number | null>(null);
  const [risenFrom, setRisenFrom] = useState<number | null>(null);
  const firstNew = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const state = chosen ?? fromAddress;
  const offered = offeredOccasions(cakes);
  // An occasion asked for by an old link may have no visible cake (§4.2): say so instead of an empty grid.
  const missingKey =
    !chosen &&
    askedOccasionKey !== null &&
    parseOccasion(askedOccasionKey) !== null &&
    !offered.some((o) => o.key === askedOccasionKey);
  const occasion = missingKey
    ? parseOccasion(askedOccasionKey)
    : state.occasion;
  const text = searchText(state.q);
  const inPill = missingKey ? [] : inOccasion(cakes, occasion);
  const list = text ? searchCakes(inPill, text) : inPill;
  const total = list.length;
  const shown =
    chosenShown ??
    (chosen
      ? Math.min(CATALOGUE_PAGE, total)
      : catalogueShown(asked ? param("shown") : null, total));
  const next = nextCatalogueCount(shown, total);
  const visible = new Set(list.slice(0, shown).map((c) => c.slug));
  const order = new Map(list.map((c, i) => [c.slug, i]));

  const capture = useResultMotion(
    gridRef,
    `${occasion}|${text ?? ""}|${missingKey}`,
  );

  useEffect(() => {
    if (risenFrom === null) return;
    firstNew.current
      ?.querySelector<HTMLElement>("h3 a")
      ?.focus({ preventScroll: true });
  }, [risenFrom]);

  const apply = (next: Chosen) => {
    capture();
    setChosen(next);
    setChosenShown(null);
    setRisenFrom(null);
    window.history.replaceState(
      window.history.state,
      "",
      catalogueHref(next.occasion, null, searchText(next.q)),
    );
  };

  // The search runs 250 ms after the last key (§4.2).
  useEffect(() => {
    if (typed === null) return;
    const timer = setTimeout(() => {
      if (typed === state.q) return;
      apply({ occasion: state.occasion, q: typed });
    }, SEARCH.debounceMs);
    return () => clearTimeout(timer);
    // Only the typing restarts the wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  const label = OCCASIONS.find((o) => o.key === occasion)?.label;
  const searching = text !== null;
  const nothingFound = searching && total === 0 && !missingKey;
  const counted = searching
    ? searchCountLine(shown, total, text, CATALOGUE_PAGE)
    : countLine(shown, total);

  return (
    <>
      <div className={styles.pills} role="group" aria-label="Occasion">
        <Pill
          selected={occasion === null}
          onClick={() => apply({ occasion: null, q: typed ?? state.q })}
        >
          All designs
        </Pill>
        {offered.map((o) => (
          <Pill
            key={o.key}
            selected={occasion === o.key}
            onClick={() => apply({ occasion: o.key, q: typed ?? state.q })}
          >
            {o.label}
          </Pill>
        ))}
      </div>
      <SearchField
        value={typed ?? state.q}
        occasion={occasion}
        onChange={setTyped}
        onClear={() => {
          setTyped("");
          apply({ occasion: state.occasion, q: "" });
        }}
      />
      {searching && !nothingFound && (
        <p className={styles.found} aria-live="polite">
          {counted}
        </p>
      )}
      <div className={styles.band}>
        <h2 className="visually-hidden">The designs</h2>
        {missingKey ? (
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
                onClick={() => apply({ occasion: null, q: state.q })}
              >
                <span data-pressable-content>Show all designs</span>
              </button>
              <Link href="/bespoke">Or start a bespoke enquiry →</Link>
            </div>
          </section>
        ) : nothingFound ? (
          <section
            className={styles.notice}
            aria-labelledby="nothing-found"
            role="status"
          >
            <h2 id="nothing-found" className={styles.noticeTitle}>
              No designs match “{text}”
            </h2>
            <p className={styles.noticeText}>
              Try another word, or ask me for it as a bespoke cake.
            </p>
            <div className={styles.noticeActions}>
              {occasion !== null && (
                <button
                  type="button"
                  className={styles.showAll}
                  data-pressable
                  onClick={() => apply({ occasion: null, q: state.q })}
                >
                  <span data-pressable-content>Search all designs</span>
                </button>
              )}
              <ButtonLink href="/bespoke" variant="outline">
                Start a bespoke enquiry
              </ButtonLink>
            </div>
          </section>
        ) : null}
        <div
          ref={gridRef}
          className={styles.grid}
          aria-label="Designs"
          role="list"
          hidden={missingKey || nothingFound || undefined}
        >
          {[...cakes]
            .sort(
              (a, b) =>
                (order.get(a.slug) ?? Infinity) -
                (order.get(b.slug) ?? Infinity),
            )
            .map((cake) => {
              const at = order.get(cake.slug) ?? -1;
              const isNew = risenFrom !== null && at >= risenFrom;
              return (
                <div
                  key={cake.slug}
                  role="listitem"
                  data-key={cake.slug}
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
      </div>
      {!missingKey && !nothingFound && (
        <div className={styles.paging}>
          {!searching && (
            <p className={styles.count} aria-live="polite">
              {counted}
            </p>
          )}
          {next > 0 ? (
            <a
              href={catalogueHref(occasion, shown + next, text)}
              className={`${styles.more} hit-44`}
              data-pressable
              onClick={(e) => {
                e.preventDefault();
                const to = shown + next;
                setRisenFrom(shown);
                setChosenShown(to);
                window.history.replaceState(
                  window.history.state,
                  "",
                  catalogueHref(occasion, to, text),
                );
              }}
            >
              <span data-pressable-content>Show the next {next}</span>
            </a>
          ) : (
            (total <= CATALOGUE_PAGE || searching) && (
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
