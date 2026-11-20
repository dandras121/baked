"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import styles from "./admin-shell.module.css";

const SEEN = "bbl-admin-home-screen";

type InstallEvent = Event & { prompt: () => Promise<void> };

/**
 * Put it on your home screen (§9.17; mobile 9 950:9038, Not now 1801:13703): once on a phone, when the admin is not
 * already installed. Show me how → the steps for this phone (or the browser's own install offer on Android);
 * Not now hides it on this device.
 */
export function HomeScreenPrompt() {
  const [open, setOpen] = useState(false);
  const [how, setHow] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [iphone, setIphone] = useState(true);

  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN) === "1";
      if (!seen) localStorage.setItem(SEEN, "1");
    } catch {
      // No storage (private window): never show it.
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const phone = window.matchMedia("(max-width: 1023.98px)").matches;
    // Shown after the page has drawn: a choice read from this device, not the server.
    const t = setTimeout(() => {
      setIphone(/iPhone|iPad/.test(navigator.userAgent));
      setOpen(!seen && phone && !standalone);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  if (!open) return null;
  return (
    <div className={styles.promptScrim}>
      <section
        className={styles.prompt}
        role="dialog"
        aria-modal="false"
        aria-labelledby="home-screen-title"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark.svg" alt="" className={styles.promptMark} />
        <h2 id="home-screen-title" className={styles.promptTitle}>
          Put it on your home screen
        </h2>
        <p className={styles.promptText}>
          It opens like an app, full screen, with no address to type.{" "}
          {iphone
            ? "Tap Share, then “Add to Home Screen”."
            : "Open the browser menu, then “Install app” / “Add to Home screen”."}
        </p>
        {how && (
          <p className={styles.promptText}>
            After thirty days the site asks you to sign in again with a new
            code.
            {iphone &&
              " Links from e-mails open in Safari, which may ask you to sign in once there too."}
          </p>
        )}
        <Button
          block
          onClick={() => {
            if (install) install.prompt().finally(() => setOpen(false));
            else setHow(true);
          }}
        >
          Show me how
        </Button>
        <button
          type="button"
          className={styles.notNow}
          onClick={() => setOpen(false)}
        >
          Not now
        </button>
        <p className={styles.promptSmall}>
          Nothing is installed and nothing is downloaded — it is the same site
          in a tidier window.
        </p>
      </section>
    </div>
  );
}
