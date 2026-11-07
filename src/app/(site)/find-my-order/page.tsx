import type { Metadata } from "next";
import { FindMyOrder } from "@/components/order-status/find-my-order";
import { getSiteSettings } from "@/db/site-settings";
import { findOrder } from "./actions";

export const metadata: Metadata = {
  title: "Find my order",
  description:
    "Put in the e-mail you ordered with and a link to your order arrives in a minute.",
};

// Find my order (§6.7; desktop 654:3636, tablet 1558:11308, phone 839:7183).
export default async function Page() {
  const phone = (await getSiteSettings())?.phone ?? "";
  return <FindMyOrder action={findOrder} phone={phone} />;
}
