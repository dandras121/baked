import Link from "next/link";
import styles from "@/components/admin/admin-pages.module.css";

// An admin address with nothing behind it, e.g. an order number typed wrong (Proposal). The frame has already begun
// to stream, so the status stays 200; the admin is never indexed (robots).
export default function NotFound() {
  return (
    <>
      <h1 className={styles.title}>Not found</h1>
      <p className={styles.soon}>
        There is nothing at this address — it may have been typed wrong.{" "}
        <Link href="/admin/orders">See all orders</Link>
      </p>
    </>
  );
}
