import { ComplaintForm } from "@/components/complaints/complaint-form";
import legal from "@/components/legal/legal.module.css";
import { blobMode } from "@/lib/storage";
import { LegalRoute, legalMetadata } from "../legal-route";
import { sendComplaint } from "./actions";

// Complaints procedure (§4.5, §7.5; 666:4722, tablet 1560:12262, phone 844:8217): the saved text, then “Send it here”.
export const generateMetadata = () => legalMetadata("complaints");

export default function Page() {
  return (
    <LegalRoute
      slug="complaints"
      extra={{
        id: "send-it-here",
        heading: "Send it here",
        content: (
          <>
            <p className={legal.paragraph}>
              Send this and I acknowledge it within one working day, with my
              full answer inside five.
            </p>
            <ComplaintForm action={sendComplaint} direct={blobMode()} />
          </>
        ),
      }}
    />
  );
}
