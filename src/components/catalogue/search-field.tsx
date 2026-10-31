"use client";

import { useRef } from "react";
import type { Occasion } from "@/lib/constants";
import styles from "./catalogue.module.css";

/**
 * The catalogue search field (§4.2; V2 · Search field 1689:12097): a pill with a magnifier, the placeholder
 * “Search by name or flavour” and × once something is typed. It is a writable field (ANIM-05). × or Esc clears it
 * and keeps the focus; the phone's Search key closes the keyboard. Filtering happens as you type (the grid).
 */
export function SearchField({
  value,
  occasion,
  onChange,
  onClear,
}: {
  value: string;
  occasion: Occasion | null;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      role="search"
      action="/cakes"
      className={styles.searchForm}
      onSubmit={(e) => {
        e.preventDefault();
        input.current?.blur();
      }}
    >
      {occasion && <input type="hidden" name="occasion" value={occasion} />}
      <div className={styles.search} data-writable>
        <svg className={styles.magnifier} viewBox="0 0 20 20" aria-hidden>
          <circle cx="8.5" cy="8.5" r="6" />
          <path d="m13 13 5 5" />
        </svg>
        <label htmlFor="cake-search" className="visually-hidden">
          Search the cakes
        </label>
        <input
          ref={input}
          id="cake-search"
          type="search"
          name="q"
          maxLength={60}
          placeholder="Search by name or flavour"
          autoComplete="off"
          enterKeyHint="search"
          className={styles.searchInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.preventDefault();
              onClear();
            }
          }}
        />
        {value && (
          <button
            type="button"
            className={`${styles.clear} hit-44`}
            aria-label="Clear the search"
            onClick={() => {
              onClear();
              input.current?.focus();
            }}
          >
            <svg viewBox="0 0 28 28" aria-hidden>
              <path d="M9.5 9.5 18.5 18.5M18.5 9.5 9.5 18.5" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
