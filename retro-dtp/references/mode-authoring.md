# Add a mode using existing composition primitives

Keep production modes under `assets/modes/<stable-id>/`. A separate development registry can be selected with `--profiles /path/to/registry`; it replaces the discovery root for that command. The original automatic routing by document type is preserved. Give new modes a unique ID, full display name and aliases; explicit selection is required for new IDs.

Copy a starter profile and change its resources deliberately. Required manifest fields: schema_version 1, id, display_name, aliases, reference_baseline, fidelity `period-inspired`, supported_types, templates, primitives, typography, palette, print_defaults, signatures (at least three), artwork_rules, overflow_policy, fallbacks, reference_path, asset_manifest, example_ids and readiness. Every supported type maps to an HTML/CSS pair and a declared kind: sheets, quarter-fold or banner. A new primitive requires renderer development and its own geometry tests; a profile cannot create one by naming it.

Use the bundled font manifest for all seven typography roles. Template HTML uses named `<!--DTP:main-->` slots (or deliberate role-specific slots); `prepare` binds ordered JSON blocks to those slots. Keep fonts and artwork local. `artwork/manifest.json` lists each original or licensed asset, SHA-256, provenance, licence and notice. Include the notices. Resources must remain beneath the profile root, without symlinks or remote URLs.

Start with readiness `draft`. It is omitted from ordinary mode listing and cannot be selected without `--allow-draft-profile`. Test explicit type selection, exact copy, overflow, every page, paper dimensions and relative paths. Render representative examples using the normal production commands and inspect the actual PDF previews. Record independent content and visual findings. An incomplete profile fails discovery with a diagnostic; it cannot silently become a supported mode.

To release, include a compact actual PDF preview in the profile and set representative_preview to its relative path. Set release_evidence to a JSON receipt containing status `verified`, preview_sha256 and examples [{id,status:"verified",pdf_sha256,revision}]. Cover every example_ids entry. This compact evidence is shipped with the skill; full editable examples and review records can live in the repository. Do not make the runtime depend on those repository paths. Set readiness to `supported` only after the evidence exists. The loader verifies resource paths, artwork, font selection, preview hash and receipt coverage. A receipt records a review; it does not replace doing that review.

The repository's test-only Workshop Press profile exercises discovery, explicit selection and the ordinary sheet primitive. It is available only in the test registry.

A template may override individual profile typography roles with a `typography` object using the same role and face fields as the profile. Preparation copies the licensed font files for the resulting role map. This lets a Draw flyer use Roman lettering while an office form keeps its labelled fields.

A letter-only or text-led design can set `text_only: true` and provide an empty artwork ledger. A profile with `postscript_level: 1` also produces monochrome Level 1 PostScript using Poppler pdftops.

For a released image preset, add the matching ID to `assets/design-rules.json` with its tools, native composition, exclusions and review question. Set the raster endpoint in `scripts/retro_filter.py`. Run the design and raster contracts and rebuild the standalone attachments after changes.
