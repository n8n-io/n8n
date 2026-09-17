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
3. **Send now (steer)** — let the *running* agent finish the tool call it is
   on, take no further action, and start the queued message as its own run
   right after, so the work already done is kept and nothing in flight is cut.
4. **Traceable** — traces record that the user steered, so we can tell "the agent
   finished its step naturally" from "the user forced a new step".

## Decisions

| Question | Decision |
|---|---|
| Steer semantics | **Finish the tool call in flight, skip the rest, end the live run** (it finishes as `steered`) and start the message as its own run — never cut a plain call in flight, never cancel. A delegated sub-agent loop (agent builder) is aborted at once via `OrchestrationContext.subAgentAbortSignal` |
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
 * Host check at each clean step boundary — after a tool batch settles, before
 * the next model call. Return `true` to end the run there: the loop skips the
 * next model call and finishes exactly like a run that reached its own stop
 * (`finishReason: 'stop'`), so everything settled so far is persisted.
 * Must not throw; a failing check is logged and read as `false`.
 */
shouldStopGracefully?: (context: { step: number; before: 'tool-call' | 'model-call' }) => boolean | Promise<boolean>;
```

Asked by the tool executor before each tool call starts (a `true` settles the
calls that have not started as skipped) and in `runAgentLoop` after
`emitTurnEnd`, before `maybeObserveMidRun` / `persistStepCheckpoint` (a `true`
breaks out of the loop with `finishReason: 'stop'`). The first `true` is
final. `finishComplete` persists the turn and emits the terminal `finish`
chunk; nothing keeps running in the background, and the run is not a
cancellation.

The message itself is never injected into the ending run: the run it starts
persists it as that run's input row, so there is one row and no id juggling.

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
  - Live run → set `steerRequestedAt`, publish `user-message` (`steered`) on the
    live run so the bubble shows at once; cancel the thread's background tasks
    (extracted helper shared with `cancelRun`); the run's boundary check picks
    it up.
  - No live run → deliver immediately (`flushQueuedMessage`, below).
- `claimSteerRequest(threadId, runId, step)` — the `shouldStopGracefully`
  callback: inside the metadata lock, takes the first `steerRequestedAt` item,
  moves it to the head of the queue and clears every stamp, tracks telemetry,
  and returns `true`; the step reaches the trace root as `steered_at_step`. The service raises the `user-steered` handoff,
  so the run finalises as `steered`. Wired in
  `buildOrchestratorAgentStreamOptions` and the resume options.
- `flushQueuedMessage(user, threadId)` — in the `finally` of `executeRun` and of
  the resumed-run path, **before** the planned-task wiring (a started user turn
  holds the follow-ups until its own finish), guarded by
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
- Steer: the press publishes `user-message` (`steered`); the boundary moves the
  item to the head and ends the run; the run-finish flush delivers it like any queued message (its
  `queued` event is a no-op in the frontend, which keys bubbles by `messageId`).
  A stamped item the run never reached (it ended first) is what the flush takes
  before the head. A process that dies between the claim and the flush leaves
  the item queued, and the stranded-queue recovery delivers it on the next mount.

### 5. Trace and telemetry

- `buildInstanceAiRunTraceMetadata`: `steered: true`, `steer_count` from the
  run's `steered` events, `steered_at_step` from the boundary that ended the run
  → the LangSmith root metadata answers "did the user cut this run short?".
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
- `src/types/sdk/agent.ts` — `shouldStopGracefully`
- `src/runtime/loop/agent-runtime.ts` + `tools/tool-call-executor.ts` — graceful stop
- `src/runtime/loop/__tests__/graceful-stop.test.ts` — new cases

**`@n8n/api-types`**
- `src/schemas/instance-ai.schema.ts` — `user-message` event + payload, queue DTOs,
  `InstanceAiQueuedMessage`
- `src/index.ts` — exports

**`packages/cli/src/modules/instance-ai`**
- `instance-ai.service.ts` — queue CRUD, steer claim, flush, event publishing,
  background-task helper extraction
- `instance-ai.controller.ts` — 5 endpoints
- `run-trace-metadata.ts` — `steered` / `steer_count` / `steered_at_step`
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

- [x] `@n8n/agents`: `shouldStopGracefully` option, stop before the next tool call or model call, tests
- [x] api-types: `user-message` event + queue DTOs/types + `steered` run status
- [x] cli: queue storage helpers + service CRUD + boundary-check wiring + `user-steered` handoff
- [x] cli: run-finish flush + stranded-queue recovery
- [x] cli: controller endpoints
- [x] cli: trace metadata + telemetry event
- [x] FE: api client + runtime queue state and actions
- [x] FE: queue list above the input (Send now / Edit / remove) + queue-on-Enter
- [x] FE: `user-message` rendering
- [x] i18n + docs + tests

## Verification

- `pnpm --filter @n8n/agents test` — a stop lets the call in flight finish and
  skips the rest, is a normal completion, and a declining or throwing check
  cannot fail the run
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

- A steered message is persisted by the run it starts, so on reload it sits
  between the run it stopped and its own run, the same order the live view shows.
- Not in v1: steered-message rendering inside the agent activity timeline,
  attachments in the queue, reordering queued items.
