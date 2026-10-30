# Timing and review

## Sources
Keep `lyrics-source.txt` unchanged. Store raw ASR with word start/end and confidence, then create reviewed display captions separately. Track each changed word and its basis: listening, user correction, model agreement, or unresolved. Agreement between two ASR models is supporting evidence, not human verification.

A field that looks like a production brief or style prompt may itself be performed text. Use explicit owner clarification or performance evidence to establish that relationship; neither a page field name nor ASR alone settles it. Record the basis without silently reclassifying the canonical source. Owner confirmation of sung wording does not establish exact cue timing or a completed listening review.

A local optional route is faster-whisper with word timestamps. If its media decoder rejects an argument, decode via FFmpeg to mono 16 kHz float32 PCM, load as a NumPy array, and pass that array to the model. Do not call decoding an audio listening review. Model downloads require network access; use available transcription capabilities or labelled estimates if unavailable.

## Alignment
Align within song sections rather than globally across repeated choruses. Use anchors at actual phrase onsets. Interpolate only short gaps between reliable anchors; flag larger gaps. Ensure word times are monotonic, within their line, and within audio duration. Do not accumulate interpolated points as if they were independent anchors.

For each line require `0 <= start < end <= duration`; avoid unintended overlap and blank instrumental gaps. Keep the last sung word long enough to read, without retaining it through a long outro. Include repeated closing phrases when actually present. Keep punctuation and proper names from the source, but don't force a draft phrase over a different sung phrase.

## Review record
Use a small table with time, draft, heard/ASR wording, chosen caption, basis, and status. Note what was visually inspected and listened to. Set `listening_review: not_performed`, `sampled`, or `complete` based on real actions. Technical decode success means media integrity, not semantic or musical accuracy.
