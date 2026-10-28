import { eq } from "drizzle-orm";
import type { Allergen } from "@/lib/constants";
import type { Settings } from "@/lib/settings";
import type { connect } from "./client";
import { settings } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export async function readSettings(db: Db): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (!row) throw new Error("Settings are missing — run `pnpm db:seed`");
  return {
    tradingName: row.tradingName,
    legalName: row.legalName,
    phone: row.phone,
    email: row.email,
    addressLine: row.addressLine,
    postcode: row.postcode,
    town: row.town,
    council: row.council,
    hygieneRating: row.hygieneRating,
    instagram: row.instagram,
    facebook: row.facebook,
    deliveryArea: row.deliveryArea,
    postcodeDistricts: row.postcodeDistricts,
    beyondTheArea: row.beyondTheArea,
    deliveryChargePence: row.deliveryChargePence,
    secondAttemptFeePence: row.secondAttemptFeePence,
    bespokeMinimumPence: row.bespokeMinimumPence,
    kitchenHandles: row.kitchenHandles as Allergen[],
    dailyCap: row.dailyCap,
    weeklyCap: row.weeklyCap,
    leadTimeDays: row.leadTimeDays,
    bespokeLeadTimeWeeks: row.bespokeLeadTimeWeeks,
  };
}

export async function writeSettings(db: Db, values: Settings): Promise<void> {
  await db
    .insert(settings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({
      target: settings.id,
      set: { ...values, updatedAt: new Date() },
    });
}
