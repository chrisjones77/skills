# Editing and revising

Copy a completed bundle's `source/` folder to a new working folder. Edit literal text in `document.json`, visual structure in `layout.html`, spacing/type/layout in `style.css`, and artwork as separate SVG assets. Do not edit `rendered.html`: it is derived. Render to a fresh revision path and inspect the resulting PDF images.

Never change text just to fit a page. Reflow within the agreed page count and minimum type size; if the constraints conflict, ask for a specific content/page decision. A title/date edit keeps all other block text unchanged. A mode switch keeps block IDs, text and paper choices while composing a new source with the selected profile. Preserve the previous source and bundle.

A `data-dtp-block` element binds exactly one JSON block. Add its ID to the layout if adding a block. HTML only holds placement; it is not a second copy authority. Keep DOM order equal to semantic block order for ordinary sheets and newsletters. Cards declare their logical panels separately; banner tiles are repeated views of a single master.

Assets are content-hashed. When intentionally replacing artwork, update its provenance and SHA-256 in document.json; do not clear missing-asset checks. Changing a font requires coverage and layout checks, not only a CSS name change. Use local licensed files and record explicit substitutions.

Record the requested delta in revision_note and optionally parent_revision {path, source_hash} in document.json. Changing a title block also updates the new handoff heading. For a mode switch, make a new brief from the same ordered blocks and paper, change mode, and prepare into a new folder. Remove or remap layout-specific slots only as part of recomposition; never silently drop text.
