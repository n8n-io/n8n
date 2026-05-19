# E2E Trust Next Steps Plan

Status: Handoff plan. Existing E2E inspection is deferred until Task 5, then captured in post-comparison artifacts.
Date: 2026-05-19

## Goal

Increase trust in n8n end-to-end tests by first understanding the product from source, then mapping real user journeys, then comparing those journeys to the existing E2E suite. The current state is a source-backed product feature inventory at `packages/testing/product-feature-inventory.md`.

This plan is written for handoff. A new agent should be able to continue without reading the prior chat.

## Current Context

- `packages/testing/product-feature-inventory.md` exists and contains a product-level feature inventory.
- The feature inventory was built from product source, routes, modules, controllers, API contracts, runtime packages, CLI commands, and node registries.
- Existing E2E, Playwright, Cypress, and test fixture files were intentionally ignored while creating the inventory.
- Four independent subagent passes contributed to the inventory:
  - Frontend routes, navigation, stores, feature modules, and user-facing views.
  - Backend/API controllers, modules, services, scopes, and shared API contracts.
  - Runtime, workflow semantics, built-in nodes, and AI/LangChain nodes.
  - Enterprise, collaboration, admin, security, source control, SSO, and operations surfaces.

## Operating Rules

- Do not inspect existing E2E tests until Task 5.
- Treat product source as the source of truth until the journey map exists.
- Keep all new planning artifacts under `packages/testing/` unless the user redirects.
- Use subagents for independent inventory or classification work; give each subagent a narrow domain and require source pointers.
- Keep journeys actor- and outcome-oriented, not route- or component-oriented.
- Prefer fewer high-confidence critical journeys over exhaustive low-value UI permutations.
- Every artifact should state whether it was created before or after comparing to existing E2E coverage.

## Deliverables

- `packages/testing/e2e-journey-map.md`: source-backed journey map, still independent of existing E2E tests.
- `packages/testing/e2e-journey-prioritization.md`: ranked journey list with criticality, confidence, and recommended suite placement.
- `packages/testing/e2e-coverage-matrix.md`: comparison between journeys and existing E2E coverage.
- `packages/testing/e2e-target-suite-plan.md`: proposed future suite structure, ownership model, and migration path.
- `packages/testing/e2e-trust-implementation-backlog.md`: post-comparison implementation backlog with metadata conventions, smoke slices, repair order, and lower-layer migration plan.
- `packages/testing/e2e-planning-artifact-review.md`: final audit showing that the planning artifacts are internally consistent and ready for implementation handoff.

## Task 1: Normalize The Feature Inventory Into Domains

**Files:**
- Read: `packages/testing/product-feature-inventory.md`
- Create: `packages/testing/e2e-journey-map.md`

- [ ] Read `packages/testing/product-feature-inventory.md`.
- [ ] Create `packages/testing/e2e-journey-map.md` with these sections:

```markdown
# E2E Journey Map

Status: Source-backed journey draft. Existing E2E tests have not been inspected.
Date: 2026-05-19

## Inputs

- `packages/testing/product-feature-inventory.md`
- Product source under `packages/frontend/editor-ui/src`
- Backend source under `packages/cli/src`
- Runtime source under `packages/core/src` and `packages/workflow/src`
- Node registries under `packages/nodes-base` and `packages/@n8n/nodes-langchain`

## Actor Groups

- Builder
- Collaborator
- Admin
- Operator
- API user
- AI user
- External end user

## Journey Domains

## Journey Inventory

## Open Questions
```

- [ ] Move feature areas into journey domains:
  - Account and first run.
  - App shell and navigation.
  - Workflow creation and authoring.
  - Node configuration and credentials.
  - Execution and debugging.
  - Resource organization.
  - Collaboration and permissions.
  - Data tables and variables.
  - Templates and onboarding.
  - AI, agents, chat, and MCP.
  - Admin, identity, security, and enterprise.
  - Operations, source control, workers, and public API.
- [ ] Keep source anchors by referencing inventory sections and important source paths.
- [ ] Do not include coverage status in this file.

**Acceptance Criteria:**
- The file exists.
- The file says existing E2E tests have not been inspected.
- Every top-level feature inventory section maps to at least one journey domain.

## Task 2: Use Subagents To Draft Journey Candidates

**Files:**
- Read: `packages/testing/product-feature-inventory.md`
- Modify: `packages/testing/e2e-journey-map.md`

- [ ] Spawn independent subagents with these exact scopes:

```text
Subagent 1: Builder journeys
Use packages/testing/product-feature-inventory.md and product source only. Do not inspect E2E, Playwright, Cypress, or test fixtures. Draft concrete end-user journeys for workflow creation, node discovery, node configuration, credentials, workflow save, activation, execution, debugging, history, and templates. Return each journey with actor, goal, preconditions, primary path, variants, success signal, and source anchors.
```

```text
Subagent 2: Collaboration and admin journeys
Use packages/testing/product-feature-inventory.md and product source only. Do not inspect E2E, Playwright, Cypress, or test fixtures. Draft concrete journeys for projects, sharing, folders, users, invitations, roles, SSO, LDAP, MFA, API keys, source control, external secrets, security settings, licensing, workers, and log streaming. Return each journey with actor, goal, preconditions, primary path, variants, success signal, and source anchors.
```

```text
Subagent 3: AI, agents, chat, MCP, and data journeys
Use packages/testing/product-feature-inventory.md and product source only. Do not inspect E2E, Playwright, Cypress, or test fixtures. Draft concrete journeys for Instance AI, AI assistant, agents, Chat Hub, MCP access, data tables, variables, insights, and public API surfaces. Return each journey with actor, goal, preconditions, primary path, variants, success signal, and source anchors.
```

```text
Subagent 4: Runtime and external-user journeys
Use packages/testing/product-feature-inventory.md and product source only. Do not inspect E2E, Playwright, Cypress, or test fixtures. Draft concrete journeys for webhook execution, form/chat/public interactions, wait/resume, scheduled/triggered execution, error workflows, sub-workflows, binary data, expression evaluation, and representative node catalog capabilities. Return each journey with actor, goal, preconditions, primary path, variants, success signal, and source anchors.
```

- [ ] Merge subagent output into `packages/testing/e2e-journey-map.md`.
- [ ] Deduplicate journeys by user goal, not by route or component.
- [ ] Preserve variants where they change risk, permissions, persistence, execution mode, or actor.

**Acceptance Criteria:**
- Journey map contains concrete journeys, not just feature names.
- Each journey has actor, goal, preconditions, primary path, variants, success signal, and source anchors.
- Existing E2E coverage is still not referenced.

## Task 3: Prioritize Journeys

**Files:**
- Read: `packages/testing/e2e-journey-map.md`
- Create: `packages/testing/e2e-journey-prioritization.md`

- [ ] Create `packages/testing/e2e-journey-prioritization.md` with this scoring rubric:

```markdown
# E2E Journey Prioritization

Status: Source-backed prioritization. Existing E2E tests have not been inspected.

## Scoring

Criticality:
- P0: Must work for the product to be usable or secure.
- P1: Common product path or high business/user impact.
- P2: Important but not a top-line trust signal.
- P3: Specialized, admin-only, integration-specific, or better covered below E2E.

Recommended Coverage:
- Smoke E2E
- Critical-path E2E
- Extended E2E
- Enterprise E2E
- API contract
- Component/integration test
- Manual/exploratory

Risk Signals:
- Cross-package behavior
- Auth/permission boundary
- Persistence or migration
- Realtime/push behavior
- External callback/webhook
- Async execution
- AI nondeterminism
- Source-control or filesystem dependency
- Queue/worker dependency
- Cloud/self-host split
```

- [ ] Rank every journey from Task 2 as P0, P1, P2, or P3.
- [ ] Assign recommended coverage for every journey.
- [ ] Add risk signals for every journey.
- [ ] Mark the first proposed smoke suite candidates.
- [ ] Mark journeys that should not become browser E2E tests.

**Acceptance Criteria:**
- Every journey has a priority.
- Every journey has a recommended coverage type.
- The smoke-suite candidates are limited enough to run frequently.

## Task 4: Define E2E Trust Criteria Before Reading Existing Tests

**Files:**
- Read: `packages/testing/e2e-journey-prioritization.md`
- Create or append: `packages/testing/e2e-target-suite-plan.md`

- [ ] Create `packages/testing/e2e-target-suite-plan.md` with these sections:

```markdown
# E2E Target Suite Plan

Status: Target model drafted before existing E2E comparison.

## Trust Criteria

## Proposed Suite Layers

## Data Setup Rules

## Assertion Rules

## Isolation And Cleanup Rules

## Diagnostics Requirements

## Ownership Model

## Migration Path
```

- [ ] Define trust criteria:
  - Tests assert user-visible outcomes or durable API state.
  - Tests avoid asserting implementation details.
  - Tests own their data setup.
  - Tests clean up or use isolated namespaces.
  - Tests do not depend on ordering with other tests.
  - Tests produce actionable diagnostics on failure.
  - Tests minimize sleeps and prefer event/state-driven waits.
  - Tests isolate nondeterministic AI and external integrations behind controlled contracts.
- [ ] Define suite layers:
  - Smoke E2E.
  - Critical-path E2E.
  - Extended E2E.
  - Enterprise E2E.
  - Public API contract.
  - Runtime/node integration.
  - Lower-level frontend/backend tests.
- [ ] Define what should not be browser E2E:
  - Pure formatting.
  - Static rendering with no user journey.
  - Exhaustive node catalog permutations.
  - Provider-specific API behavior better covered by node tests or contract mocks.
  - Feature-flag permutations with identical user outcomes.

**Acceptance Criteria:**
- The target suite plan can be evaluated before seeing current tests.
- It gives concrete rules for test data, assertions, isolation, cleanup, diagnostics, and suite placement.

## Task 5: Compare Against Existing E2E Coverage

**Files:**
- Read: `packages/testing/e2e-journey-map.md`
- Read: `packages/testing/e2e-journey-prioritization.md`
- Read: `packages/testing/playwright/`
- Create: `packages/testing/e2e-coverage-matrix.md`

- [ ] Only start this task after Tasks 1-4 are complete.
- [ ] Inspect existing Playwright specs, fixtures, page objects, helpers, setup, and tags under `packages/testing/playwright/`.
- [ ] Create `packages/testing/e2e-coverage-matrix.md` with this structure:

```markdown
# E2E Coverage Matrix

Status: Compared against existing Playwright suite after source-backed journey map.

## Coverage States

- Covered and trusted
- Covered but low-trust
- Partially covered
- Missing
- Covered below E2E
- Not worth browser E2E

## Matrix

| Journey ID | Priority | Recommended Coverage | Current Coverage | Current Test Path | Trust Issues | Proposed Action |
| --- | --- | --- | --- | --- | --- | --- |
```

- [ ] For every P0/P1 journey, find whether existing tests cover it.
- [ ] For P2/P3 journeys, group related low-priority journeys where individual rows would add noise.
- [ ] Mark low-trust coverage when tests rely on shared state, brittle selectors, fixed sleeps, broad assertions, unclear cleanup, external services, or hidden dependencies.
- [ ] Do not rewrite tests in this task.

**Acceptance Criteria:**
- Every P0/P1 journey appears in the matrix.
- Every matrix row has a proposed action.
- Existing tests are evaluated against the target trust criteria, not treated as proof of product coverage by default.

## Task 6: Propose The Migration Path

**Files:**
- Read: `packages/testing/e2e-coverage-matrix.md`
- Read: `packages/testing/e2e-target-suite-plan.md`
- Create: `packages/testing/e2e-trust-implementation-backlog.md`
- Optionally modify: `packages/testing/e2e-target-suite-plan.md`

- [ ] Add a migration path with these buckets:
  - Keep as-is.
  - Rename/reclassify.
  - Refactor for trust.
  - Split into lower-level test.
  - Replace with a better journey test.
  - Delete after replacement.
  - Add missing journey.
- [ ] Identify the first three implementation slices:
  - Slice 1: smoke suite definition and tagging.
  - Slice 2: deterministic data setup and cleanup pattern.
  - Slice 3: highest-priority missing or low-trust journeys.
- [ ] For each slice, include exact files likely to be touched after inspecting `packages/testing/playwright/`.
- [ ] Include validation commands from `packages/testing/playwright/README.md` and `packages/testing/playwright/AGENTS.md`.

**Acceptance Criteria:**
- The next engineer can start implementing one slice without rereading all planning artifacts.
- No destructive cleanup or test deletion is proposed without a replacement or explicit rationale.

## Task 7: Review The Planning Artifacts

**Files:**
- Read all new planning files under `packages/testing/e2e-*.md`
- Create `packages/testing/e2e-planning-artifact-review.md`

- [ ] Check that no file before Task 5 references existing E2E tests as evidence.
- [ ] Check that every P0/P1 journey has source anchors.
- [ ] Check that every P0/P1 journey has a success signal.
- [ ] Check that coverage recommendations do not overuse browser E2E for lower-level behavior.
- [ ] Check that AI and external-integration journeys have deterministic boundaries.
- [ ] Check that enterprise-only journeys are labeled as such.
- [ ] Check that public API journeys are separated from editor UI journeys.

**Acceptance Criteria:**
- The artifacts can be handed to a test engineer without prior chat context.
- The sequence from feature inventory to journey map to prioritization to coverage matrix is clear.

## Suggested Commit Boundaries

- Commit 1: Add source-backed journey map.
- Commit 2: Add journey prioritization.
- Commit 3: Add target suite trust criteria.
- Commit 4: Add coverage matrix after inspecting current Playwright tests.
- Commit 5: Add migration path and first implementation slices.

Each commit message must include:

```text
Co-authored-by: Codex <noreply@openai.com>
```

## Final Handoff Checklist

- [ ] `packages/testing/product-feature-inventory.md` is present.
- [ ] `packages/testing/e2e-journey-map.md` is present.
- [ ] `packages/testing/e2e-journey-prioritization.md` is present.
- [ ] `packages/testing/e2e-target-suite-plan.md` is present.
- [ ] `packages/testing/e2e-coverage-matrix.md` is present after existing E2E comparison.
- [ ] `packages/testing/e2e-trust-implementation-backlog.md` is present after Task 6.
- [ ] `packages/testing/e2e-planning-artifact-review.md` is present after Task 7.
- [ ] Every planning file states whether existing E2E tests were inspected.
- [ ] The next implementation slice is identified and small enough to complete independently.
