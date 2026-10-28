// The last kind of pointer the visitor used (A§1.9, RESPONSIVE §1): overlays follow the input, not the width.
let last: "mouse" | "touch" = "mouse";
let installed = false;

export function trackInputType(doc: Document = document) {
  if (installed) return;
  installed = true;
  doc.addEventListener(
    "pointerdown",
    (e) => {
      last = e.pointerType === "touch" ? "touch" : "mouse";
    },
    true,
  );
  doc.addEventListener("keydown", () => (last = "mouse"), true);
}

/** ANIM-12 / ANIM-13: a dialog with a mouse, trackpad or keyboard; a bottom sheet with touch below 1120 px. */
export function overlayKind(
  viewportWidth: number,
  input: "mouse" | "touch" = last,
): "dialog" | "sheet" {
  return input === "touch" && viewportWidth < 1120 ? "sheet" : "dialog";
}
