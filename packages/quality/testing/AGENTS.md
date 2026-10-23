# Testing instructions

Read the parent [quality instructions](../AGENTS.md) before you change test tooling.

- Keep test selection in `test-impact/`. Keep Playwright-specific checks in `janitor/`.
- Keep the E2E harness, fixtures, and test journeys in Playwright.
- Update CI path filters when you move a test or harness file.
- Run tests, lint, and typecheck for each changed workspace.
