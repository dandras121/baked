import NextLink from "next/link";
import type { ReactNode } from "react";
import styles from "./link.module.css";

type LinkProps = {
  href: string;
  children: ReactNode;
  /** standalone: on its own (ANIM-07, grows); inline: inside a sentence (colour only, A§7E). */
  variant?: "standalone" | "inline";
  /** Dense link lists (footer, “On this page”): 24 × 24 hit area instead of 44 × 44 (§0.6). */
  dense?: boolean;
  external?: boolean;
  className?: string;
};

export function Link({
  href,
  children,
  variant = "standalone",
  dense,
  external,
  className = "",
}: LinkProps) {
  const standalone = variant === "standalone";
  const props = {
    className: [
      styles.link,
      styles[variant],
      standalone ? (dense ? "hit-24" : "hit-44") : "",
      className,
    ].join(" "),
    ...(standalone ? { "data-pressable": "" } : {}),
  };
  if (external || /^(https?:|mailto:|tel:)/.test(href)) {
    const newTab = /^https?:/.test(href);
    return (
      <a
        href={href}
        {...props}
        {...(newTab ? { target: "_blank", rel: "noopener" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} {...props}>
      {children}
    </NextLink>
  );
}
