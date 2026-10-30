"use client";

import { buttonClasses } from "@/components/ui/button";
import { OPEN_COOKIE_SETTINGS } from "./cookie-consent";

/**
 * Footer “Cookie preferences” (§3.2): opens the cookie panel with the stored choice. Without
 * JavaScript it stays a link to the Cookie policy's “changing your mind” section.
 */
export function CookiePreferencesButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <a
      href="/cookies#changing-your-mind"
      role="button"
      className={buttonClasses({ variant: "outline", size: "sm", className })}
      data-pressable=""
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        e.preventDefault();
        window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS));
      }}
    >
      Cookie preferences
    </a>
  );
}
