"use client";

import { useEffect, useState } from "react";
import { ErrorPage, type SiteFacts } from "./error-page";

/**
 * The 500 content when a page fails (§4.7). Phone and e-mail come from the static
 * /site-facts.json written at build time, so showing it needs no database.
 */
export function ServerError() {
  const [facts, setFacts] = useState<SiteFacts>({});
  useEffect(() => {
    document.title = "Something went wrong — Baked by Linda";
    fetch("/site-facts.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((f: SiteFacts) => setFacts(f))
      .catch(() => {});
  }, []);
  return <ErrorPage kind={500} facts={facts} />;
}
