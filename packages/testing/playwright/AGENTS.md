# AGENTS.md

## Commands

```bash
# Run tests locally
pnpm --filter=n8n-playwright test:local <file-path>
pnpm --filter=n8n-playwright test:local tests/e2e/credentials/crud.spec.ts

# Run with container capabilities (requires pnpm build:docker first)
pnpm --filter=n8n-playwright test:container:sqlite --grep @capability:email

# Lint and typecheck
pnpm --filter=n8n-playwright lint
pnpm --filter=n8n-playwright typecheck
```

Always trim output: `--reporter=list 2>&1 | tail -50`

## Test Maintenance (Janitor)

Static analysis for Playwright test architecture. Catches problems before they spread.

> **CRITICAL: Always use TCR for code changes.**
> When janitor identifies violations and you fix them, use `pnpm janitor tcr --execute` to safely commit. Never manually commit janitor-related fixes - TCR ensures tests pass before the commit lands.

### Golden Rules

1. **Analysis only?** Run `pnpm janitor` (no TCR needed)
2. **Making code changes?** Use TCR: `pnpm janitor tcr --execute -m="chore: ..."`
3. **Never** manually `git commit` janitor-related fixes - always go through TCR
4. **Never** modify `.janitor-baseline.json` via TCR - baseline updates must be done manually

### When to Use

| User Says | Intent | Approach |
|-----------|--------|----------|
| "Clean up the test codebase" | Incremental cleanup | Create baseline first, then use `--max-diff-lines=500` for small PRs. |
| "Start tracking violations" | Enable incremental cleanup | Run `janitor baseline` to snapshot current state, commit `.janitor-baseline.json`. |
| "Add a test for X" | New test following patterns | After writing, run janitor to verify architecture compliance. |
| "Fix architecture drift" | Enforce layered architecture | Run `selector-purity` and `no-page-in-flow` rules. |
| "Find dead code" | Remove unused methods | Run `dead-code` rule with `--fix --write` for auto-removal. |
| "Find copy-paste code" | Detect duplicates | Run `duplicate-logic` rule to find structural duplicates. |
| "This file is messy" | Targeted cleanup | Analyze specific file, fix issues, TCR to safely commit. |
| "Refactor this page object" | Safe refactoring | Use TCR - changes commit if tests pass, revert if they fail. |
| "What tests would break?" | Impact analysis | Run `impact` command before changing shared code. |
| "Prepare for PR" | Pre-commit check | Run janitor on changed files to catch violations early. |

### Architecture Rules

The janitor enforces a layered architecture:

```
Tests → Flows/Composables → Page Objects → Components → Playwright API
```

| Rule | What It Catches |
|------|-----------------|
| `selector-purity` | Raw locators in tests/flows: `page.getByTestId()`, `someLocator.locator()` |
| `no-page-in-flow` | Flows accessing `page` directly (should use page objects) |
| `boundary-protection` | Pages importing other pages (creates coupling) |
| `scope-lockdown` | Unscoped locators that escape their container |
| `dead-code` | Unused public methods in page objects |
| `deduplication` | Same selector defined in multiple files |
| `duplicate-logic` | Copy-pasted code across tests/pages (AST fingerprinting) |

### Commands

```bash
# Analyze entire codebase
pnpm janitor

# Analyze specific file
pnpm janitor --file=pages/CanvasPage.ts --verbose

# Run specific rule
pnpm janitor --rule=dead-code

# Auto-fix (dead-code only)
pnpm janitor:fix --rule=dead-code

# List all rules (short)
pnpm janitor --list

# Show detailed rule info (for AI agents)
pnpm janitor rules --json

# JSON output
pnpm janitor --json
```

### Baseline (Incremental Cleanup)

For codebases with existing violations, create a baseline to enable incremental cleanup:

```bash
# Create baseline - snapshots current violations
pnpm janitor baseline

# Commit the baseline
git add .janitor-baseline.json && git commit -m "chore: add janitor baseline"
```

Once baseline exists, janitor and TCR **only fail on NEW violations**. Pre-existing violations are tracked but don't block work.

> **Safeguard:** TCR blocks commits that modify `.janitor-baseline.json`. This prevents accidentally "fixing" violations by updating the baseline instead of the actual code. Baseline updates must be done manually after fixing violations.

```bash
# Update baseline after fixing violations (manual commit required)
pnpm janitor baseline
git add .janitor-baseline.json && git commit -m "chore: update baseline after cleanup"
```

### Incremental Cleanup Strategy

For large cleanups, keep diffs small and reviewable:

```bash
# Show ALL violations (ignoring baseline) for cleanup work
pnpm janitor --ignore-baseline --json

# Find easiest files to fix (lowest violation count)
pnpm janitor --ignore-baseline --json 2>/dev/null | jq '.fileReports | sort_by(.violationCount) | .[:5]'

# TCR with max diff size (skip if changes are too large)
pnpm janitor tcr --max-diff-lines=500 --execute -m="chore: cleanup"
```

**AI Cleanup Workflow:**
1. Use `--ignore-baseline` to see all violations (not just new ones)
2. Pick small fixes from the list
3. Fix violations, then TCR to safely commit
4. After fixing, run `pnpm janitor baseline` to update the baseline

### TCR Workflow (Test && Commit || Revert)

Safe refactoring loop: make changes, run affected tests, auto-commit or auto-revert.

```bash
# Dry run - see what would happen
pnpm janitor tcr --verbose

# Execute - actually commit/revert
pnpm janitor tcr --execute -m="chore: remove dead code"

# With guardrails - skip if diff too large
pnpm janitor tcr --execute --max-diff-lines=500 -m="chore: cleanup"
```

### After Writing New Tests

Always run janitor after adding or modifying tests to catch architecture violations early:

```bash
pnpm janitor --file=tests/my-new-test.spec.ts --verbose
```

See `packages/testing/janitor/README.md` for full documentation.

## Entry Points

All tests should start with `n8n.start.*` methods. See `composables/TestEntryComposer.ts`.

| Method | Use Case |
|--------|----------|
| `fromHome()` | Start from home page |
| `fromBlankCanvas()` | New workflow from scratch |
| `fromNewProjectBlankCanvas()` | Project-scoped workflow (returns projectId) |
| `fromNewProject()` | Project-scoped test, no canvas (returns projectId) |
| `fromImportedWorkflow(file)` | Test pre-built workflow JSON |
| `withUser(user)` | Isolated browser context per user |
| `withProjectFeatures()` | Enable sharing/folders/permissions |

## Test Isolation

Tests run in parallel. Design tests to be fully isolated so they don't interfere with each other.

### Unique Identifiers

Use `nanoid` for unique test data:

```typescript
const credentialName = `Test Credential ${nanoid()}`;
const workflow = await api.workflows.createWorkflow({
  name: `Test Workflow ${nanoid()}`,
});
```

### Dynamic User Creation

Create users dynamically via the public API:

```typescript
const member = await api.publicApi.createUser({
  email: `member-${nanoid()}@test.com`,
  firstName: 'Test',
  lastName: 'Member',
});
```

### Isolated Browser Contexts

For UI tests requiring multiple users, create isolated browser contexts:

```typescript
// 1. Create users via public API
const member1 = await api.publicApi.createUser({ role: 'global:member' });
const member2 = await api.publicApi.createUser({ role: 'global:member' });

// 2. Get isolated browser contexts
const member1Page = await n8n.start.withUser(member1);
const member2Page = await n8n.start.withUser(member2);

// 3. Each operates independently (no session bleeding)
await member1Page.navigate.toWorkflows();
await member2Page.navigate.toCredentials();
```

**Reference:** `tests/e2e/building-blocks/user-service.spec.ts`

| Pattern | Why | Use Instead |
|---------|-----|-------------|
| `test.describe.serial` | Creates test dependencies | Parallel tests with isolated setup |
| Fresh DB per file | Tests need isolated container | `test.use({ capability: { env: { TEST_ISOLATION: 'name' } } })` |
| Fresh DB per test | Tests modify shared state | `@db:reset` tag on describe (container-only, combined with `test.use()`) |
| `n8n.api.signin()` | Session bleeding | `n8n.start.withUser()` |
| `Date.now()` for IDs | Race conditions | `nanoid()` |
| `waitForTimeout()` | Flaky | `waitForResponse()`, `toBeVisible()` |
| `.toHaveCount(N)` | Brittle | Named element assertions |
| Raw `page.goto()` | Bypasses setup | `n8n.navigate.*` methods |

## Code Style

- Use specialized locators: `page.getByRole('button')` over `page.locator('[role=button]')`
- Use `nanoid()` for unique identifiers (parallel-safe)
- API setup over UI setup when possible (faster, more reliable)

## Architecture

```
Tests (*.spec.ts)
    ↓ uses
Composables (*Composer.ts) - Multi-step business workflows
    ↓ orchestrates
Page Objects (*Page.ts) - UI interactions
    ↓ extends
BasePage - Common utilities
```

See `CONTRIBUTING.md` for detailed patterns and conventions.

## Debugging

See [README.md#debugging](./README.md#debugging) for detailed instructions on:
- **Keepalive mode** - Keep containers running after tests with `N8N_CONTAINERS_KEEPALIVE=true`
- **Victoria exports** - Logs/metrics automatically attached on failure, importable locally via `scripts/import-victoria-data.mjs`

## Test Migration & Refactoring

**Test Name = Contract**
- Name declares intent, assertion proves it, everything else is flow
- Bad: `should open W1 as U2` (describes action)
- Good: `should allow sharee to edit shared workflow` (declares rule)

**Coverage Parity Check**
1. Read old test name → what was the intent?
2. Find the explicit assertion that proved it
3. Verify new test has equivalent proof
4. No proof found? Document as intentional drop or gap

**Legacy Tests (unauditable names/assertions)**
- Prioritize clarity over parity - can't audit what you can't read
- Document your best interpretation of intent
- Accept short-term risk, fix regressions forward

See [Quality Corner: Test Migration Guide](https://www.notion.so/n8n/Best-Practices-Test-Migration-Refactoring) for full rationale and examples.

## Reference Files

| Purpose | File |
|---------|------|
| Multi-user testing | `tests/e2e/building-blocks/user-service.spec.ts` |
| Entry points | `composables/TestEntryComposer.ts` |
| Page object example | `pages/CanvasPage.ts` |
| Composable example | `composables/WorkflowComposer.ts` |
| API helpers | `services/api-helper.ts` |
| Capabilities | `fixtures/capabilities.ts` |

```typescript
const member = await api.publicApi.createUser({...});
const memberN8n = await n8n.start.withUser(member);

await memberN8n.navigate.toWorkflows();
await expect(memberN8n.workflows.cards.getWorkflow(workflowName)).toBeVisible();
```
### Isolated API Contexts

For API-only operations as another user, create isolated API contexts (no browser needed):

```typescript
const member = await api.publicApi.createUser({...});
const memberApi = await api.createApiForUser(member);

const memberProject = await memberApi.projects.getMyPersonalProject();
await memberApi.credentials.createCredential({...});
```

### Identity-Based Assertions

Assert by identity (name) rather than count for parallel-safe tests:

```typescript
await expect(credentialDropdown.getByText(testCredName)).toBeVisible();
await expect(credentialDropdown.getByText(devCredName)).toBeHidden();
```

## Worker Isolation (Fresh Database)

Use `test.use()` at file top-level with unique capability config:

```typescript
// my-isolated-tests.spec.ts
import { test, expect } from '../fixtures/base';

// Must be top-level, not inside describe block
test.use({ capability: { env: { TEST_ISOLATION: 'my-isolated-tests' } } });

test('test with clean state', async ({ n8n }) => {
  // Fresh container with reset database
});
```

For per-test database reset (when tests modify shared state like MFA), add `@db:reset` to the describe. **Note:** `@db:reset` is container-only - these tests won't run locally.

```typescript
test.use({ capability: { env: { TEST_ISOLATION: 'my-stateful-tests' } } });

test.describe('My stateful tests @db:reset', () => {
  // Each test gets a fresh database reset (container-only)
});
```

## Data Setup

Use API helpers for fast, reliable test data setup. Reserve UI interactions for testing UI behavior:

```typescript
// API for data setup
const credential = await api.credentials.createCredential({
  name: `Test Credential ${nanoid()}`,
  type: 'notionApi',
  data: { apiKey: 'test' },
});

const workflow = await api.workflows.createWorkflow({
  name: `Test Workflow ${nanoid()}`,
  nodes: [...],
});

// UI for verification
await n8n.navigate.toCredentials();
await expect(n8n.credentials.cards.getCredential(credential.name)).toBeVisible();
```

## Feature Enablement

The `n8n` fixture automatically enables project features. For API-only tests (no `n8n` fixture), enable features explicitly:

```typescript
test('API-only test', async ({ api }) => {
  await api.enableProjectFeatures();
  // ...
});
```

### Feature Flag Overrides

To test features behind feature flags (experiments), use `TestRequirements` with storage overrides:

```typescript
import type { TestRequirements } from '../config/TestRequirements';

const requirements: TestRequirements = {
  storage: {
    N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ 'your_experiment': true }),
  },
};

test.use({ requirements });

test('test with feature flag enabled', async ({ n8n }) => {
  // Feature flag is now active for this test
});
```

**Common patterns:**

```typescript
// Single experiment
{ storage: { N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '025_new_canvas': true }) } }

// Multiple experiments
{ storage: { N8N_EXPERIMENT_OVERRIDES: JSON.stringify({
  '025_new_canvas': true,
  '026_another_feature': 'variant_a'
}) } }

// Combined with other requirements
const requirements: TestRequirements = {
  storage: {
    N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ 'your_experiment': true }),
  },
  capability: {
    env: { TEST_ISOLATION: 'my-test-suite' },
  },
};
```

**Reference:** `config/TestRequirements.ts` for full interface definition.

## Code Style

- Use specialized locators: `page.getByRole('button')` over `page.locator('[role=button]')`
- Use `nanoid()` for unique identifiers (parallel-safe)
- API setup over UI setup when possible (faster, more reliable)

## Architecture

```
Tests (*.spec.ts)
    ↓ uses
Composables (*Composer.ts) - Multi-step business workflows
    ↓ orchestrates
Page Objects (*Page.ts) - UI interactions
    ↓ extends
BasePage - Common utilities
```

See `CONTRIBUTING.md` for detailed patterns and conventions.

## Reference Files

| Purpose | File |
|---------|------|
| Multi-user testing | `tests/e2e/building-blocks/user-service.spec.ts` |
| Entry points | `composables/TestEntryComposer.ts` |
| Page object example | `pages/CanvasPage.ts` |
| Composable example | `composables/WorkflowComposer.ts` |
| API helpers | `services/api-helper.ts` |
| Capabilities | `fixtures/capabilities.ts` |

## Shard Rebalancing

When refactoring, adding, or moving significant numbers of tests, consider rebalancing test shards to maintain even CI distribution. See `docs/ORCHESTRATION.md` for details.
