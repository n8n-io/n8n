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
| `@db:reset` tag | Deprecated - CI issues | `test.use()` with unique capability |
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
test.use({ capability: { env: { _ISOLATION: 'my-isolated-tests' } } });

test('test with clean state', async ({ n8n }) => {
  // Fresh container with reset database
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
