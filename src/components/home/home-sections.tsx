import type { ReactNode } from "react";
import { FacebookIcon, InstagramIcon } from "@/components/ui/social-icons";
import type { Settings } from "@/lib/settings";
import styles from "./home-sections.module.css";

/** The hand-drawn flourish under the cake slot (Vector 5 / Vector 6); decorative. */
function Flourish() {
  return (
    <svg
      className={styles.flourish}
      viewBox="0 0 149.266 33.4948"
      fill="none"
      aria-hidden
    >
      <path
        d="M1.28139 22.5378C9.43607 20.7495 17.5908 18.9612 25.3047 17.2373M25.3047 17.2373C30.703 16.0308 35.8854 14.8559 40.701 13.7345M25.3047 17.2373C28.2646 17.2771 31.4348 17.3284 34.7289 17.389M25.3047 17.2373C22.4385 17.1987 19.7696 17.1708 17.3765 17.1555C-0.32873 17.0427 -1.93885 17.6465 4.37661 16.9512C9.84776 16.3489 21.3036 14.7579 40.701 13.7345M40.701 13.7345C41.1762 13.6239 41.6477 13.5138 42.1155 13.4042M40.701 13.7345C40.9772 13.72 41.255 13.7055 41.5344 13.6912M42.1155 13.4042C49.1948 11.7462 55.4231 10.2124 60.2979 8.87618C73.4259 5.27779 76.0424 3.26514 76.8871 2.12768C77.7318 0.990226 76.7255 0.788961 74.3957 1.18844C72.0659 1.58792 68.4431 2.59425 62.149 4.92405C56.4259 7.04246 48.5851 10.2299 42.1155 13.4042ZM42.1155 13.4042C41.9205 13.4999 41.7268 13.5956 41.5344 13.6912M41.5344 13.6912C41.0898 13.9122 40.6523 14.1329 40.2232 14.353C38.1993 15.3914 36.3848 16.407 34.7289 17.389M41.5344 13.6912C44.2834 13.5501 47.1888 13.4207 50.256 13.3071C75.5301 12.3709 111.355 12.5721 148.266 12.7795M34.7289 17.389C30.841 19.6947 27.8271 21.8157 25.0277 23.6143C17.7851 28.2675 13.8879 30.4604 13.9855 31.6771C14.04 32.3569 15.0894 32.8939 26.3725 32.098C37.6556 31.302 59.3922 29.0881 76.5273 26.4381C93.6623 23.7881 105.537 20.7691 112.862 18.5095C114.937 17.8693 116.618 17.2974 117.979 16.8014M34.7289 17.389C51.8462 17.7038 72.3091 18.2694 83.9802 18.787C100.072 19.5006 99.4685 20.1044 94.6046 20.7173C89.7406 21.3302 80.885 21.934 72.5172 22.9617C64.1494 23.9894 56.5013 25.3982 52.0552 26.4137C47.6091 27.4292 46.4015 28.033 50.5671 28.2312C54.7326 28.4294 63.9909 28.2282 76.9145 26.1576C89.8382 24.087 105.939 20.2629 114.509 17.8325C115.841 17.4546 116.99 17.1111 117.979 16.8014M117.979 16.8014C121.421 15.5467 122.812 14.7779 123.343 14.6183C123.969 14.4303 123.348 15.1188 117.979 16.8014Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** “We got you.” (desktop 1311:9957, phone 1381:10080): text, the fast-changing-cakes slot, no links. */
export function WeGotYou() {
  return (
    <section className={styles.weGotYou} aria-labelledby="we-got-you">
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed decorative asset */}
      <img
        className={styles.glow}
        src="/home/glow.webp"
        alt=""
        width={1540}
        height={630}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.copy}>
        <h2 id="we-got-you" className={`${styles.title} ${styles.display}`}>
          We got you.
        </h2>
        <p className={styles.subhead}>
          Whatever the vibe is, we’ve got a cake for it.
        </p>
        <p className={styles.lead}>
          Fancy. Fun. Colourful. Classic. A little bit ridiculous. Whatever your
          vibe, we’re here to make it delicious.
        </p>
      </div>
      {/* Placeholder-fast changing cakes-desktop|tablet|phone: an empty slot for a future design asset (§0.6). */}
      <div
        className={styles.cakeSlot}
        data-slot="fast changing cakes"
        aria-hidden
      />
      <Flourish />
    </section>
  );
}

/** “Local, home baked.” on the pink band (desktop 1361:9949, phone 1384:10041); the town from Settings (D14). */
export function LocalHomeBaked({
  town,
  cakeRow,
}: {
  town: string;
  /** The Home cake row (2.3) opens the band when there are visible designs. */
  cakeRow?: ReactNode;
}) {
  return (
    <div className={styles.band}>
      {cakeRow}
      <section
        className={styles.local}
        aria-labelledby="local-home-baked"
        data-after-row={cakeRow ? "" : undefined}
      >
        <h2 id="local-home-baked" className={styles.localTitle}>
          Local, <br className="only-phone" />
          home baked.
        </h2>
        <p className={styles.subhead}>They are all made with heart</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed decorative asset */}
        <img
          className={styles.map}
          src="/home/west-lothian.webp"
          alt=""
          width={800}
          height={763}
          loading="lazy"
          decoding="async"
        />
        <div className={styles.story}>
          <p>
            We’re a small home bakery based in {town}, West Lothian, creating
            cakes one at a time — personally made by me, Linda. Never
            mass-produced.
          </p>
          <p>
            That means homemade flavour, fresh ingredients and attention to
            every little detail. Every cake gets the time and care it deserves,
            so you get something that feels genuinely personal rather than
            something made by the hundreds.
          </p>
          <p>Local to {town}, with delivery available across nearby areas.</p>
          <p className={styles.highlight}>
            Real cake. Real care. Made right here at home.
          </p>
        </div>
      </section>
    </div>
  );
}

/** “Check out our social media” (desktop 1373:10130, phone 1443:9323). Each link hides when its URL is empty. */
export function SocialBand({
  instagram,
  facebook,
}: Pick<Settings, "instagram" | "facebook">) {
  if (!instagram.url && !facebook.url) return null;
  const link = (
    kind: "Instagram" | "Facebook",
    s: { url: string; label: string },
  ) => (
    <a
      href={s.url}
      target="_blank"
      rel="noopener"
      className={`${styles.social} ${styles[`social${kind}`]} type-social hit-44`}
      data-pressable=""
    >
      {kind === "Instagram" ? (
        <InstagramIcon className={styles.socialIcon} />
      ) : (
        <FacebookIcon className={styles.socialIcon} />
      )}
      {s.label}
      <span className="visually-hidden"> ({kind}, opens in a new tab)</span>
    </a>
  );
  return (
    <section className={styles.socialBand} aria-labelledby="social-media">
      <h2 id="social-media" className={styles.socialTitle}>
        Check out our social media
      </h2>
      {instagram.url && link("Instagram", instagram)}
      {facebook.url && link("Facebook", facebook)}
    </section>
  );
}
