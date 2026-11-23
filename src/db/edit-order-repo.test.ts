import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  checkAddOrder,
  EMPTY_FORM,
  formFromManual,
  type AddOrderForm,
} from "@/lib/admin/add-order";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { addOrder, dayInfo } from "./add-order-repo";
import { connect } from "./client";
import { editManualOrder } from "./edit-order-repo";
import { netPaid } from "./refund-repo";
import {
  mailSends,
  orderChanges,
  orderHistory,
  orderLines,
  orders,
  paymentLinks,
  refunds,
} from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const now = londonInstant("2026-11-23", 10);
const day = "2027-07-17";

describe.skipIf(!url)("database: Edit the order (§9.7, manual orders)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  const base: AddOrderForm = {
    ...EMPTY_FORM,
    name: "Mairi Sinclair",
    email: "mairi@example.co.uk",
    phone: "07700 900 000",
    date: day,
    address: "Hopetoun House",
    postcode: "EH30 9SL",
    window: "afternoon",
    what: "Three tiers, ivory buttercream",
    serves: "100",
    tiers: "3",
    allergens: ["milk", "eggs"],
    total: "380",
    paid: "100",
    method: "bank",
  };
  async function make(over: Partial<AddOrderForm> = {}) {
    const number = await addOrder(
      db(),
      checkAddOrder({ ...base, ...over }, "2026-11-23").value!,
      "Linda",
      now,
    );
    await db().delete(mailSends);
    const [o] = await db()
      .select()
      .from(orders)
      .where(eq(orders.number, number));
    const [l] = await db()
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id));
    return { o, form: formFromManual({ ...o, date: String(o.date) }, l, "") };
  }
  const edit = (
    o: typeof orders.$inferSelect,
    form: AddOrderForm,
    over: {
      owner?: boolean;
      confirmRefund?: boolean;
      gw?: ReturnType<typeof countingGateway>;
    } = {},
  ) =>
    editManualOrder(
      db(),
      (over.gw ?? countingGateway()).gw,
      {
        orderId: o.id,
        seenVersion: o.version,
        by: over.owner === false ? "Ailsa" : "Linda",
        owner: over.owner ?? true,
        value: checkAddOrder(
          { ...form, paid: "0" },
          "2026-11-23",
          String(o.date),
        ).value!,
        confirmRefund: over.confirmRefund ?? false,
      },
      now,
    );
  const read = async (id: number) =>
    (await db().select().from(orders).where(eq(orders.id, id)))[0];
  const mails = async () => db().select().from(mailSends);

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(mailSends);
    await db().delete(orders).where(eq(orders.date, day));
  });
  afterAll(async () => {
    await db().delete(mailSends);
    await db().delete(orders).where(eq(orders.date, day));
    await conn?.close();
  });

  it("opens filled in from the saved order (every field, Paid so far left out)", async () => {
    const { form } = await make({
      inscription: "Happy 40th",
      alsoContains: "",
    });
    expect(form).toMatchObject({
      name: "Mairi Sinclair",
      date: day,
      window: "afternoon",
      what: "Three tiers, ivory buttercream",
      serves: "100",
      tiers: "3",
      inscription: "Happy 40th",
      allergens: ["eggs", "milk"],
      total: "380",
      emails: "on",
    });
  });

  it("saves every field, writes HISTORY and a change row, and sends e-mail 12", async () => {
    const { o, form } = await make();
    const r = await edit(o, {
      ...form,
      what: "Two tiers, lemon",
      tiers: "2",
      serves: "60",
      inscription: "Mairi & Tom",
      total: "420",
    });
    expect(r).toMatchObject({ kind: "saved", emailed: true, handPence: 0 });
    const after = await read(o.id);
    expect(after.totalPence).toBe(42000);
    expect(after.version).toBe(o.version + 1);
    const [l] = await db()
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id));
    expect(l).toMatchObject({
      name: "Two tiers, lemon",
      message: "Mairi & Tom",
      pricePence: 42000,
    });
    expect(l.sizeLine).toMatch(/serves 60/);
    const h = await db()
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id));
    expect(h.map((x) => x.what).join("|")).toMatch(
      /Edited the order · What it is: Three tiers, ivory buttercream → Two tiers, lemon/,
    );
    const [c] = await db()
      .select()
      .from(orderChanges)
      .where(eq(orderChanges.orderId, o.id));
    expect(c).toMatchObject({
      by: "linda",
      moneyKind: "owed",
      moneyPence: 4000,
      newTotalPence: 42000,
    });
    // A higher total only raises still to pay: e-mail 12, never an automatic e-mail 15.
    const m = await mails();
    expect(m.map((x) => x.key)).toEqual([`order:${o.id}:12:${c.id}`]);
  });

  it("sends no e-mail 12 for contact details alone, or when the customer's e-mails are off", async () => {
    const { o, form } = await make();
    expect(await edit(o, { ...form, phone: "07700 900 111" })).toMatchObject({
      kind: "saved",
      emailed: false,
    });
    const off = await make({ emails: "off" });
    expect(
      await edit(off.o, { ...off.form, inscription: "Hello" }),
    ).toMatchObject({ kind: "saved", emailed: false });
    expect(await mails()).toEqual([]);
  });

  it("nothing changed saves nothing; a stale version is a conflict", async () => {
    const { o, form } = await make();
    expect(await edit(o, form)).toEqual({ kind: "nothing" });
    await edit(o, { ...form, inscription: "First" });
    expect(await edit(o, { ...form, inscription: "Second" })).toMatchObject({
      kind: "conflict",
    });
  });

  it("a total below what was paid asks first; by hand it is flagged, nothing goes to a card", async () => {
    const { o, form } = await make();
    const t = countingGateway();
    const ask = await edit(o, { ...form, total: "60" }, { gw: t });
    expect(ask).toEqual({
      kind: "confirm-refund",
      lessPence: 4000,
      cardPence: 0,
      handPence: 4000,
    });
    expect((await read(o.id)).totalPence).toBe(38000);
    const r = await edit(
      o,
      { ...form, total: "60" },
      { gw: t, confirmRefund: true },
    );
    expect(r).toMatchObject({ kind: "saved", handPence: 4000, refundOk: true });
    expect(t.refunds).toEqual([]);
    const h = await db()
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id));
    expect(h.at(-1)?.what).toMatch(/£40\.00 to give back by hand/);
  });

  it("the card part goes back to the card at once, newest payment first; the rest by hand", async () => {
    const { o, form } = await make({ paid: "50", method: "cash" });
    await db()
      .insert(paymentLinks)
      .values({
        orderId: o.id,
        token: `edit-${o.id}-link-padding-padding`,
        purpose: "rest",
        amountPence: 10000,
        status: "paid",
        paymentIntentId: `pi_edit_${o.id}`,
        paidPence: 10000,
        sentOn: "2026-11-20",
        paidAt: now,
      });
    expect(await netPaid(db(), o)).toBe(15000);
    const t = countingGateway();
    const r = await edit(
      o,
      { ...form, total: "20" },
      { gw: t, confirmRefund: true },
    );
    expect(r).toMatchObject({ kind: "saved", handPence: 3000, refundOk: true });
    expect(t.refunds.map((x) => [x.paymentIntentId, x.amountPence])).toEqual([
      [`pi_edit_${o.id}`, 10000],
    ]);
    const rf = await db()
      .select()
      .from(refunds)
      .where(eq(refunds.orderId, o.id));
    expect(rf).toHaveLength(1);
    const [m] = await mails();
    expect((m.data as { view: { money: unknown } }).view.money).toEqual({
      kind: "down",
      pence: 10000,
    });
  });

  it("a Helper changes the day, address and inscription only; the rest stays as saved", async () => {
    const { o, form } = await make();
    const r = await edit(
      o,
      {
        ...form,
        inscription: "Hi",
        postcode: "EH49 6HH",
        total: "1",
        what: "Something else",
        name: "Someone",
      },
      { owner: false },
    );
    expect(r).toMatchObject({ kind: "saved" });
    const after = await read(o.id);
    expect(after).toMatchObject({
      totalPence: 38000,
      customerName: "Mairi Sinclair",
      postcode: "EH49 6HH",
    });
    const [l] = await db()
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id));
    expect(l).toMatchObject({
      name: "Three tiers, ivory buttercream",
      message: "Hi",
    });
  });

  it("a full day is the Owner's: a Helper is refused, the Owner may save", async () => {
    const { o, form } = await make();
    const closed = "2027-07-24";
    // A full day: fill it with manual orders up to the day's cap.
    const info = await dayInfo(db(), closed, now, o.id);
    for (let i = info.day; i < info.dailyCap; i++)
      await addOrder(
        db(),
        checkAddOrder({ ...base, date: closed }, "2026-11-23").value!,
        "Linda",
        now,
      );
    const helper = await edit(o, { ...form, date: closed }, { owner: false });
    expect(helper).toMatchObject({ kind: "owner-only" });
    expect(await edit(o, { ...form, date: closed })).toMatchObject({
      kind: "saved",
    });
    await db().delete(orders).where(eq(orders.date, closed));
  });
});
