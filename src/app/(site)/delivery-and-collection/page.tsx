import { LegalRoute, legalMetadata } from "../legal-route";

// delivery-and-collection (§4.5): the newest saved revision.
export const generateMetadata = () => legalMetadata("delivery-and-collection");

export default function Page() {
  return <LegalRoute slug="delivery-and-collection" />;
}
