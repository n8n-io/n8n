# Instance AI: queue, edit, and steer user messages

## Context

The Instance AI composer blocks sending while a run is active. A second message
is refused by the server with `409 Conflict`
(`packages/cli/src/modules/instance-ai/instance-ai.controller.ts:220`) and the
frontend surfaces "Agent is still working on your previous message"
(`instanceAi.threadRuntime.ts` → `dispatchUserMessage`).

The user wants what Codex / Cursor / Claude Code all have:

1. **Queue** — type a message while the agent works; it is held, not rejected.
2. **Edit** — change a queued message before it is sent.
3. **Send now (steer)** — push a queued message into the *running* agent at the
   next step boundary, so the work already done is kept.
4. **Traceable** — traces record that the user steered, so we can tell "the agent
   finished its step naturally" from "the user forced a new step".

## Decisions

| Question | Decision |
|---|---|
| Steer semantics | **Inject into the live run** at the next clean step boundary — never cancel the run |
| Background tasks on steer | **Stop them** (the user is redirecting the thread) |
| Queue lifetime | **Persisted server-side**, robust to a process or browser shutdown |
| Queue UI | A list of items **just above the text input**, each with **Send now** and **Edit**; Edit moves the text back into the input and drops the item |
| While parked on a confirmation / plan review | **Hide the queue list entirely** (no Send now). The user answers the card; the queued message stays queued and sends when the run finishes |
| Flush rule | Flush the next queued message when a run finishes (completed / cancelled / errored) |
| Attachments | Text-only queue (attach stays disabled while streaming, as today) |
| Delivered message in the transcript | A normal **user message bubble**, live and on reload |

## What already exists (reuse)

- **A ready-made step boundary**: `runAgentLoop`
  (`packages/@n8n/agents/src/runtime/loop/agent-runtime.ts`) runs a clean loop
  boundary after every settled tool batch (`memory.maybeObserveMidRun`,
  `persistStepCheckpoint`). A user message added with `list.addInput(...)` there
  is visible to the next model call (`AgentMessageList.forLlm` → everything after
  the observation boundary) and is persisted by `saveToMemory` at run end.
- **The drain-hook precedent**: `crashResume({ contextNotes })` already injects
  host-supplied user notes via
  `list.addInput([{ role: 'user', content: [{ type: 'text', text: note }] }])`,
  and its doc comment says the host is expected to keep *"undrained steering
  corrections"* in its own durable log.
- **Persisted events**: every non-ephemeral event type is persisted with a seq and
  replayed (`event-bus/durable-event-log.ts`). One reducer
  (`@n8n/api-types/src/schemas/agent-run-reducer.ts`) folds live events and
  history-from-log, so one reducer case serves both.
- **Trace metadata is already derived from the run's events**:
  `buildMessageTraceMetadata` → `buildInstanceAiRunTraceMetadata(events, …)`
  (`run-trace-metadata.ts`). A steer event is therefore enough to mark the trace.
- **Per-thread auxiliary state already lives in thread metadata**:
  `metadata.instanceAiPlannedTasks`, `instanceAiTasks`, `instanceAiWorkflowLoop`,
  `activeSkillStates`, … are written only through the locked
  `patchThread`/`updateThread` path and excluded from `saveThread` writes via
  `PATCH_ONLY_METADATA_KEYS` (`storage/typeorm-agent-memory.ts:164`). The queue
  follows this pattern — no migration.
- **Internal follow-up runs** (`startInternalFollowUpRun`,
  `instance-ai.service.ts:3333`) show how to start a run that is not gated by the
  per-user concurrency cap, reusing the thread's remembered time zone.
- **Background-task cancellation** already exists inside `cancelRun`
  (`instance-ai.service.ts:1555`) — extract that block for reuse.

## Approach

### 1. `@n8n/agents`: one new execution option

```ts
// types/sdk/agent.ts → ExecutionOptions
/**
 * Host-drained mid-run user input ("steering"). Called at each clean step
 * boundary — after a tool batch settles, before the next model call — and the
 * returned text is appended as user input so the next step accounts for it.
 * The host owns durability of the text: persist it before returning. Must not
 * throw; a failed drain must never fail the run.
 */
steeringInput?: (context: { step: number }) => SteeringInput[] | Promise<SteeringInput[]>;

export interface SteeringInput { id?: string; text: string }
```

Call site in `runAgentLoop`, after `emitTurnEnd` and before `maybeObserveMidRun`
/ `persistStepCheckpoint` (so the checkpoint and the observation include the
injected turn):

```ts
await this.injectSteeringInput(list, options?.steeringInput, iterationCount + 1);
```

`injectSteeringInput` try/catches the callback, maps `{ id, text }` to
`{ id, role: 'user', content: [{ type: 'text', text }] }` and calls `list.addInput`.

Passing the host's `id` matters: the host persists the row eagerly with that id, so
the SDK's end-of-run `saveToMemory` upserts it instead of inserting a duplicate.

### 2. Queue storage: thread metadata

```jsonc
// instance_ai_threads.metadata
"instanceAiQueuedMessages": [
  { "id": "qm_x", "text": "use the Slack node", "createdAt": "…", "steerRequestedAt": "…" }
]
```

- Add the key to `PATCH_ONLY_METADATA_KEYS` so `saveThread` cannot clobber it.
- Read/modify through `patchThread` (`updateThread` takes a pessimistic row lock
  on Postgres; `serializeThreadMutation` serialises in-process), so claim / edit /
  delete are race-free.
- Omit the key from the thread-list summary projection so the sidebar payload does
  not carry message text.

### 3. New persisted event: `user-message`

```ts
{ type: 'user-message', payload: { messageId, text, source: 'steered' | 'queued', step?: number } }
```

Published by the service for both delivery paths. It drives the live UI, the
history fold, and the trace metadata. The `messageId` is the queued item's id and
the persisted memory row's id, so the frontend can move an item from "queued" to
"sent" without guessing.

### 4. Service flow

- `queueMessage(threadId, text)` — append to metadata.
- `updateQueuedMessage` / `removeQueuedMessage` — edit / delete by id.
- `requestSteer(threadId, messageId)`
  - Live run → set `steerRequestedAt`; cancel the thread's background tasks
    (extracted helper shared with `cancelRun`); the run's drain hook picks it up.
  - No live run → deliver immediately (`deliverQueuedMessage`, below).
- `claimSteeringInput(threadId, runId, step)` — the SDK drain callback: claims the
  oldest `steerRequestedAt` item inside the metadata lock, persists it as a user
  message (`agentMemory.saveMessages`, same id), publishes `user-message`,
  tracks telemetry, returns `[{ id, text }]`. Wired in
  `buildOrchestratorAgentStreamOptions`.
- `flushQueuedMessage(user, threadId)` — at the end of `executeRun`'s `finally`,
  after the planned-task wiring, guarded by
  `!segmentSuspended && !hasSuspendedRun && !signal.aborted && !hasLiveRun`:
  deliver the oldest queued item (persist + publish `user-message` with
  `source: 'queued'`) and start a follow-up-style run for that text. If the run
  cannot start, the item stays queued.

**Ordering and failure handling** (a queued message must never be delivered
without a run, and never delivered twice):

- Flush: re-check `hasLiveRun`, then claim the head item (removes it from the
  metadata under the lock), then start the run, and only then persist the row and
  publish `user-message`. When the start is skipped or refused, re-queue the item
  at the head and publish nothing. The claim-first order is what makes a double
  delivery impossible.
- Steer: claim the item, persist the row, publish `user-message`, then return the
  text to the SDK to inject. A run that dies before the next model call leaves the
  message in history unread — visible and resendable, never lost.

### 5. Trace and telemetry

- `buildInstanceAiRunTraceMetadata`: derive from the run's events
  `steered: true`, `steer_count`, `steered_at_steps: number[]` → the LangSmith
  root metadata answers "did the user force this step?".
- Registered telemetry event `USER_STEERED_MESSAGE` (`events/instance-ai.ts`) with
  `thread_id`, `instance_id`, `step`.

### 6. API (all `@GlobalScope('instanceAi:message')`, all return the updated queue)

| Method | Path | Purpose |
|---|---|---|
| GET | `/instance-ai/threads/:threadId/queued-messages` | list |
| POST | `/instance-ai/threads/:threadId/queued-messages` | add (`{ text }`) |
| PATCH | `/instance-ai/threads/:threadId/queued-messages/:messageId` | edit (`{ text }`) |
| DELETE | `/instance-ai/threads/:threadId/queued-messages/:messageId` | remove |
| POST | `/instance-ai/threads/:threadId/queued-messages/:messageId/steer` | send now |

Each reuses the controller's `assertThreadAccess`.

### 7. Frontend

- `instanceAi.api.ts`: the five calls above.
- `ThreadRuntime`: `queuedMessages` state (GET on load, replaced from mutation
  responses), `queueMessage`, `steerQueuedMessage`, `removeQueuedMessage`,
  `takeQueuedMessageForEdit` (removes and returns the text).
  - `sendMessage` while streaming is not used; the composer calls `queueMessage`.
  - Handle `user-message`: drop the matching queued item (by `messageId`) and
    append a `role: 'user'` bubble (dedupe by id) — the same shape
    `pushOptimisticUserMessage` produces, so routing and artifact lookups are
    untouched.
  - Recovery: on thread open, if the queue is non-empty, the thread is idle and
    not parked, deliver the head item (covers a queue stranded by a shutdown).
- `instanceAi.reducer.ts`: `case 'user-message'` pushes the user message; exclude
  it from the mid-run phantom-creation guard.
- `components/InstanceAiInput.vue`:
  - Queue list rendered above `ChatInputBase` — hidden when
    `isAwaitingConfirmation || isAwaitingPlanReview` (the floating confirmation
    panel already replaces the whole input in that case).
  - Each item: text, **Send now** (only while streaming), **Edit**, remove.
  - While streaming a non-empty text draft is submittable and Enter queues it; the
    design-system stop button ignores `disabled`, so Stop keeps working. Queueing
    requires `isStreaming` (a confirmed live run) and no staged attachments; a
    send that is only `isSendingMessage` still blocks the composer, so nothing is
    queued before a run exists.
- i18n keys under `instanceAi.queue.*`.

## Files to modify

**`@n8n/agents`**
- `src/types/sdk/agent.ts` — `steeringInput`, `SteeringInput`
- `src/runtime/loop/agent-runtime.ts` — drain call site + `injectSteeringInput`
- `src/index.ts` — export `SteeringInput`
- `src/runtime/loop/__tests__/` — new cases

**`@n8n/api-types`**
- `src/schemas/instance-ai.schema.ts` — `user-message` event + payload, queue DTOs,
  `InstanceAiQueuedMessage`
- `src/index.ts` — exports

**`packages/cli/src/modules/instance-ai`**
- `instance-ai.service.ts` — queue CRUD, steer claim, flush, event publishing,
  background-task helper extraction
- `instance-ai.controller.ts` — 5 endpoints
- `run-trace-metadata.ts` — `steered` / `steer_count` / `steered_at_steps`
- `storage/typeorm-agent-memory.ts` — `PATCH_ONLY_METADATA_KEYS` entry
- `storage/queued-messages.ts` (new, small) — metadata read/write helpers
- `__tests__/` — service, controller, run-trace-metadata

**`packages/@n8n/telemetry`**
- `src/events/instance-ai.ts` — `USER_STEERED_MESSAGE`

**Frontend** (`packages/frontend/editor-ui/src/features/ai/instanceAi`)
- `instanceAi.api.ts`, `instanceAi.threadRuntime.ts`, `instanceAi.reducer.ts`
- `components/InstanceAiInput.vue`, plus a small queue-list component
- `__tests__/instanceAi.threadRuntime.test.ts`, `InstanceAiInput.test.ts`

**Docs / i18n**
- `packages/frontend/@n8n/i18n/src/locales/en.json`
- `packages/@n8n/instance-ai/docs/streaming-protocol.md` (new event)

## Steps

- [x] `@n8n/agents`: `steeringInput` option, drain at the step boundary, tests
- [x] api-types: `user-message` event + queue DTOs/types
- [x] cli: queue storage helpers + service CRUD + drain wiring
- [x] cli: run-finish flush + stranded-queue recovery
- [x] cli: controller endpoints
- [x] cli: trace metadata + telemetry event
- [x] FE: api client + runtime queue state and actions
- [x] FE: queue list above the input (Send now / Edit / remove) + queue-on-Enter
- [x] FE: `user-message` rendering
- [x] i18n + docs + tests

## Verification

- `pnpm --filter @n8n/agents test` — drain at the boundary, host id preserved,
  a throwing drain cannot fail the run
- `pnpm --filter n8n test instance-ai` — queue CRUD, steer claim, flush on
  finish, no flush while suspended or parked, trace metadata
- `pnpm --filter n8n-editor-ui test instanceAi` — queue-on-Enter while streaming,
  Send now, Edit recall, queue list hidden while parked
- Manual (local instance): long tool-loop run → queue two messages → edit one →
  Send now → the agent's next step reacts, background builders stop, trace
  metadata shows `steered: true`
- Manual: reload mid-queue → queue restored; run finishes → the next queued
  message is delivered as its own turn with a user bubble

## Notes

- A steered message is a real user row, so on reload it lands before its run's
  assistant block (row order), while live it appears below the streaming bubble.
  Both render as a normal user bubble; no parser change is planned for that
  ordering nuance.
- Not in v1: steered-message rendering inside the agent activity timeline,
  attachments in the queue, reordering queued items.
