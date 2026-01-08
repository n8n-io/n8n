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
