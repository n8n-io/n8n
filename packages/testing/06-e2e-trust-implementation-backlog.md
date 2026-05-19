# E2E Trust Implementation Backlog

Status: Post-comparison migration backlog. Existing Playwright tests have been inspected.
Date: 2026-05-19

## Inputs

- `packages/testing/02-e2e-journey-map.md`
- `packages/testing/03-e2e-journey-prioritization.md`
- `packages/testing/04-e2e-target-suite-plan.md`
- `packages/testing/05-e2e-coverage-matrix.md`
- `packages/testing/playwright/AGENTS.md`
- Existing Playwright suite under `packages/testing/playwright/`

## Scope

This file turns the journey map, prioritization, target suite plan, and coverage matrix into implementation-ready slices.

It is intentionally separate from `packages/testing/04-e2e-target-suite-plan.md` because that file records the target model drafted before inspecting existing tests. This backlog is post-comparison and includes existing Playwright paths.

Task 6 does not rewrite tests. It defines the order, files, metadata conventions, acceptance criteria, and validation commands for the engineers who implement the migration.

## Operating Principles

- Tag and report coverage before broad rewrites so progress can be measured by journey ID.
- Build a small trusted smoke suite before repairing broad low-trust coverage.
- Prefer one durable user outcome over many UI-only permutations.
- Keep browser E2E for browser-critical journeys. Move API, runtime, protocol, expression, node, CLI, and scheduler semantics to lower layers.
- Do not delete an existing browser test until a replacement or lower-layer owner is merged and linked to the same journey.
- Keep every trusted test independent, namespaced, and runnable alone.
- Treat skipped critical suites as unavailable coverage until repaired.

## Migration Buckets

| Bucket | Meaning | Implementation Rule |
| --- | --- | --- |
| Keep as-is | Existing coverage maps to a journey, fits the target layer, and satisfies trust criteria. | Add journey metadata and keep the behavior. |
| Rename/reclassify | Existing coverage is useful but hidden by naming, path, tags, or layer. | Add journey metadata, move only when it improves discoverability, and preserve behavior. |
| Refactor for trust | Existing coverage touches the right journey but has weak setup, waits, assertions, isolation, cleanup, or diagnostics. | Replace weak mechanics while preserving the journey. |
| Split into lower-level test | Browser coverage is exercising API, runtime, node, CLI, protocol, or algorithmic behavior. | Move the durable assertion to the target lower layer and keep only a thin browser UX slice when needed. |
| Replace with better journey test | Existing coverage touches the feature but does not prove the user outcome. | Add a journey-oriented test first, then retire the weaker overlap. |
| Delete after replacement | Existing coverage is redundant or lower-value after replacement lands. | Delete only after the replacement is linked to the same journey ID and has passing evidence. |
| Add missing journey | No meaningful coverage exists in the chosen layer. | Add coverage using target-layer rules and trust criteria. |

## Slice 0: Journey Metadata And Reporting

Goal: make every new or migrated trusted test explicitly map to the source-backed journey inventory.

### Files

- Create: `packages/testing/playwright/utils/journey-metadata.ts`
- Create: `packages/testing/playwright/fixtures/journey-metadata.ts`
- Create: `packages/testing/playwright/reporters/journey-coverage-reporter.ts`
- Modify: `packages/testing/playwright/fixtures/base.ts`
- Modify: `packages/testing/playwright/playwright.config.ts`
- Modify: `packages/testing/playwright/README.md`
- Modify: `packages/testing/playwright/AGENTS.md`

### Metadata Contract

Use title tags for grep and orchestration-friendly selection:

```text
@journey:D06-CJ06
@suite:smoke
@suite:critical
@suite:extended
@suite:enterprise
@suite:api
@suite:runtime
```

Keep existing operational tags unchanged:

```text
@auth:owner
@auth:none
@db:reset
@capability:proxy
@capability:email
@licensed
@mode:postgres
@mode:queue
```

Use annotations for structured metadata:

```typescript
type JourneyMetadata = {
	id: `D${number}${number}-CJ${number}${number}`;
	priority: 'P0' | 'P1' | 'P2' | 'P3';
	trustLayer:
		| 'smoke-e2e'
		| 'critical-path-e2e'
		| 'extended-e2e'
		| 'enterprise-e2e'
		| 'api-contract'
		| 'runtime-node-integration'
		| 'lower-level'
		| 'manual-exploratory';
	coverageState:
		| 'trusted-browser'
		| 'low-trust-browser'
		| 'partial-browser'
		| 'covered-below-e2e'
		| 'manual-exploratory'
		| 'not-browser-target';
	owner: string;
	relatedJourneys?: Array<`D${number}${number}-CJ${number}${number}`>;
	note?: string;
};
```

The helper in `packages/testing/playwright/utils/journey-metadata.ts` should expose:

```typescript
export function journey(meta: JourneyMetadata) {
	return {
		annotation: [
			{ type: 'journey', description: meta.id },
			{ type: 'priority', description: meta.priority },
			{ type: 'trust-layer', description: meta.trustLayer },
			{ type: 'coverage-state', description: meta.coverageState },
			{ type: 'owner', description: meta.owner },
			...(meta.relatedJourneys ?? []).map((id) => ({
				type: 'related-journey',
				description: id,
			})),
			...(meta.note ? [{ type: 'coverage-note', description: meta.note }] : []),
		],
	};
}
```

Example trusted smoke test metadata:

```typescript
test.describe(
	'Runtime webhooks @journey:D06-CJ06 @suite:smoke',
	journey({
		id: 'D06-CJ06',
		priority: 'P0',
		trustLayer: 'smoke-e2e',
		coverageState: 'trusted-browser',
		owner: 'Catalysts',
	}),
	() => {
		test('returns caller response and records execution @auth:owner', async ({ api, journey }) => {
			const workflowName = `${journey.namespace}-webhook`;
			// The implementation creates, activates, triggers, and verifies execution state.
		});
	},
);
```

Example low-trust legacy mapping during migration:

```typescript
test.describe(
	'Data tables @journey:D08-CJ01 @suite:critical',
	journey({
		id: 'D08-CJ01',
		priority: 'P1',
		trustLayer: 'critical-path-e2e',
		coverageState: 'low-trust-browser',
		owner: 'Adore',
		note: 'Existing coverage has fixed waits and lacks reload/API persistence checks.',
	}),
	() => {
		// Existing tests remain mapped while the trusted replacement is built.
	},
);
```

### Fixture Requirements

`packages/testing/playwright/fixtures/journey-metadata.ts` should add an auto fixture that:

- Parses exactly one primary `@journey:*` tag when present.
- Reads `journey`, `priority`, `trust-layer`, `coverage-state`, and `owner` annotations.
- Attaches `journey-metadata.json` to test results for diagnostics.
- Provides a `journey` fixture with `{ id, namespace, metadata }`.
- Uses a namespace format like `e2e-D04-CJ01-w<workerIndex>-<shortid>`.
- Warns for unmapped legacy tests by default.
- Enforces metadata only when `PLAYWRIGHT_REQUIRE_JOURNEY_METADATA=true`.
- Fails trusted suites when a `@journey:*` title tag and `journey` annotation disagree.

### Reporter Requirements

`packages/testing/playwright/reporters/journey-coverage-reporter.ts` should output:

- `test-results/journey-coverage.json`
- A console or GitHub step summary grouped by journey ID.

Required groups:

- Trusted browser E2E: browser E2E project plus `coverage-state=trusted-browser`.
- Low-trust browser E2E: browser E2E project plus `coverage-state=low-trust-browser` or `partial-browser`.
- API/runtime/lower-level: `trust-layer=api-contract`, `runtime-node-integration`, or `lower-level`.
- Manual/exploratory: sourced from the static matrix, not inferred from Playwright results.
- Unmapped legacy: tests without journey metadata.

### Acceptance Criteria

- `@journey:*` and `@suite:*` tags can be selected with Playwright `--grep`.
- Metadata is included in failure artifacts.
- Trusted smoke tests can be listed without counting API/runtime/manual evidence as browser E2E.
- Legacy tests can run without immediate failures while new trusted tests can opt into enforcement.

### Validation Commands

Run from the repository root:

```bash
pnpm --filter=n8n-playwright typecheck
```

Expected: TypeScript exits successfully.

```bash
pnpm --filter=n8n-playwright lint
```

Expected: ESLint exits successfully.

Run from `packages/testing/playwright` after adding or modifying Playwright files:

```bash
pnpm janitor --file=tests/e2e/smoke/builder.spec.ts --verbose
```

Expected: no new architecture violations for the changed file.

## Slice 1: Smoke Suite Definition

Goal: create a deliberately small browser smoke suite that proves the product can be opened, authored, saved, activated, configured, and executed.

### Files

- Create: `packages/testing/playwright/pages/SetupOwnerPage.ts`
- Create: `packages/testing/playwright/tests/e2e/smoke/account.spec.ts`
- Create: `packages/testing/playwright/tests/e2e/smoke/app-shell.spec.ts`
- Create: `packages/testing/playwright/tests/e2e/smoke/builder.spec.ts`
- Create: `packages/testing/playwright/tests/e2e/smoke/credentials.spec.ts`
- Create: `packages/testing/playwright/tests/e2e/smoke/execution.spec.ts`
- Modify: `packages/testing/playwright/composables/CanvasComposer.ts`
- Modify: `packages/testing/playwright/pages/components/SaveChangesModal.ts`
- Modify: `packages/testing/playwright/services/workflow-api-helper.ts`
- Modify: `packages/testing/playwright/tests/e2e/nodes/webhook.spec.ts`
- Modify: `packages/testing/playwright/README.md`
- Modify: `packages/testing/playwright/AGENTS.md`

### Shared Helper Backlog

Add helpers only when they remove repeated low-level mechanics from smoke tests:

| Helper | File | Purpose | First Consumer |
| --- | --- | --- | --- |
| `SetupOwnerPage` | `packages/testing/playwright/pages/SetupOwnerPage.ts` | Encapsulate the ownerless first-run setup form, submit action, and post-submit landing assertion. | D01-CJ01 |
| `getCurrentWorkflowId()` | `packages/testing/playwright/composables/CanvasComposer.ts` | Read the current workflow ID from the editor URL with a clear failure message. | D04-CJ01, D04-CJ04, D05-CJ02 |
| `saveAndFetchCurrentWorkflow()` | `packages/testing/playwright/composables/CanvasComposer.ts` | Wait for save, get workflow ID, then return `api.workflows.getWorkflow(workflowId)`. | D04-CJ01, D04-CJ04, D05-CJ02, D05-CJ03 |
| `expectWorkflowGraph()` | `packages/testing/playwright/services/workflow-api-helper.ts` or a smoke-local helper | Assert expected node names, node types, parameters, credentials, and source-indexed connections from API workflow data. | D04-CJ01, D05-CJ01, D05-CJ02 |
| `expectLatestExecution()` | `packages/testing/playwright/services/workflow-api-helper.ts` | Wait for execution, fetch full execution, and assert status plus selected node output. | D06-CJ01, D04-CJ05 |
| Clear save-modal actions | `packages/testing/playwright/pages/components/SaveChangesModal.ts` | Provide explicit `stayOnPage()`, `discardChanges()`, and `saveChanges()` methods. | D04-CJ04 |

### Smoke Journey Backlog

| Order | Journey | Current State | Action | Files | Durable Assertion |
| ---: | --- | --- | --- | --- | --- |
| 1 | D01-CJ01 Owner setup | Missing | Add dedicated fresh-instance smoke. | `tests/e2e/smoke/account.spec.ts`; likely `fixtures/fresh-instance.ts` if base fixture cannot skip seeded owner reset. | First owner completes setup and reaches authenticated app; `/rest/login` succeeds for that owner; guarded route is accessible afterward. |
| 2 | D01-CJ02 Sign in, sign out, and guarded routing | Partial | Refactor account smoke. | `tests/e2e/smoke/account.spec.ts`; existing `tests/e2e/auth/signin.spec.ts`; `tests/e2e/auth/authenticated.spec.ts` | Unauthenticated guarded route redirects to sign-in; login returns to guarded route; logout clears session; guarded route redirects again. |
| 3 | D02-CJ01 Navigate product areas and resource contexts | Partial | Add deliberate app-shell smoke. | `tests/e2e/smoke/app-shell.spec.ts`; existing `tests/e2e/building-blocks/workflow-entry-points.spec.ts`; `tests/e2e/projects/projects.spec.ts` | User navigates workflows, credentials, executions, templates, variables or settings where enabled, then switches personal/project context and API confirms resource ownership. |
| 4 | D04-CJ01 Workflow creation | Partial | Add builder vertical. | `tests/e2e/smoke/builder.spec.ts`; `pages/CanvasPage.ts`; `composables/CanvasComposer.ts` | Saved workflow API readback contains expected workflow name, nodes, and connection graph. |
| 5 | D04-CJ04 Save and dirty state | Partial | Add save/reload state to builder vertical. | `tests/e2e/smoke/builder.spec.ts` | After edit and save, reload keeps graph and parameters; no unsaved-changes modal appears after successful save. |
| 6 | D04-CJ05 Publish and activation | Low-trust | Refactor publish smoke. | `tests/e2e/smoke/execution.spec.ts`; existing `tests/e2e/workflows/editor/workflow-actions/publish.spec.ts` | API readback shows `active=true`; if webhook-backed, external call proves active workflow runs. |
| 7 | D05-CJ01 Node discovery | Low-trust | Add thin node discovery to builder vertical. | `tests/e2e/smoke/builder.spec.ts`; existing `tests/e2e/node-creator/actions.spec.ts` | Node selected through search appears in persisted graph after reload/API readback. |
| 8 | D05-CJ02 Node configuration | Partial | Add representative parameter assertion. | `tests/e2e/smoke/builder.spec.ts`; `pages/NodeDetailsViewPage.ts`; `helpers/NodeParameterHelper.ts` | API readback contains configured node parameter value, not only visible UI text. |
| 9 | D05-CJ03 Credential setup | Low-trust | Consolidate credential smoke. | `tests/e2e/smoke/credentials.spec.ts`; existing `tests/e2e/credentials/crud.spec.ts`; `tests/e2e/building-blocks/credentials.spec.ts` | Credential is created with controlled data, assigned to a node, and workflow API readback shows credential association. |
| 10 | D06-CJ01 Manual workflow execution | Partial | Add manual execution smoke. | `tests/e2e/smoke/execution.spec.ts`; existing `tests/e2e/workflows/editor/execution/execution.spec.ts` | Manual run returns execution ID; execution API shows `status=success`; run data contains expected node output. |
| 11 | D06-CJ06 Runtime webhooks | Trusted | Keep and tag explicitly. | `tests/e2e/nodes/webhook.spec.ts`; `tests/e2e/api/webhook-external.spec.ts`; `tests/e2e/api/webhook-isolation.spec.ts` | Unique webhook path returns caller response and execution record for the same workflow. |

### Fresh Owner Setup Note

`D01-CJ01` should not rely on the default E2E reset endpoint because `POST /rest/e2e/reset` seeds an owner. Implement this as one of these concrete approaches:

- Create `packages/testing/playwright/fixtures/fresh-instance.ts` that starts a worker-scoped container with a fresh database and does not run `dbSetup`, `setupFromTags`, or owner sign-in.
- Or add an explicit E2E-only reset mode in `packages/cli/src/controllers/e2e.controller.ts` that leaves the database ownerless, then expose it through `ApiHelpers` only for the fresh-owner setup test.

Preferred first approach: use a dedicated fixture so the production first-run path is tested without adding new backend reset behavior.

`D01-CJ01` is the only missing smoke journey and should remain owned by the smoke suite. It does not have to be the first implementation PR if the fresh-instance fixture support is slower than the other smoke refactors. Do not block D01-CJ02, D06-CJ06 metadata, D06-CJ01, or the builder smoke vertical while the ownerless fixture is being designed.

### Recommended Smoke Implementation Order

1. Add metadata and shared persisted-workflow/execution helpers.
2. Implement fast high-trust refactors: D01-CJ02, D06-CJ06 tagging, and D06-CJ01.
3. Add the authoring smoke vertical: D04-CJ01, D04-CJ04, D05-CJ01, and D05-CJ02.
4. Add activation and credential journeys: D04-CJ05 and D05-CJ03.
5. Add navigation/resource-context smoke: D02-CJ01.
6. Add D01-CJ01 owner setup once the ownerless fresh-instance fixture is available.

### Smoke Suite Assertion Rules

- Every smoke test must end with API readback, reload readback, execution record, or caller response.
- Toasts and button visibility are supporting evidence only.
- Every created user, project, workflow, credential, variable, table, webhook path, and API key must include the journey namespace.
- Every smoke test must pass alone with `pnpm --filter=n8n-playwright test:local <file>`.
- Container-only tests should declare the needed `@capability:*`, `@licensed`, or `@db:reset` tags.

### Validation Commands

Run a single smoke file while iterating:

```bash
pnpm --filter=n8n-playwright test:local tests/e2e/smoke/builder.spec.ts --reporter=list
```

Expected: the targeted smoke file passes locally.

Run the smoke suite:

```bash
pnpm --filter=n8n-playwright test:local --grep @suite:smoke --reporter=list
```

Expected: only smoke-tagged tests run and pass.

Run janitor for changed smoke files from `packages/testing/playwright`:

```bash
pnpm janitor --file=tests/e2e/smoke/builder.spec.ts --verbose
```

Expected: no new janitor violations.

## Slice 2: Deterministic Setup, Cleanup, And Diagnostics

Goal: establish reusable mechanics before expanding trusted coverage.

### Files

- Modify: `packages/testing/playwright/fixtures/journey-metadata.ts`
- Modify: `packages/testing/playwright/services/workflow-api-helper.ts`
- Modify: `packages/testing/playwright/services/credential-api-helper.ts`
- Modify: `packages/testing/playwright/services/project-api-helper.ts`
- Modify: `packages/testing/playwright/services/user-api-helper.ts`
- Modify: `packages/testing/playwright/services/public-api-helper.ts`
- Modify: `packages/testing/playwright/Types.ts`
- Modify: `packages/testing/playwright/README.md`

### Required Patterns

Namespace:

```typescript
const workflowName = `${journey.namespace}-workflow`;
const credentialName = `${journey.namespace}-credential`;
const webhookPath = `${journey.namespace}-webhook`;
```

Resource logging:

```typescript
await testInfo.attach('journey-resource-ids.json', {
	body: JSON.stringify(
		{
			journey: journey.id,
			namespace: journey.namespace,
			workflowId,
			credentialId,
			executionId,
		},
		null,
		2,
	),
	contentType: 'application/json',
});
```

Cleanup rule:

```typescript
try {
	await api.workflows.deactivate(workflowId);
} catch {}

try {
	await api.workflows.delete(workflowId);
} catch {}
```

Use this style only for cleanup. Assertions should not swallow failures.

### Acceptance Criteria

- New smoke tests use `nanoid` or the journey namespace, never `Date.now()`.
- New smoke tests do not depend on `test.describe.serial`.
- New smoke tests do not use fixed sleeps.
- Cleanup is idempotent and preserves failure artifacts before deletion.
- Failure output includes journey ID, namespace, resource IDs, and expected durable state.

## Slice 3: First P0/P1 Repairs After Smoke

Goal: repair the highest-value low-trust or skipped areas after the smoke suite gives a stable signal.

### Repair Queue

| Order | Journeys | Existing Paths | Required Tags/Capabilities | Action | Acceptance Criteria |
| ---: | --- | --- | --- | --- | --- |
| 1 | D04-CJ03, D03-CJ01, D04-CJ04 | `tests/e2e/workflows/editor/workflow-actions/copy-paste.spec.ts`; `duplicate.spec.ts`; `settings.spec.ts`; `archive.spec.ts` | `@suite:critical` | Repair disabled or weak workflow authoring suites. | No whole-suite `test.fixme`; copy/paste, duplicate, settings, archive, restore, and unpublish verify persisted graph, settings, or list state after reload/API readback. |
| 2 | D06-CJ02, D06-CJ03, D06-CJ04, D06-CJ05 | `tests/e2e/workflows/editor/execution/previous-nodes.spec.ts`; `tests/e2e/workflows/executions/list.spec.ts`; `tests/e2e/workflows/executions/filter.spec.ts`; `tests/e2e/workflows/editor/execution/debug.spec.ts` | `@suite:critical` | Repair execution, previous-node, debug, and execution-list trust. | Previous-node execution proves the current node did not run via execution data; execution lists use controlled execution IDs and event-driven waits; debug uses controlled local data. |
| 3 | D08-CJ01, D08-CJ03 | `tests/e2e/data-tables/*.spec.ts`; `tests/e2e/settings/environments/variables.spec.ts` | `@suite:critical` | Remove fixed waits and global state. | Data table CRUD persists after reload/API readback; variables use isolated names and do not delete global state outside the namespace. |
| 4 | D10-CJ01, D10-CJ02, D11-CJ01, D11-CJ02 | `tests/e2e/projects/projects.spec.ts`; `tests/e2e/sharing/*.spec.ts`; `tests/e2e/settings/users/users.spec.ts` | `@suite:critical`; add `@suite:enterprise` and `@licensed` for licensed user-admin/offboarding cases | Refactor collaboration/admin coverage from visibility-only to durable permission outcomes. | Allowed and denied paths are both asserted; transferred or deleted resources are verified by API/UI readback; tests use isolated users and browser contexts. |
| 5 | D12-CJ01 | `tests/e2e/settings/environments/source-control.spec.ts`; `tests/e2e/source-control/push.spec.ts`; `tests/e2e/source-control/pull.spec.ts` | `@suite:enterprise`; `@licensed`; `@capability:source-control` | Treat browser coverage as unavailable until skipped source-control suites are repaired. | No suite-level `test.fixme`; each test uses a unique repository; push/pull verifies UI status plus repository contents and API-visible resources. |
| 6 | D09-CJ03, D09-CJ06, D09-CJ07 | `tests/e2e/ai/workflow-builder.spec.ts`; `tests/e2e/chat-hub/*.spec.ts` | `@suite:extended`; add replay/stub capability metadata before counting as trusted | Repair AI only where deterministic replay or stubbed contracts exist. | No exact live-model prose assertions; no fixed hover sleeps; generated workflow diffs and chat/session state are asserted through controlled replay or persisted state. |

### Validation Commands

For a changed existing spec:

```bash
pnpm --filter=n8n-playwright test:local tests/e2e/workflows/editor/workflow-actions/copy-paste.spec.ts --reporter=list
```

Expected: the targeted repaired spec passes locally.

For architecture checks from `packages/testing/playwright`:

```bash
pnpm janitor --file=tests/e2e/workflows/editor/workflow-actions/copy-paste.spec.ts --verbose
```

Expected: no new janitor violations.

For container capability suites:

```bash
pnpm --filter=n8n-playwright test:container:sqlite --grep @capability:source-control --reporter=list
```

Expected: only source-control capability tests run in the container environment.

## Move Below Browser E2E

These journeys remain important, but browser E2E should not be their primary trust layer.

| Journeys | Current Paths | Target Layer | Action | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| D06-CJ09 Scheduled execution | `tests/e2e/nodes/schedule-trigger-node.spec.ts` | Runtime/node integration | Move scheduler behavior to controlled-clock runtime tests. | Browser keeps only optional node add/config UX; scheduler assertions run without wall-clock flake. |
| D06-CJ12 Sub-workflow execution | `tests/e2e/workflows/editor/subworkflows/*.spec.ts` | Runtime integration plus thin browser UX | Keep extraction/selector/debug entry browser slices only. | Parent/child execution contract and data propagation are asserted lower than browser E2E. |
| D06-CJ14 Expression evaluation | `tests/e2e/workflows/editor/expressions/*.spec.ts`; `tests/e2e/regression/SUG-38-inline-expression-preview.spec.ts` | Expression engine/component tests | Move expression correctness matrix lower. | Browser keeps one expression preview smoke; engine matrix has focused diagnostics. |
| D06-CJ15 Representative node execution | `tests/cli-workflows/workflow-tests.spec.ts`; `tests/cli-workflows/workflows/*.json` | Runtime/CLI integration | Add journey or fixture metadata without counting as browser coverage. | Runtime corpus tracks deterministic skip reasons and fixture ownership. |
| D09-CJ10 MCP OAuth client and tool execution | `tests/e2e/mcp/mcp-service.spec.ts`; `tests/e2e/nodes/mcp-trigger.spec.ts`; `services/mcp-api-helper.ts` | API/protocol contract | Keep JSON-RPC, auth, OAuth, consent, and tool assertions outside browser dashboard. | Browser reporting classifies this as covered below E2E. |
| D09-CJ11 AI/LangChain workflow graph | `tests/e2e/ai/langchain-*.spec.ts`; `tests/e2e/ai/hitl-for-tools.spec.ts` | Node/runtime integration | Move graph semantics to deterministic model/tool stubs. | Browser keeps at most thin AI-node discovery/config UX. |
| D11-CJ06 API keys and D12-CJ05 Public API automation | `tests/e2e/api/discovery.spec.ts`; `tests/e2e/building-blocks/user-service.spec.ts` | Public API contract | Expand API contract matrix instead of adding browser settings coverage by default. | Create, scope, revoke, denied requests, and resource automation are verified at API boundary. |
| D12-CJ06 Community nodes | `tests/e2e/settings/community-nodes/community-nodes.spec.ts`; `tests/e2e/nodes/community-nodes.spec.ts` | Component/integration | Move install/load policy and filesystem/package behavior lower. | Browser remains a thin mocked UI smoke if retained. |
| D12-CJ07 CLI and self-hosted operations | `tests/cli-workflows/*` and future CLI specs | CLI/integration | Track import/export, worker, webhook, config, audit, and queue behavior outside browser Playwright. | CLI coverage appears in reporting separately from trusted browser E2E. |

## Lower-Layer Handoff Slices

These slices keep lower-layer work concrete so browser E2E does not become the fallback for API, runtime, protocol, expression, node, or CLI behavior.

| Slice | Journeys | Target Homes | Validation Commands | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Public API contract | D11-CJ06, D12-CJ05 | `packages/cli/test/integration/public-api/`, `packages/cli/test/integration/api-keys.api.test.ts`, `packages/cli/src/controllers/__tests__/api-keys.controller.test.ts`, `packages/cli/src/services/__tests__/api-key-auth.strategy.integration.test.ts` | `pushd packages/cli && pnpm test test/integration/public-api/workflows.test.ts && pnpm test test/integration/api-keys.api.test.ts && popd` | API keys, scopes, denied requests, discovery, pagination, and durable resource writes are verified without browser setup. |
| Runtime and scheduler integration | D06-CJ09, D06-CJ12, D06-CJ15 | `packages/core/src/execution-engine/__tests__/`, `packages/core/src/execution-engine/partial-execution-utils/__tests__/`, `packages/testing/playwright/tests/cli-workflows/` | `pushd packages/core && pnpm test src/execution-engine/__tests__/scheduled-task-manager.test.ts && popd`; `pnpm --filter=n8n-playwright test:local tests/cli-workflows/workflow-tests.spec.ts --reporter=list` | Scheduler, parent/child execution, representative nodes, and skip reasons are deterministic and reported separately from browser E2E. |
| Expression and run-data correctness | D06-CJ14 | `packages/workflow/test/`, `packages/core/src/execution-engine/partial-execution-utils/__tests__/`, `packages/testing/playwright/tests/e2e/workflows/editor/expressions/` | `pushd packages/workflow && pnpm test test/workflow-expression.test.ts && popd`; `pnpm --filter=n8n-playwright test:local tests/e2e/workflows/editor/expressions/inline.spec.ts --reporter=list` | The expression matrix runs below browser; browser keeps one preview/editor confidence slice only. |
| MCP and AI graph protocol | D09-CJ10, D09-CJ11 | `packages/cli/src/modules/mcp/__tests__/`, `packages/core/src/execution-engine/node-execution-context/__tests__/`, `packages/@n8n/nodes-langchain/` tests when present | `pushd packages/cli && pnpm test src/modules/mcp/__tests__/mcp.oauth.controller.api.test.ts && popd`; `pushd packages/core && pnpm test src/execution-engine/node-execution-context/__tests__/execute-context.test.ts && popd` | OAuth, consent, JSON-RPC, tool availability, and AI graph semantics use controlled protocol/model/tool stubs. |

## Missing Journeys After Smoke

`D01-CJ01` is missing but belongs in the immediate smoke suite. The following missing journeys should wait until after smoke metadata and smoke stability are established.

| Order | Journey | Current State | Target Layer | Acceptance Criteria |
| ---: | --- | --- | --- | --- |
| 1 | D09-CJ08 Public chat | Missing; adjacent editor chat coverage only. | Critical-path E2E | Public or hosted chat URL accepts deterministic message, returns controlled response, and creates execution record. |
| 2 | D08-CJ02 Data table CSV and workflow writes | Missing. | Extended E2E plus runtime/API | CSV import/export browser path works; workflow read/write is verified primarily through runtime/API assertions. |
| 3 | D10-CJ04 Live collaboration | Missing; adjacent viewer permissions only. | Extended E2E | Multi-context test proves lock, presence, or acquire-editing with persisted or stream-backed final state. |
| 4 | D11-CJ07 Security settings | Missing. | Enterprise E2E | Enterprise security setting persists and one restricted action proves enforcement. |
| 5 | D04-CJ06 Workflow history and versions | Missing. | Extended E2E | Create versions, compare or restore, and verify restored workflow graph through API/reload. |
| 6 | D12-CJ04 Insights dashboard and summaries | Missing. | Extended E2E | Controlled fixtures drive dashboard filters, charts, summaries, and expected values. |
| 7 | D09-CJ04 Agent creation and publish | Missing. | Extended E2E | Stubbed model/tool flow creates, configures, publishes, and verifies agent availability/session state. |

## First Commit Boundaries

1. Metadata and reporting only.
   - Files: `utils/journey-metadata.ts`, `fixtures/journey-metadata.ts`, `reporters/journey-coverage-reporter.ts`, `fixtures/base.ts`, `playwright.config.ts`, docs.
   - Validation: `pnpm --filter=n8n-playwright typecheck`, `pnpm --filter=n8n-playwright lint`.

2. Account smoke.
   - Files: `tests/e2e/smoke/account.spec.ts`, possible `fixtures/fresh-instance.ts`.
   - Validation: `pnpm --filter=n8n-playwright test:local tests/e2e/smoke/account.spec.ts --reporter=list`.

3. Builder smoke.
   - Files: `tests/e2e/smoke/builder.spec.ts`, page/composer helpers only when necessary.
   - Validation: `pnpm --filter=n8n-playwright test:local tests/e2e/smoke/builder.spec.ts --reporter=list`.

4. Credential and execution smoke.
   - Files: `tests/e2e/smoke/credentials.spec.ts`, `tests/e2e/smoke/execution.spec.ts`.
   - Validation: targeted file runs plus `pnpm --filter=n8n-playwright test:local --grep @suite:smoke --reporter=list`.

5. Keep and tag trusted webhook coverage.
   - Files: `tests/e2e/nodes/webhook.spec.ts`, `tests/e2e/api/webhook-external.spec.ts`, `tests/e2e/api/webhook-isolation.spec.ts`.
   - Validation: `pnpm --filter=n8n-playwright test:local --grep @journey:D06-CJ06 --reporter=list`.

6. Add lower-layer public API contract metadata.
   - Files: `packages/cli/test/integration/public-api/*.test.ts`, `packages/cli/test/integration/api-keys.api.test.ts`.
   - Validation: `pushd packages/cli && pnpm test test/integration/public-api/workflows.test.ts && pnpm test test/integration/api-keys.api.test.ts && popd`.

7. Add lower-layer runtime and expression metadata.
   - Files: `packages/core/src/execution-engine/__tests__/*.test.ts`, `packages/core/src/execution-engine/partial-execution-utils/__tests__/*.test.ts`, `packages/workflow/test/*.test.ts`, `packages/testing/playwright/tests/cli-workflows/README.md`.
   - Validation: targeted package tests plus `pnpm --filter=n8n-playwright test:local tests/cli-workflows/workflow-tests.spec.ts --reporter=list`.

## Handoff Checklist

- [ ] Metadata helper exists and documents `@journey:*`, `@suite:*`, and structured annotations.
- [ ] Journey reporter separates trusted browser, low-trust browser, lower-layer, manual, and unmapped legacy coverage.
- [ ] Smoke suite files exist and cover all 11 smoke journeys.
- [ ] D01-CJ01 uses a real ownerless first-run state, not the default seeded E2E reset.
- [ ] Smoke tests use durable API/reload/execution/caller assertions.
- [ ] Smoke tests use unique namespaces and do not depend on execution order.
- [ ] Existing low-trust tests are not deleted until replacements are merged.
- [ ] Layer-mismatched coverage is tracked below browser E2E instead of being counted as trusted browser coverage.
- [ ] `packages/testing/05-e2e-coverage-matrix.md` can be updated after implementation to move journeys from missing, partial, or low-trust to trusted.
