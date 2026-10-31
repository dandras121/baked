import { AboutCards, type AboutCard } from "./about-cards";
import styles from "./about.module.css";

const CARDS: AboutCard[] = [
  {
    title: "Made by hand, start to finish",
    text: "Every cake is handcrafted with attention to detail, using high-quality ingredients and locally sourced products wherever possible.",
  },
  {
    title: "Designed around you",
    text: "Each design is created with the individual customer and their occasion in mind — bespoke cakes and sweet treats for all ages.",
  },
  {
    title: "For every kind of occasion",
    text: "Birthdays, anniversaries, family celebrations and special business occasions. Whatever the reason, it should feel like it was made for that day.",
  },
];

/** The first sentence of the introduction; also the page's description (§10.12). */
export function aboutFirstSentence(tradingName: string) {
  return `The baker and owner of ${tradingName}.`;
}

/**
 * About Linda (§4.3; desktop 518:2688, tablet 1562:12372, phone 1600:10493): text and photos; the photos are
 * Linda's page photos (§9.12), placeholders until she uploads them.
 */
export function AboutPage({ tradingName }: { tradingName: string | null }) {
  return (
    <div className={styles.page}>
      <section className={styles.intro} aria-labelledby="about-title">
        <h1 id="about-title" className={styles.title}>
          <span className={styles.hello}>Hello,</span>{" "}
          <span className={styles.iam}>I am</span>{" "}
          <span className={styles.name}>Linda</span>
        </h1>
        <div className={`${styles.photo} ${styles.portrait}`} aria-hidden />
        <p className={styles.introText}>
          {/* The trading name comes from Settings (rule 11); without a database the sentence is left out. */}
          {tradingName ? `${aboutFirstSentence(tradingName)} ` : ""}I started
          this business because I believe every birthday and special occasion
          deserves a cake that becomes the centrepiece of the celebration — one
          made with passion, skill and care, that helps turn an important moment
          into a lasting memory.
        </p>
      </section>
      <section className={styles.offerSection} aria-labelledby="what-we-offer">
        <h2 id="what-we-offer" className={styles.offerTitle}>
          What do we offer?
        </h2>
        <AboutCards cards={CARDS} />
      </section>
      <section className={styles.local} aria-labelledby="local-community">
        <h2 id="local-community" className={styles.localTitle}>
          Part of the
          <br />
          local community
        </h2>
        <p className={styles.localText}>
          Based in West Lothian, I love being part of the local community by
          creating cakes that bring people together. Whether it is a child’s
          first birthday, a milestone celebration or a special event, my aim is
          to make something unique that makes your occasion even more memorable.
        </p>
        <div className={`${styles.photo} ${styles.community}`} aria-hidden />
      </section>
    </div>
  );
}
