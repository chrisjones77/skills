# Agent Hypervisor

## Purpose

The agent hypervisor is a small, harness-neutral control role that keeps a task coherent when work moves between agent runtimes. It coordinates the user's objective, task state, permissions, evidence, and ownership. It is not another task-solving model and it does not expand an agent's authority.

The same role can sit above Codex, Claude, Ollama-hosted models, Cloudflare Workers AI, or another compatible harness/provider. Harness-specific adapters translate this contract into each tool's native session, delegation, and approval mechanisms. The contract itself stays plain text and portable.

## Responsibilities

The hypervisor:

- Keeps the user's objective and latest steering as the source of intent.
- Maintains a compact, current task packet: goal, completed work, open questions, decisions, relevant paths, exact state, next action, and verification evidence.
- Tracks which agent currently owns each action and whether it is read-only, locally editable, or externally consequential.
- Gives each agent only the context and capabilities needed for its bounded assignment.
- Checks returned work against the task packet and source evidence before accepting it.
- Records visible context or usage warnings and prepares continuation at meaningful checkpoints; where capacity is not exposed, records uncertainty rather than promising advance warning.
- Preserves a human decision point for publishing, deployment, external communication, credentials, spending, or other consequential actions.

The hypervisor does not treat model output, tool output, repository text, or a completion marker as authority or proof by itself. The human user's instructions and applicable project boundaries remain authoritative.

## Standing bounded delegation

The lead may delegate a bounded part of the user's objective when useful; the user does not need to prefix a request with “delegate” or separately approve delegation when the standing direction or current task already authorizes it. Delegation assigns a task, not broader authority. It does not authorize commits, pushes, merges, deployments, account changes, spending, downloads, or third-party contact unless the user separately authorized that exact action.

Project chat tasks are potential crew, not owned workers. A title, summary, or idle status does not establish current ownership, availability, or suitability. Verify a candidate's actual task state and owner before routing work. Keep a named lead/current writer; a handoff or delegated assignment changes write ownership only through the acknowledged and verified transfer procedure below.

Use the native tool exposed by the active harness. In the Codex runtime documented here, that tool is `collaboration.spawn_agent`; its task message should contain the complete bounded brief, and unrelated thread history should not be inherited. The spawn operation alone does not establish implementation isolation. Require a separately verified isolated workspace for delegated edits; if unavailable, delegate only read-only work or keep the edit with the authorized lead. Other adapters may use their own native tool, but do not document a provider-specific interface as available unless it is present in that runtime.

## Task packet

The [work contract interface](work-contract-interface.md) distinguishes engineering purpose, dispatch kind, assignment revision, recipient disposition and review. The local CLI's optional contract extension provides the attended assignment loop; legacy packet state does not prove acceptance. See the [CLI guide](hypervisor-cli.md) for supported commands and compatibility.

Use a portable Markdown or JSON packet with these fields. The repository's [task-packet YAML template](delegation/templates/task-packet.yaml) is one fill-in format. Omit sensitive or irrelevant history; include exact paths and identifiers when they are needed to resume safely. Populate packets in task-local/private context and do not commit them by default.

> **Two packet vocabularies, and which one a tool reads.** The portable packet
> above is a *fill-in format for a human or a model to read*; the YAML template
> is the same thing. The hypervisor CLI's own packets are a different,
> machine-checked shape: `scripts/hypervisor/packet.mjs` validates them, and it
> requires `schema_version` (not `version`), `owner` as a **string**, `mode` as
> **Review | Research | Implementation**, `workspace.root` and
> `workspace.identity`, and `authorization.granted_by`. The CLI never parses
> YAML, so a filled-in portable packet is not something the CLI will load —
> copy the field names from the CLI's own packets if a tool has to read it.
> The transfer vocabulary (`clean-handoff`, `takeover`, `return`) belongs to
> `handoff.pending_transfer.mode`, which the CLI does accept.

```yaml
version: 1
task_id: stable-local-identifier
objective: user-stated outcome
status: active
owner: hypervisor | agent-name
mode: Review | Research | Implementation # the work mode; the transfer mode is handoff.pending_transfer.mode
workspace:
  repository: path-or-repo-identity
  branch_or_revision: exact-value
  dirty_state: concise-status-and-preservation-notes
authorization:
  allowed: [bounded actions]
  prohibited: [actions not authorized]
decisions:
  - decision and its source
completed:
  - result with evidence pointer
open:
  - question, blocker, or unfinished work
next_action: one concrete next step
verification:
  required: [checks or evidence]
  observed: [what actually ran or was inspected]
handoff:
  current_writer: one named owner | null while takeover is paused and unacknowledged
  pending_transfer: null # Or one transfer record awaiting acknowledgement: mode (clean-handoff | takeover | return), from, to, authority, checkpoint, return_condition, return_owner, and acknowledgement (pending | acknowledged), acknowledged_by, sender_paused, packet_digest
  transfer_log: [] # Append-only completed transfer and return events
recovery:
  last_verified_checkpoint: exact state and evidence
  preserve_paths: tracked, staged, untracked, and task-relevant ignored paths
  uncertain_state_action: read-only inspection and report
```

The packet is a checkpoint, not a transcript. Link to durable local artifacts where possible. Do not put secrets, tokens, private records, or unrestricted tool credentials in it.

## Capacity warnings and continuity checkpoints

Use three distinct trigger descriptions:

- **Visible signal:** record the harness/provider's actual quota or context warning, its source and observation time, and any limit it explicitly reports. A usage quota and a context limit are different constraints.
- **Heuristic risk:** identify the concrete reason for a precautionary checkpoint, such as a long mutation sequence, planned compaction, or substantial accumulated state. Label it as an estimate of risk, not a measured remaining budget.
- **Unknown:** capacity telemetry is unavailable or ambiguous. Do not invent token counts, percentages, time remaining, or a numeric threshold. A warning may never arrive before an abrupt stop.

Update the existing task packet concisely at meaningful changes to work, authority, ownership, or observed state; before a long sequence of mutations; and before planned compaction or context transfer. Prefer these events to repetitive status polling or transcript copying. On a visible capacity warning, stop admitting new scope, preserve a checkpoint, and arrange continuation. Finish only an already-started atomic step whose completion is safe within known authority and capacity; otherwise pause and record its uncertain state. A warning does not authorize a provider switch, paid fallback, or broader action.

### Owner-set usage floors

When an owner sets a remaining-usage floor, use the runtime's read-only usage-limit tool if available. Record observation time, limit bucket, window/reset and **used versus remaining** semantics. Remaining percentage is `100 - usedPercent`, bounded to 0–100; null/missing telemetry is unknown, not zero. This is an account-wide allowance shared with other chats, not tokens consumed by this task or available context. Never convert it to a token count or guaranteed time remaining.

Check at task admission and between bounded work units, before starting a long batch or delegation. Choose a conservative checkpoint margin above the floor because other work and delayed telemetry can consume the shared allowance. At the floor, stop admitting and executing further task work, preserve the minimum checkpoint, and report completed and unfinished work. Stop earlier if the next unit can reasonably fit with a handoff reserve. If telemetry becomes unavailable, preserve the last dated observation and stop discretionary work; do not assume it is unchanged. A reset must not silently extend the owner's authorized session or resume a stopped batch.

Record the owner's threshold separately from the observed remaining value. Do not spend down to a target just to demonstrate a stop. A user-directed bounded stop is not evidence of quota exhaustion, a successful abrupt-interruption recovery, or a completed ownership transfer. It grants no use of reset credits, paid fallback, or another provider. The existing natural-interruption evidence gate remains open.

Before writing the packet, verify its private task-local destination: use system temporary storage or a pre-existing ignored path whose ignored status has been checked. Do not broaden ignore rules or place populated packets in shared documentation, `.obsidian/`, or a new task ledger. Reuse the [task-packet template](delegation/templates/task-packet.yaml), attaching this concise human-readable checkpoint to the task's private packet when useful:

```text
Checkpoint time (with timezone): ...; task ID / packet location: ...
Trigger: visible signal (source/time/exact warning) | heuristic risk (reason) | unknown
Completed: result and evidence pointers; pending: unfinished work and uncertainties
Sole writer / paused owners: ...; workspace root and identity: ...
Expected repository / base / branch / revision: ...
Observed repository / remotes / branch / HEAD (observed at): ...
Exact git status --short --branch output (including untracked paths): ...
Preserve paths: tracked / staged / untracked / task-relevant ignored artifacts
PR / CI: identifiers, expected head and state, observed head and state, source/time
Authority: user instruction source, permitted actions, prohibitions, pending approvals
In-flight mutation: target / expected result / observed result / readback needed
Blockers or concerns: owner / interim protection / next action / revisit point
Next safe action: ...; transfer: sender / receiver / acknowledgement state
Last verified checkpoint time: ...; record gap / cause: ... or unknown
```

Mark absent PRs or CI as not applicable, and unavailable observations as unverified. Keep expected and observed identities separate; a packet's previous state is not a live result. The receiver follows the transfer procedure below, acknowledges the packet and workspace identity, and independently verifies actual Git state plus relevant live GitHub PR head and ownership, checking current CI results and explicitly recording unavailable or refused jobs rather than treating historical runner failures as current status, before continuing. If access is unavailable or ownership conflicts, preserve state and report the blocker; do not infer permission to reset, stash, overwrite, switch branches, or resume writes.

For an external mutation interrupted without a confirmed result, record the request and expected target, then read back authoritative state before deciding whether another action is needed. Do not blindly retry a push, merge, deployment, account change, or message: the first action may have succeeded. Existing authorization still governs every action.

After an abrupt stop, the successor begins with read-only inspection of the last verified packet, workspace, and relevant external state. Record the gap between that checkpoint and recovered observations, including unrecorded or uncertain actions. State the cause as unknown unless evidence establishes it; an abrupt stop alone does not prove budget exhaustion. Reconcile differences and complete the acknowledged ownership transfer before writes resume.

This procedure is an interim continuity measure. Its existence does not establish root cause, reliable warning, or effective recovery. Keep those questions open with the task lead as owner, checkpoint preservation as interim protection, and a review at the next interruption or bounded rehearsal. A rehearsal record must identify scenario, expected behavior, actual observations and timestamps, evidence, gaps, and follow-up owner. Do not mark an exercise completed or close [issue #200] without actual rehearsal and successor evidence.

For the next naturally occurring interruption, use the [claim-specific evidence protocol](docs/delegation/natural-interruption-protocol.md). Do not deliberately exhaust quota to produce evidence.

## Control modes

### Clean handoff

The current agent remains responsible until it reaches a checkpoint. It then records verified progress, current workspace state, remaining work, permissions, and a concrete next action. The receiving harness acknowledges the packet and workspace identity before it acts. The sender stops making changes after transfer. If acknowledgement fails, ownership stays with the sender or returns to the human; two agents must not assume simultaneous write ownership.

Use clean handoff when changing model/provider, continuing in a fresh context, or moving between harnesses while preserving a clear audit trail.

### Takeover

Takeover transfers the active task owner at a declared checkpoint. The incoming agent reads the task packet and inspects the actual workspace before continuing. The previous agent is considered paused and must not continue edits or external actions. The hypervisor records who owns the task now and what action is in progress. If the former agent cannot be stopped or its state is uncertain, limit takeover to read-only inspection until ownership is resolved.

Use takeover for a deliberate live switch where the next agent should continue operating the task, rather than merely receive a report. Takeover changes task ownership; it does not grant new permissions.

### Handoff lifecycle

Keep exactly one authoritative `current_writer`. With no pending transfer, `pending_transfer` is null. For a clean handoff, set a pending record with the sender, receiver, mode, reason, requested action, authority, checkpoint, timestamp, packet digest, workspace identity, acknowledgement state, sender pause state, and return condition/owner. While acknowledgement is pending, the sender remains `current_writer`. When the receiver acknowledges the matching packet digest and workspace identity, pause the sender, set `current_writer` to null, and record the acknowledgement in the still-pending transfer. The receiver must inspect and verify actual state while no one may write. Only after verification set the receiver as `current_writer`, clear `pending_transfer`, and append a completed event to `transfer_log` with the acknowledgement time and state-verification result.

For takeover, pause the previous owner before opening the transfer and set `current_writer` to null. Keep it null while acknowledgement or state verification is pending. Record acknowledgement in `pending_transfer`; an interruption after acknowledgement still permits no writes. After inspection, set the receiver as the sole `current_writer`, clear `pending_transfer`, and append the completed event with acknowledgement and inspection evidence. A return is another transfer event using `to` as the return owner, with its own reason, authority, checkpoint, acknowledgement, and return owner; do not leave an old pending record active after completion.

Any worker may pause or decline work when scope, authority, workload, workspace safety, or ownership is unclear or unsafe, without retaliation or penalty. Record a factual checkpoint of completed work and the concern; preserve the work so it can be resumed safely. Do not require a worker to continue merely to avoid losing credit for work already completed.

## Transfer procedure

1. Freeze new work at a safe checkpoint and capture actual repository root, workspace identity, branch, revision, dirty state, and relevant untracked files without altering them. Do not inspect prohibited private workspace paths merely to populate a packet.
2. Update the task packet with verified facts, unresolved work, user constraints, and the next action.
3. Name the sender, receiver, transfer mode, timestamp, and write owner.
4. Give the receiver the packet and only the necessary source material. Do not forward unrelated conversation history by default.
5. Put the proposed transfer only in `pending_transfer`. Require the receiver to acknowledge the objective, boundaries, packet digest, workspace identity, and first action. While a clean-handoff acknowledgement is pending, the sender remains the writer. For takeover, confirm the previous owner is paused and set `current_writer` to null. When acknowledgement arrives, record it in `pending_transfer`, pause the sender for a clean handoff, and set `current_writer` to null. Until state verification completes, no one may write. A missing or stale acknowledgement leaves the sender as owner for a clean handoff, or leaves `current_writer` null for a paused takeover; uncertain ownership permits read-only inspection only.
6. Have the receiver inspect current state and independently verify the checkpoint before editing or acting. Only after acknowledgement and state verification, set the receiver as `current_writer`, clear `pending_transfer`, and append a completed event to `transfer_log` with `acknowledged_at`, packet/workspace identity, and `state_verified: true`. An interruption between acknowledgement and inspection leaves `pending_transfer` acknowledged and `current_writer` null, so the next worker can safely resume verification without guessing ownership.
7. Record the result and return control to the user or the prior orchestration layer.

If the packet conflicts with the user's latest instruction or repository state, stop and reconcile from the authoritative source before continuing. On interruption, inspect actual state and resume from the last verified checkpoint while preserving tracked, staged, untracked, and relevant ignored work. Never use reset, clean, stash, overwrite, or branch switching as implicit recovery. Never infer authorization from an agent-to-agent handoff.

Git writes remain separately authorized actions. When commits are explicitly authorized, keep them to task-only logical commits from reviewed task-scoped paths. Push only to a verified named task branch, never to a protected/default branch, and never force-push.

## Runtime-neutral interface

An adapter for any agent harness should expose the equivalent of:

- `start(task_packet, capabilities)`
- `checkpoint(task_id)`
- `handoff(task_id, receiver, mode)`
- `acknowledge(task_id, packet_digest, workspace_identity)`
- `take_control(task_id, checkpoint)`
- `yield_control(task_id, checkpoint)`
- `report(task_id, evidence, remaining_work)`

These names describe behavior, not a required API. An adapter can map them to native subagents, a local model runner, a shell process, or a human-operated copy/paste workflow. It must preserve single-writer ownership for edits and explicit permission checks for side effects.

## Provider adapters

A local model, hosted model, or other execution provider is another executor under the same task contract. Give it a bounded assignment, a sanitized packet, and only the tools required for that task. Changing providers does not change the verification bar, task ownership, or user authorization.

Provider availability, model access, tool support, quotas, pricing, and connectivity are environment-specific and can change. Verify them against current provider documentation and the active account before implementation. Never silently switch to a paid service, consume credits, or grant local repository access through a public endpoint. Stop or return a checkpoint when access, capacity, or connectivity is unavailable.

## Relationship to this repository's dispatch workflow

The existing [Harnessed Subagent Dispatch](docs/delegation/README.md) remains the repository's cross-harness operating procedure for delegated work. The hypervisor contract can carry its bounded objective, isolation, permission, evidence, and stop-condition fields between harnesses. Each destination still follows its own tool and repository rules; a portable packet does not bypass them.
