# Implementation contracts: queue, edit, and steer user messages

Companion to `plans/instance-ai-message-queue-and-steer.md` (approved plan).
This file fixes the cross-package interfaces so the work can be parallelised.
**Do not change these signatures/shapes without updating this file.**

## Vocabulary

- **queued message** — text the user submitted while a run was active; held
  server-side, editable, not yet in the transcript.
- **steer / Send now** — let the live run finish the tool call it is on, take
  no further action, and deliver the queued message as its own run right after.

`source: 'steered'` means *exactly* that: the user pressed Send now while a run
was active. The event is published at the press, on the live run, so the bubble
is visible at once; the run then ends at its next step boundary. The run the
message starts also publishes it with `source: 'queued'`, which the frontend
dedupes by `messageId`. A Send now with no live run delivers immediately as a new
run and reports only `source: 'queued'` — no run was stopped.
- **flush** — deliver the head of the queue as a new run after the active run
  finished.

## 1. `@n8n/agents` — public surface

`packages/@n8n/agents/src/types/sdk/agent.ts`

```ts
export interface ExecutionOptions {
	// …existing fields…
	/**
	 * Host check at each clean step boundary — after a tool batch settles, before
	 * the next model call. Return `true` to end the run there: the loop skips the
	 * next model call and finishes exactly like a run that reached its own stop
	 * (`finishReason: 'stop'`), so everything settled so far is persisted.
	 * Must not throw; a failing check is logged and read as `false`.
	 */
	shouldStopGracefully?: (context: { step: number; before: 'tool-call' | 'model-call' }) => boolean | Promise<boolean>;
}
```

Asked in two places, and the first `true` is final for the run:
- `tools/tool-call-executor.ts` — before each tool call starts
  (`before: 'tool-call'`): the calls that have not started are settled as
  `[Skipped: the user sent a new instruction]`; the in-flight one finishes.
- `loop/agent-runtime.ts` — inside `runAgentLoop`, after `emitTurnEnd` and
  **before** `maybeObserveMidRun` / `persistStepCheckpoint`
  (`before: 'model-call'`): sets `finishReason: 'stop'` and breaks out of the
  loop, so `finishComplete` persists the turn and emits the terminal `finish`
  chunk.

The check is wrapped: a thrown error is logged and read as `false`. No behaviour
change when the option is undefined.

## 2. `@n8n/api-types`

### 2.1 New event type

Add `'user-message'` to `instanceAiEventTypeSchema` (after `'run-finish'`) and to
`instanceAiEventSchema`:

```ts
export const userMessagePayloadSchema = z.object({
	messageId: z.string(),
	text: z.string(),
	/** 'steered' = sent now into a live run; 'queued' = started a run. */
	source: z.enum(['steered', 'queued']),
});
export type InstanceAiUserMessageEvent = Extract<InstanceAiEvent, { type: 'user-message' }>;
```

- **Not** added to `INSTANCE_AI_EPHEMERAL_EVENT_TYPES` (it must be persisted).
- No `agent-run-reducer.ts` case — the frontend renders it as a normal user
  message, not as timeline activity.

### 2.2 Queue types + DTOs

```ts
export const instanceAiQueuedMessageSchema = z.object({
	id: z.string(),
	text: z.string(),
	createdAt: z.string(),
	/** Set while the user asked to send this message into the live run. */
	steerRequestedAt: z.string().optional(),
});
export type InstanceAiQueuedMessage = z.infer<typeof instanceAiQueuedMessageSchema>;

export class InstanceAiQueueMessageRequest extends Z.class({
	text: z.string().trim().min(1),
}) {}

export class InstanceAiUpdateQueuedMessageRequest extends Z.class({
	text: z.string().trim().min(1),
}) {}

export interface InstanceAiQueuedMessagesResponse {
	queuedMessages: InstanceAiQueuedMessage[];
}
```

`packages/@n8n/api-types/src/index.ts` — export the new schemas, DTOs and types.

## 3. `packages/cli/src/modules/instance-ai`

### 3.1 Storage helpers — new file `storage/queued-messages.ts`

```ts
export const QUEUED_MESSAGES_METADATA_KEY = 'instanceAiQueuedMessages';
export interface QueuedMessage { id: string; text: string; createdAt: string; steerRequestedAt?: string }

/** Read defensively: the column is a JSON blob shared with other features. */
export function readQueuedMessages(metadata: Record<string, unknown> | undefined): QueuedMessage[];
/** Returns metadata with the queue written (or the key dropped when empty). */
export function withQueuedMessages(
	metadata: Record<string, unknown> | undefined,
	messages: QueuedMessage[],
): Record<string, unknown>;
export function toQueuedMessageList(messages: QueuedMessage[]): InstanceAiQueuedMessage[];
```

Also add `'instanceAiQueuedMessages'` to `PATCH_ONLY_METADATA_KEYS`
(`storage/typeorm-agent-memory.ts`).

### 3.2 `InstanceAiService` additions (public)

```ts
async listQueuedMessages(threadId: string): Promise<InstanceAiQueuedMessage[]>;
async queueMessage(threadId: string, text: string): Promise<InstanceAiQueuedMessage[]>;
async updateQueuedMessage(threadId: string, messageId: string, text: string): Promise<InstanceAiQueuedMessage[]>;
async removeQueuedMessage(threadId: string, messageId: string): Promise<InstanceAiQueuedMessage[]>;
/** Send now. Takes the user because an idle thread delivers it as a new run. */
async requestSteer(user: User, threadId: string, messageId: string): Promise<{ queuedMessages: InstanceAiQueuedMessage[] }>;
```

All mutations go through `patchThread(this.agentMemory, { threadId, update })`
(locked read-modify-write); a missing thread or a missing message id throws
`UserError` (404-style) — never silently no-ops.

### 3.3 `InstanceAiService` additions (private)

```ts
/**
 * `shouldStopGracefully` callback. Moves the first steer-requested item to the
 * head of the queue (clearing every stamp) and reports whether the run must end
 * here. The bubble was already published by `requestSteer`.
 */
private async claimSteerRequest(threadId: string, runId: string, step: number): Promise<boolean>;

/** Run-finish flush. Claims the head item, starts a run, then persists + publishes. */
private async flushQueuedMessage(user: User, threadId: string): Promise<void>;

/** Persists the user row and publishes `user-message`. */
private async deliverQueuedMessage(args: {
	user: User; threadId: string; runId: string; item: QueuedMessage;
	source: 'steered' | 'queued'; step?: number;
}): Promise<void>;
```

Wiring:
- `buildOrchestratorAgentStreamOptions` (and the resume options) pass
  `shouldStopGracefully: ({ step }) => this.claimSteerRequest(threadId, runId, step)`
  and raise `runControl.requestHandoff('user-steered')` on `true`, so
  `finalizeRun` publishes `run-finish` with `status: 'steered'`.
- `executeRun`'s `finally`, **after** the planned-task wiring block:
  `if (!segmentSuspended && !signal.aborted && !this.runState.hasLiveRun(threadId)) await this.flushQueuedMessage(user, threadId);`
  (`runState.hasLiveRun` already exists.)
- `requestSteer`: if `this.runState.hasLiveRun(threadId)` → mark
  `steerRequestedAt`, publish `user-message` (`steered`) on the live run at once
  + cancel the thread's background tasks
  (extract the `backgroundTasks.cancelThread` block from `cancelRun` into a
  reusable private helper); else deliver immediately as a new run.
- `flushQueuedMessage` ordering: re-check `hasLiveRun` → claim the first
  steer-requested item, else the head → start run → publish. If the run cannot
  be started, re-queue the item at the head and publish nothing.

The service never pre-persists a message: every delivered item starts a new run,
and the SDK's `persistInputMessages` writes that run's input row itself with its
own id. Writing ours as well would leave two rows (and two user bubbles) for one
message. So the delivery is: publish `user-message` only, after the run has
started. The durable row arrives with the run.

Ordering therefore is: claim → start run → publish `user-message`. Publishing
after the start guarantees no bubble exists for a message that never got a run
(a failed start re-queues the item instead).

Publish pattern:

```ts
this.eventBus.publish(threadId, {
	type: 'user-message',
	runId,
	agentId: orchestratorAgentId(runId),
	userId: user.id,
	payload: { messageId: item.id, text: item.text, source, ...(step !== undefined ? { step } : {}) },
});
```

### 3.4 Trace metadata — `run-trace-metadata.ts`

From the run's events (`user-message` with `source === 'steered'` = Send now
presses made during the run) and the `steeredAtStep` option the service passes
from the boundary that ended the run:

```ts
metadata.steered = true;
metadata.steer_count = steerRequests.length;
metadata.steered_at_step = options.steeredAtStep;
```

Only `steered` counts (a flushed `queued` message arrives after the run ended,
so it stopped nothing).

### 3.5 Telemetry — `packages/@n8n/telemetry/src/events/instance-ai.ts`

```ts
USER_STEERED_MESSAGE: {
	name: 'User steered Instance AI message',
	description: 'A queued user message was injected into the running n8n Assistant run at a step boundary (Send now).',
	properties: z.object({
		thread_id: z.string(),
		step: z.number().optional().describe('Agent-loop step the steer was injected before'),
	}),
},
```

Tracked from `claimSteerRequest` via `TELEMETRY_EVENT.INSTANCE_AI.USER_STEERED_MESSAGE`.

### 3.6 Controller — 5 endpoints on `InstanceAiController`

All `@GlobalScope('instanceAi:message')`, all `requireInstanceAiEnabled()`, all
`await this.assertThreadAccess(req.user.id, threadId)`, all return
`{ queuedMessages }`:

| Method | Path |
|---|---|
| GET | `/threads/:threadId/queued-messages` |
| POST | `/threads/:threadId/queued-messages` → `InstanceAiQueueMessageRequest` |
| PATCH | `/threads/:threadId/queued-messages/:messageId` → `InstanceAiUpdateQueuedMessageRequest` |
| DELETE | `/threads/:threadId/queued-messages/:messageId` |
| POST | `/threads/:threadId/queued-messages/:messageId/steer` |

## 4. Frontend

### 4.1 `instanceAi.api.ts`

```ts
export async function fetchQueuedMessages(context, threadId): Promise<InstanceAiQueuedMessagesResponse>;
export async function postQueuedMessage(context, threadId, text): Promise<InstanceAiQueuedMessagesResponse>;
export async function patchQueuedMessage(context, threadId, messageId, text): Promise<InstanceAiQueuedMessagesResponse>;
export async function deleteQueuedMessage(context, threadId, messageId): Promise<InstanceAiQueuedMessagesResponse>;
export async function postSteerQueuedMessage(context, threadId, messageId): Promise<InstanceAiQueuedMessagesResponse>;
```

### 4.2 `instanceAi.threadRuntime.ts`

```ts
const queuedMessages = ref<InstanceAiQueuedMessage[]>([]);

async function loadQueuedMessages(): Promise<void>;          // GET, replaces state
async function queueMessage(text: string): Promise<boolean>; // POST; false on failure (caller restores the draft)
async function removeQueuedMessage(messageId: string): Promise<void>;
async function steerQueuedMessage(messageId: string): Promise<void>;
/** Removes the item locally + on the server and returns its text, or null. */
async function takeQueuedMessageForEdit(messageId: string): Promise<string | null>;
```

- Expose `queuedMessages` + all five actions from the runtime.
- In `onSSEMessage`, after the reducer call: on `user-message`, drop the matching
  queued item by `payload.messageId`.
- Recovery: `loadQueuedMessages()` is safe to call on thread open; the caller
  delivers the head item when the thread is idle and not parked.

### 4.3 `instanceAi.reducer.ts`

- `case 'user-message'`: insert a `role: 'user'` `InstanceAiMessage`
  (`id`/`content` from the payload, `createdAt: new Date().toISOString()`),
  deduped by id. Do **not** set `messageGroupId`/`runId` on it (routing lookups
  must keep resolving to the assistant message). Return `state.activeRunId`.
- Placement: for `source: 'queued'`, splice the message in *before* the assistant
  message of `event.runId` when that message exists (else append) — that makes the
  order independent of whether `run-start` was reduced yet. For
  `source: 'steered'`, always append (it lands below the bubble of the run it
  stopped, ahead of the run it starts).
- Exclude `'user-message'` from the mid-run phantom-creation guard.

### 4.4 `components/InstanceAiInput.vue`

- New prop `queueWhileStreaming?: boolean` (default `false`).
- `canSubmitMessage`: while `props.isStreaming` **and** `queueWhileStreaming` and
  not awaiting a plan review, allow submit when `message.length > 0` and
  `attachmentCount === 0`. Everything else unchanged.

### 4.5 Queue UI — new `components/InstanceAiQueuedMessages.vue`

- Rendered by `InstanceAiConversation.vue` directly above `<div :class="$style.inputSwap">`
  (inside `.inputConstraint`), guarded by
  `v-if="!thread.isAwaitingConfirmation && !thread.pendingPlanReview"`.
- Uses `useThread()`; renders one row per `thread.queuedMessages`:
  text, **Send now** (`steerQueuedMessage`, only while `thread.isStreaming`),
  **Edit** (`takeQueuedMessageForEdit` → `emit('recall', text)`), remove.
- Per-row pending state while a steer is in flight (disable the buttons).

### 4.6 `InstanceAiConversation.vue`

- Pass `queue-while-streaming` to `InstanceAiInput`.
- `handleSubmit`: keep the plan-review branch first; then
  `if (thread.isStreaming) → thread.queueMessage(message)` (restore the draft on
  `false`) and return.
- `@recall` from the queue list → put the text back in the composer
  (`isDirty() ? appendText('\n' + text) : setText(text)` + focus).

### 4.7 i18n (`packages/frontend/@n8n/i18n/src/locales/en.json`)

Keys under `instanceAi.queue.*` — list title/label, `sendNow`, `edit`, `remove`,
per-row pending label.

## Rules for every implementer

- TypeScript: no `any`, no `as` casts in non-test code. Use the shared utilities
  that already exist (`@n8n/utils`, `n8n-workflow`) instead of hand-rolling.
- Comments: concise, explain *why*.
- Do not reformat untouched code. Keep diffs focused.
- Run the package's own `pnpm typecheck` and `pnpm lint` before reporting done;
  run the relevant tests you added.
- Never run `pnpm install` or destructive commands.
