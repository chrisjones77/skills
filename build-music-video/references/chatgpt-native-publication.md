# ChatGPT-native music-video production and publishing

This is a **host adapter guide**, not a new router, executor, or automatic permission grant. Use the existing Unified Work Harness (UWH) for QVCH purpose selection, capability review and work boundaries, then invoke `build-music-video` for production. This workflow is conditional on tools exposed in the current ChatGPT conversation; it does **not** require launching Codex, ChatGPT Work, a paid video generator, or the UWH local executor. If a host tool is absent, report the missing capability rather than claiming parity.

## Intake — before rendering

1. Identify the selected recording, source file and provenance. Measure duration with FFprobe; hash the source bytes if accessible. Preserve original recording and all previous accepted edits.
2. Identify the actual publishing destination, **post type** (Facebook Reel versus standard video, etc.), account/brand, requested date and timezone, orientation, runtime and media limits. These constraints are **provider- and account-specific** and may change; verify available current platform/connector guidance at production time. Do not generalize a historical rejection to every platform.
3. Clarify the approval scope: creating a candidate, transferring files, creating a draft, scheduling, and live publishing are **distinct effects**. A review-cut request does not authorize scheduling. A scheduling request does not establish permission to post immediately or to modify unrelated posts.
4. Declare original-versus-derived music, lyrics/caption evidence, AI-generated visual material, rights uncertainty, intended audience and privacy boundaries. Do not claim copyright clearance or verified listening without evidence.

## Production through available ChatGPT tools

1. Resolve the necessary domain skill (for WRBG, the authorized private WRBG v2 overlay when accessible) and this skill's editorial, timing, and render references. Do not copy private overlays into a general-purpose skill.
2. Prepare a section map and lyric-payoff map, then design individual *production frames* in the final output ratio. **A portrait storyboard poster containing landscape panels is not portrait-native artwork.** Reject incorrectly oriented source art or label its reframing as a crop proof.
3. Keep frame artwork separate from captions, scene numbers, timecodes and credit overlays. Check for **baked-in lettering** in composite source images; a clean scene must not contain storyboard annotations. Identify unique illustrations separately from edit segments.
4. Assemble reproducibly with available local media tools (for example the existing FFmpeg render scripts). Retain exact shot boundaries, audio choice, aspect ratio, FPS and file provenance in a manifest. Create credits only where approved; default to no permanent lyrics when transcription or timings are unverified.
5. Verify finished **master and each derivative independently**: exact dimensions, stream duration and frame count, complete A/V decoding, opening/midpoint/ending frames, safe areas, visual continuity and listening evidence (if actually performed). Do not equate upscale resolution with native source detail. The full-song release and short promotional cut are separate artifacts.

## Media transfer and connector boundaries

1. Verify the final export **exists** and is complete before uploading. When a connector has a size/format limit, create a verified lower-bitrate derivative without silently shortening the song; retain the master. Do not assume every Google Drive tool accepts local filesystem paths or ChatGPT sandbox URLs.
2. Upload using an authorized available file route, for example the user Library/Google Drive file bridge when exposed. Inspect the returned file ID and metadata rather than inferring success from a filename. Avoid broad public permissions unless needed and authorized for the intended publishing transfer.
3. Where a social-media integration imports public URLs, check the destination file's actual permissions: a URL query string such as `?usp=sharing` **does not** itself grant access. Record the granted access scope and minimise its lifetime as appropriate.
4. Confirm that the social tool actually ingested its **own media copy**. Successful Drive upload is not proof of Metricool import. No connection between two third-party accounts should be assumed merely because both appear in ChatGPT.

## Metricool → Facebook example path (conditional)

- Read/confirm the target brand ID using Metricool's brand-settings tool. Preserve any existing post state; check for duplicates before creating a new post when an earlier attempt's outcome is uncertain.
- For a Facebook Reel send `providers: [{network:"facebook"}]`, `facebookData.type:"REEL"`, approved text/title, accessible video media and verified publication time. A standard Facebook video uses `facebookData.type:"POST"`; post-type selection should be made **before** production.
- The Metricool scheduling API requires a future publication date, even for a draft-like workflow. A draft/scheduled post is not the same as instant publication. Explicitly set `draft` and `autoPublish` from the authorization; their defaults may publish automatically. The target timezone must be verified, including DST.
- **If Metricool rejects duration or media access**, preserve the error and the selected source. Reassess a standard video versus a separate shorter Reel rather than truncating the song without approval. If an already scheduled post exists, read it and retain its `id`, stable `uuid`, original text/media and scheduled time before a bounded update. Updates can assign a *new* numeric post ID; use the response's replacement ID for later calls.
- Treat `PENDING`/scheduled as **not published**. Check platform delivery/status separately, record the final URL if actually returned and confirm that no accidental duplicate was created. Do not imply successful Facebook publication from a Metricool scheduling receipt.

## Provenance and privacy

Save an access-controlled release ledger outside reusable skill code: source/output hashes, measured durations, export geometry/FPS, tool/check versions, caption basis, permissions, social-media network, post type, scheduling receipt, delivery status, reviewer and unresolved risk. Store private brand identifiers, user emails, unpublished media URLs, and account-specific receipts in the project record—not this shared guidance.

Do not claim that this method installs native ChatGPT Project skills, executes UWH's Node package, has persistent cross-chat state, or proves that a third-party platform published the result. GitHub-connected source reads and ChatGPT-native tool execution are distinct from Codex/Work dispatch.

See [publication regression cases](chatgpt-publication-cases.md) for a sanitized case and negative tests.
