import { LegalRoute, legalMetadata } from "../legal-route";

// terms (§4.5): the newest saved revision.
export const generateMetadata = () => legalMetadata("terms");

export default function Page() {
  return <LegalRoute slug="terms" />;
}
