"use client";

import { useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Radio } from "@/components/ui/choice";
import { Link } from "@/components/ui/link";
import { Pill } from "@/components/ui/pill";
import {
  countCharacters,
  Select,
  TextArea,
  TextField,
} from "@/components/ui/text-field";
import styles from "./gallery.module.css";

function Group({
  title,
  figma,
  children,
}: {
  title: string;
  figma: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.group}>
      <h2 className="type-heading-sm">{title}</h2>
      <p className={styles.figma}>Figma: {figma}</p>
      <div className={styles.items}>{children}</div>
    </section>
  );
}

const PILLS = ["All designs", "Birthdays", "Weddings", "Celebrations"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ComponentsGallery() {
  const [paying, setPaying] = useState(false);
  const [quick, setQuick] = useState(false);
  const [pill, setPill] = useState(PILLS[0]);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [inscription, setInscription] = useState("");

  const pay = () => {
    setPaying(true);
    setTimeout(() => setPaying(false), 1500);
  };

  return (
    <div className={styles.page}>
      <h1 className="type-wordmark">Base components (0.5a)</h1>
      <p>
        Buttons, links, pills, fields and choices. Hover, press and type: every
        one follows ANIM-07 or ANIM-05.
      </p>

      <Group
        title="Buttons"
        figma="06 · Gombok 1491:8676 · busy state 983:9240 (UI-03)"
      >
        <Button>Order a cake</Button>
        <Button variant="outline">Start a bespoke enquiry</Button>
        <Button size="card">View</Button>
        <Button variant="outline" size="sm">
          Cookie preferences
        </Button>
        <Button variant="text">Show the next 9</Button>
        <Button disabled>Pay £185</Button>
        <Button
          busy={paying}
          busyLabel="Taking payment"
          onClick={pay}
          data-testid="pay"
        >
          Pay £185
        </Button>
        <Button
          variant="outline"
          busy={quick}
          busyLabel="Saving"
          onClick={() => {
            setQuick(true);
            setTimeout(() => setQuick(false), 100);
          }}
          data-testid="quick"
        >
          Quick action (100 ms)
        </Button>
        <ButtonLink href="/dev" variant="outline">
          A link that looks like a button
        </ButtonLink>
        <div className={styles.full}>
          <Button block>Continue</Button>
        </div>
      </Group>

      <Group
        title="Links"
        figma="standalone: Pressable · ANIM-07; inside a sentence: Text link · colour only"
      >
        <Link href="/dev">Find my order →</Link>
        <p className={styles.sentence}>
          Read the{" "}
          <Link href="/dev" variant="inline">
            terms and conditions
          </Link>{" "}
          before you order.
        </p>
        <Link href="/dev" dense className={styles.small}>
          Privacy policy (dense list)
        </Link>
      </Group>

      <Group
        title="Filter pills"
        figma="07 · Pirulák 1492:8680 · 599:2717 / 599:2719"
      >
        <div
          role="group"
          aria-label="Filter the cakes"
          className={styles.pills}
        >
          {PILLS.map((name) => (
            <Pill
              key={name}
              selected={pill === name}
              onClick={() => setPill(name)}
            >
              {name}
            </Pill>
          ))}
        </div>
      </Group>

      <Group
        title="Text fields"
        figma="08 · 1493:8698 · V2 · Input 630:3004 / 630:3008 · errors 974:9092 (ANIM-19)"
      >
        <div className={styles.field}>
          <TextField
            label="Your name"
            placeholder="Your name"
            autoComplete="name"
          />
        </div>
        <div className={styles.field}>
          <TextField
            label="Email"
            labelStyle="plain"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError && EMAIL.test(e.target.value)) setEmailError(null);
            }}
            onBlur={() =>
              setEmailError(
                email && !EMAIL.test(email)
                  ? "That does not look like a full email address."
                  : null,
              )
            }
            error={emailError}
            data-testid="email"
          />
        </div>
        <div className={styles.fieldWide}>
          <TextField
            label="Inscription"
            labelStyle="plain"
            max={24}
            value={inscription}
            onChange={(e) => setInscription(e.target.value)}
            hint="Up to 24 characters, piped by hand. Leave it empty if you would rather have none."
            error={
              countCharacters(inscription) > 24
                ? `${countCharacters(inscription)} of 24 characters — a little too long to pipe neatly.`
                : null
            }
            data-testid="inscription"
          />
        </div>
        <div className={styles.fieldWide}>
          <TextArea label="Your message" max={400} rows={4} />
        </div>
        <div className={styles.field}>
          <Select label="Occasion" defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            <option>Birthday</option>
            <option>Wedding</option>
            <option>Something else</option>
          </Select>
        </div>
      </Group>

      <Group
        title="Check boxes and radio buttons"
        figma="630:3012 / 630:3015 · phone 810:5860 · error 975:9107"
      >
        <Checkbox label="Keep me posted about new cakes" />
        <Checkbox
          label="I accept the terms and conditions"
          checked={terms}
          onChange={(e) => {
            setTerms(e.target.checked);
            if (e.target.checked) setTermsError(null);
          }}
          error={termsError}
          data-testid="terms"
        />
        <Button
          variant="outline"
          onClick={() =>
            setTermsError(
              terms
                ? null
                : "Tick this to confirm you have read the terms. I cannot take the order without it.",
            )
          }
          data-testid="check-terms"
        >
          Check the terms box
        </Button>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Delivery or collection</legend>
          <Radio name="handover" value="delivery" label="Delivered to you" />
          <Radio name="handover" value="collection" label="Collect from me" />
        </fieldset>
      </Group>
    </div>
  );
}
