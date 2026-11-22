import { demand } from "./util.mjs";
export function cardGeometry(w, h, margin) {
  demand(
    w > margin * 4 && h > margin * 4,
    "CARD_GEOMETRY",
    "Card panels too small",
  );
  return {
    finished: [w / 2, h / 2],
    inset: Math.max(margin, 6),
    panels: [
      { id: "inside-right", x: 0, y: 0, rotation: 180 },
      { id: "inside-left", x: w / 2, y: 0, rotation: 180 },
      { id: "back", x: 0, y: h / 2, rotation: 0 },
      { id: "front", x: w / 2, y: h / 2, rotation: 0 },
    ].map((p) => ({ ...p, w: w / 2, h: h / 2 })),
    folds: ["Top half behind bottom", "Left half behind right"],
  };
}
export async function applyCard(page, g) {
  await page.evaluate((g) => {
    for (const p of g.panels) {
      const el = document.querySelector(`[data-panel="${p.id}"]`);
      if (!el) throw new Error(`Missing panel ${p.id}`);
      Object.assign(el.style, {
        position: "absolute",
        left: p.x + "mm",
        top: p.y + "mm",
        width: p.w + "mm",
        height: p.h + "mm",
      });
      const inner = el.querySelector("[data-dtp-region]");
      Object.assign(inner.style, {
        position: "absolute",
        inset: g.inset + "mm",
        transform: `rotate(${p.rotation}deg)`,
      });
    }
  }, g);
}
export function cardAssembly(g) {
  return `<h1>Quarter-fold card</h1><p>Print one-sided, at actual size. Start with the printed face up.</p><div class="fold-grid">${g.panels.map((p) => `<div><strong>${p.id}</strong><p>${p.rotation} degrees</p><p>${p.rotation ? "Text upside down on the flat sheet" : "Text upright on the flat sheet"}</p></div>`).join("")}</div><h2>1. Fold the top half behind the bottom</h2><h2>2. Fold the left half behind the right</h2><p>The original lower-right panel is the front. Open that front toward the left.</p><p>Finished size: ${g.finished.map((x) => x.toFixed(2)).join(" × ")} mm.</p>`;
}
