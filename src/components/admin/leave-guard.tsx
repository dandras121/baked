"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";

/**
 * §9.1 Saving: leaving a form with unsaved changes asks “Leave without saving?” · Leave · Stay. Links inside the site
 * get the dialog; closing the tab or reloading gets the browser's own question.
 */
export function LeaveGuard({ dirty }: { dirty: boolean }) {
  const router = useRouter();
  const [to, setTo] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setTo(url.pathname + url.search);
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
  return (
    <Overlay
      open={to !== null}
      onClose={() => setTo(null)}
      title="Leave without saving?"
      description="What you typed here is not saved yet."
    >
      <Button
        onClick={() => {
          const go = to!;
          setTo(null);
          router.push(go);
        }}
      >
        Leave
      </Button>
      <Button variant="outline" onClick={() => setTo(null)}>
        Stay
      </Button>
    </Overlay>
  );
}
