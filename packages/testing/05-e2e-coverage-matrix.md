# E2E Coverage Matrix

Status: Compared against existing Playwright suite after source-backed journey map.
Date: 2026-05-19

## Inputs

- `packages/testing/02-e2e-journey-map.md`
- `packages/testing/03-e2e-journey-prioritization.md`
- `packages/testing/04-e2e-target-suite-plan.md`
- `packages/testing/playwright/AGENTS.md`
- Existing Playwright suite under `packages/testing/playwright/`

## Scope

This is the first artifact in this workstream that inspects existing E2E coverage. Earlier artifacts deliberately ignored Playwright, Cypress, fixtures, page objects, and existing test implementation.

The purpose of this matrix is to compare the source-backed journey model against current coverage, not to rewrite tests. Rows are inferred from current test behavior and file paths because existing tests do not yet carry journey IDs.

## Coverage States

- Covered and trusted: The journey has coverage in the target layer, uses controlled data or integrations, verifies a durable outcome, and has no obvious isolation or wait-risk problem.
- Covered but low-trust: Coverage exists, but trust is reduced by skipped tests, serial or shared state, fixed sleeps, toast-only or UI-only assertions, live services, weak cleanup, or poor layer fit.
- Partially covered: Some important behavior is covered, but the journey goal, variants, denied path, durable state, or target layer is incomplete.
- Missing: No meaningful current coverage was found for the journey.
- Covered below E2E: Current coverage exists in API, runtime, CLI, integration, or component tests and browser E2E is not the primary target layer.
- Not worth browser E2E: The target model says browser E2E should not own this journey unless future evidence shows a browser-only regression pattern.

## Suite-Level Findings

Current strengths:

- The suite has strong infrastructure for browser artifacts, container capabilities, dynamic users, API helpers, and controlled services such as Mailpit, proxy, Gitea, Keycloak, LocalStack, Kafka, and observability.
- Several areas already use product APIs for setup, unique names with `nanoid`, and isolated browser contexts via `n8n.start.withUser()`.
- The strongest current journey coverage is where tests assert caller responses, execution records, or persisted data, for example runtime webhooks and replay-backed Instance AI container tests.

Main trust gaps:

- No tests currently carry source journey IDs, so coverage mapping is inferred rather than explicit.
- Several high-value suites are disabled or partly disabled with `test.fixme()`, including workflow run, workflow duplicate, workflow settings, copy/paste, previous-node execution, source control, and some AI workflow builder tests.
- Serial or shared global state remains in important areas such as MFA, projects, project moves, global credentials, tags, variables, MCP service keys, token exchange, and workers.
- Fixed sleeps appear in data tables, execution lists, Chat Hub menus, archive flows, canvas helpers, NDV helpers, and log streaming helpers.
- Many browser tests assert visible UI, URLs, counts, or notifications without verifying persisted state through reload, API readback, execution records, or resource ownership.
- Some Playwright tests are valuable API, CLI, runtime, or infrastructure tests rather than browser E2E. They should remain in the coverage picture, but not be counted as trusted browser journey coverage.

## Summary

| Coverage State | Journey Count |
| --- | ---: |
| Covered and trusted | 3 |
| Covered but low-trust | 15 |
| Partially covered | 30 |
| Missing | 8 |
| Covered below E2E | 5 |
| Not worth browser E2E | 7 |

The trusted count includes D09-CJ01 only for replay-backed container execution. Local live-provider Instance AI mode is intentionally excluded from trusted coverage until it uses the same deterministic boundary or is classified separately.

Smoke-suite readiness:

- The target smoke suite has 11 journeys.
- 1 is currently covered and trusted: D06-CJ06.
- 3 are covered but low-trust: D04-CJ05, D05-CJ01, D05-CJ03.
- 6 are partially covered: D01-CJ02, D02-CJ01, D04-CJ01, D04-CJ04, D05-CJ02, D06-CJ01.
- 1 is missing: D01-CJ01.

This means the current suite is useful as a broad regression suite, but it does not yet provide a small trusted smoke signal.

## Matrix

| Journey ID | Priority | Recommended Coverage | Current Coverage | Current Test Path | Trust Issues | Proposed Action |
| --- | --- | --- | --- | --- | --- | --- |
| D01-CJ01 Owner setup | P0 | Smoke E2E | Missing | None found | No fresh-instance owner creation path was found. | Add isolated first-run setup smoke E2E with fresh/reset instance ownership. |
| D01-CJ02 Sign in, sign out, and guarded routing | P0 | Smoke E2E | Partially covered | `tests/e2e/auth/signin.spec.ts`; `tests/e2e/auth/authenticated.spec.ts` | Login is covered, but logout, protected-route return, and session destruction are incomplete; seeded owner is used. | Add guarded-route login-return and logout assertions. |
| D01-CJ03 Password recovery and change | P1 | Critical-path E2E | Partially covered | `tests/e2e/auth/password-reset.spec.ts` | Current test proves email delivery only, not reset-token completion or settings password change. | Extend with Mailpit token extraction, reset completion, sign-in with new password, and password-change flow. |
| D01-CJ04 MFA login and recovery | P1 | Enterprise E2E | Covered but low-trust | `tests/e2e/settings/personal/two-factor-authentication.spec.ts` | Serial, shared owner state, mutable MFA state, and notification-heavy assertions. | Split into isolated user tests with durable enabled, challenge, recovery-code, and disabled-state checks. |
| D01-CJ05 Enterprise login entry | P1 | Enterprise E2E | Partially covered | `tests/e2e/auth/oidc.spec.ts` | OIDC with Keycloak is covered; SAML, LDAP, role mapping, and other enterprise entry variants are not. | Keep OIDC slice; add only controlled enterprise protocol slices that the environment can support. |
| D02-CJ01 Navigate product areas and resource contexts | P1 | Smoke E2E | Partially covered | `tests/e2e/building-blocks/workflow-entry-points.spec.ts`; `tests/e2e/workflows/templates/templates.spec.ts`; `tests/e2e/projects/projects.spec.ts` | Navigation coverage is incidental rather than a deliberate app-shell journey; some project coverage is serial. | Add one smoke shell test for primary areas and personal/project context switching. |
| D02-CJ02 Create from global and scoped entry points | P1 | Critical-path E2E | Partially covered | `tests/e2e/workflows/list/workflows.spec.ts`; `tests/e2e/projects/projects.spec.ts`; `tests/e2e/credentials/crud.spec.ts` | Workflow and credential creation are covered, but global/scoped entry-point matrix and durable ownership checks are incomplete. | Add focused global-add versus project-add journey with API ownership verification. |
| D03-CJ01 Workflow library management | P1 | Critical-path E2E | Partially covered | `tests/e2e/workflows/list/workflows.spec.ts`; `tests/e2e/credentials/crud.spec.ts`; `tests/e2e/projects/folders-basic.spec.ts`; `tests/e2e/data-tables/details.spec.ts` | List behavior exists across resources, but assertions are mostly UI state and not consistently durable. | Keep current breadth; add one resource-library journey with reload/API verification. |
| D03-CJ02 Cross-resource organization | P1 | Extended E2E | Partially covered | `tests/e2e/projects/folders-basic.spec.ts`; `tests/e2e/projects/folders-operations.spec.ts`; `tests/e2e/projects/folders-advanced.spec.ts`; `tests/e2e/projects/projects-move-resources.spec.ts` | Folder and move coverage is broad, but some move-resource tests are serial and permission variants are incomplete. | Keep folder coverage; add one isolated cross-project move/permission journey. |
| D04-CJ01 Workflow creation | P0 | Smoke E2E | Partially covered | `tests/e2e/workflows/list/workflows.spec.ts`; `tests/e2e/workflows/editor/canvas/actions.spec.ts`; `tests/e2e/workflows/editor/canvas/canvas-nodes.spec.ts` | There is no single compact create-connect-name-save-reload journey; current assertions are mostly visible counts. | Add one builder smoke test with persisted graph readback after reload or API fetch. |
| D04-CJ02 Workflow import | P1 | Critical-path E2E | Covered but low-trust | `tests/e2e/workflows/list/import.spec.ts`; `tests/e2e/building-blocks/workflow-entry-points.spec.ts` | Import paths are covered, but mostly through node counts and limited persisted graph verification. | Keep current tests and add saved workflow graph assertion. |
| D04-CJ03 Canvas editing | P1 | Critical-path E2E | Partially covered | `tests/e2e/workflows/editor/canvas/actions.spec.ts`; `tests/e2e/workflows/editor/canvas/canvas-nodes.spec.ts`; `tests/e2e/workflows/editor/canvas/undo-redo.spec.ts`; `tests/e2e/workflows/editor/workflow-actions/copy-paste.spec.ts` | Many interactions exist, but copy/paste is skipped and key edits lack reload-backed persistence checks. | Unskip/refactor copy-paste and add reload/API assertions for move, duplicate, delete, and connect. |
| D04-CJ04 Save and dirty state | P0 | Smoke E2E | Partially covered | `tests/e2e/workflows/editor/canvas/canvas-nodes.spec.ts`; `tests/e2e/workflows/list/workflows.spec.ts`; `tests/e2e/workflows/editor/workflow-actions/settings.spec.ts` | Save and reload are covered in places, but dirty state, lost-work, and checksum behavior are incomplete; settings suite is skipped. | Add explicit dirty-state save/reload smoke and restore settings coverage. |
| D04-CJ05 Publish and activation | P0 | Smoke E2E | Covered but low-trust | `tests/e2e/workflows/editor/workflow-actions/publish.spec.ts`; `tests/e2e/workflows/checklist/production-checklist.spec.ts`; `tests/e2e/workflows/list/workflows.spec.ts` | Indicator and toast assertions dominate; activation state and triggered execution are not consistently verified. | Add API activation-state verification and one triggered execution proof. |
| D04-CJ06 Workflow history and versions | P2 | Extended E2E | Missing | None found | Restore, compare, and version-naming journeys were not found in Playwright. | Add extended E2E or lower-level contract for version restore/compare. |
| D05-CJ01 Node discovery | P1 | Smoke E2E | Covered but low-trust | `tests/e2e/node-creator/actions.spec.ts`; `tests/e2e/node-creator/categories.spec.ts`; `tests/e2e/node-creator/workflows.spec.ts`; `tests/e2e/building-blocks/canvas-actions.spec.ts` | Good node-creator UI breadth, but mostly counts/visibility and limited saved graph verification. | Keep thin smoke; add one durable find-and-add trigger/action assertion. |
| D05-CJ02 Node configuration | P0 | Smoke E2E | Partially covered | `tests/e2e/building-blocks/node-details-configuration.spec.ts`; `tests/e2e/workflows/editor/ndv/ndv-parameters.spec.ts`; `tests/e2e/workflows/editor/ndv/resource-locator.spec.ts`; `tests/e2e/workflows/editor/expressions/*.spec.ts` | Broad NDV/browser matrix exists, but many assertions are UI-only and expression correctness is better below browser E2E. | Keep representative NDV smoke with persisted parameter verification; move broad expression matrix lower. |
| D05-CJ03 Credential setup | P0 | Smoke E2E | Covered but low-trust | `tests/e2e/credentials/crud.spec.ts`; `tests/e2e/building-blocks/credentials.spec.ts`; `tests/e2e/credentials/api-operations.spec.ts` | Good create/select/edit/delete breadth, but duplicated coverage and many UI-only assertions. | Consolidate into one trusted browser credential journey plus API contract coverage. |
| D05-CJ04 OAuth credential callback | P1 | Critical-path E2E | Partially covered | `tests/e2e/credentials/oauth.spec.ts` | Success is simulated with `BroadcastChannel`; no real local OAuth callback/server contract or persisted credential readback. | Add controlled local OAuth stub callback and credential-state verification. |
| D06-CJ01 Manual workflow execution | P0 | Smoke E2E | Partially covered | `tests/e2e/workflows/editor/execution/execution.spec.ts`; `tests/e2e/workflows/editor/execution/logs.spec.ts`; `tests/e2e/workflows/editor/workflow-actions/run.spec.ts` | Manual run is covered, but stop path and workflow-actions run suite are skipped; some assertions rely on notifications. | Add smoke run with execution ID, status, and node output assertion; repair stop path separately. |
| D06-CJ02 Node-level execution | P1 | Critical-path E2E | Partially covered | `tests/e2e/workflows/editor/execution/execution.spec.ts`; `tests/e2e/workflows/editor/execution/partial.spec.ts`; `tests/e2e/workflows/editor/execution/previous-nodes.spec.ts` | Payload and partial coverage exists; previous-nodes suite is skipped and some assertions are UI-state only. | Keep partial v2, restore previous-nodes, and assert execution data. |
| D06-CJ03 Run data inspection | P1 | Critical-path E2E | Covered but low-trust | `tests/e2e/workflows/editor/execution/execution.spec.ts`; `tests/e2e/workflows/editor/ndv/ndv-data-display.spec.ts`; `tests/e2e/workflows/editor/ndv/io-filter.spec.ts`; `tests/e2e/workflows/editor/ndv/schema-preview.spec.ts`; `tests/e2e/workflows/editor/ndv/paired-item.spec.ts` | Good UI surface coverage, but assertions lean on visible panels/text and do not consistently prove durable execution data. | Keep representative browser checks; add execution-record backed payload assertions for critical run-data states. |
| D06-CJ04 Execution debugging | P1 | Critical-path E2E | Covered but low-trust | `tests/e2e/workflows/editor/execution/debug.spec.ts`; `tests/e2e/workflows/editor/execution/inject-previous.spec.ts` | Debug tests use a live external URL and route/debug-mode assertions are thin. | Replace external URL with controlled local stub and assert imported run data. |
| D06-CJ05 Execution list operations | P1 | Critical-path E2E | Covered but low-trust | `tests/e2e/workflows/executions/list.spec.ts`; `tests/e2e/workflows/executions/filter.spec.ts`; `tests/e2e/workflows/editor/execution/executions-list-infinite-scroll.spec.ts` | Fixed sleeps, broad counts, and skipped filter/list cases reduce trust. | Refactor waits and assert controlled execution IDs, statuses, deletion, and filters. |
| D06-CJ06 Runtime webhooks | P0 | Smoke E2E | Covered and trusted | `tests/e2e/nodes/webhook.spec.ts`; `tests/e2e/api/webhook-external.spec.ts`; `tests/e2e/api/webhook-isolation.spec.ts` | Coverage is mostly API-backed and asserts caller responses plus execution records. | Keep as trusted coverage and map explicitly to D06-CJ06. |
| D06-CJ07 Public forms | P1 | Critical-path E2E | Partially covered | `tests/e2e/nodes/form-trigger-node.spec.ts`; `tests/e2e/api/form-endpoint-isolation.spec.ts` | Public form UI is covered, but execution-record verification is limited and some IDs use `Date.now()`. | Add one public form journey with caller response plus execution-record assertion. |
| D06-CJ08 Wait and resume | P1 | Extended E2E | Partially covered | `tests/e2e/api/wait-form-resume.spec.ts`; `tests/e2e/workflows/editor/execution/logs.spec.ts`; `tests/e2e/workflows/editor/subworkflows/wait.spec.ts` | Strong API pieces exist, but browser path is thin and queue/clock behavior belongs lower. | Keep thin browser wait UI; own resume semantics in runtime/API tests. |
| D06-CJ09 Scheduled execution | P2 | Component/integration test | Not worth browser E2E | Incidental: `tests/e2e/nodes/schedule-trigger-node.spec.ts`; `tests/e2e/workflows/editor/workflow-actions/publish.spec.ts` | Browser only proves schedule node UI or publishability, not scheduler ownership or timing. | Cover with controlled-clock runtime/integration tests. |
| D06-CJ10 Service-triggered execution | P2 | Component/integration test | Not worth browser E2E | Incidental node specs under `tests/e2e/nodes/` | Service triggers depend on service events and activation lifecycle; browser adds little. | Keep node/runtime integration ownership. |
| D06-CJ11 Error workflow handling | P1 | Component/integration test | Not worth browser E2E | Incidental: `tests/e2e/workflows/checklist/production-checklist.spec.ts` | Browser opens settings/checklist only; runtime error-workflow payload and recovery semantics are not proven. | Add or maintain lower-level runtime tests for error execution payloads. |
| D06-CJ12 Sub-workflow execution | P1 | Component/integration test | Covered below E2E | `tests/e2e/workflows/editor/subworkflows/*.spec.ts` plus runtime/API-heavy assertions | Some browser extraction/debug UX exists, but the main trust boundary is parent/child runtime behavior. | Keep runtime/API assertions; reserve browser for extraction and selector UX only. |
| D06-CJ13 Binary data lifecycle | P1 | Extended E2E | Partially covered | `tests/e2e/nodes/webhook.spec.ts`; `tests/e2e/api/binary-data-xss.spec.ts`; `tests/e2e/api/webhook-isolation.spec.ts` | Security and webhook binary response pieces exist; preview/download lifecycle is incomplete. | Add one controlled binary preview/download journey if browser risk remains. |
| D06-CJ14 Expression evaluation | P0 | Component/integration test | Covered but low-trust | `tests/e2e/workflows/editor/expressions/*.spec.ts`; `tests/e2e/regression/SUG-38-inline-expression-preview.spec.ts` | Browser tests cover engine behavior that target plan says should be lower-level; some expression sections are serial or skipped. | Move correctness matrix lower; keep one browser expression preview smoke. |
| D06-CJ15 Representative node execution | P0 | Component/integration test | Covered below E2E | `tests/cli-workflows/workflow-tests.spec.ts`; `tests/cli-workflows/workflows/*.json` | Large legacy CLI corpus lacks journey IDs and includes time/random/external-service fixture risks. | Keep as node/runtime suite; improve determinism and metadata. |
| D07-CJ01 Template start | P1 | Critical-path E2E | Covered and trusted | `tests/e2e/workflows/templates/templates.spec.ts`; `tests/e2e/workflows/templates/credentials-setup.spec.ts`; `tests/e2e/regression/ADO-4462-template-setup-experiment.spec.ts` | Controlled template host and import path are strong; journey ID metadata is missing. | Keep and tag/map to D07-CJ01; add durable saved workflow assertion where missing. |
| D08-CJ01 Data table CRUD and grid work | P1 | Critical-path E2E | Covered but low-trust | `tests/e2e/data-tables/tables.spec.ts`; `tests/e2e/data-tables/details.spec.ts` | Good CRUD/grid breadth, but no reload/API persistence checks; fixed sleeps and a skipped column-filter test remain. | Refactor a critical CRUD path with API/reload verification and event-driven waits. |
| D08-CJ02 Data table CSV and workflow writes | P1 | Extended E2E | Missing | None found | Existing data-table tests cover list/grid behavior, not CSV import/export or workflow writes. | Add extended browser test for CSV; cover workflow read/write primarily through runtime/API tests. |
| D08-CJ03 Variables | P1 | Critical-path E2E | Partially covered | `tests/e2e/settings/environments/variables.spec.ts`; source-control variable coverage in `tests/e2e/source-control/*.spec.ts` | CRUD/search is covered, but the suite is serial, deletes all variables globally, toggles feature globally, and lacks expression autocomplete/use coverage. | Split isolated CRUD/search tests and add expression/use-in-workflow coverage. |
| D09-CJ01 Instance AI threads | P2 | Extended E2E | Covered and trusted | `tests/e2e/instance-ai/instance-ai-chat-basics.spec.ts`; `instance-ai-sidebar.spec.ts`; `instance-ai-timeline.spec.ts`; `instance-ai-artifacts.spec.ts`; `instance-ai-attachments.spec.ts` | Only replay-backed container mode counts as trusted; local live-provider mode can hit Anthropic and is excluded from this state. | Keep replay-backed E2E, tag it to D09-CJ01, and classify live-provider local mode as manual or low-trust until stubbed. |
| D09-CJ02 Instance AI approvals and gateway | P3 | Manual/exploratory | Not worth browser E2E | `tests/e2e/instance-ai/instance-ai-confirmations.spec.ts`; `instance-ai-remediation-guard.spec.ts` | Approval safeguards exist, but local gateway/high-risk approval behavior is environment-dependent and target plan marks manual. | Keep minimal replay-backed safeguards if useful; do not count as trusted browser journey. |
| D09-CJ03 AI workflow builder and Ask AI | P2 | Extended E2E | Partially covered | `tests/e2e/ai/workflow-builder.spec.ts`; `builder-setup-wizard.spec.ts`; `assistant-code-help.spec.ts`; `tests/e2e/instance-ai/instance-ai-workflow-*.spec.ts` | Builder generation tests are skipped; passing tests mostly cover entry, suggestions, abort, setup cards, or mocked states. | Restore deterministic builder generation replay and assert applied/persisted workflow diff. |
| D09-CJ04 Agent creation and publish | P2 | Extended E2E | Missing | None found for product-agent create/configure/publish | Existing Chat Hub personal agents and LangChain Agent node tests are adjacent but not this product surface. | Add extended E2E with stubbed model/tool response. |
| D09-CJ05 Agent chat and sessions | P2 | Extended E2E | Partially covered | `tests/e2e/chat-hub/chat-hub-personal-agent.spec.ts`; `tests/e2e/chat-hub/chat-hub-workflow-agent.spec.ts`; `tests/e2e/ai/langchain-agents.spec.ts` | Adjacent agent chat surfaces exist, but product-agent session timeline/history is not covered; fixed sleeps and model-text assertions remain. | Add controlled product-agent preview/session test; keep Chat Hub tests mapped separately. |
| D09-CJ06 Chat Hub model conversation | P2 | Extended E2E | Covered but low-trust | `tests/e2e/chat-hub/chat-hub-basic.spec.ts`; `chat-hub-settings.spec.ts`; `chat-hub-chat-user.spec.ts`; `chat-hub-attachment.spec.ts`; `chat-hub-tools.spec.ts` | Proxy replay exists, but tests assert generated prose, share expectation folders, and use fixed sleeps for menu hover. | Replace fixed sleeps, namespace data, and prefer contract/persistence assertions. |
| D09-CJ07 Chat Hub custom and workflow agents | P3 | Extended E2E | Covered but low-trust | `tests/e2e/chat-hub/chat-hub-personal-agent.spec.ts`; `chat-hub-workflow-agent.spec.ts` | Fixed sleeps, fixed names, and natural-language response assertions lower trust. | Add unique names, explicit cleanup, and state-backed selected-agent/workflow checks. |
| D09-CJ08 Public chat | P1 | Critical-path E2E | Missing | Adjacent only: `tests/e2e/workflows/demo-executable-chat-trigger.spec.ts`; `tests/e2e/ai/chat-session.spec.ts` | Current coverage is editor/manual chat, not hosted or embedded public chat with execution record. | Add public chat E2E with deterministic Chat Trigger and non-AI response. |
| D09-CJ09 MCP settings and workflow availability | P2 | Enterprise E2E | Partially covered | `tests/e2e/mcp/mcp-service.spec.ts` | API-level MCP access and `availableInMCP` are covered; settings UI enable/key/listing journey is not. MCP tests are serial due one global key. | Keep API coverage; add thin settings UI journey only if target enterprise suite supports it. |
| D09-CJ10 MCP OAuth client and tool execution | P2 | API contract | Covered below E2E | `tests/e2e/mcp/mcp-service.spec.ts`; `tests/e2e/nodes/mcp-trigger.spec.ts`; `services/mcp-api-helper.ts` | Strong protocol/API coverage exists; OAuth client/consent specifically was not evident. | Keep outside browser E2E; add missing OAuth/consent contract coverage if needed. |
| D09-CJ11 AI/LangChain workflow graph | P2 | Component/integration test | Not worth browser E2E | `tests/e2e/ai/langchain-agents.spec.ts`; `langchain-chains.spec.ts`; `langchain-memory.spec.ts`; `langchain-tools.spec.ts`; `langchain-vectorstores.spec.ts`; `hitl-for-tools.spec.ts` | Browser tests cover graph/node semantics that target plan says should live lower; fake credentials and broad node/toast assertions are common. | Move semantic coverage lower; keep one thin AI node discovery/config UX smoke if useful. |
| D10-CJ01 Projects | P1 | Critical-path E2E | Partially covered | `tests/e2e/projects/projects.spec.ts`; `tests/e2e/projects/project-settings.spec.ts`; `tests/e2e/sharing/access-control.spec.ts` | Broad project behavior exists, but `projects.spec.ts` is serial/reset-based and durable role/resource verification is incomplete. | Refactor into isolated project lifecycle E2E with member access and deletion verification. |
| D10-CJ02 Sharing | P1 | Critical-path E2E | Partially covered | `tests/e2e/sharing/workflow-sharing.spec.ts`; `credential-sharing.spec.ts`; `access-control.spec.ts`; `credential-visibility.spec.ts` | Happy and denied pieces exist, but some tests assert visibility only; shared workflow edit lacks save/reload proof. | Add durable recipient access/edit/reload and unshare/policy-denied paths. |
| D10-CJ03 Folders | P2 | Extended E2E | Partially covered | `tests/e2e/projects/folders-basic.spec.ts`; `folders-operations.spec.ts`; `folders-advanced.spec.ts` | Strong CRUD/navigation/move coverage, but permission-denied and cross-project resource transfer variants are absent. | Keep coverage; add one permission/resource-transfer journey. |
| D10-CJ04 Live collaboration | P1 | Extended E2E | Missing | Adjacent only: `tests/e2e/workflows/editor/viewer-permissions.spec.ts` | Viewer permissions cover role restrictions, not presence, active-editor, lock, or acquire-editing behavior. | Add deterministic multi-context collaboration E2E with lock-state assertions. |
| D11-CJ01 Invitations | P1 | Critical-path E2E | Partially covered | `tests/e2e/settings/users/users.spec.ts`; `tests/e2e/building-blocks/user-service.spec.ts` | User creation/listing exists, but invite, reinvite, copy invite link, and accept-token journey are incomplete. | Add invite acceptance E2E with controlled token or Mailpit fixture. |
| D11-CJ02 User admin and offboarding | P1 | Enterprise E2E | Covered but low-trust | `tests/e2e/settings/users/users.spec.ts` | Delete/transfer tests assert only toast; user absence and resource transfer/delete are not verified. | Create owned resources, offboard user, then verify user/resource state by API/UI. |
| D11-CJ03 Custom roles | P2 | Enterprise E2E | Partially covered | `tests/e2e/workflows/editor/viewer-permissions.spec.ts`; lower-level custom-role tests | Role impact is covered through API setup, but UI create/edit/delete/assignment lifecycle is not; spec is serial/static-user based. | Add enterprise E2E for role UI lifecycle and isolate viewer-permission cases. |
| D11-CJ04 SSO | P2 | Enterprise E2E | Partially covered | `tests/e2e/auth/oidc.spec.ts`; lower-level SAML/OIDC tests | OIDC browser flow exists; SAML, provisioning, role mapping, and environment-managed locks are not browser-covered. | Keep OIDC; add one controlled SAML/provisioning slice only if environment supports it. |
| D11-CJ05 LDAP | P3 | Manual/exploratory | Not worth browser E2E | Lower-level LDAP integration and command tests | Target plan says LDAP should stay manual/exploratory or integration-level due directory infrastructure variability. | Do not add browser E2E; maintain integration tests and release runbook. |
| D11-CJ06 API keys | P1 | API contract | Covered below E2E | `tests/e2e/building-blocks/user-service.spec.ts`; `tests/e2e/api/discovery.spec.ts`; lower-level API key tests | Browser settings flow is not covered, but target layer is API contract. | Keep/expand API contract for create, scope, revoke, and denied requests. |
| D11-CJ07 Security settings | P1 | Enterprise E2E | Missing | Adjacent only: `tests/e2e/settings/personal/two-factor-authentication.spec.ts`; `tests/e2e/app-config/security-notifications.spec.ts` | MFA and notifications do not cover security settings such as sharing policy, publish policy, redaction, or affected counts. | Add enterprise E2E for settings persistence plus one restricted-action check. |
| D11-CJ08 Licensing | P2 | Manual/exploratory | Not worth browser E2E | `tests/e2e/cloud/cloud.spec.ts`; lower-level license tests | Browser coverage only checks cloud trial/upgrade CTA; target plan marks licensing manual/exploratory. | Keep lower-level license tests and collect manual evidence for plan transitions. |
| D12-CJ01 Source control | P2 | Enterprise E2E | Covered but low-trust | `tests/e2e/settings/environments/source-control.spec.ts`; `tests/e2e/source-control/push.spec.ts`; `tests/e2e/source-control/pull.spec.ts`; lower-level source-control tests | All browser source-control suites are fully skipped with `test.fixme()` due flakiness. | Treat browser coverage as unavailable until repaired; rely on integration coverage meanwhile. |
| D12-CJ02 External secrets | P2 | Enterprise E2E | Partially covered | `tests/e2e/settings/external-secrets/secret-providers-connections-ui.spec.ts`; `aws-secrets-manager.spec.ts`; `secret-providers-connections.spec.ts` | Good LocalStack/API/UI pieces, but names/cleanup are not consistently namespaced and unauthorized project access is not asserted. | Add namespace/cleanup and denied project access checks. |
| D12-CJ03 Ops observability | P2 | Enterprise E2E | Partially covered | `tests/e2e/settings/log-streaming/*.spec.ts`; `tests/e2e/settings/workers/workers.spec.ts`; `tests/infrastructure/observability/*.spec.ts`; `tests/infrastructure/instance-registry/*.spec.ts` | Log streaming has controlled infra coverage; worker UI is serial/global-feature and only shell-level. | Keep infra tests; replace worker-view coverage with controlled worker status assertions. |
| D12-CJ04 Insights dashboard and summaries | P2 | Extended E2E | Missing | Lower-level insights tests only | No Playwright browser spec was found for Insights dashboard, filters, charts, workflow table, or summaries. | Add extended E2E with controlled insight fixtures if browser remains target. |
| D12-CJ05 Public API automation | P1 | API contract | Covered below E2E | `tests/e2e/api/discovery.spec.ts`; `tests/e2e/building-blocks/user-service.spec.ts`; lower-level public API tests | Browser does not add much; current Playwright API coverage is only a slice of full automation surface. | Expand API contract matrix for workflows, executions, credentials, projects, tags, variables, data tables, source control, users, and insights. |
| D12-CJ06 Community nodes | P3 | Component/integration test | Covered but low-trust | `tests/e2e/settings/community-nodes/community-nodes.spec.ts`; `tests/e2e/nodes/community-nodes.spec.ts`; lower-level community package tests | Browser specs mock package registry and REST endpoints; install/load lifecycle is not fully exercised and target layer is lower. | Move trust to lower layers; keep browser as thin mocked UI smoke only. |
| D12-CJ07 CLI and self-hosted operations | P3 | Component/integration test | Partially covered | `tests/cli-workflows/workflow-tests.spec.ts`; lower-level command/integration tests | CLI Playwright runner executes workflow fixtures, but does not cover server, webhook, worker, import/export, audit, or config operations broadly. | Track a real CLI integration suite outside browser Playwright; keep fixture runner as runtime coverage. |

## High-Value Gaps

1. Trusted smoke suite is not currently present. D01-CJ01 is missing, and most smoke journeys are partial or low-trust.
2. Core builder journeys need one compact happy path each with durable verification: workflow creation, save/dirty state, node configuration, credentials, and manual execution.
3. Several disabled suites overlap with critical paths: workflow run, workflow duplicate, workflow settings, copy/paste, previous-node execution, source control, and AI workflow builder.
4. Collaboration and admin coverage is broad but often proves visibility rather than durable permission/resource state.
5. AI coverage is strongest for replay-backed Instance AI in containers; Chat Hub and workflow builder need better isolation from exact generated prose and fixed waits.
6. Source control should not count as trusted browser coverage until the skipped suites are repaired.

## Migration Buckets

Keep as-is:

- D06-CJ06 runtime webhook coverage.
- D07-CJ01 template start coverage, after adding journey metadata.
- D09-CJ01 Instance AI replay-backed container coverage, as long as live-provider mode is classified separately.

Refactor for trust:

- D01-CJ04 MFA.
- D04-CJ02 import.
- D04-CJ05 publish/activation.
- D05-CJ01 node discovery.
- D05-CJ03 credential setup.
- D06-CJ03 run data inspection.
- D06-CJ04 execution debugging.
- D06-CJ05 execution list operations.
- D08-CJ01 data tables.
- D09-CJ06 and D09-CJ07 Chat Hub.
- D11-CJ02 user offboarding.
- D12-CJ06 community nodes if browser coverage is kept.

Add missing journey:

- D01-CJ01 owner setup.
- D04-CJ06 workflow history and versions.
- D08-CJ02 data table CSV and workflow writes.
- D09-CJ04 agent creation and publish.
- D09-CJ08 public chat.
- D10-CJ04 live collaboration.
- D11-CJ07 security settings.
- D12-CJ04 insights dashboard and summaries.

Move or keep below E2E:

- D06-CJ09 scheduled execution.
- D06-CJ10 service-triggered execution.
- D06-CJ11 error workflow handling.
- D06-CJ12 sub-workflow execution.
- D06-CJ14 expression evaluation.
- D06-CJ15 representative node execution.
- D09-CJ10 MCP OAuth/tool execution.
- D09-CJ11 AI/LangChain graph.
- D11-CJ06 API keys.
- D12-CJ05 public API automation.
- D12-CJ07 CLI/self-hosted operations.

## Task 6 Handoff

Task 6 should turn this matrix into a migration plan. Recommended first slices:

1. Define journey metadata conventions for Playwright titles, tags, annotations, or fixtures so every new trusted test maps to a journey ID.
2. Create or repair the smallest trusted smoke suite:
   - D01-CJ01 owner setup.
   - D01-CJ02 sign in/sign out/guarded route.
   - D02-CJ01 navigate product areas and resource contexts.
   - D04-CJ01 workflow creation.
   - D04-CJ04 save and dirty state.
   - D04-CJ05 publish/activation.
   - D05-CJ01 node discovery.
   - D05-CJ02 node configuration.
   - D05-CJ03 credential setup.
   - D06-CJ01 manual execution.
   - D06-CJ06 runtime webhooks.
3. Repair or replace skipped high-value tests before adding broad new coverage.
4. Move layer-mismatched browser tests toward API/runtime/component ownership rather than trying to harden them as browser E2E.
5. Add dashboard reporting that separates trusted browser E2E, low-trust browser coverage, API/runtime coverage, and manual/exploratory coverage.
