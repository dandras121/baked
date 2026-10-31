import { LegalRoute, legalMetadata } from "../legal-route";

// accessibility (§4.5): the newest saved revision.
export const generateMetadata = () => legalMetadata("accessibility");

export default function Page() {
  return <LegalRoute slug="accessibility" />;
}
