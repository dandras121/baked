import Link from "next/link";
import { SIGN_IN, SIGN_IN_COPY } from "@/lib/admin/sign-in";
import { formatAdminTime, formatLongDate, londonDate } from "@/lib/london-time";
import styles from "./admin.module.css";

/**
 * A placeholder screen until Today (8.3) and Money (8.8) arrive: the signed-in person, the session line of its last
 * 24 hours (§9.2) and the owner-only notice.
 */
export function AdminStub({
  title,
  member,
  expiresAt,
  notice,
}: {
  title: string;
  member: { name: string; role: string };
  expiresAt: Date;
  notice: "owner" | null;
}) {
  const now = new Date();
  const ending =
    expiresAt.getTime() - now.getTime() < SIGN_IN.warnHours * 60 * 60 * 1000;
  const today = londonDate(now);
  const day = londonDate(expiresAt);
  return (
    <>
      {ending && (
        <p className={styles.ending}>
          Your sign-in ends{" "}
          {day === today ? "today" : formatLongDate(day, today)} at{" "}
          {formatAdminTime(expiresAt)} — sign in again to carry on without a
          break. <Link href="/admin/sign-in?renew=1">Sign in again</Link>
        </p>
      )}
      {notice === "owner" && (
        <p className={styles.notice} role="status">
          {SIGN_IN_COPY.owner}
        </p>
      )}
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.who}>
        {member.name} · {member.role === "owner" ? "Owner" : "Helper"}
      </p>
    </>
  );
}
