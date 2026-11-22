import { demand } from "./util.mjs";
export function bannerGeometry(a, paper, margin) {
  const width = a?.width_mm,
    height = a?.height_mm,
    overlap = a?.overlap_mm ?? 10,
    usable = paper[0] - 2 * margin,
    usableHeight = paper[1] - 2 * margin - 8;
  demand(
    [width, height, overlap, usable, usableHeight].every(Number.isFinite) &&
      width > 0 &&
      height > 0 &&
      overlap > 0 &&
      overlap < usable &&
      height <= usableHeight,
    "BANNER_GEOMETRY",
    "Invalid banner dimensions/overlap or master exceeds printable height",
  );
  const count = Math.max(1, Math.ceil((width - overlap) / (usable - overlap)));
  demand(
    count <= 100,
    "BANNER_GEOMETRY",
    "Banner exceeds 100-sheet processing limit; divide into sections",
  );
  return {
    width,
    height,
    overlap,
    usable,
    usableHeight,
    paper,
    margin,
    tiles: Array.from({ length: count }, (_, i) => ({
      index: i + 1,
      x: i * (usable - overlap),
      end: Math.min(width, i * (usable - overlap) + usable),
    })),
  };
}
export async function sizeMaster(page, g) {
  await page.evaluate((g) => {
    const el = document.querySelector(".master");
    if (el) {
      el.style.width = g.width + "mm";
      el.style.height = g.height + "mm";
    }
  }, g);
  await page.addStyleTag({
    content: `@page{size:${g.width}mm ${g.height}mm;margin:0}.sheet{width:${g.width}mm!important;height:${g.height}mm!important}.master{position:relative;width:${g.width}mm;height:${g.height}mm}.master-region{position:absolute;inset:10mm}`,
  });
}
export async function makeTiles(page, g) {
  await page.evaluate((g) => {
    const master = document.querySelector(".master");
    if (!master) throw new Error("Missing banner master");
    const html = master.outerHTML;
    document.body.innerHTML = "";
    for (const t of g.tiles) {
      const sheet = document.createElement("section");
      sheet.className = "sheet tile";
      sheet.style.cssText = `width:${g.paper[0]}mm!important;height:${g.paper[1]}mm!important;position:relative;overflow:hidden;break-after:page`;
      const clip = document.createElement("div");
      clip.style.cssText = `position:absolute;left:${g.margin}mm;top:${g.margin}mm;width:${g.usable}mm;height:${g.height}mm;overflow:hidden`;
      clip.innerHTML = html;
      const clone = clip.firstElementChild;
      clone.style.cssText = `position:absolute;left:${-t.x}mm;top:0;width:${g.width}mm;height:${g.height}mm`;
      sheet.append(clip);
      const guide = document.createElement("div");
      guide.textContent = `Tile ${t.index} / ${g.tiles.length} — ${g.overlap} mm overlap — align before trimming`;
      guide.style.cssText = `position:absolute;left:${g.margin}mm;top:${g.margin + g.height + 4}mm;font:10pt "Liberation Sans";color:#111`;
      sheet.append(guide);
      if (t.index > 1) {
        const cut = document.createElement("div");
        cut.textContent = "▲";
        cut.title =
          "Trim the left edge to this mark and align repeated artwork";
        cut.style.cssText = `position:absolute;left:${g.margin + g.overlap - 1}mm;top:${g.margin + g.height}mm;font:8pt \"Liberation Sans\"`;
        sheet.append(cut);
      }
      document.body.append(sheet);
    }
    document.body.lastElementChild.style.breakAfter = "auto";
  }, g);
  await page.addStyleTag({
    content: `@page{size:${g.paper[0]}mm ${g.paper[1]}mm;margin:0}`,
  });
}
