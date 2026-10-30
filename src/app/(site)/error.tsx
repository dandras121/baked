"use client";

import { ServerError } from "@/components/error-page/server-error";

// A page that fails inside the site: the 500 content under the header, above the footer (§4.7).
export default function SiteError() {
  return <ServerError />;
}
