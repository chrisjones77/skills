---
name: wrbg-obsidian-operator
description: Navigate and maintain the BridgeIncluded.ca project knowledge map when the repository is used as an Obsidian vault, while preserving GitHub and privacy boundaries.
metadata:
  short-description: Navigate the WRBG project vault
---

# WRBG Obsidian Operator

Use this skill to find and maintain project documentation in the private `chrisjones77/bridgeincluded.ca` repository when it is opened as an Obsidian vault. It does not provide an Obsidian MCP connection or manage the Obsidian application.

## Navigation

- Start at [`PROJECT-MAP.md`](../../../PROJECT-MAP.md), then follow the relevant focused map to canonical sources.
- Treat maps as navigation aids, not project canon. Prefer the source specification, runbook, catalogue, or code they link to when answering or changing project behavior.
- Use GitHub issues, pull requests, reviews, and CI for current work status. Do not create a parallel Obsidian task ledger or infer live status from old notes.
- If a map link is missing or stale, verify the target before editing the map. Keep links relative where possible.

## Vault and Privacy Boundaries

- The repository root may be opened directly as the vault; do not create or maintain a second copy of the project for Obsidian.
- Leave `.obsidian/` as local workspace state. Do not inspect, edit, stage, or commit it unless the user explicitly asks for a narrowly scoped configuration change.
- Do not search unrelated vaults or personal notes to answer project questions. Do not move private employment material, credentials, local media, or personal notes into project maps, issues, tests, analytics, prompts, or other shared artifacts.
- Keep the Safety Committee campaign case-neutral. Use only source-checked general guidance; do not turn private context into public examples or identifying detail.

## Editing

- Edit the canonical project document, not generated site output, unless the task specifically targets generated output.
- Make documentation or map changes only when requested. Preserve existing scope and use the repository's normal branch, review, and CI workflow.
- Do not install an MCP server, plugin, or community extension as part of vault navigation. Assess or configure integrations only when the user explicitly requests that work.
