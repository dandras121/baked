import { LegalRoute, legalMetadata } from "../legal-route";

// cookies (§4.5): the newest saved revision.
export const generateMetadata = () => legalMetadata("cookies");

export default function Page() {
  return <LegalRoute slug="cookies" />;
}
