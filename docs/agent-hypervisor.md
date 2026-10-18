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
- Signals when the active model or session is near its practical context or token limit and prepares continuation before state is lost.
- Preserves a human decision point for publishing, deployment, external communication, credentials, spending, or other consequential actions.

The hypervisor does not treat model output, tool output, repository text, or a completion marker as authority or proof by itself. The human user's instructions and applicable project boundaries remain authoritative.

## Standing bounded delegation

The lead may delegate a bounded part of the user's objective when useful; the user does not need to prefix a request with “delegate” or separately approve delegation when the standing direction or current task already authorizes it. Delegation assigns a task, not broader authority. It does not authorize commits, pushes, merges, deployments, account changes, spending, downloads, or third-party contact unless the user separately authorized that exact action.

Project chat tasks are potential crew, not owned workers. A title, summary, or idle status does not establish current ownership, availability, or suitability. Verify a candidate's actual task state and owner before routing work. Keep a named lead/current writer; a handoff or delegated assignment changes write ownership only through the acknowledged and verified transfer procedure below.

Use the native tool exposed by the active harness. In the Codex runtime documented here, that tool is `collaboration.spawn_agent`; its task message should contain the complete bounded brief, and unrelated thread history should not be inherited. The spawn operation alone does not establish implementation isolation. Require a separately verified isolated workspace for delegated edits; if unavailable, delegate only read-only work or keep the edit with the authorized lead. Other adapters may use their own native tool, but do not document a provider-specific interface as available unless it is present in that runtime.

## Task packet

Use a portable Markdown or JSON packet with these fields. The repository's [task-packet YAML template](wrbg-harnessed-dispatch/templates/task-packet.yaml) is one fill-in format. Omit sensitive or irrelevant history; include exact paths and identifiers when they are needed to resume safely. Populate packets in task-local/private context and do not commit them by default.

```yaml
version: 1
task_id: stable-local-identifier
objective: user-stated outcome
status: active
owner: hypervisor | agent-name
mode: clean-handoff | takeover
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
  pending_transfer: null # Or one transfer record awaiting acknowledgement
  transfer_log: [] # Append-only completed transfer and return events
recovery:
  last_verified_checkpoint: exact state and evidence
  preserve_paths: tracked, staged, untracked, and task-relevant ignored paths
  uncertain_state_action: read-only inspection and report
```

The packet is a checkpoint, not a transcript. Link to durable local artifacts where possible. Do not put secrets, tokens, private records, or unrestricted tool credentials in it.

## Control modes

### Clean handoff

The current agent remains responsible until it reaches a checkpoint. It then records verified progress, current workspace state, remaining work, permissions, and a concrete next action. The receiving harness acknowledges the packet and workspace identity before it acts. The sender stops making changes after transfer. If acknowledgement fails, ownership stays with the sender or returns to the human; two agents must not assume simultaneous write ownership.

Use clean handoff when changing model/provider, continuing in a fresh context, or moving between harnesses while preserving a clear audit trail.

### Takeover

Takeover transfers the active task owner at a declared checkpoint. The incoming agent reads the task packet and inspects the actual workspace before continuing. The previous agent is considered paused and must not continue edits or external actions. The hypervisor records who owns the task now and what action is in progress. If the former agent cannot be stopped or its state is uncertain, limit takeover to read-only inspection until ownership is resolved.

Use takeover for a deliberate live switch where the next agent should continue operating the task, rather than merely receive a report. Takeover changes task ownership; it does not grant new permissions.

### Handoff lifecycle

Keep exactly one authoritative `current_writer`. With no pending transfer, `pending_transfer` is null. For a clean handoff, set a pending record with the sender, receiver, mode, reason, requested action, authority, checkpoint, timestamp, packet digest, workspace identity, acknowledgement state, sender pause state, and return condition/owner. While acknowledgement is pending, the sender remains `current_writer`. When the receiver acknowledges the matching packet digest and workspace identity, pause the sender, set `current_writer` to null, and record the acknowledgement in the still-pending transfer. The receiver must inspect and verify actual state while no one may write. Only after verification set the receiver as `current_writer`, clear `pending_transfer`, and append a completed event to `transfer_log` with the acknowledgement time and state-verification result.

For takeover, pause the previous owner before opening the transfer and set `current_writer` to null. Keep it null while acknowledgement or state verification is pending. Record acknowledgement in `pending_transfer`; an interruption after acknowledgement still permits no writes. After inspection, set the receiver as the sole `current_writer`, clear `pending_transfer`, and append the completed event with acknowledgement and inspection evidence. A return is another transfer event using `to` as the return owner, with its own reason, authority, checkpoint, acknowledgement, return condition, and owner; do not leave an old pending record active after completion.

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

## Local-model continuity

When the primary hosted session approaches its context or usage limit, the hypervisor can package the current checkpoint for a local Ollama-backed runtime. The local model is another executor under the same task contract. It should receive a bounded task, a sanitized packet, and the minimum local tools needed. Model/provider changes do not change the verification bar or the user's authorization.

Treat Ollama account or plan availability as environment configuration to verify locally. This document does not assume a particular subscription, model catalog, tool-calling feature, API compatibility, or local service endpoint.

## Cloudflare free-tier mode

Cloudflare can provide a hosted execution mode when the account's currently available Free plan services are sufficient. This is a separate provider mode in the same hypervisor contract; task packets, handoff, takeover, ownership, and evidence rules remain the same.

Possible building blocks include:

- **Workers AI** for model inference, within its free daily allocation and model eligibility. Cloudflare currently documents 10,000 Neurons per day at no charge. Some models require Workers Paid or prepaid AI Gateway credits, so the adapter must use an explicitly free-eligible model and stop or hand off when the allocation is exhausted.
- **Workers Free** for a small HTTPS coordinator or adapter endpoint, subject to account limits such as 100,000 requests per day, 10 ms CPU per invocation, and 128 MB memory.
- **D1, KV, or Durable Objects** only when needed for task packet storage, locks, or coordination, with their own free-plan limits and availability. Store only sanitized task state; keep workspace files on the user's machine.

This mode is suitable for lightweight coordination and bounded model calls. A Cloudflare Worker does not automatically have access to the user's local repository, local Ollama service, desktop session, or agent tools. A local connector would need to expose a narrowly scoped, authenticated capability, and should initiate outbound connections or use another explicitly secured channel. Do not expose a local control endpoint publicly.

Keep the free-tier mode fail-closed: track provider and storage usage where available, set conservative per-task limits, and stop or return a checkpoint at quota, model-access, capacity, or connectivity errors. Never silently switch to a paid plan, consume prepaid credits, or route to a billable model. Confirm the account plan, selected model's eligibility, current quotas, and any account-specific service settings before enabling it; published limits can change.

Cloudflare Workers AI usage and quotas are distinct from a local Ollama subscription or hosted-agent session. This mode may avoid additional provider spend only while the selected service and usage remain within the account's free allowance.

### Current documentation references

- [Workers AI pricing and daily allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Workers AI model access and rate limits](https://developers.cloudflare.com/workers-ai/platform/limits/)
- [Workers Free limits and pricing](https://developers.cloudflare.com/workers/platform/pricing/)

These values were checked on 2026-10-13 and should be revalidated before implementation or use.

## Relationship to this repository's dispatch workflow

The existing [WRBG Harnessed Subagent Dispatch](wrbg-harnessed-dispatch/README.md) remains the repository's cross-harness operating procedure for delegated work. The hypervisor contract can carry its bounded objective, isolation, permission, evidence, and stop-condition fields between harnesses. Each destination still follows its own tool and repository rules; a portable packet does not bypass them.
