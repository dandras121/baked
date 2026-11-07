// Every e-mail template by name (§8.1), with what it needs from the database. /dev/emails renders each one with
// sample data ({ sample: true }); the queue renders it again at every attempt (§8.4 Failures).
import type { Email } from "@/lib/mail/layout";
import { orderConfirmedEmail, SAMPLE_ORDER } from "@/lib/mail/order-confirmed";
import { TEMPLATES as PLAIN } from "@/lib/mail/templates";
import type { connect } from "./client";
import { readLegalRevision } from "./legal-repo";
import { orderMailView } from "./order-mail-repo";

type Db = ReturnType<typeof connect>["db"];
type Data = Record<string, unknown>;
export type Template = (
  data: Data,
  db: Db,
  origin: string,
) => Promise<Email | null>;

export const TEMPLATES: Record<string, Template> = {
  sample: async (d) => PLAIN.sample(d),
  /** E-mail 1 · Order confirmed: data { orderId } (or { sample: true }). */
  "order-confirmed": async (d, db, origin) => {
    if (d.sample) {
      // The sample with the current Terms and Cancellations, so its PDFs can be opened in /dev/mail.
      const [t, c] = await Promise.all([
        readLegalRevision(db, "terms"),
        readLegalRevision(db, "cancellations"),
      ]);
      return orderConfirmedEmail(
        {
          ...SAMPLE_ORDER,
          terms: t && { id: t.id, updatedOn: t.updatedOn },
          cancellations: c && { id: c.id, updatedOn: c.updatedOn },
        },
        origin,
      );
    }
    const view = await orderMailView(db, Number(d.orderId));
    return view && orderConfirmedEmail(view, origin);
  },
};

export const SAMPLES: { template: string; title: string; data: Data }[] = [
  {
    template: "order-confirmed",
    title: "1 · Order confirmed (1800:13257)",
    data: { sample: true },
  },
  {
    template: "sample",
    title:
      "Layout sample — every part of the frame (drawn as e-mail 2, 1128:9160)",
    data: {},
  },
];
