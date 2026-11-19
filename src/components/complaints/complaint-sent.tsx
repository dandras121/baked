import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import styles from "./complaint-sent.module.css";

/**
 * Complaint sent (§7.5; L 1253:9529, phone 1253:9542): “Your complaint” with its line (the reference, the matched
 * order, the start of what's wrong), the notice as the page's heading, and Back to home.
 */
export function ComplaintSent({
  reference,
  summary,
}: {
  reference: string;
  summary: string;
}) {
  return (
    <div className={styles.page}>
      <p className={styles.label} id="your-complaint">
        Your complaint
      </p>
      <p className={styles.box} aria-labelledby="your-complaint">
        {summary}
      </p>
      <Notice
        tone="calm"
        icon
        asHeading
        title={`I’ve got it — reference ${reference}`}
      >
        <p>
          I’ll look into what happened and give you my answer within five
          working days. I’ll email you the moment I know.
        </p>
        <p className={styles.meanwhile}>
          Meanwhile: nothing else to do — I’ll be in touch.
        </p>
      </Notice>
      <ButtonLink href="/" variant="outline" className={styles.back}>
        Back to home
      </ButtonLink>
    </div>
  );
}
