# Playwright E2E Test Guide

## Quick Start
```bash
pnpm test:all                 									# Run all tests (fresh containers, pnpm build:local from root first to ensure local containers)
pnpm test:local           											# Starts a local server and runs the UI tests
N8N_BASE_URL=localhost:5068 pnpm test:local			# Runs the UI tests against the instance running
```

## Test Commands
```bash
# By Mode
pnpm test:container:standard    # Sqlite
pnpm test:container:postgres    # PostgreSQL
pnpm test:container:queue       # Queue mode
pnpm test:container:multi-main  # HA setup

pnpm test:performance						# Runs the performance tests against Sqlite container
pnpm test:chaos									# Runs the chaos tests


# Development
pnpm test:all --grep "workflow"           # Pattern match, can run across all test types UI/cli-workflow/performance
```

## Test Tags
```typescript
test('basic test', ...)                              // All modes, fully parallel
test('postgres only @mode:postgres', ...)            // Mode-specific
test('needs clean db @db:reset', ...)                // Sequential per worker
test('chaos test @mode:multi-main @chaostest', ...) // Isolated per worker
```

## Tips
- `test:*` commands use fresh containers (for testing)
- VS Code: Set `N8N_BASE_URL` in Playwright settings to run tests directly from VS Code
- Pass custom env vars via `N8N_TEST_ENV='{"KEY":"value"}'`

## Project Layout
- **composables**: Multi-page interactions (e.g., `WorkflowComposer.executeWorkflowAndWaitForNotification()`)
- **config**: Test setup and configuration (constants, test users, etc.)
- **fixtures**: Custom test fixtures extending Playwright's base test
- **pages**: Page Object Models for UI interactions
- **services**: API helpers for E2E controller, REST calls, etc.
- **utils**: Utility functions (string manipulation, helpers, etc.)
- **workflows**: Test workflow JSON files for import/reuse

## Writing Tests
For guidelines on writing new tests, see [CONTRIBUTING.md](./CONTRIBUTING.md).
