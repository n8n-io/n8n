# CLAUDE.md

## Commands

- Use `pnpm test:local --reporter=line --grep="..."` to execute tests.


## Code Styles

- In writing locators, use specialized methods when available.
  For example, prefer `page.getByRole('button')` over `page.locator('[role=button]')`.