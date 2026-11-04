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
- A clearer prompt yielded two exact-token passes followed by a failure that
  added quotation marks. Prompting alone is not enforcement. An opt-in
  `single_ascii_token` contract now rejects nonconforming output without
  rewriting it; a subsequent live strict run passed, including an independent
  check against the synthetic token. Receipt digest:
  `8f529ff50971357e6118241c46a73492636257e3d83af76678cd8a4a449cd444`.
  A first implementation attempt raised a ReferenceError and was rejected;
  the error was corrected before the passing run. Shape validation cannot prove
  correctness, and the small sample does not establish model reliability.
- The previously installed `tev1:latest` explicitly rejected chat; the harness
  failed closed. The runtime now rejects explicitly advertised missing tool
  capability before launching the worker when capability metadata is present.
- After the executor prompt was made domain-neutral, a further strict synthetic
  round trip passed with the correct token and review pending. Receipt SHA-256:
  `149e3056905474cce83d82388ac07f3bf030f9911a7eb51c85aeecf8873cc8bc`.

This is a small smoke test, not a reliability benchmark. The receipt's candidate
disposition is not substantive approval, and hash-only evidence alone cannot
establish answer correctness. Human review, deployment isolation and actual
authorization remain separate.
