"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { reorderCakesAction } from "@/app/admin/(shell)/cakes/actions";
import { ButtonLink } from "@/components/ui/button";
import type { AdminCake } from "@/db/admin-cakes-repo";
import {
  CAKE_FILTERS,
  cakesCount,
  moved,
  shownCakes,
  sizeSummary,
  type CakeFilter,
} from "@/lib/admin/cakes";
import styles from "./cakes.module.css";

/**
 * Cakes (§9.13; desktop 940:8399, phone 948:8933), Owner only: the count, Add a cake, the filters (desktop), the
 * search, the rows in Linda's order with ⠿ (only with All and no search; pointer or arrow keys; saved at once).
 */
export function CakesScreen({
  initial,
  notice = null,
}: {
  initial: AdminCake[];
  /** After Save, Delete or Hide on Add or edit a cake (§9.13). */
  notice?: string | null;
}) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [filter, setFilter] = useState<CakeFilter>("all");
  const [query, setQuery] = useState("");
  const [said, setSaid] = useState("");
  const [line, setLine] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [, start] = useTransition();
  // The handle that was moved keeps the focus once its row is in its new place.
  const [refocus, setRefocus] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (refocus === null) return;
    document.getElementById(`move-${refocus}`)?.focus();
  }, [list, refocus]);
  const rows = useRef(new Map<number, HTMLLIElement>());
  const count = cakesCount(list);
  const canMove = filter === "all" && !query.trim();
  const shown = canMove ? list : shownCakes(list, filter, query);

  const save = (next: AdminCake[], before: AdminCake[]) =>
    start(async () => {
      setLine(null);
      const r = await reorderCakesAction(next.map((c) => c.id)).catch(
        () => ({ kind: "failed" }) as const,
      );
      if (r.kind === "saved") return;
      setList(before);
      router.refresh();
      setLine(
        r.kind === "signed-out"
          ? "You are signed out — nothing was moved. Sign in again, then move it again."
          : r.kind === "changed"
            ? "The list had changed — here is the latest order. Nothing was moved."
            : "Nothing was moved — please try again.",
      );
    });

  // Arrow up / down on a focused handle moves that cake one place and saves.
  const keyMove = (index: number, by: number) => {
    const next = moved(list, index, index + by);
    if (next === list) return;
    const before = list;
    setList(next);
    setSaid(
      `${list[index].name} moved to ${index + by + 1} of ${list.length}.`,
    );
    save(next, before);
    setRefocus(list[index].id);
  };

  // Pointer drag: the row follows the pointer through the list; the order is saved on release.
  const startDrag = (e: React.PointerEvent, id: number) => {
    if (!canMove) return;
    e.preventDefault();
    setRefocus(null);
    const before = list;
    let current = list;
    setDragging(id);
    const onMove = (ev: PointerEvent) => {
      const from = current.findIndex((c) => c.id === id);
      let to = from;
      for (const [i, c] of current.entries()) {
        const el = rows.current.get(c.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (ev.clientY > r.top + r.height / 2) to = i;
      }
      if (
        ev.clientY <
        (rows.current.get(current[0].id)?.getBoundingClientRect().top ?? 0)
      )
        to = 0;
      if (to !== from) {
        current = moved(current, from, to);
        setList(current);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDragging(null);
      if (current.map((c) => c.id).join() !== before.map((c) => c.id).join()) {
        const at = current.findIndex((c) => c.id === id);
        setSaid(`${current[at].name} moved to ${at + 1} of ${current.length}.`);
        save(current, before);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Cakes</h1>
          <p className={styles.subtitle}>
            {count.designs} · {count.showing}
            <span className={styles.wide}>
              {" "}
              on the site · drag ⠿ to change the order — the first five show on
              the home page
            </span>
            <span className={styles.narrow}> · drag ⠿ to reorder</span>
          </p>
        </div>
        <ButtonLink href="/admin/cakes/new" className={styles.add}>
          <span className={styles.wide}>Add a cake</span>
          <span className={styles.narrow}>Add</span>
        </ButtonLink>
      </div>

      <div className={styles.filters} role="group" aria-label="Show">
        {CAKE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={styles.pill}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className={styles.searchRow}>
        <input
          type="search"
          className={styles.search}
          aria-label="Search by name or flavour"
          placeholder="Search by name or flavour"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {notice && !line && (
        <p className={styles.saved} role="status">
          {notice}
        </p>
      )}
      {line && (
        <p className={styles.alert} role="alert">
          {line}
        </p>
      )}
      <p id="move-help" className={styles.visuallyHidden}>
        Use the arrow keys to move the cake up or down. The new order is saved
        at once.
      </p>
      <p className={styles.visuallyHidden} aria-live="polite">
        {said}
      </p>

      {shown.length === 0 ? (
        <p className={styles.empty}>
          No cake matches — try another word or filter.
        </p>
      ) : (
        <ul className={styles.rows}>
          {shown.map((c) => (
            <li
              key={c.id}
              ref={(el) => {
                if (el) rows.current.set(c.id, el);
                else rows.current.delete(c.id);
              }}
              className={`${styles.row} ${dragging === c.id ? styles.dragging : ""}`}
            >
              {canMove && (
                <button
                  id={`move-${c.id}`}
                  type="button"
                  className={styles.handle}
                  aria-label={`Move ${c.name}`}
                  aria-describedby="move-help"
                  onPointerDown={(e) => startDrag(e, c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                      e.preventDefault();
                      keyMove(
                        list.findIndex((x) => x.id === c.id),
                        e.key === "ArrowUp" ? -1 : 1,
                      );
                    }
                  }}
                >
                  <svg viewBox="0 0 8 14" width="8" height="14" aria-hidden>
                    {[1, 7].flatMap((x) =>
                      [1, 7, 13].map((y) => (
                        <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" />
                      )),
                    )}
                  </svg>
                </button>
              )}
              {/* The photo slot: the card photo comes with the media slice (9.2). */}
              <span className={styles.thumb} aria-hidden />
              <span className={styles.name}>{c.name}</span>
              <span className={styles.size}>{sizeSummary(c)}</span>
              <span
                className={`${styles.tag} ${c.visible ? styles.showing : styles.hidden}`}
              >
                {c.visible ? "Showing" : "Hidden"}
              </span>
              {/* Desktop: the drawn Edit button; phone: the whole row opens the cake (948:8933 draws no button). */}
              <ButtonLink
                href={`/admin/cakes/${c.id}`}
                variant="outline"
                className={styles.edit}
              >
                Edit<span className={styles.visuallyHidden}> {c.name}</span>
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
