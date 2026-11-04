import type { CSSProperties } from "react";

export type OmbreName =
  | "header"
  | "menu"
  | "footer-phone"
  | "footer-tablet"
  | "footer-desktop"
  | "home-band"
  | "range-phone"
  | "range-desktop";

/**
 * A pink ombre background in CSS (src/styles/ombre.css; Bohoka 2026-11-04). Put it first inside a surface that is
 * positioned and isolated; it fills the surface behind its content. `imgClassName` places the drawn picture when it
 * is not sized like `cover`; `tail` continues its last row below it. Colours and grain: tokens.css (scripts/ombre-fit.py).
 */
export function Ombre({
  name,
  className,
  imgClassName,
  tail,
}: {
  name: OmbreName;
  className?: string;
  imgClassName?: string;
  tail?: boolean;
}) {
  const style: Record<string, string> = {
    "--r": `var(--ombre-${name}-ratio)`,
    "--ombre-grain": `var(--ombre-${name}-grain)`,
  };
  for (let i = 0; i < 6; i++) style[`--o${i}`] = `var(--ombre-${name}-${i})`;
  return (
    <span
      aria-hidden
      className={`ombre${className ? ` ${className}` : ""}`}
      data-tail={tail || undefined}
      style={style as CSSProperties}
    >
      <span className={`ombre-img${imgClassName ? ` ${imgClassName}` : ""}`}>
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}
