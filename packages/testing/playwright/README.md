# Playwright E2E Test Guide

## Quick Start
```bash
pnpm test                 # Run all tests (fresh containers)
pnpm run test:local       # Run against http://localhost:5678
```

## Test Commands
```bash
# By Mode
pnpm run test:standard    # Basic n8n
pnpm run test:postgres    # PostgreSQL
pnpm run test:queue       # Queue mode
pnpm run test:multi-main  # HA setup

# Development
pnpm test --grep "workflow"           # Pattern match
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