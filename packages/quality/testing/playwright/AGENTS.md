# Playwright instructions

Read the [quality](../../AGENTS.md) and [testing](../AGENTS.md) instructions first. Use the [suite map](README.md#choose-a-suite) to choose a project.

## Place tests by runner

- Keep product UI and API journeys in `tests/e2e/`.
- Keep database, queue, multi-main, encryption, and process lifecycle tests in `tests/infrastructure/`.
- Keep Playwright-backed memory and canvas checks in `tests/performance/`. Keep infrastructure load specs in `tests/infrastructure/benchmarks/`.
- Keep local-only container benchmarks in `tests/infrastructure/benchmarks-local/`.
- Keep fixture and harness contract tests in `tests/framework/`. Run browser-free tests with Vitest. Run browser-backed contracts with `test:harness`.
- Use Playwright when tests need its browser, worker lifecycle, project matrix, fixtures, or managed containers. Use Vitest for browser-free tests that need none of these.

## Write isolated tests

- Start UI journeys with `n8n.start.*`. Keep selectors in page objects.
- Create test data through API helpers. Use `nanoid()` for unique names. Assert by identity rather than count.
- Give each test independent state. Use `n8n.start.withUser()` for another browser user and `api.createApiForUser()` for another API user.
- Configure `test.use()` at file scope. Use `TEST_ISOLATION` for a fresh worker database. Use `@db:reset` only in container projects.
- Set `N8N_USER_FOLDER` to a test-owned directory before importing n8n settings. Remove only paths the test created.

See [test-writing patterns](docs/TESTING_PATTERNS.md) for examples and [accessibility checks](docs/ACCESSIBILITY.md) for axe and landmark tests.

## Check changes

Run focused checks from this package:

```bash
pnpm test:unit
pnpm lint
pnpm typecheck
pnpm janitor
```

Run the changed Playwright spec with its project. Build the n8n image first when a container test must include product-code changes. See the [suite map](README.md#choose-a-suite) for commands.

The [Janitor guide](../janitor/README.md) explains its rules and baseline. When you commit a Janitor-related fix, use `pnpm janitor tcr --execute`. Do not manually commit those fixes. Update `.janitor-baseline.json` separately after fixing violations.

See the [orchestration guide](docs/ORCHESTRATION.md) when a change affects test distribution or shards.
