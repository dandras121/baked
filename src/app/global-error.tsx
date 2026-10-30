"use client";

import { ServerError } from "@/components/error-page/server-error";
import "@/styles/fonts.css";
import "@/styles/tokens.css";
import "@/styles/typography.css";
import "@/styles/base.css";
import "@/styles/responsive.css";
import "@/styles/interaction.css";
import "./globals.css";

// When even the page frame fails (e.g. the database is down while the header and footer load):
// the 500 page on its own, with no database call (§4.7).
export default function GlobalError() {
  return (
    <html lang="en-GB">
      <head>
        <meta name="robots" content="noindex" />
      </head>
      <body>
        <main className="shell" style={{ containerType: "inline-size" }}>
          <ServerError />
        </main>
      </body>
    </html>
  );
}
