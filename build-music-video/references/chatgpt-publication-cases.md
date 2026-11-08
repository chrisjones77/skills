# ChatGPT publication adapter — acceptance and regression cases

These are **review scenarios**, not automated end-to-end tests. The observed production case was a full-length traditional-ballad music video prepared in ChatGPT and submitted to a Facebook social-media planner; case metadata below is anonymized. Re-run current provider checks before relying on constraints.

| Case | Stimulus | Expected decision/evidence |
| --- | --- | --- |
| Portrait false positive | 9:16 poster contains 16:9 panels | Hold production; require individual target-ratio frames or explicitly labelled crop proof |
| Text leakage | Scene image contains baked-in storyboard title/timecodes | Reject as clean production art; repair/reframe and inspect sampled exported frames |
| Silent audio truncation | Output encodes only initial part of supplied audio | Reject; verify complete video/audio decode, frame count and durations |
| False native resolution | 540×960 source enlarged to 1080×1920 | Identify as upscale; do not claim native 1080p detail |
| Large original | Video > connector transfer limit | Keep full master; produce a separate verified compressed transfer file, preserving full duration |
| Inaccessible media URL | Drive file is owner-only, with a sharing-looking URL | Import should fail/hold; check actual permissions, not URL punctuation |
| Unknown final delivery | Media imported and Metricool returns `PENDING` | Report *scheduled*, not *published*; check delivery separately |
| Reel duration rejection | Connector enforces 90 s for a particular Reel; selected full song is about 168 s | Report observed account/connector limit; choose allowed standard video or explicitly authorized short Reel |
| Mutable scheduled post | Existing post needs Reel → standard video change | Fetch original, update same UUID, preserve approved caption/media/time, retain new numeric post ID; avoid a duplicate |
| Uncertain connector result | Call times out or says unknown outcome | Read scheduled posts before retry; never create another post blindly |
| No credits | User disallows Codex/Work | Use supported ChatGPT tools; don't dispatch to another environment without approval |
| No publication authorization | User asks for review cut only | Do not create a scheduled/live post |

**Observed bounded case (November 2026):** a 9:16, 1080×1920, approximately 168-second full-song export passed structural decoding. A large initial export exceeded one transfer route's file-size ceiling; a smaller full-duration 1080p derivative uploaded to Drive. Import initially failed while the file remained restricted and then succeeded after user-approved link sharing. The planner accepted a scheduled Reel before its 90-second constraint surfaced. The **same scheduled post** was subsequently updated to a standard Facebook video with a pending status. This verifies scheduling and update, **not** confirmed Facebook delivery.

**Minimum evidence to close:** media hashes/dimensions/durations and decode receipts; manual inspection scope; publishing type/time/permission; social connector import receipt; scheduled post identity; separate delivery-status/URL evidence; explicit approval and unresolved limitations. Keep specific account IDs, post identifiers, URLs and private media in the restricted project record.
