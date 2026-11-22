# Local production

Run from the skill directory with Node 24 and Poppler (`pdfinfo`, `pdffonts`, `pdftotext`, `pdftoppm`). The PageMaker preset also uses Poppler’s pdftops to export a monochrome Level 1 PostScript job. Setup once with `npm ci` and `node node_modules/playwright/cli.js install chromium`; use `node scripts/retro-dtp.mjs doctor --json` to check actual readiness. Rendering never installs dependencies or switches browsers silently.

For image design, `design` emits one generator prompt and `design-card` exports plain-language controls for ordinary ChatGPT. The `filter` command applies raster finishing. Document production uses `doctor`, `modes`, `prepare`, `render` and `verify`. Paths may be absolute; source resources must remain relative within their folder. `--profiles <folder>` selects a development profile collection. `--allow-draft-profile` is an explicit development option, never a default.

## Brief

Create UTF-8 JSON such as:

```json
{
  "schema_version": 1,
  "id": "garden-notice",
  "document_type": "notice",
  "mode": "print-shop",
  "paper": {"size": "letter", "orientation": "portrait", "safe_margin_mm": 12.7},
  "blocks": [
    {"id": "title", "role": "title", "text": "Seed Swap"},
    {"id": "date", "role": "date", "text": "Saturday, 10 April 2027"},
    {"id": "body", "role": "body", "text": "Bring seeds to share."}
  ]
}
```

Roles: title, heading, body, label, date, caption, footer. Block IDs are unique. The block array is semantic reading order. Text is literal, never HTML. Templates have named slots; unspecified slots use `main`. Check the chosen template/reference before assigning `slot` or card `panel`. A4 and landscape are supported; newsletters require an explicit page limit up to four.

```sh
node scripts/retro-dtp.mjs prepare --brief /path/brief.json --out /path/new-source
node scripts/retro-dtp.mjs render --source /path/new-source --out /path/revision-001 --json
node scripts/retro-dtp.mjs verify --revision /path/revision-001 --json
```

Finish the composition between prepare and render. Exit 0 from render means output was created and structurally checked, with visual review still pending. Exit 2 diagnoses input/selection; 3 missing prerequisites/assets/fonts; 4 rendering/structural failure; 5 incomplete or stale review from verify. `--timeout-ms` sets a positive per-operation timeout (30 seconds by default).

## Inspect and record

Open every image named by `render-manifest.json.required_visuals`. Use full-page reading and enlargement as needed; contact sheets alone do not prove body legibility. The report must address copy, clipping, overlap, glyphs/assets, reading order, spacing and profile signatures.

Update only `review.json` after actual inspection. Record `source_hash` from the manifest, `source_to_brief` with outcome/reviewer/findings, and one visual item per image with `path`, its `sha256`, associated `pdf_sha256`, `outcome`, `reviewer`, `findings`, and `reviewed_at`. For rotated text that automated extraction marks unavailable, a `resolved_checks` item may record the exact check ID, passing outcome, reviewer and findings only after a real source/image comparison. Never suppress an actual content loss with a review entry.

Keep creative_acceptance as not-requested or pending unless the user actually accepts. Keep physical_print as not-tested unless a named-device print test occurred. Any changed source/PDF/preview needs a new revision and review. `verify` checks recorded scope and hashes and reruns actual PDF geometry/font/text checks; a review record is evidence of the named review, not authenticated human approval.

## Runtime and supported scope

The tested baseline is macOS arm64 with Node 24.14.0, Playwright 1.65.1, Fontkit 3.0.0 and Poppler 26.11.0. Linux and physical printing are unverified. Install package-matching Chromium explicitly during setup; production commands never download it. In the full repository, npm test uses npm_node_execpath to avoid an unrelated Node binary in a parent node_modules directory shadowing the selected runtime. Standalone production does not require repository tests.
