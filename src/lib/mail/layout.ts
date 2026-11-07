// Every e-mail's frame (SITE-FLOWS §8.4; section 1128:9106): a 600 px table layout with the pink header band, the
// body built from a few blocks, the sign-off and the business footer — and a plain-text part from the same blocks.
import type { Placeholder } from "../placeholders";
import C from "./palette.json";

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "para"; text: string }
  | {
      kind: "rows";
      title?: string;
      rows: [label: string, value: string][];
      /** The last row is the money that matters (e-mails 12 and 15: “£55”, larger and bolder). */
      strongLast?: boolean;
    }
  | { kind: "eyebrow"; text: string }
  | {
      kind: "tiles";
      title: string;
      tiles: {
        name: string;
        from: string;
        href: string;
        image: string;
        alt: string;
      }[];
    }
  | { kind: "linkLine"; text?: string; label: string; href: string }
  | {
      kind: "footnote";
      text: string;
      link?: [label: string, href: string];
      /** The link on the same line (e-mail 18), else under the text (e-mail 5). */
      inline?: boolean;
    }
  | { kind: "textPanel"; title: string; paras: string[] }
  | { kind: "small"; text: string }
  | { kind: "card"; lines: string[]; links: [label: string, href: string][] }
  | { kind: "links"; links: [label: string, href: string][] }
  | { kind: "steps"; steps: { label: string; date?: string; done: boolean }[] }
  | { kind: "notice"; title: string; text: string; icon?: "clock" | "check" }
  | {
      kind: "button";
      label: string;
      href: string;
      secondary?: boolean;
      /** Full width at every size (e-mail 5, as drawn). */
      block?: boolean;
    };

export type Business = {
  tradingName: string;
  legalName: string;
  addressLine: string;
  town: string;
  postcode: string;
  phone: string;
};

export type Attachment = {
  name: string;
  revisionId: number;
  /** The business facts the PDF's placeholders are filled with. */
  facts: Record<Placeholder, string>;
};

export type Email = {
  subject: string;
  preheader: string;
  blocks: Block[];
  /** The facts kept with an order (e-mail 1): its footer uses these, not today's Settings (§8.1). */
  business?: Business;
  /** E-mail 1's legal PDFs (§8.1 Durable record). */
  attachments?: Attachment[];
  /** An internal e-mail to the team (e-mail 4) has no “— Linda”, as drawn. */
  noSignOff?: boolean;
  /** A full-width picture under the header (e-mail 5's hero, 2:1). */
  hero?: { src: string; alt: string };
  /** Extra mail headers (e-mail 5: List-Unsubscribe and List-Unsubscribe-Post, §8.4). */
  headers?: Record<string, string>;
};

// Single quotes only: these go inside style="…" attributes.
const SERIF = `Fraunces, Georgia, 'Times New Roman', serif`;
const SANS = `Quicksand, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`;

export const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** “Baked by Linda is the trading name of …” — §8.4 Header and footer. */
export function footerLines(b: Business): [string, string] {
  return [
    `${b.tradingName} is the trading name of ${b.legalName}, a sole trader in Scotland.`,
    `${[b.addressLine, b.addressLine.includes(b.town) ? "" : b.town, b.postcode].filter(Boolean).join(", ")} · ${b.phone}`,
  ];
}

function blockHtml(b: Block, origin: string): string {
  switch (b.kind) {
    case "heading":
      return `<tr><td style="padding:24px 0 0;font-family:${SERIF};font-weight:300;font-size:${C.size.heading};line-height:1.2;color:${C.ink}">${esc(b.text)}</td></tr>`;
    case "para":
      return `<tr><td style="padding:12px 0 0;font-family:${SANS};font-size:${C.size.body};line-height:1.5;color:${C.body}">${esc(b.text)}</td></tr>`;
    case "rows":
      return `<tr><td style="padding:20px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.frame};border-radius:14px;border-collapse:separate"><tr><td style="padding:8px 19px">${b.title ? `<div style="padding:10px 0 4px;font-family:${SANS};font-size:${C.size.small};letter-spacing:0.5px;color:${C.accent}">${esc(b.title)}</div>` : ""}${b.rows
        .map(([label, value], i) => {
          const strong = b.strongLast && i === b.rows.length - 1;
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="row"${i ? ` style="border-top:1px solid ${C.rule}"` : ""}><tr><td class="label" style="padding:8px 0;font-family:${SANS};font-size:${C.size.small};color:${C.body};vertical-align:top">${esc(label)}</td><td class="value" align="right" style="padding:8px 0;font-family:${SANS};font-size:${strong ? C.size.button : C.size.small};font-weight:${strong ? 600 : 500};color:${C.ink};text-align:right;vertical-align:top;word-break:break-word">${esc(value)}</td></tr></table>`;
        })
        .join("")}</td></tr></table></td></tr>`;
    case "textPanel":
      return `<tr><td style="padding:20px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.frame};border-radius:14px;border-collapse:separate"><tr><td style="padding:8px 19px 12px"><div style="padding:10px 0 4px;font-family:${SANS};font-size:${C.size.small};letter-spacing:0.5px;color:${C.accent}">${esc(b.title)}</div>${b.paras
        .map(
          (t, i) =>
            `<div style="padding:8px 0;${i ? `border-top:1px solid ${C.rule};` : ""}font-family:${SANS};font-size:${C.size.small};line-height:1.5;color:${C.body}">${esc(t)}</div>`,
        )
        .join("")}</td></tr></table></td></tr>`;
    case "eyebrow":
      return `<tr><td style="padding:24px 0 0;font-family:${SANS};font-size:${C.size.small};letter-spacing:0.5px;color:${C.accent}">${esc(b.text)}</td></tr>`;
    case "tiles":
      // Three across; one column under 480 px (§8.4 Layout). 1–2 tiles keep the same width, left-aligned.
      return `<tr><td style="padding:24px 0 0;font-family:${SANS};font-size:${C.size.small};letter-spacing:0.5px;color:${C.accent}">${esc(b.title)}</td></tr><tr><td style="padding:12px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="tiles"><tr>${b.tiles
        .map(
          (t, i) =>
            `${i ? `<td width="17" class="gap" style="width:17px;font-size:0;line-height:0">&nbsp;</td>` : ""}<td width="168" style="width:168px;vertical-align:top"><a href="${esc(t.href)}" style="text-decoration:none;color:${C.ink}"><img src="${esc(t.image)}" width="168" height="210" alt="${esc(t.alt)}" style="display:block;width:168px;height:auto;border:0;border-radius:8px"><div style="padding-top:10px;font-family:${SANS};font-size:${C.size.body};font-weight:500;color:${C.ink}">${esc(t.name)}</div><div style="font-family:${SANS};font-size:${C.size.small};color:${C.body}">${esc(t.from)}</div></a></td>`,
        )
        .join(
          "",
        )}<td style="font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>`;
    case "linkLine":
      return `<tr><td style="padding:16px 0 0;font-family:${SANS};font-size:${C.size.body};line-height:1.5;color:${C.body}">${b.text ? `${esc(b.text)} ` : ""}<a href="${esc(b.href)}" style="color:${C.accent};text-decoration:underline">${esc(b.label)}</a></td></tr>`;
    case "footnote":
      return `<tr><td style="padding:24px 0 0;font-family:${SANS};font-size:${C.size.small};line-height:1.5;color:${C.meta}">${esc(b.text)}${b.link ? `${b.inline ? " " : "<br>"}<a href="${esc(b.link[1])}" style="color:${C.accent};text-decoration:underline">${esc(b.link[0])}</a>` : ""}</td></tr>`;
    case "card":
      // E-mail 4's handover card (1155:9360): the first line in ink, the rest in body grey, the links underlined.
      return `<tr><td style="padding:12px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.frame};border-radius:14px;border-collapse:separate"><tr><td style="padding:14px 15px">${b.lines
        .map(
          (l, i) =>
            `<div style="${i ? "padding-top:6px;" : ""}font-family:${SANS};font-size:${i ? C.size.small : C.size.body};line-height:1.5;color:${i ? C.body : C.ink}">${esc(l)}</div>`,
        )
        .join(
          "",
        )}<div style="padding-top:8px;font-family:${SANS};font-size:${C.size.body}">${b.links
        .map(
          ([l, h]) =>
            `<a href="${esc(h)}" style="color:${C.accent};text-decoration:underline">${esc(l)}</a>`,
        )
        .join(
          "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
        )}</div></td></tr></table></td></tr>`;
    case "small":
      return `<tr><td style="padding:16px 0 0;font-family:${SANS};font-size:${C.size.body};line-height:1.5;color:${C.body}">${esc(b.text)}</td></tr>`;
    case "links":
      return `<tr><td style="padding:8px 0 0;font-family:${SANS};font-size:${C.size.small};color:${C.accent}">${b.links
        .map(
          ([l, h]) =>
            `<a href="${esc(h)}" style="color:${C.accent}">${esc(l)}</a>`,
        )
        .join(" · ")}</td></tr>`;
    case "steps":
      return `<tr><td style="padding:16px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${b.steps
        .map(
          (s) =>
            `<tr><td width="18" style="padding:8px 0;vertical-align:middle"><div style="width:9px;height:9px;border-radius:5px;background:${s.done ? C.dotDone : C.dotLater}"></div></td><td style="padding:8px 0;font-family:${SANS};font-size:${C.size.small};font-weight:500;color:${s.done ? C.ink : C.meta}">${esc(s.label)}</td><td align="right" style="padding:8px 0;font-family:${SANS};font-size:${C.size.small};color:${s.done ? C.body : C.meta};text-align:right">${esc(s.date ?? "")}</td></tr>`,
        )
        .join("")}</table></td></tr>`;
    case "notice":
      return `<tr><td style="padding:20px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.noticeFill};border:1px solid ${C.noticeBorder};border-radius:10px;border-collapse:separate"><tr>${b.icon ? `<td width="32" style="padding:18px 0 18px 19px;vertical-align:top"><img src="${origin}/email/icon-${b.icon}@2x.png" width="20" height="20" alt="" style="display:block;border:0"></td>` : ""}<td style="padding:18px 19px${b.icon ? " 18px 12px" : ""}"><div style="font-family:${SANS};font-size:${C.size.body};font-weight:600;color:${C.ink}">${esc(b.title)}</div><div style="padding-top:4px;font-family:${SANS};font-size:${C.size.small};line-height:1.5;color:${C.body}">${esc(b.text)}</div></td></tr></table></td></tr>`;
    case "button":
      // A bordered cell, so it stays visible when a mail app inverts colours (§8.4 Dark mode).
      return `<tr><td style="padding:${b.secondary ? 14 : 24}px 0 0"><table role="presentation" cellpadding="0" cellspacing="0" class="button"${b.block ? ' width="100%"' : ""}><tr><td align="center" bgcolor="${b.secondary ? C.white : C.ink}" style="border:${b.secondary ? `1px solid ${C.display}` : `2px solid ${C.ink}`};border-radius:100px"><a href="${esc(b.href)}" style="display:${b.block ? "block" : "inline-block"};text-align:center;padding:${b.secondary ? "14px 9px" : "13px 32px"};font-family:${SANS};font-size:${C.size.button};font-weight:500;letter-spacing:0.15px;color:${b.secondary ? C.display : C.buttonText};text-decoration:none">${esc(b.label)}</a></td></tr></table></td></tr>`;
  }
}

function blockText(b: Block): string {
  switch (b.kind) {
    case "heading":
      return b.text;
    case "para":
      return b.text;
    case "rows":
      return [b.title, ...b.rows.map(([l, v]) => `${l}: ${v}`)]
        .filter(Boolean)
        .join("\n");
    case "textPanel":
      return [b.title, ...b.paras].join("\n\n");
    case "eyebrow":
      return b.text;
    case "tiles":
      return [
        b.title,
        ...b.tiles.map((t) => `${t.name} · ${t.from}: ${t.href}`),
      ].join("\n");
    case "linkLine":
      return `${b.text ? `${b.text} ` : ""}${b.label}: ${b.href}`;
    case "footnote":
      return [b.text, b.link && `${b.link[0]}: ${b.link[1]}`]
        .filter(Boolean)
        .join("\n");
    case "card":
      return [...b.lines, ...b.links.map(([l, h]) => `${l}: ${h}`)].join("\n");
    case "small":
      return b.text;
    case "links":
      return b.links.map(([l, h]) => `${l}: ${h}`).join("\n");
    case "steps":
      return b.steps
        .map(
          (s) =>
            `${s.done ? "[x]" : "[ ]"} ${s.label}${s.date ? ` — ${s.date}` : ""}`,
        )
        .join("\n");
    case "notice":
      return `${b.title}\n${b.text}`;
    case "button":
      return `${b.label}: ${b.href}`;
  }
}

/** The finished e-mail: HTML (with the hidden preheader) and its plain-text part. */
export function renderEmail(
  e: Email,
  ctx: { business: Business; origin: string; signOff: string },
): { subject: string; html: string; text: string } {
  const business = e.business ?? ctx.business;
  const [f1, f2] = footerLines(business);
  const logo = `${ctx.origin}/email/baked-by-linda-logo-email@2x.png`;
  // Footnotes sit under the sign-off, just above the footer rule (e-mails 5, 16, 18 as drawn).
  const body = e.blocks.filter((b) => b.kind !== "footnote");
  const foot = e.blocks.filter((b) => b.kind === "footnote");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(e.subject)}</title>
<style>@media (max-width:480px){.row td{display:block!important;width:100%!important;text-align:left!important;padding:2px 0!important}.row .label{padding-top:8px!important}.row .value{padding-bottom:8px!important}.button,.button tbody,.button tr,.button td,.button a{display:block!important;width:100%!important;text-align:center!important;box-sizing:border-box}.tiles td{display:block!important;width:100%!important;padding:0 0 16px!important}.tiles .gap{display:none!important}.tiles img{width:100%!important;max-width:240px!important}}</style></head>
<body style="margin:0;padding:0;background:${C.white}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader)}${"&#x2007;&#xFEFF;&#x34F; ".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.white}"><tr><td align="center" style="padding:16px 8px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border:1px solid ${C.frame};border-radius:10px;border-collapse:separate;overflow:hidden">
<tr><td bgcolor="${C.headerBand}" style="background:${C.headerBand};padding:15px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><a href="${esc(ctx.origin)}/"><img src="${logo}" width="177" height="27" alt="${esc(business.tradingName)}" style="display:block;border:0"></a></td><td align="right" style="font-family:${SANS};font-size:${C.size.small};color:${C.accent}">${esc(business.town)}</td></tr></table></td></tr>
${e.hero ? `<tr><td><img src="${esc(e.hero.src)}" width="600" height="300" alt="${esc(e.hero.alt)}" style="display:block;width:100%;height:auto;border:0"></td></tr>\n` : ""}<tr><td style="padding:0 31px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${body.map((b) => blockHtml(b, ctx.origin)).join("\n")}
${e.noSignOff || !ctx.signOff ? "" : `<tr><td style="padding:24px 0 0;font-family:${SANS};font-size:${C.size.body};color:${C.body}">— ${esc(ctx.signOff)}</td></tr>`}
${foot.map((b) => blockHtml(b, ctx.origin)).join("\n")}
<tr><td style="padding:24px 0 0"><div style="border-top:1px solid ${C.rule};padding-top:18px;font-family:${SANS};font-size:${C.size.small};line-height:1.5;color:${C.meta}">${esc(f1)}<br>${esc(f2.replace(` · ${business.phone}`, ""))} · <a href="${tel(business.phone)}" style="color:${C.meta};text-decoration:none">${esc(business.phone)}</a></div></td></tr>
</table></td></tr></table>
</td></tr></table>
</body></html>`;
  const text = [
    ...body.map(blockText),
    ...(e.noSignOff || !ctx.signOff ? [] : [`— ${ctx.signOff}`]),
    ...foot.map(blockText),
    `${f1}\n${f2}`,
  ].join("\n\n");
  return { subject: e.subject, html, text };
}
