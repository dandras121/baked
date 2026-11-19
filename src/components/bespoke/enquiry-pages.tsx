import { telHref } from "@/components/contact/contact-page";
import contact from "@/components/contact/contact.module.css";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import styles from "./enquiry-pages.module.css";

/**
 * The two pages after an enquiry (§7.2) share one layout: the big title, a violet line with the reference, rows with a
 * violet label (beside on tablet and desktop, above on the phone), the buttons and a small note.
 * Enquiry sent 654:3805 / phone 839:6936; Your enquiry 1609:10885 / tablet 1609:11227 / phone 1609:11066.
 */
function Sheet({
  title,
  meta,
  rows,
  actions,
  note,
}: {
  title: React.ReactNode;
  meta: string;
  rows: [React.ReactNode, React.ReactNode][];
  actions: React.ReactNode;
  note: React.ReactNode;
}) {
  return (
    <div className={contact.page}>
      <h1 className={`${contact.title} ${styles.title}`}>{title}</h1>
      <div className={styles.body}>
        <p className={styles.meta}>{meta}</p>
        <dl className={styles.rows}>
          {rows.map(([label, value], i) => (
            <div key={i} className={styles.row}>
              <dt className={styles.label}>{label}</dt>
              <dd className={styles.value}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.actions}>{actions}</div>
        <p className={styles.note}>{note}</p>
      </div>
    </div>
  );
}

/** Enquiry sent (§7.2, 654:3805): the reference, what happens next, and the phone if no reply comes. */
export function EnquirySent({
  reference,
  phone,
}: {
  reference: string;
  phone: string | null;
}) {
  return (
    <Sheet
      title={
        <>
          We’ve got <br className={styles.phoneBreak} />
          your idea.
        </>
      }
      meta={`Enquiry ${reference} · nothing has been charged and nothing is committed`}
      rows={[
        [
          "Within 24 hours",
          "My reply by e-mail, or a call if you asked for one.",
        ],
        [
          "Then it is your call",
          "Say yes, ask for changes, or walk away — all fine.",
        ],
        [
          "Only after you agree",
          "I book the date and send you a secure link for any payment we agree.",
        ],
      ]}
      actions={
        <>
          <Primary href="/cakes">Browse the ready-made range</Primary>
          <Back />
        </>
      }
      note={
        phone ? (
          <>
            No reply by this time tomorrow? Check your junk folder, then call me
            on{" "}
            <Link href={telHref(phone)} variant="inline">
              {phone}
            </Link>{" "}
            — it means something went astray.
          </>
        ) : (
          "No reply by this time tomorrow? Check your junk folder — it means something went astray."
        )
      }
    />
  );
}

/** The first action: solid on tablet and desktop, a full-width outline button on the phone (as drawn). */
function Primary({ href, children }: { href: string; children: string }) {
  return (
    <>
      <ButtonLink href={href} className={styles.wideOnly}>
        {children}
      </ButtonLink>
      <ButtonLink
        href={href}
        variant="outline"
        block
        className={styles.phoneOnly}
      >
        {children}
      </ButtonLink>
    </>
  );
}

/** Back to home: an outline button beside the first one; a text link under it on the phone (839:6936). */
function Back() {
  return (
    <>
      <ButtonLink href="/" variant="outline" className={styles.wideOnly}>
        Back to home
      </ButtonLink>
      <Link href="/" className={styles.phoneOnly}>
        Back to home
      </Link>
    </>
  );
}

export type YourEnquiryView = {
  reference: string;
  sent: string;
  rows: [string, string][];
  inspired: { caption: string; src: string | null } | null;
  email: string;
};

/** Your enquiry (§7.2, 1609:10885): every answer as sent, read-only; nothing can be changed here. */
export function YourEnquiry({ v }: { v: YourEnquiryView }) {
  const rows: [React.ReactNode, React.ReactNode][] = [...v.rows];
  if (v.inspired)
    rows.push([
      "Inspired by",
      <span key="inspired" className={styles.inspired}>
        {v.inspired.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.inspired.src} alt="" className={styles.thumb} />
        ) : (
          <span className={styles.thumb} aria-hidden />
        )}
        {v.inspired.caption}
      </span>,
    ]);
  return (
    <Sheet
      title="Your enquiry."
      meta={`Enquiry ${v.reference} · sent ${v.sent} · read-only`}
      rows={rows}
      actions={
        <>
          <Primary
            href={`mailto:${v.email}?subject=${encodeURIComponent(`Enquiry ${v.reference}`)}`}
          >
            Email Linda about it
          </Primary>
          <Back />
        </>
      }
      note="This page only shows what you sent — nothing here can be changed. To add or change anything, reply to my email or use Email Linda about it. The link works for 12 months."
    />
  );
}
