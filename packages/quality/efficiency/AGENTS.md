# Efficiency instructions

Read the parent [quality instructions](../AGENTS.md) before you change a benchmark.

- Compare results with the same machine, workload, and process profile.
- Do not change benchmark methods during a path migration.
- Keep local measurements possible without an n8n Docker image rebuild. State when a benchmark needs an image.
- Put task steps and result interpretation in the owning benchmark's README.
- Keep shared Playwright reporting and fixtures in `../testing/playwright/`. Import them through the package exports.
- Keep root lint, typecheck, and unit-test scopes separate from nested workspaces.
