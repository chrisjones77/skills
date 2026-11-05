# Synthetic local-model smoke test

## Integrated v5 strict smoke test

On 2026-11-04 (America/Toronto), the integrated v5 fixture passed on its first
attempt with `qwen2.5:3b`, Ollama 0.40.14 and OpenCode 1.18.25. Executor timestamps
were 2026-11-05T01:50:40.125Z through 2026-11-05T01:50:48.739Z; the complete test
took approximately 9.2 seconds. Model digest:
`357c53fb659c5076de1d65ccb0b397446227b71a42be9d1603d46168015c9e4b`.

Command, run from the repository root with local-service access:

```sh
UNIFIED_LIVE_TEST=1 UNIFIED_LIVE_STRICT=1 UNIFIED_LOCAL_MODEL=qwen2.5:3b node --test unified-work-harness/live-roundtrip.test.mjs
```

Tested artifact identities (uncommitted local state, not a release commit):

- Bundle SHA-256: `bd5eb8ec7f2c575e48aeaf9691275338a93c5d43abfdbcf29b1eecd0e22ca16e`
- Live fixture SHA-256: `a3446451ebb62c29a09de9151448ad647cae2fe46d6e55d030a3a1b74ee85b66`
- Receipt SHA-256: `4c55b8a9a33ce7577fb74af67e3d02d388ac187cc60c518702184f8c8b77230b`
- Private result SHA-256: `c5ae22fbaa6c39d0ee96e42b2efb03199f843d0c3aed204a789d7ae4529b743f`

Observed: one completed in-scope read, two agent steps, exit code zero, no timeout,
no policy violations and no changed source files. The fixed Node runtime check
passed. The fixture verified the private artifact's byte hash and response hash,
and that the answer was exactly `cobalt-otter-47` after trimming surrounding
whitespace. The v5 receipt bound the draft, accepted assignment, invocation claim
and execution window; its disposition was `candidate`, with review `pending`.
There was no worker-binary override or output-capturing wrapper.

The fixture created its own synthetic acceptance/resume and disposable repository,
ledger and private result files, then removed them in cleanup. Those transient
files are no longer available for later inspection; this record preserves selected
hashes and observations from the test output, not a retained evidence archive.
Replay rejection and expiry edge cases are covered separately by deterministic
tests, not established by this one happy-path live run.

This result does not establish authenticated consent, continuous authorization,
OS isolation, model-locality attestation, repeated model reliability, professional
competence or release readiness. No real project content was submitted as a task.
The existing dirty checkout was not committed, reset or published.

## Earlier legacy-protocol test

On 2026-11-04, the current neutral protocol completed a synthetic read-only
round trip using Ollama `qwen2.5:3b` (model digest
`357c53fb659c5076de1d65ccb0b397446227b71a42be9d1603d46168015c9e4b`),
Ollama 0.40.14, and OpenCode 1.18.25. The fixture used a disposable Git
repository, a public synthetic token, and a synthetic accepted/resumed work
contract. A temporary wrapper captured only synthetic output and forwarded
events unchanged; temporary files were removed after the run.

The strict test observed one completed in-scope read and the correct token in
the requested format, with no source changes and human review pending. The
receipt SHA-256 was
`3f2497ca8078a3a8fde0edb43752da9443af8705c7ef9093564f60d3fd1c0759`.
The test ignores surrounding whitespace; the optional runtime format check
rejects extra words or quotation marks without rewriting the output. Separate
earlier prompt-only trials produced extra text, so a single passing run does
not establish reliable model adherence.

This is a small smoke test, not a reliability benchmark. A candidate is not
substantive approval, and hash-only evidence cannot establish answer
correctness. Human review, actual authorization, model locality and operating
system isolation remain separate responsibilities.
