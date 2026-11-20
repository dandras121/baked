// Two people at once (§9.1): every editable record has a version; saving an out-of-date one is refused with who
// changed it and when, and the unsaved inputs are kept beside the new version.
import { formatAdminTime } from "@/lib/london-time";

/** Who made a change: a team member (“member:{name}”), the customer, a payment (Stripe) or the site's own job. */
export type ChangedBy = string | null;

export function conflictLine(by: ChangedBy, at: Date | null): string {
  const when = at ? ` at ${formatAdminTime(at)}` : "";
  if (by?.startsWith("member:"))
    return `${by.slice(7)} changed this${when} — here is the new version`;
  if (by === "customer")
    return `The customer changed this${when} — here is the new version`;
  if (by === "payment")
    return `A payment updated this${when} — here is the new version`;
  return `The site updated this${when} — here is the new version`;
}

export const memberChange = (name: string): ChangedBy => `member:${name}`;
