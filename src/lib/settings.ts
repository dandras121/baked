// Settings values (SITE-FLOWS §11.1 business facts, §11.2 capacity). Business facts are never typed into pages:
// they come from here (CLAUDE.md §5 rule 11). The real values were Decided 2026-10-21.
import type { Allergen } from "./constants";

export type Settings = {
  tradingName: string;
  legalName: string;
  phone: string;
  email: string;
  addressLine: string;
  postcode: string;
  town: string;
  council: string;
  hygieneRating: string;
  instagram: { url: string; label: string };
  facebook: { url: string; label: string };
  deliveryArea: string;
  postcodeDistricts: string;
  beyondTheArea: string;
  deliveryChargePence: number;
  secondAttemptFeePence: number;
  bespokeMinimumPence: number;
  kitchenHandles: Allergen[];
  dailyCap: number;
  weeklyCap: number;
  leadTimeDays: number;
  bespokeLeadTimeWeeks: number;
};

/** The real business facts and the starting operational values (seed and tests). */
export const INITIAL_SETTINGS: Settings = {
  tradingName: "Baked by Linda",
  legalName: "Linda Dávid-Vágvölgyi",
  phone: "+44 7884 199103",
  email: "info@bakedbylinda.co.uk",
  addressLine: "20 Church View, Winchburgh",
  postcode: "EH52 6SZ",
  town: "Winchburgh",
  council: "West Lothian Council",
  hygieneRating: "Pass",
  instagram: {
    url: "https://www.instagram.com/bakedbylinda",
    label: "@bakedbylinda",
  },
  facebook: {
    // Linda's page, given by Bohoka 2026-11-01; Linda can change it in Settings.
    url: "https://www.facebook.com/share/1Mbri3RQMk/?mibextid=wwXIfr",
    label: "Baked by Linda",
  },
  deliveryArea: "Edinburgh & the Lothians",
  postcodeDistricts: "EH1–EH42, EH47–EH55",
  beyondTheArea: "Collection or courier",
  deliveryChargePence: 0,
  secondAttemptFeePence: 1500,
  bespokeMinimumPence: 16000,
  kitchenHandles: [
    "nuts",
    "cereals containing gluten",
    "eggs",
    "milk",
    "soya",
    "sesame",
  ],
  dailyCap: 2,
  weeklyCap: 9,
  leadTimeDays: 5,
  bespokeLeadTimeWeeks: 3,
};
