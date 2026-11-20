import styles from "@/components/admin/admin-pages.module.css";

// While a screen loads, the frame stays and the content area answers at once (§9.1: no motion, a quiet line).
export default function Loading() {
  return (
    <p className={styles.loading} role="status">
      Loading…
    </p>
  );
}
