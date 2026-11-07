// The Terms and Cancellations PDFs of e-mail 1 (§8.1 Durable record): the accepted revision, its placeholders filled
// from the business facts kept with the order (never today's Settings). A4, plain and readable; the site's fonts
// are not embedded (Helvetica) so the file stays small.
import {
  Document,
  Link,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { fillLegal, parseLegal, updatedLabel, type Inline } from "../legal";
import type { Placeholder } from "../placeholders";
import C from "./palette.json";

const s = StyleSheet.create({
  page: {
    padding: C.pdf.margin,
    fontFamily: "Helvetica",
    fontSize: C.pdf.body,
    color: C.ink,
    lineHeight: 1.45,
  },
  brand: { fontSize: C.pdf.meta, color: C.accent, marginBottom: 18 },
  title: { fontSize: C.pdf.title, fontFamily: "Helvetica", marginBottom: 6 },
  meta: { fontSize: C.pdf.meta, color: C.meta, marginBottom: 14 },
  intro: { color: C.body, marginBottom: 12 },
  heading: {
    fontSize: C.pdf.heading,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 4,
  },
  p: { marginBottom: 6, color: C.body },
  li: { flexDirection: "row", marginBottom: 3, color: C.body },
  bullet: { width: 12 },
  bold: { fontFamily: "Helvetica-Bold", color: C.ink },
  link: { color: C.accent },
});

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "bold" ? (
          <Text key={i} style={s.bold}>
            {p.text}
          </Text>
        ) : p.kind === "link" ? (
          <Link key={i} src={p.href} style={s.link}>
            {p.text}
          </Link>
        ) : (
          <Text key={i}>{p.text}</Text>
        ),
      )}
    </>
  );
}

export async function legalPdf(r: {
  title: string;
  intro: string;
  body: string;
  updatedOn: string;
  facts: Record<Placeholder, string>;
}): Promise<Buffer> {
  const sections = parseLegal(fillLegal(r.body, r.facts));
  const doc = (
    <Document title={r.title} author={r.facts.trading_name}>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>{r.facts.trading_name}</Text>
        <Text style={s.title}>{r.title}</Text>
        <Text style={s.meta}>Last updated {updatedLabel(r.updatedOn)}</Text>
        <Text style={s.intro}>{fillLegal(r.intro, r.facts)}</Text>
        {sections.map((sec) => (
          <View key={sec.id} wrap>
            <Text style={s.heading}>
              {sec.number}. {sec.heading}
            </Text>
            {sec.blocks.map((b, i) =>
              b.kind === "p" ? (
                <Text key={i} style={s.p}>
                  <Inlines parts={b.inline} />
                </Text>
              ) : (
                <View key={i}>
                  {b.items.map((item, j) => (
                    <View key={j} style={s.li}>
                      <Text style={s.bullet}>•</Text>
                      <Text style={{ flex: 1 }}>
                        <Inlines parts={item} />
                      </Text>
                    </View>
                  ))}
                </View>
              ),
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
