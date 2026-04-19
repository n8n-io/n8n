# Unified Sub-Agent Handoff — Simplified Plan

## Goal

One typed, idiomatic place that holds everything a sub-agent needs. Inspired by
`openai-agents` (Zod input schemas + typed runtime context), but sized for
Instance AI's manager-style orchestration over Mastra's `Agent.stream(string)`.

## Design

### One module, one rule

`packages/@n8n/instance-ai/src/agent/handoff.ts` owns the contract. Nothing
else in the codebase defines per-child input, outcome, or briefing shapes.

The one rule decides where every piece of data lives:

| Where | Who reads it | What goes there |
|---|---|---|
| `SubAgentHandoff.input` (per-kind Zod) | LLM (child) | **Parent-authored**, task-specific data: goals, resources, requirements |
| `OrchestrationContext` | Host only | **Services**: memory, event bus, iteration log, domain tools, planned-task service |
| `renderHandoff()` (runtime pull) | LLM (child) | **Cross-cutting runtime signals**: running siblings, prior attempts — pulled from `ctx` at render time, never duplicated on per-kind schemas |

This eliminates the three redundancies in today's code: `buildSubAgentBriefing`
vs ad-hoc markdown (two renderers), `iteration` / `runningTasks` on every
briefing input (five copies of the same runtime signal), and untyped
`outcome?: Record<string, unknown>` debriefings parsed separately from the
stream return (two outcome shapes).

### Two type disciplines, nothing more

1. **Per-kind Zod input schema** — what the parent computed for this child.
2. **Per-kind Zod outcome schema** — what the child returns. Reuses
   `WorkflowBuildOutcome` as-is for builder; minimal typed payloads for the
   rest.

No registry, no reuse policy, no envelope lanes, no generic `HandoffFact[]`,
no separate debrief parser.

### Kinds

Reuse `PlannedTaskKind` (`packages/@n8n/instance-ai/src/types.ts:546`) and
extend:

```ts
export type SubAgentKind =
  | 'delegate'
  | 'build-workflow'
  | 'research'
  | 'manage-data-tables'
  | 'planner'                    // new
  | 'browser-credential-setup';  // new
```

### Schemas (sketch)

```ts
// Shared leaf — used only where a resource ID is parent-authored.
const ResourceIdentity = z.object({
  workflowId: z.string().optional(),
  credentialId: z.string().optional(),
  dataTableId: z.string().optional(),
});

// Per-kind inputs — each only has parent-authored fields for that child.
// NOTE: no `priorAttempts`, no `runningSiblings` — those are runtime signals
// rendered from `ctx`, not duplicated on every schema.
export const DelegateInput = z.object({
  goal: z.string(),
  successCriteria: z.array(z.string()).optional(),
  toolSubset: z.array(z.string()).optional(),
  resources: ResourceIdentity.optional(),
});

export const BuilderInput = z.object({
  goal: z.string(),
  workflowId: z.string().optional(),
  sandboxPath: z.string(),
  requirements: z.string().optional(),
});

export const ResearchInput = z.object({
  question: z.string(),
  constraints: z.array(z.string()).optional(),
});

export const DataTableInput = z.object({
  goal: z.string(),
  tableId: z.string().optional(),
});

export const BrowserCredInput = z.object({
  credentialType: z.string(),
  docsUrl: z.string().url(),
  requiredFields: z.array(z.string()),
  redirectUrl: z.string().url().optional(),
});

export const PlannerInput = z.object({
  userGoal: z.string(),
  recentMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string(),
  })),
});

// One envelope, one place. `taskKey` is the single canonical identity for
// this handoff — planned task ID if scheduled, generated ID otherwise. Used
// by the renderer to look up iteration history and by storage to persist
// the outcome.
export type SubAgentHandoff =
  | { taskKey: string; kind: 'delegate'; input: z.infer<typeof DelegateInput> }
  | { taskKey: string; kind: 'build-workflow'; input: z.infer<typeof BuilderInput> }
  | { taskKey: string; kind: 'research'; input: z.infer<typeof ResearchInput> }
  | { taskKey: string; kind: 'manage-data-tables'; input: z.infer<typeof DataTableInput> }
  | { taskKey: string; kind: 'browser-credential-setup'; input: z.infer<typeof BrowserCredInput> }
  | { taskKey: string; kind: 'planner'; input: z.infer<typeof PlannerInput> };

// Outcomes — what the child returns. No separate "debrief" step.
// `spawnSubAgent` parses the stream return into this shape.
export type SubAgentOutcome =
  | { kind: 'delegate'; summary: string; blockers?: string[] }
  | { kind: 'build-workflow'; payload: WorkflowBuildOutcome }
  | { kind: 'research'; findings: string }
  | { kind: 'manage-data-tables'; summary: string; tableId?: string }
  | { kind: 'browser-credential-setup'; credentialId?: string; summary: string }
  | { kind: 'planner'; planRunId: string };
```

### Two functions

```ts
// Typed end-to-end. Renders the handoff, runs the child, parses the typed
// outcome from the stream return. No separate briefing step, no separate
// debrief step — one call, one round trip.
export async function spawnSubAgent<K extends SubAgentHandoff['kind']>(
  ctx: OrchestrationContext,
  handoff: Extract<SubAgentHandoff, { kind: K }>,
): Promise<Extract<SubAgentOutcome, { kind: K }>>;

// Envelope → string for Mastra. The single renderer. Pulls runtime signals
// (running siblings from `ctx.getRunningTaskSummaries`, prior attempts from
// `ctx.iterationLog` keyed by `handoff.taskKey`) and merges with typed input.
// Emits today's XML sections verbatim so specialist prompts keep working.
export function renderHandoff(
  handoff: SubAgentHandoff,
  ctx: OrchestrationContext,
): string;
```

### Runtime context

`OrchestrationContext` (`types.ts:782–860`) is the typed runtime carrier —
services, memory, event bus, iteration log, running-task summaries. Keep
as-is. The child never sees it; it's host-side only. This is our `RunContext`
equivalent. The renderer is the only thing that reaches into it to project
runtime signals into the LLM-visible briefing.

## Storage changes

Flip `PlannedTask` and `PlannedTaskRecord` to typed payloads:

```ts
// Before
interface PlannedTask {
  spec: string;                           // untyped
  // ...
}
interface PlannedTaskRecord extends PlannedTask {
  outcome?: Record<string, unknown>;      // untyped
  // ...
}

// After
interface PlannedTask {
  input: SubAgentHandoff;                 // typed, discriminated
  // ...
}
interface PlannedTaskRecord extends PlannedTask {
  outcome?: SubAgentOutcome;              // typed, discriminated
  // ...
}
```

Derive `title` / `spec` display text from `input` in one mapper so existing
plan-review SSE/UI payloads stay byte-compatible in v1.

## Migration

Six spawn sites converge on `spawnSubAgent()`:

| File | Change |
|---|---|
| `tools/orchestration/delegate.tool.ts` | Build `DelegateInput`, call `spawnSubAgent` |
| `tools/orchestration/build-workflow-agent.tool.ts` | Build `BuilderInput`, call `spawnSubAgent` |
| `tools/orchestration/research-with-agent.tool.ts` | Build `ResearchInput`, call `spawnSubAgent` |
| `tools/orchestration/data-table-agent.tool.ts` | Build `DataTableInput`, call `spawnSubAgent` |
| `tools/orchestration/plan-with-agent.tool.ts` | Build `PlannerInput`, stop bypassing shared helper |
| `tools/orchestration/browser-credential-setup.tool.ts` | Build `BrowserCredInput`, stop bypassing shared helper |

`buildSubAgentBriefing()` and `SubAgentBriefingInput` are **deleted**.
`renderHandoff()` is the sole renderer and absorbs the XML format verbatim so
every specialist prompt keeps working. There is no "briefing" concept and no
"debrief" concept in the new code — only `SubAgentHandoff` in and
`SubAgentOutcome` out.

## Non-goals (explicitly cut)

- **The "briefing" concept.** Deleted. No `buildSubAgentBriefing`, no
  `SubAgentBriefingInput`. One type: `SubAgentHandoff`. One renderer:
  `renderHandoff`.
- **The "debrief" concept.** Deleted. No separate outcome parser.
  `spawnSubAgent` returns a typed `SubAgentOutcome` directly.
- **`HandoffContextRegistry`.** Services live on `OrchestrationContext`;
  resource IDs live on typed input fields. No second registry.
- **`HandoffFact[]` + `reusePolicy`.** A ternary hint with no enforcement is
  noise. Stable things are typed fields on input. Mutable things re-fetch via
  tools.
- **Three envelope lanes.** One typed input per kind + one `ctx`. Planner's
  `recentMessages` is a field, not a lane.
- **Duplicated runtime signals on every schema.** `priorAttempts` and
  `runningSiblings` are pulled from `ctx` by the renderer, never repeated on
  per-kind inputs.
- **OpenAI `handoff()` routing semantics.** Instance AI is manager-style;
  children run as tools, not conversation owners.
- **Phase-1 SSE / REST / UI changes.** `agent-spawned` / `agent-completed`
  keep their current payloads; typed data lives in tracing and planned-task
  storage only.

## Test plan

1. **Schema tests** — every input and outcome schema has positive + negative
   cases.
2. **Renderer snapshot tests** — each `renderHandoff(handoff)` matches a
   committed XML snapshot so specialist prompts stay valid.
3. **Spawn-site tests** — each of the six tools produces the correct typed
   input; none construct ad-hoc strings.
4. **Storage round-trip tests** — `PlannedTaskRecord` persists and rehydrates
   typed `input` / `outcome` without loss.
5. **Plan-review payload compatibility** — existing SSE `tasks-update`
   payload shape is byte-identical pre/post migration.
6. **Prompt audit** — walk each specialist prompt (`sub-agent-factory.ts`
   consumers) and confirm every field it references is still rendered.

## Sequencing

1. Land `handoff.ts` with schemas, `spawnSubAgent`, `renderHandoff` — no
   callers yet.
2. Migrate the four spawn sites already using `buildSubAgentBriefing`
   (delegate, builder, research, data-table).
3. Migrate the two outliers (plan-with-agent, browser-credential-setup).
4. Flip `PlannedTask.input` and `PlannedTaskRecord.outcome` to typed; update
   plan-review mapper; confirm SSE stays byte-identical.
5. Delete `SubAgentBriefingInput` and `buildSubAgentBriefing` outright. The
   XML format now lives only inside `renderHandoff`. Grep confirms no other
   references to "briefing" or "debrief" remain.

Each step is a small, reviewable PR. No step requires a prompt rewrite.
