# AGENTS.md

## Commands

- Use `pnpm --filter=n8n-playwright test:local <file-path>` to execute tests.
  For example: `pnpm --filter=n8n-playwright test:local tests/e2e/credentials/crud.spec.ts`

- Use `pnpm --filter=n8n-playwright test:container:sqlite --grep pattern` to execute the tests using test containers for particular features.
  For example `pnpm --filter=n8n-playwright test:container:sqlite --grep @capability:email`
	Note: This requires the docker container to be built locally using pnpm build:docker

## Code Styles

- In writing locators, use specialized methods when available.
  For example, prefer `page.getByRole('button')` over `page.locator('[role=button]')`.

## Concurrency

Tests run in parallel. Use `nanoid` (not `Date.now()`) for unique identifiers.

## Multi-User Testing

For tests requiring multiple users with isolated browser sessions:

```typescript
// 1. Create users via public API (owner's API key created automatically)
const member1 = await api.publicApi.createUser({ role: 'global:member' });
const member2 = await api.publicApi.createUser({ role: 'global:member' });

// 2. Get isolated browser contexts for each user
const member1Page = await n8n.start.withUser(member1);
const member2Page = await n8n.start.withUser(member2);

// 3. Test interactions between users
await member1Page.navigate.toWorkflows();
await member2Page.navigate.toWorkflows();
```

This approach provides:
- Full browser isolation (separate cookies, storage, state)
- Dynamic users with unique emails (no pre-seeded dependencies)
- Parallel-safe execution (no serial mode needed)

Avoid the legacy pattern of `n8n.api.signin('member', 0)` which reuses the same browser context and risks session state bleeding.
