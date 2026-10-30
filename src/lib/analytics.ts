// The analytics hook (SITE-FLOWS §3.3, §10.11). No provider is chosen yet (§14.1): consenting loads
// nothing. When a provider is chosen, its loader goes in `load` and its cookies into
// ANALYTICS_COOKIE_PREFIXES (consent.ts), and CONSENT_VERSION is raised.
import { isAnalyticsCookie } from "./consent";

const load = () => {
  // §14.1: nothing to load until Linda chooses a provider.
};

/** Deletes every analytics cookie at once (no reload needed), on this host and its parent domains. */
function deleteAnalyticsCookies() {
  const names = document.cookie
    .split(/;\s*/)
    .map((c) => c.split("=")[0])
    .filter((n) => n && isAnalyticsCookie(n));
  const host = location.hostname;
  const domains = ["", host, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of names)
    for (const domain of domains)
      document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}`;
}

/** Starts or stops analytics to match the stored choice. */
export function applyAnalyticsConsent(allowed: boolean) {
  if (allowed) {
    document.documentElement.dataset.analytics = "allowed";
    load();
  } else {
    delete document.documentElement.dataset.analytics;
    deleteAnalyticsCookies();
  }
}
