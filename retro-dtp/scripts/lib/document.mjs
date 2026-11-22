import { demand } from "./util.mjs";
export const TYPES = [
  "flyer",
  "notice",
  "card",
  "banner",
  "newsletter",
  "letterhead",
  "letter",
  "memo",
  "form",
];
export const ROLES = [
  "title",
  "heading",
  "body",
  "label",
  "date",
  "caption",
  "footer",
];
export function paperSize(p) {
  const size = p.size === "letter" ? [215.9, 279.4] : [210, 297];
  return p.orientation === "landscape" ? size.reverse() : size;
}
export function normalizeDocument(input) {
  const d = structuredClone(input);
  demand(
    d.schema_version === 1,
    "SCHEMA_VERSION",
    "Document schema_version must be 1",
  );
  demand(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.id ?? ""),
    "INVALID_ID",
    "A stable lowercase job id is required",
  );
  demand(
    TYPES.includes(d.document_type),
    "DOCUMENT_TYPE",
    `Unknown document type ${d.document_type}`,
  );
  d.paper = {
    size: "letter",
    orientation: "portrait",
    safe_margin_mm: 12.7,
    ...d.paper,
  };
  demand(
    ["letter", "a4"].includes(d.paper.size) &&
      ["portrait", "landscape"].includes(d.paper.orientation),
    "PAPER",
    "Unknown paper size or orientation",
  );
  const [w, h] = paperSize(d.paper);
  demand(
    Number.isFinite(d.paper.safe_margin_mm) &&
      d.paper.safe_margin_mm >= 0 &&
      d.paper.safe_margin_mm * 2 < Math.min(w, h),
    "MARGIN",
    "Invalid or impossible safe margins",
  );
  d.minimum_body_pt ??= 10;
  demand(
    Number.isFinite(d.minimum_body_pt) &&
      d.minimum_body_pt > 0 &&
      (d.minimum_body_pt >= 10 ||
        (typeof d.minimum_body_override === "string" &&
          d.minimum_body_override.trim())),
    "TYPE_SIZE",
    "Body type below 10pt requires an explicit override",
  );
  d.page_limit ??=
    d.document_type === "newsletter"
      ? 2
      : d.document_type === "banner"
        ? 100
        : 1;
  demand(
    Number.isInteger(d.page_limit) && d.page_limit > 0 && d.page_limit <= 100,
    "PAGE_LIMIT",
    "page_limit must be a positive integer up to 100",
  );
  demand(
    d.document_type !== "newsletter" || d.page_limit <= 4,
    "PAGE_LIMIT",
    "Newsletter limit is four pages",
  );
  d.color ??= "monochrome";
  demand(
    ["monochrome", "accent"].includes(d.color),
    "COLOR",
    "Unknown color treatment",
  );
  demand(
    Array.isArray(d.blocks) && d.blocks.length > 0,
    "CONTENT",
    "Provide text blocks",
  );
  let ids = new Set();
  for (const b of d.blocks) {
    demand(/^[a-zA-Z][\w-]*$/.test(b.id ?? ""), "BLOCK_ID", "Invalid block ID");
    demand(!ids.has(b.id), "DUPLICATE_BLOCK", `Duplicate block ${b.id}`);
    ids.add(b.id);
    demand(ROLES.includes(b.role), "BLOCK_ROLE", `Unknown role for ${b.id}`);
    demand(
      typeof b.text === "string",
      "BLOCK_TEXT",
      `Literal text required: ${b.id}`,
    );
    if (b.panel)
      demand(
        ["front", "inside-left", "inside-right", "back"].includes(b.panel),
        "PANEL",
        `Unknown panel ${b.panel}`,
      );
  }
  demand(
    d.blocks.some((b) => b.text.trim()),
    "CONTENT",
    "Document must contain text",
  );
  if (d.document_type === "card")
    for (const b of d.blocks)
      demand(b.panel, "PANEL", `Card block ${b.id} needs a panel`);
  d.title ??= d.blocks.find((b) => b.role === "title")?.text ?? d.id;
  d.assets ??= [];
  return d;
}
