# AGENTS.md

## Commands

- Use `pnpm --filter=n8n-playwright test:local <test-file>` to execute tests.

## Code Styles

- In writing locators, use specialized methods when available.
  For example, prefer `page.getByRole('button')` over `page.locator('[role=button]')`.
