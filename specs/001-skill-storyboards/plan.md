# Implementation Plan: Skill workflow storyboards

**Branch**: `codex/skill-storyboards-spec` · **Date**: 2026-10-22 · **Spec**: [spec.md](spec.md)

## Approach

Reuse the ten generated images after source and visual review. Store them with portable provenance in `docs/skill-storyboards/`. Provide a Markdown gallery for GitHub and a plain HTML gallery for local browsing. A small standard-library Python validator checks inventory, hashes, source bindings, transcripts and links; it does not assess pixels or rights.

## Technical context

- Documentation: Markdown, static HTML and JSON; image assets: PNG.
- Validation: Python 3.11+ standard library, no added package dependencies.
- Platform: GitHub Markdown and a browser opening a local checkout.
- Scale: ten boards, no server, storage service, telemetry or application runtime.
- Asset provenance: OpenAI built-in image_gen; prompts and revision notes retained.

## Constitution check

The source tree has no `.specify/` constitution, Spec Kit scaffold, `AGENTS.md` or contribution guide. Do not invent repository governance or install a scaffold as a side effect. Apply feature-local constraints: preserve source skills, keep the package portable, distinguish source from illustration, disclose pending human review and make only the authorized task-branch change. These gates were checked at planning and after implementation.

## Design decisions

1. Keep images together rather than adding assets to ten separate skill directories. This keeps the change explanatory and avoids modifying installed skill packages.
2. Include Markdown because GitHub does not serve arbitrary repository HTML as a website.
3. Provide transcripts because image alt text alone cannot convey the six-panel workflow.
4. Bind both sources and assets. A digest proves byte identity, not correctness or rights.
5. Reuse GitHub Actions conventions from the existing workflow. Run a scoped validation job for gallery, skill and validator changes.
6. Keep human acceptance pending PR review; the author's AI visual inspection is labelled as such.

## Structure

```text
docs/skill-storyboards/
  README.md
  index.html
  manifest.json
  generation.json
  asset-lineage.json
  assets/*.png
scripts/validate_storyboards.py
.github/workflows/skill-storyboards.yml
specs/001-skill-storyboards/
  spec.md
  plan.md
  tasks.md
  verification.md
  work-and-safety.md
```

## Validation and review

Check portable paths, PNG headers/digests, Git blob SHA bindings, ten-entrypoint coverage, six-step transcripts, gallery source/image links and absence of external resources. Exercise failure cases for changed bytes, missing source coverage and unsafe links in temporary copies. Inspect browser rendering at desktop and narrow widths. Inspect each generated board for main narrative and material contradictions, record corrections, and disclose minor nonauthoritative sample content. Run `git diff --check` before commit.

## Spec Kit reference

The user subsequently requested full work/safety documentation. [work-and-safety.md](work-and-safety.md) records authority, scheduling limits, affected people/systems, evidence chronology, concerns, escalation and remaining review. `asset-lineage.json` records initial/parent/final hashes and the five exact edit prompts. The validator checks parent continuity and final-manifest binding; it cannot reconstruct or inspect omitted intermediate image bytes. Referenced-document drift remains a manual review concern rather than an automated source-binding claim.

This packet adapts the structure described by [GitHub Spec Kit](https://github.com/github/spec-kit) and its [specification](https://github.com/github/spec-kit/blob/main/templates/spec-template.md), [plan](https://github.com/github/spec-kit/blob/main/templates/plan-template.md) and [task](https://github.com/github/spec-kit/blob/main/templates/tasks-template.md) templates, consulted 2026-10-22. It is a manual adaptation, not output attributed to unrun Spec Kit commands.
