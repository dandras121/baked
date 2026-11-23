// Edit the order (§9.7, manual orders): the Add an order form with every field but Paid so far. Saved with the version
// check; a full or closed day is the Owner's; a Helper changes the date, window, address, inscription and collection
// time only. A higher total only raises still to pay (no automatic e-mail 15); a total below what was paid asks first,
// then the card part goes back at once and the rest is Linda's to give back by hand (Money flags it, §9.9).
import { eq } from "drizzle-orm";
import {
  dayWarnings,
  sizeLine,
  type AddOrderValue,
} from "@/lib/admin/add-order";
import { newEarliest } from "@/lib/admin/change-order";
import { memberChange } from "@/lib/admin/versions";
import { allergenLine } from "@/lib/cake-config";
import type { ChangeView } from "@/lib/mail/after-emails";
import { formatAdminMoney } from "@/lib/money";
import { formatLongDate, londonDate } from "@/lib/london-time";
import type { Gateway } from "@/lib/payments";
import { WINDOWS } from "@/lib/handover";
import { dayInfo } from "./add-order-repo";
import { withdrawLinksAbove } from "./admin-pay-link-repo";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { cardRefundable, netPaid, refundOrder } from "./refund-repo";
import { orderChanges, orderHistory, orderLines, orders } from "./schema";
import { readSettings } from "./settings-repo";
import { saveOrderVersioned } from "./versioned";

type Db = ReturnType<typeof connect>["db"];

export type EditResult =
  | { kind: "saved"; emailed: boolean; refundOk: boolean; handPence: number }
  | {
      kind: "confirm-refund";
      lessPence: number;
      cardPence: number;
      handPence: number;
    }
  | { kind: "nothing" }
  | { kind: "conflict"; line: string }
  | { kind: "closed" }
  | { kind: "owner-only"; warnings: string[] };

const money = (p: number) => formatAdminMoney(p, "breakdown");
const times = (k: string | null) =>
  WINDOWS.find((w) => w.key === k)?.times ?? "—";
const where = (v: {
  address: string | null;
  town: string | null;
  postcode: string | null;
}) =>
  [v.address, [v.town, v.postcode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ") || "—";

export async function editManualOrder(
  db: Db,
  gw: Pick<Gateway, "refund"> & Partial<Pick<Gateway, "cancel">>,
  input: {
    orderId: number;
    seenVersion: number;
    by: string;
    owner: boolean;
    value: AddOrderValue;
    confirmRefund: boolean;
  },
  now = new Date(),
): Promise<EditResult> {
  const today = londonDate(now);
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));
  if (!o || o.kind !== "manual" || o.status !== "confirmed")
    return { kind: "closed" };
  const [line] = await db
    .select()
    .from(orderLines)
    .where(eq(orderLines.orderId, o.id))
    .orderBy(orderLines.position);
  const old = { snapshot: (o.snapshot ?? {}) as { alsoContains?: string } };
  // A Helper's edit keeps everything but the date, window, address, inscription and collection time (Decided D9).
  const v: AddOrderValue = input.owner
    ? input.value
    : {
        ...input.value,
        name: o.customerName,
        email: o.email,
        phone: o.phone,
        phoneE164: o.phoneE164,
        what: line.name,
        serves: Number(/serves\s+(\d+)/.exec(line.sizeLine)?.[1] ?? 1),
        tiers: input.value.tiers,
        allergens: line.allergenKeys as AddOrderValue["allergens"],
        alsoContains: old.snapshot.alsoContains ?? "",
        allergyNote: o.allergyNote,
        totalPence: o.totalPence,
        customerEmails: o.customerEmails,
      };
  const s = await readSettings(db);
  const newSize = input.owner ? sizeLine(v.tiers, v.serves) : line.sizeLine;
  const newAllergen = allergenLine(
    { allergens: v.allergens, alsoContains: v.alsoContains || undefined },
    [],
    { picks: {}, texts: {} },
    s.kitchenHandles,
  );
  const message = v.inscription || null;

  // Old → new rows: what the customer hears of (e-mail 12), and the contact details (no e-mail for those alone).
  const rows: [string, string, string][] = [];
  const contact: [string, string, string][] = [];
  const add = (
    to: typeof rows,
    what: string,
    a: string | null,
    b: string | null,
  ) => {
    if ((a ?? "") !== (b ?? "")) to.push([what, a || "—", b || "—"]);
  };
  add(
    rows,
    "Date",
    formatLongDate(String(o.date), today),
    formatLongDate(v.date, today),
  );
  add(
    rows,
    "Handover",
    o.handover === "delivery" ? "Delivery" : "Collection",
    v.handover === "delivery" ? "Delivery" : "Collection",
  );
  if (v.handover === "delivery") {
    add(rows, "Window", times(o.deliveryWindow), times(v.window));
    add(rows, "Address", where(o), where(v));
  } else
    add(
      rows,
      "Collection time",
      o.collectionTime || "Agreed with Linda",
      v.collectionTime || "Agreed with Linda",
    );
  add(rows, "What it is", line.name, v.what);
  add(rows, "Size", line.sizeLine, newSize);
  add(
    rows,
    "Message",
    line.message ? `“${line.message}”` : "No message",
    message ? `“${message}”` : "No message",
  );
  add(rows, "Contains", line.allergenText, newAllergen);
  add(rows, "Allergy note", o.allergyNote, v.allergyNote);
  add(rows, "Total", money(o.totalPence), money(v.totalPence));
  add(contact, "Name", o.customerName, v.name);
  add(contact, "Email", o.email, v.email);
  add(contact, "Phone", o.phone, v.phone);
  add(
    contact,
    "Customer emails",
    o.customerEmails ? "On" : "Off",
    v.customerEmails ? "On" : "Off",
  );
  if (!rows.length && !contact.length) return { kind: "nothing" };

  if (v.date !== String(o.date)) {
    const warnings = dayWarnings(await dayInfo(db, v.date, now, o.id), 1);
    if (warnings.length && !input.owner)
      return { kind: "owner-only", warnings };
  }

  // A total below what was paid asks first (§9.7): the card part back now, the rest by hand.
  const paid = await netPaid(db, o);
  const excess = paid - v.totalPence;
  const card = excess > 0 ? Math.min(excess, await cardRefundable(db, o)) : 0;
  if (excess > 0 && !input.confirmRefund)
    return {
      kind: "confirm-refund",
      lessPence: excess,
      cardPence: card,
      handPence: excess - card,
    };

  const saved = await db.transaction(async (tx) => {
    const r = await saveOrderVersioned(
      tx,
      o.id,
      input.seenVersion,
      {
        customerName: v.name,
        email: v.email,
        phone: v.phone,
        phoneE164: v.phoneE164,
        date: v.date,
        earliestDate: newEarliest(
          { date: String(o.date), earliestDate: String(o.earliestDate) },
          v.date,
          false,
        ),
        handover: v.handover,
        deliveryWindow: v.window,
        address: v.address,
        town: v.town,
        postcode: v.postcode,
        collectionTime: v.collectionTime,
        allergyNote: v.allergyNote,
        totalPence: v.totalPence,
        customerEmails: v.customerEmails,
        snapshot: { ...(o.snapshot as object), alsoContains: v.alsoContains },
      },
      memberChange(input.by),
      now,
    );
    if (!r.ok) return { ok: false as const, line: r.line };
    await tx
      .update(orderLines)
      .set({
        name: v.what,
        sizeLine: newSize,
        message,
        allergenText: newAllergen,
        allergenKeys: v.allergens,
        pricePence: v.totalPence,
      })
      .where(eq(orderLines.id, line.id));
    const all = [...rows, ...contact];
    const [c] = await tx
      .insert(orderChanges)
      .values({
        orderId: o.id,
        by: "linda",
        changes: all,
        moneyKind:
          v.totalPence < o.totalPence
            ? "down"
            : v.totalPence > o.totalPence
              ? "owed"
              : "none",
        moneyPence: Math.abs(v.totalPence - o.totalPence),
        newTotalPence: v.totalPence,
        createdAt: now,
      })
      .returning({ id: orderChanges.id });
    await tx.insert(orderHistory).values({
      orderId: o.id,
      at: now,
      byName: input.by,
      what: `Edited the order · ${all.map(([w, a, b]) => `${w}: ${a} → ${b}`).join("; ")}${excess > 0 ? ` · ${money(card)} back to the card${excess - card ? ` · ${money(excess - card)} to give back by hand` : ""}` : ""}`,
    });
    return { ok: true as const, changeId: c.id };
  });
  if (!saved.ok) return { kind: "conflict", line: saved.line };

  let refundOk = true;
  if (card > 0)
    refundOk = (
      await refundOrder(
        db,
        gw,
        {
          orderId: o.id,
          amountPence: card,
          kind: "change",
          changeId: saved.changeId,
        },
        now,
      )
    ).ok;

  // A lowered total: open links worth more than what is still to pay are withdrawn (§9.8).
  if (v.totalPence < o.totalPence)
    await withdrawLinksAbove(
      db,
      gw.cancel ? { cancel: gw.cancel } : null,
      o.id,
    );

  // E-mail 12 when the customer's e-mails are on (the queue applies the switch, §8.2).
  let emailed = false;
  if (rows.length && v.email) {
    const view: ChangeView = {
      number: o.number,
      token: o.token,
      date: v.date,
      today,
      changes: rows,
      same: [],
      newTotalPence: v.totalPence,
      money:
        card > 0
          ? { kind: "down", pence: card }
          : v.totalPence > paid
            ? { kind: "owed", pence: v.totalPence - paid }
            : { kind: "none", pence: 0 },
      newDeadline: v.date !== String(o.date) ? "me" : null,
    };
    emailed =
      (await queueMail(
        db,
        {
          key: `order:${o.id}:12:${saved.changeId}`,
          template: "change-saved",
          data: { view },
          to: v.email,
        },
        now,
      )) === "queued";
  }
  return {
    kind: "saved",
    emailed,
    refundOk,
    handPence: excess > 0 ? excess - card : 0,
  };
}
