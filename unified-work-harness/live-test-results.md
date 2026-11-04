# Synthetic local-model smoke test

Observed 2026-11-04 using Ollama `qwen2.5:3b`, model digest
`357c53fb659c5076de1d65ccb0b397446227b71a42be9d1603d46168015c9e4b`,
Ollama server 0.40.14, and OpenCode 1.18.25. The fixture was a disposable Git
repository with a synthetic public token, a synthetic accepted/resumed
Hypervisor contract, and no external data. A temporary local-only wrapper
captured the synthetic answer for comparison and forwarded events unchanged;
the temporary files were removed at the end of the test.

- The report-the-token case passed twice: one completed in-scope read, a subsequent
  response containing the correct token, matching response/event hash, no
  source changes, and review pending. Receipt digest:
  `d7c902f2e8a4016ab5d18ac1a2d2ddb25c00d9b34ef1ef68a7d29219793595f0`
  for the final run, after adding completed-read path checks.
- In stricter prior trials that requested only the token and no other words,
  the model included explanatory text. One trial occurred before the prompt
  conflict was fixed and one after. Both failed the exact-format criterion.
  The later report-the-token case had a different acceptance criterion and does
  not retroactively pass those trials.
- The previously installed `tev1:latest` explicitly rejected chat; the harness
  failed closed. The runtime now rejects explicitly advertised missing tool
  capability before launching the worker when capability metadata is present.

This is a small smoke test, not a reliability benchmark. The receipt's candidate
disposition is not substantive approval, and hash-only evidence alone cannot
establish answer correctness. Human review, deployment isolation and actual
authorization remain separate.
