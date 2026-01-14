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

## Multi-User Testing

For tests requiring multiple users with isolated browser sessions:

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

## Anti-Patterns

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

## Reference Files

| Purpose | File |
|---------|------|
| Multi-user testing | `tests/e2e/building-blocks/user-service.spec.ts` |
| Entry points | `composables/TestEntryComposer.ts` |
| Page object example | `pages/CanvasPage.ts` |
| Composable example | `composables/WorkflowComposer.ts` |
| API helpers | `services/api-helper.ts` |
| Capabilities | `fixtures/capabilities.ts` |
