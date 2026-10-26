"use client";

import { useEffect } from "react";
import { installInteractions } from "./interactions";

/** Mounted once in the root layout: every [data-pressable] and [data-writable] on the page reacts (ANIM-05, ANIM-07). */
export function MotionRoot() {
  useEffect(() => installInteractions(document), []);
  return null;
}
