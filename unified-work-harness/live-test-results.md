# Synthetic local-model smoke test

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
