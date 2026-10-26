import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { contrastRatio } from "@/lib/contrast";
import {
  parseTokens,
  tokenMap,
  type Token,
  type TokenGroup,
} from "@/lib/design-tokens";
import styles from "./tokens-page.module.css";

export const metadata: Metadata = { title: "Design tokens — Baked by Linda" };

const SAMPLE = "Cakes, I have made.";

function readGroups(): TokenGroup[] {
  return parseTokens(
    readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8"),
  );
}

function ratio(value: string, background: string): string {
  try {
    return `${contrastRatio(value, background).toFixed(2)} : 1`;
  } catch {
    return "—";
  }
}

function Meta({ token }: { token: Token }) {
  return (
    <div className={styles.meta}>
      <code className={styles.name}>{token.name}</code>
      <code className={styles.value}>{token.value}</code>
      <span>{token.description}</span>
      <span className={styles.source}>{token.source}</span>
    </div>
  );
}

function Colour({
  token,
  white,
  paper,
}: {
  token: Token;
  white: string;
  paper: string;
}) {
  const opaque = token.value.startsWith("#");
  return (
    <li className={styles.colour}>
      <span
        className={styles.swatch}
        style={{ background: `var(${token.name})` }}
        aria-hidden
      />
      <Meta token={token} />
      {opaque && (
        <span className={styles.ratios}>
          on white {ratio(token.value, white)} · on paper{" "}
          {ratio(token.value, paper)}
        </span>
      )}
    </li>
  );
}

function Type({ token, tokens }: { token: Token; tokens: Token[] }) {
  if (token.name.endsWith("-ls")) return null;
  const spacing = tokens.find((t) => t.name === `${token.name}-ls`);
  return (
    <li className={styles.type}>
      <p className={`${token.name.slice(2)} ${styles.sample}`}>{SAMPLE}</p>
      <Meta token={token} />
      {spacing && (
        <code className={styles.value}>
          {spacing.name}: {spacing.value}
        </code>
      )}
    </li>
  );
}

function Shape({
  token,
  kind,
}: {
  token: Token;
  kind: "radius" | "shadow" | "space" | "other";
}) {
  const style =
    kind === "radius"
      ? { borderRadius: `var(${token.name})` }
      : kind === "shadow"
        ? { boxShadow: `var(${token.name})` }
        : kind === "space"
          ? { width: `var(${token.name})` }
          : undefined;
  return (
    <li className={styles.shape}>
      {style && <span className={styles[kind]} style={style} aria-hidden />}
      <Meta token={token} />
    </li>
  );
}

function Easing({ token }: { token: Token }) {
  const match = /cubic-bezier\(([^)]+)\)/.exec(token.value);
  const [x1, y1, x2, y2] = match
    ? match[1].split(",").map(Number)
    : [0, 0, 1, 1];
  const p = (x: number, y: number) => `${x * 100} ${100 - y * 100}`;
  return (
    <li className={styles.shape}>
      <svg className={styles.curve} viewBox="-10 -10 120 120" aria-hidden>
        <path className={styles.axis} d="M0 100 H100 M0 100 V0" />
        <path
          className={styles.line}
          d={`M${p(0, 0)} C${p(x1, y1)} ${p(x2, y2)} ${p(1, 1)}`}
        />
      </svg>
      <Meta token={token} />
    </li>
  );
}

function Group({
  group,
  white,
  paper,
}: {
  group: TokenGroup;
  white: string;
  paper: string;
}) {
  const title = group.title;
  const kind = title.startsWith("Radii")
    ? "radius"
    : title.startsWith("Shadows")
      ? "shadow"
      : title.startsWith("Spacing")
        ? "space"
        : "other";
  return (
    <section className={styles.group} aria-labelledby={slug(title)}>
      <h2 id={slug(title)} className="type-heading-sm">
        {title}
      </h2>
      <ul
        className={
          title.startsWith("Colours")
            ? `${styles.list} ${styles.colours}`
            : styles.list
        }
      >
        {group.tokens.map((token) =>
          title.startsWith("Colours") ? (
            <Colour
              key={token.name}
              token={token}
              white={white}
              paper={paper}
            />
          ) : title.startsWith("Type") ? (
            <Type key={token.name} token={token} tokens={group.tokens} />
          ) : title.startsWith("Motion — easings") ? (
            <Easing key={token.name} token={token} />
          ) : (
            <Shape key={token.name} token={token} kind={kind} />
          ),
        )}
      </ul>
    </section>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default function TokensPage() {
  const groups = readGroups();
  const count = groups.reduce((n, g) => n + g.tokens.length, 0);
  const values = tokenMap(groups);
  const white = values.get("--colour-white") ?? "";
  const paper = values.get("--colour-paper") ?? "";
  return (
    <main className="dev-page">
      <h1 className="type-wordmark">Design tokens</h1>
      <p>
        Every value the site may use, read live from{" "}
        <code>src/styles/tokens.css</code> ({count} tokens). Compare with the
        Figma style guide “V2 — Arculattár · v4” (1490:8656). Type sizes are the
        desktop sizes.
      </p>
      {groups.map((group) => (
        <Group key={group.title} group={group} white={white} paper={paper} />
      ))}
    </main>
  );
}
