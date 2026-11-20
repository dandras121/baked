"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Copy the order link (Decided D11): copies /my-order/[token]; “Link copied” for a moment. */
export function CopyOrderLink({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(
          new URL(path, location.origin).href,
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      <span aria-live="polite">
        {copied ? "Link copied" : "Copy the order link"}
      </span>
    </Button>
  );
}
