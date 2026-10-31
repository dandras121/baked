import { LegalRoute, legalMetadata } from "../legal-route";

// privacy (§4.5): the newest saved revision.
export const generateMetadata = () => legalMetadata("privacy");

export default function Page() {
  return <LegalRoute slug="privacy" />;
}
