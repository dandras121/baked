// Copies the keyframe JSON of docs/ANIMATIONS.md §12 into src/motion/keyframes.json (the one source of motion data).
// Run: pnpm keyframes. A unit test fails when the copy and the document differ.
import { readFileSync, writeFileSync } from "node:fs";

export function extractKeyframes(markdown) {
  const section = markdown.slice(
    markdown.indexOf("## 12. Appendix — keyframe data (JSON)"),
  );
  const match = /```json\n([\s\S]*?)\n```/.exec(section);
  if (!match) throw new Error("No JSON block in ANIMATIONS.md §12");
  return JSON.parse(match[1]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = extractKeyframes(readFileSync("docs/ANIMATIONS.md", "utf8"));
  writeFileSync("src/motion/keyframes.json", JSON.stringify(data) + "\n");
  console.log("src/motion/keyframes.json written");
}
