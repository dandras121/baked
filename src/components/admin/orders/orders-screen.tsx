import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import type { OrderListRow } from "@/db/orders-list-repo";
import {
  listDate,
  ORDER_FILTERS,
  PAGE,
  PHONE_FILTERS,
  STATUS_TAG,
  type OrderFilter,
} from "@/lib/admin/orders";
import { OrderSearch } from "./order-search";
import styles from "./orders.module.css";

/**
 * Orders (§9.4; desktop 934:8201, phone 948:8869): the title with Add an order, the Owner's subtitle, the filter
 * pills, the search, the rows (DATE · CUSTOMER · CAKE · WHERE · PAID · STATUS · →; phone: date, name, cake · town,
 * money), Show 20 more and “Showing {n} of {total}”.
 */
export function OrdersScreen({
  owner,
  subtitle,
  filter,
  q,
  shown,
  rows,
  total,
  today,
}: {
  owner: boolean;
  subtitle: string | null;
  filter: OrderFilter;
  q: string;
  shown: number;
  rows: OrderListRow[];
  total: number;
  today: string;
}) {
  const href = (p: { filter?: OrderFilter; shown?: number; q?: string }) => {
    const u = new URLSearchParams();
    const f = p.filter ?? filter;
    if (f !== "all") u.set("filter", f);
    const query = p.q ?? q;
    if (query) u.set("q", query);
    if (p.shown && p.shown > PAGE) u.set("shown", String(p.shown));
    return `/admin/orders${u.size ? `?${u}` : ""}`;
  };
  const filters = ORDER_FILTERS.filter((f) => owner || f.key !== "topay");
  return (
    <>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {owner && (
          <ButtonLink href="/admin/orders/new" className={styles.add}>
            <span className={styles.wide}>Add an order</span>
            <span className={styles.narrow}>Add</span>
          </ButtonLink>
        )}
      </div>

      <div className={styles.controls}>
        <nav className={styles.filters} aria-label="Show orders">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={href({ filter: f.key, shown: PAGE })}
              scroll={false}
              className={`${styles.pill} ${PHONE_FILTERS.includes(f.key) ? "" : styles.deskOnly}`}
              aria-current={f.key === filter ? "page" : undefined}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <div className={styles.searchRow}>
          <OrderSearch initial={q} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          {q ? (
            <>
              <p>Nothing matches “{q}”</p>
              <Link href={href({ q: "" })} className={styles.emptyLink}>
                Clear the search
              </Link>
            </>
          ) : (
            <p>No orders here yet.</p>
          )}
        </div>
      ) : (
        <>
          <div className={styles.columns} aria-hidden>
            <span>Date</span>
            <span>Customer</span>
            <span className={styles.cakeCol}>Cake</span>
            <span className={styles.whereCol}>Where</span>
            {owner && <span>Paid</span>}
            <span>Status</span>
          </div>
          <ul className={styles.rows}>
            {rows.map((r) => {
              const date = listDate(r.date, today);
              const tag = STATUS_TAG[r.status] ?? r.status;
              return (
                <li key={r.number}>
                  <Link
                    href={`/admin/orders/${r.number}`}
                    className={`${styles.row} ${owner ? "" : styles.helper}`}
                    aria-label={[
                      date,
                      r.name,
                      r.cake,
                      r.where,
                      owner ? r.paid : null,
                      tag,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  >
                    <span className={styles.date}>{date}</span>
                    <span className={styles.name} title={r.name}>
                      {r.name}
                    </span>
                    <span
                      className={`${styles.cell} ${styles.cakeCol}`}
                      title={r.cake}
                    >
                      {r.cake}
                    </span>
                    <span
                      className={`${styles.cell} ${styles.whereCol}`}
                      title={r.where}
                    >
                      {r.where}
                    </span>
                    <span className={styles.what}>
                      {[
                        r.cake,
                        r.where === "Collection" ? "collection" : r.where,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {owner && (
                      <span
                        className={`${styles.paid} ${r.owes ? styles.owes : ""}`}
                      >
                        {r.paid}
                      </span>
                    )}
                    <span className={styles.statusCell}>
                      <span
                        className={`${styles.tag} ${r.status === "cancelled" ? styles.cancelled : ""}`}
                      >
                        {tag}
                      </span>
                    </span>
                    <span className={styles.arrow} aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className={styles.more}>
            {rows.length < total && (
              <ButtonLink
                href={href({ shown: shown + PAGE })}
                scroll={false}
                variant="outline"
                className={styles.moreButton}
              >
                Show 20 more
              </ButtonLink>
            )}
            <p className={styles.showing} aria-live="polite">
              Showing {rows.length} of {total}
            </p>
          </div>
        </>
      )}
    </>
  );
}
