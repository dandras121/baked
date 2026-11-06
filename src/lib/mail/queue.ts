// Retries and deadlines (§8.4 Failures): retried with backoff until the e-mail's deadline; after it nothing is sent.

/** 1, 2, 4, 8 … minutes, at most 30, after the n-th failed attempt. */
export const backoffMs = (attempts: number) =>
  Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 30 * 60_000);

/** A row found due at `now`: send it, or it is past its deadline (“Failed — too late” when never tried). */
export function whenDue(
  row: { attempts: number; deadline: Date },
  now: Date,
): "send" | "failed" | "failed-too-late" {
  if (now.getTime() < row.deadline.getTime()) return "send";
  return row.attempts === 0 ? "failed-too-late" : "failed";
}

/** After a failed attempt: try again after the backoff, unless that is past the deadline or the error is final. */
export function afterFailure(
  attempts: number,
  now: Date,
  deadline: Date,
  retry: boolean,
): { status: "queued" | "failed"; nextAttemptAt: Date } {
  const next = new Date(now.getTime() + backoffMs(attempts));
  if (!retry || next.getTime() >= deadline.getTime())
    return { status: "failed", nextAttemptAt: next };
  return { status: "queued", nextAttemptAt: next };
}

/** “All others 24 hours” (§8.4 Failures); the e-mails with their own deadline pass it when they are queued. */
export const DEFAULT_DEADLINE_MS = 24 * 60 * 60_000;
