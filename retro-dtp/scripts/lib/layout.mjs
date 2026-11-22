import { paperSize } from "./document.mjs";
import { demand } from "./util.mjs";
import { fontCss } from "./fonts.mjs";
export function printCss(d) {
  const [w, h] = paperSize(d.paper);
  return `${fontCss(d)}\n@page{size:${w}mm ${h}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{color:#111;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{position:relative;width:${w}mm;height:${h}mm;margin:0;break-after:page;overflow:hidden}.sheet:last-child{break-after:auto}.safe{position:absolute;inset:${d.paper.safe_margin_mm}mm}[data-dtp-block]{white-space:pre-wrap;hyphens:none;text-transform:none}[data-role="body"]{font-size:${d.minimum_body_pt}pt}img,svg{max-width:100%}.monochrome,.monochrome *{--accent:#111!important} .monochrome [data-dtp-block]{color:#111!important}.monochrome img{filter:grayscale(1)} `;
}
export async function bindAndMeasure(page, d) {
  const result = await page.evaluate(
    async ({ blocks, minPt, safeMargin, kind }) => {
      const all = [...document.querySelectorAll("[data-dtp-block]")],
        errors = [];
      const known = new Map(blocks.map((b) => [b.id, b]));
      for (const el of all) {
        const id = el.dataset.dtpBlock;
        if (!known.has(id)) errors.push(`Unknown block ${id}`);
        else el.textContent = known.get(id).text;
      }
      for (const b of blocks)
        if (all.filter((e) => e.dataset.dtpBlock === b.id).length !== 1)
          errors.push(`Expected exactly one binding: ${b.id}`);
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode()));
      const sheets = [...document.querySelectorAll(".sheet")];
      const records = [];
      const rect = (r) => ({ x: r.x, y: r.y, w: r.width, h: r.height });
      for (const el of all) {
        const b = known.get(el.dataset.dtpBlock);
        if (!b) continue;
        const box = el.getBoundingClientRect(),
          sheet = el.closest(".sheet"),
          sb = sheet?.getBoundingClientRect();
        const region =
          el.closest("[data-dtp-region]") ?? el.closest(".safe") ?? sheet;
        const rb = region?.getBoundingClientRect();
        const style = getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const fragments = [];
        if (el.firstChild)
          for (const match of b.text.matchAll(/\S+/g)) {
            const wordRange = document.createRange();
            wordRange.setStart(el.firstChild, match.index);
            wordRange.setEnd(el.firstChild, match.index + match[0].length);
            fragments.push(...wordRange.getClientRects());
          }
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0;
        if (
          b.text.trim() &&
          (!visible || !fragments.length || !box.width || !box.height)
        )
          errors.push(`Hidden or empty text ${b.id}`);
        if (
          kind === "sheets" &&
          sb &&
          fragments.some(
            (r) =>
              r.left < sb.left + safeMargin - 1 ||
              r.right > sb.right - safeMargin + 1 ||
              r.top < sb.top + safeMargin - 1 ||
              r.bottom > sb.bottom - safeMargin + 1,
          )
        )
          errors.push(`Outside safe area: ${b.id}`);
        if (!sheet || !region) errors.push(`No sheet/region for ${b.id}`);
        if (
          rb &&
          b.text.trim() &&
          (fragments.some(
            (r) =>
              r.left < rb.left - 1 ||
              r.right > rb.right + 1 ||
              r.top < rb.top - 1 ||
              r.bottom > rb.bottom + 1,
          ) ||
            box.right > rb.right + 1 ||
            box.bottom > rb.bottom + 1)
        )
          errors.push(
            `Overflow in ${b.id}: region ${JSON.stringify(rect(rb))}, block ${JSON.stringify(rect(box))}, fragments ${JSON.stringify(fragments.filter((r) => r.left < rb.left - 1 || r.right > rb.right + 1 || r.top < rb.top - 1 || r.bottom > rb.bottom + 1).map(rect))}`,
          );
        if (
          ["body", "date", "label", "caption", "footer"].includes(b.role) &&
          parseFloat(style.fontSize) * 0.75 < minPt - 0.02
        )
          errors.push(`Type below minimum in ${b.id}`);
        if (style.textTransform !== "none")
          errors.push(`Text transform changes copy in ${b.id}`);
        records.push({
          id: b.id,
          page: sheets.indexOf(sheet) + 1,
          rect: {
            x: box.x - (sb?.x ?? 0),
            y: box.y - (sb?.y ?? 0),
            w: box.width,
            h: box.height,
          },
          family: style.fontFamily.split(",")[0].replaceAll('"', "").trim(),
          weight: style.fontWeight,
          style: style.fontStyle,
          size_pt: parseFloat(style.fontSize) * 0.75,
          panel: b.panel ?? null,
        });
      }
      return {
        errors,
        records,
        page_count: sheets.length,
        dom_order: all.map((e) => e.dataset.dtpBlock),
        sheets: sheets.map((e) => rect(e.getBoundingClientRect())),
      };
    },
    {
      blocks: d.blocks,
      minPt: d.minimum_body_pt,
      safeMargin: (d.paper.safe_margin_mm * 96) / 25.4,
      kind: d.layout.kind,
    },
  );
  demand(!result.errors.length, "LAYOUT", result.errors.join("; "), 4, {
    errors: result.errors,
  });
  demand(
    result.page_count <= d.page_limit,
    "PAGE_LIMIT",
    `Produced ${result.page_count} pages; limit ${d.page_limit}`,
    4,
  );
  if (d.layout.kind === "sheets")
    demand(
      JSON.stringify(result.dom_order) ===
        JSON.stringify(d.blocks.map((b) => b.id)),
      "READING_ORDER",
      "DOM block order differs from semantic copy order",
      4,
    );
  return result;
}
