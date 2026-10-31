import { LegalRoute, legalMetadata } from "../legal-route";

// cancellations (§4.5): the newest saved revision.
export const generateMetadata = () => legalMetadata("cancellations");

export default function Page() {
  return <LegalRoute slug="cancellations" />;
}
