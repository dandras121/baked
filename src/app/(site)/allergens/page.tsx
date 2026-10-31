import { LegalRoute, legalMetadata } from "../legal-route";

// allergens (§4.5): the newest saved revision.
export const generateMetadata = () => legalMetadata("allergens");

export default function Page() {
  return <LegalRoute slug="allergens" />;
}
