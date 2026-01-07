# AGENTS.md

## Commands

- Use `pnpm --filter=n8n-playwright test:local <file-path>` to execute tests.
  For example: `pnpm --filter=n8n-playwright test:local tests/e2e/credentials/crud.spec.ts`

## Code Styles

- In writing locators, use specialized methods when available.
  For example, prefer `page.getByRole('button')` over `page.locator('[role=button]')`.
