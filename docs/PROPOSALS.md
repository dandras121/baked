# Proposals built — Baked by Linda

Every **Proposal** row (SITE-FLOWS §0.2) and every case no document covers (§0.7) that was built, one line each.
Bohoka’s decision is added when he gives it (“jó” = keep, “ne legyen” = back to Figma).

| Slice | § reference | What was built | Where | Bohoka’s decision |
|---|---|---|---|---|
| 0.2 | §0.7 (no Figma spacing variables) | A spacing scale of the gaps and paddings drawn in Figma (2–96 px); the drawn values without a node are marked Proposal in the file | `src/styles/tokens.css` (Spacing) | |
| 0.2 | §0.8 (fonts) + Figma | Manrope (variable, self-hosted) as the third family, because Figma uses it for the cake card description and the reviews (`V2/Quote/*`, 1490:8905) | `src/styles/fonts.css`, `--font-quote` | Keep (jó), 2026-10-26 |
| 0.5a | §0.7 (not drawn) | Radio button: the check box shape made round, a 10 px ink dot when chosen | `src/components/ui/choice.tsx` | |
| 0.5a | §0.7 (not drawn) | Select (drop-down list): the text field box with the browser’s own list and a small chevron | `src/components/ui/text-field.tsx` | |
| 0.5a | A§7E (“Text link · colour only”, none drawn) | Links inside sentences: accent colour, underlined; on hover or keyboard focus they turn display violet | `src/components/ui/link.*` | |
| 0.5a | §7.1 Counters | Counter “n / max” can show always or only from 80 % of the limit (the field decides) | `src/components/ui/text-field.tsx` | |
