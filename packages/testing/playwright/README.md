# Playwright E2E Test Guide

## Development setup
```bash
pnpm install-browsers:local # in playwright directory
pnpm build:docker # from root first to test against local changes
```

## Quick Start
```bash
pnpm test:all                 									# Run all tests (fresh containers, pnpm build:docker from root first to ensure local containers)
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
pnpm test:local --ui            # To enable UI debugging and test running mode
```

## Test Tags
```typescript
test('basic test', ...)                              // All modes, fully parallel
test('postgres only @mode:postgres', ...)            // Mode-specific
test('needs clean db @db:reset', ...)                // Sequential per worker
test('chaos test @mode:multi-main @chaostest', ...) // Isolated per worker
test('cloud resource test @cloud:trial', ...)       // Cloud resource constraints
test('proxy test @capability:proxy', ...)           // Requires proxy server capability
```

## Fixture Selection
- **`base.ts`**: Standard testing with worker-scoped containers (default choice)
- **`cloud-only.ts`**: Cloud resource testing with guaranteed isolation
  - Use for performance testing under resource constraints
  - Requires `@cloud:*` tags (`@cloud:trial`, `@cloud:enterprise`, etc.)
  - Creates only cloud containers, no worker containers

```typescript
// Standard testing
import { test, expect } from '../fixtures/base';

// Cloud resource testing
import { test, expect } from '../fixtures/cloud-only';
test('Performance under constraints @cloud:trial', async ({ n8n, api }) => {
  // Test runs with 384MB RAM, 250 millicore CPU
});
```

## Tips
- `test:*` commands use fresh containers (for testing)
- VS Code: Set `N8N_BASE_URL` in Playwright settings to run tests directly from VS Code
- Pass custom env vars via `N8N_TEST_ENV='{"KEY":"value"}'`

## Project Layout
- **composables**: Multi-page interactions (e.g., `WorkflowComposer.executeWorkflowAndWaitForNotification()`)
- **config**: Test setup and configuration (constants, test users, etc.)
- **fixtures**: Custom test fixtures extending Playwright's base test
  - `base.ts`: Standard fixtures with worker-scoped containers
  - `cloud-only.ts`: Cloud resource testing with test-scoped containers only
- **pages**: Page Object Models for UI interactions
- **services**: API helpers for E2E controller, REST calls, workflow management, etc.
- **utils**: Utility functions (string manipulation, helpers, etc.)
- **workflows**: Test workflow JSON files for import/reuse

## Writing Tests with Proxy

You can use ProxyServer to mock API requests.

```typescript
import { test, expect } from '../fixtures/base';

// The `@capability:proxy` tag ensures tests only run when proxy infrastructure is available.
test.describe('Proxy tests @capability:proxy', () => {
  test('should mock HTTP requests', async ({ proxyServer, n8n }) => {
    // Create mock expectations
    await proxyServer.createGetExpectation('/api/data', { result: 'mocked' });

    // Execute workflow that makes HTTP requests
    await n8n.canvas.openNewWorkflow();
    // ... test implementation

    // Verify requests were proxied
    expect(await proxyServer.wasGetRequestMade('/api/data')).toBe(true);
  });
});
```

### Recording and replaying requests

The ProxyServer service supports recording HTTP requests for test mocking and replay. All proxied requests are automatically recorded by the mock server as described in the [Mock Server documentation](https://www.mock-server.com/proxy/record_and_replay.html).

#### Recording Expectations

```typescript
// Record all requests (the request is simplified/cleansed to method/path/body/query)
await proxyServer.recordExpectations('test-folder');

// Record with filtering and options
await proxyServer.recordExpectations('test-folder', {
  host: 'googleapis.com',           // Filter by host (partial match)
  dedupe: true,                     // Remove duplicate requests
  raw: false                        // Save cleaned requests (default)
});

// Record raw requests with all headers and metadata
await proxyServer.recordExpectations('test-folder', {
  raw: true                         // Save complete original requests
});

// Record requests matching specific criteria
await proxyServer.recordExpectations('test-folder', {
  pathOrRequestDefinition: {
    method: 'POST',
    path: '/api/workflows'
  }
});
```

#### Loading and Using Recorded Expectations

Recorded expectations are saved as JSON files in the `expectations/` directory. To use them in tests, you must explicitly load them:

```typescript
test('should use recorded expectations', async ({ proxyServer }) => {
  // Load expectations from a specific folder
  await proxyServer.loadExpectations('test-folder');

  // Your test code here - requests will be mocked using loaded expectations
});
```

#### Important: Cleanup Expectations

**Remember to clean up expectations before or after test runs:**

```typescript
test.beforeEach(async ({ proxyServer }) => {
  // Clear any existing expectations before test
  await proxyServer.clearAllExpectations();
});

test.afterEach(async ({ proxyServer }) => {
  // Or clear expectations after test
  await proxyServer.clearAllExpectations();
});
```

This prevents expectations from one test affecting others and ensures test isolation.

## Writing Tests
For guidelines on writing new tests, see [CONTRIBUTING.md](./CONTRIBUTING.md).
