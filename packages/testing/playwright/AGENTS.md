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

## Debugging with Keepalive

Use `N8N_CONTAINERS_KEEPALIVE=true` to keep containers running after tests complete. This is useful for:
- Debugging test failures by inspecting the n8n instance state
- Exploring configured integrations (source control, email, OIDC, etc.)
- Manual testing against a pre-configured environment

```bash
N8N_CONTAINERS_KEEPALIVE=true pnpm --filter=n8n-playwright test:container:sqlite --grep "@capability:email" --workers 1
```

After tests complete, containers remain running and connection details are printed:
```
=== KEEPALIVE: Containers left running for debugging ===
    URL: http://localhost:54321
    Project: n8n-stack-abc123
    Cleanup: pnpm --filter n8n-containers stack:clean:all
=========================================================
```

Clean up when done: `pnpm --filter n8n-containers stack:clean:all`
