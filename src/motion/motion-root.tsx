"use client";

import { useEffect } from "react";
import { installInteractions } from "./interactions";
import { trackInputType } from "./input-type";

/** Mounted once in the root layout: every [data-pressable] and [data-writable] on the page reacts (ANIM-05, ANIM-07). */
export function MotionRoot() {
  useEffect(() => {
    trackInputType(document);
    return installInteractions(document);
  }, []);
  return null;
}
