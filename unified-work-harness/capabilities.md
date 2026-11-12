# Capability crosswalk for the complete package

Read this table alongside the [source notes](sources.md). Method lineage describes the engineering method applied. A traced implementation has a source identity in the notes. Scope in the third column is part of each capability's supported behavior. The compatibility inventory in bundle.mjs continues to describe that module alone.

| Capability | Source and entry point | What a user can do, and where support ends |
| --- | --- | --- |
| purpose_selection | QVCH and engineering-work-safety, package.mjs profile | Select one purpose and up to two companion lenses and see their suggested methods. |
| embedded_source_binding | Original bundle identity; package inventory | Pin the bundle alone for legacy work or the distributed file set for package work. External binaries and models have separate identities. |
| qvch_source_resolution | QVCH; package.mjs | Resolve the fixed package registry, transitive prerequisites and required effects against a reviewed package pin. Local/private overlays are external. |
| assignment_intake | Work contract and reviewed intake; [intake.md](intake.md) | Structural intake plus a named, expiring evidence-backed review of capacity, authority, meaning and concerns. An eligible offer still needs acceptance. |
| human_hybrid_contracts | Hypervisor and attended coordination; [coordination.md](coordination.md) | Human, agent or hybrid recipients can receive descriptive offers. A hybrid recipient records actual human decisions and separate evidence for agent work. |
| engineering_safety | Engineering work and safety; [methods.md](methods.md) | Follow the workload hold, protection, accountable owner and reassessment in the training case. The operator evaluates real conditions. |
| call_response | Recipient response and Hypervisor; [coordination.md](coordination.md) | Record decline, deferral, clarification, alternate routing, reoffer, resume, review and handoff; a new recipient accepts a linked offer. Operator serializes decisions in the authoritative record. |
| ai_lifecycle | Forward-deployed AI engineering; [methods.md](methods.md) | Compare a reversible training trial with a consequential operating decision; define ownership, review, rollback and reassessment. |
| professional_practice | Professional evidence and accountability guidance; [methods.md](methods.md) | Scope competence and applicable requirements and identify when qualified review is needed. |
| fair_process | Attributed concern and response practice; [methods.md](methods.md) | Preserve a dispute, give affected people a route to respond, keep protection in effect through revision and report back. |
| coverage_review | Generic artifact coverage; [methods.md](methods.md) and examples/methods | Compare the code, data, text and visual fixtures and reproduce a regression against an explicit expected outcome. |
| issue_triage | Evidence-based work-item triage; [methods.md](methods.md) | Reuse an existing item after comparing outcomes, record scope, priority, authority and readiness separately. |
| advisory_workflow | Engineering advisory and AI lifecycle practice; [methods.md](methods.md) | Trace an intended decision through evidence, advice, owner, restrictions and handoff. |
| readonly_roundtrip | Hypervisor and local agent executor; bundle.mjs | Execute accepted Review or Research in a clean pinned temporary checkout. Compare final HEAD and files with the starting baseline. File events reveal violations after access. |
| bounded_dispatch | Reviewed contract and supervised worker; [queue.md](queue.md) | Admit an attended offer or a separately accepted provider assignment; enforce deadlines, cancellation and provider budgets. |
| sequential_queue | Queue predecessor and integrated SQLite supervisor; [queue.md](queue.md) | Mix human, hybrid and local agent steps in one FIFO. The named recipient responds. Review gates progression; persisted decisions survive restart. New queues may explicitly enable the [transactional event outbox](outbox.md); recorder delivery remains separate. Interrupted provider work requires owner reconciliation. |
| goal_pursuit | Goal-dispatch predecessor; [queue.md](queue.md) | Propose and explicitly select bounded steps from a goal. Each dispatch requires its own accepted assignment; stop closes further admission. |
| provider_facade | Executor and bounded text candidate interface; [candidate.md](candidate.md) | Fixed loopback HTTP request/result protocols with response, time, data, scope and cancellation limits. Operator verifies actual model locality. |
| multiple_adapters | Original executor adapters and candidate interface; [candidate.md](candidate.md) | Local OpenAI-compatible and native Ollama candidate routes share a constrained text exchange. The read-only contract uses OpenCode. Codex and Aider are lower-level executor interfaces; neither is a supported contract adapter. |
| candidate_changes | Candidate-edit and defect-reproduction executor; [candidate.md](candidate.md) | Prepare a review artifact against pinned source, with a separately scoped write contract. The recipient reviews its contents before any application. |

## Host-specific guided production (not a bundled runtime capability)

Under UWH's purpose selection and effect/authority review, the [build-music-video ChatGPT publication method](../build-music-video/references/chatgpt-native-publication.md) describes a ChatGPT-native route for image creation, media rendering/validation, authorized file transfer and connected social-media scheduling. The [sanitized case matrix](../build-music-video/references/chatgpt-publication-cases.md) records observed failure modes. This route is **guidance applied through available host tools**, not an automatically resolved `package.mjs` capability, independent router, dispatched UWH executor, installed private overlay, or validated contract adapter. The host must check its actual tools, permissions, package/source revisions and user authorization. A social connector scheduling receipt does not prove delivery to the platform.

## Separately developed controls

The [optional native reviewer roles](package-guide.md#optional-native-assignment-reviewer) give Codex and Claude Code a pre-offer advisory method. They do not add a provider adapter, change the contract or satisfy independent human review.

The initial integration packaged the Hypervisor contract, scoped OpenCode executor, lease, adapter command builders and candidate behavior. Subsequent work added draft binding (v2), an approved private result destination (v3), a single-attempt ledger and recovery inspection (v4), and a UTC start window (v5). The lease limits cooperating processes sharing its namespace. The ledger provides at most one attempt per accepted digest with intact local state. Start expiry gates launch; the worker has a separate timeout. Digest and token-shape checks establish identity and format. The reviewer assesses substantive correctness.


## Evidence by workflow

| User workflow | Reproducible evidence |
| --- | --- |
| Choose a purpose and resolve package sources | [Profile tests](package-profile.test.mjs) compare the package and compatibility inventories and exercise changed guidance, missing dependencies and prohibited effects. |
| Offer and hand off attended work | [Intake tests](intake.test.mjs) exercise independent, current review; [coordination tests](coordination.test.mjs) follow each recipient type and verify superseded decisions. |
| Review and advise on a proposed change | [Worked examples](methods.md) include before/after files, expected observations and a human decision record. |
| Run accepted work and schedule its review | [Integrated tests](integrated.test.mjs) exercise the v6 boundary; [queue tests](queue.test.mjs) exercise ordered admission, stopping, worker loss and review. |
| Receive and inspect a text candidate | [Candidate tests](candidate.test.mjs) exercise both HTTP protocols, scoped replacements, rejection and the defect oracle. |
