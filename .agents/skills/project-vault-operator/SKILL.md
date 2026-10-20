---
name: project-vault-operator
description: Navigate and maintain project documentation when a repository is used as a local knowledge vault, while preserving source-of-truth and privacy boundaries.
metadata:
  short-description: Navigate a project knowledge vault
---

# Project Vault Operator

Use this skill to find and maintain project documentation in a repository opened as a local knowledge vault. It does not provide a vault application connection or manage the application.

## Navigation

- Start at the repository's project map or documentation index, then follow its links to canonical sources.
- Treat maps as navigation aids, not project canon. Prefer the source specification, runbook, data catalogue, or code they link to when answering or changing project behavior.
- Use the configured issue, pull request, review, and CI systems for current work status. Do not create a parallel task ledger or infer live status from old notes.
- If a map link is missing or stale, verify the target before editing the map. Keep links relative where possible.

## Vault and privacy boundaries

- The repository root may be opened directly as the vault; do not create or maintain a second copy of the project for vault use.
- Keep application-specific local workspace configuration as local state. Do not inspect, edit, stage, or commit it unless the user explicitly asks for a narrowly scoped configuration change.
- Do not search unrelated vaults or personal notes to answer project questions. Do not move private employment material, credentials, local media, or personal notes into shared project maps, issues, tests, prompts, analytics, or other shared artifacts.
- Use neutral, source-checked examples in public documentation. Do not turn private context into public examples or identifying detail.

## Editing

- Edit the canonical project document, not generated output, unless the task specifically targets generated output.
- Make documentation or map changes only when requested. Preserve existing scope and use the repository's normal branch, review, and CI workflow.
- Do not install an integration, plugin, or community extension as part of navigation. Assess or configure integrations only when explicitly requested.
