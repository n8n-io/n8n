# n8n Test Containers

A composable container stack for n8n testing. Describe what you need, it builds the environment.

## Quick Start

```bash
# Basic n8n (SQLite)
pnpm stack

# With PostgreSQL
pnpm stack --postgres

# Queue mode (Redis + PostgreSQL + worker)
pnpm stack --queue

# Multi-main cluster
pnpm stack --mains 2 --workers 1

# Cloud plan simulation
pnpm stack --plan starter
```

When started, you'll see the URL: `http://localhost:[port]`

## Using in Playwright Tests

### Basic Test

```typescript
import { test, expect } from '../fixtures/base';

test('my test', async ({ n8n }) => {
  await n8n.page.goto('/workflow/new');
  // ...
});
```

### Enabling Services

Use `test.use()` to request services:

```typescript
// Single service
test.use({
  capability: {
    services: ['mailpit'],
  },
});

// Multiple services
test.use({
  capability: {
    services: ['mailpit', 'keycloak', 'victoriaLogs', 'victoriaMetrics', 'vector'],
  },
});

// Queue mode with services
test.use({
  capability: {
    mains: 2,
    workers: 1,
    services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
  },
});
```

### Using Service Helpers

Services provide type-safe helpers via `n8nContainer.services.*`:

```typescript
test('email test', async ({ n8nContainer }) => {
  // Wait for email
  const email = await n8nContainer.services.mailpit.waitForMessage({
    to: 'test@example.com',
  });
  expect(email.subject).toBe('Welcome');
});

test('source control', async ({ n8nContainer }) => {
  // Create git repo
  const repo = await n8nContainer.services.gitea.createRepo('my-repo');
  await repo.createBranch('develop');
});

test('metrics', async ({ n8nContainer }) => {
  // Query Prometheus metrics
  const result = await n8nContainer.services.observability.metrics.query('up');
  expect(result[0].value).toBe(1);
});
```

### Capability Shortcuts

Common combinations have shortcuts in `fixtures/capabilities.ts`:

```typescript
// Instead of: { services: ['mailpit'] }
test.use({ capability: 'email' });

// Instead of: { services: ['keycloak'] }
test.use({ capability: 'oidc' });

// Instead of: { services: ['gitea'] }
test.use({ capability: 'source-control' });
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Test Code                             │
│   n8nContainer.services.gitea.createRepo('my-repo')         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         N8NStack                             │
│   services: ServiceHelpers  ← Proxy with lazy instantiation │
│   baseUrl, stop(), findContainers()                         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │ GiteaHelper │ │MailpitHelper│ │ Observability│
      └─────────────┘ └─────────────┘ └─────────────┘
              │               │               │
              ▼               ▼               ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │  Container  │ │  Container  │ │  Container  │
      └─────────────┘ └─────────────┘ └─────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Service** | Container definition with `start()`, optional `env()`, optional helper |
| **Registry** | Central manifest of all services (`services/registry.ts`) |
| **Stack** | Orchestrator that builds the environment from config |
| **Helper** | Type-safe API for interacting with a service in tests |

### Service Activation

Services activate in two ways:

| Mode | When | Example |
|------|------|---------|
| **Auto-start** | Service has `shouldStart()` returning true | Redis auto-starts in queue mode |
| **User-enabled** | Listed in `services: []` array | `services: ['mailpit']` |

## Adding a New Service

### Do I Need a Helper?

Helpers let tests interact with a service **outside of the n8n UI**. Ask yourself:

> "Will tests need to arrange or assert data in this service directly?"

| Scenario | Helper Needed? | Example |
|----------|---------------|---------|
| **Test arrangement** - Set up data before test | Yes | Create a git repo before testing source control sync |
| **Test assertion** - Verify side effects | Yes | Check an email was sent after workflow execution |
| **Infrastructure only** - n8n connects, tests don't | No | PostgreSQL, Redis - n8n uses them, tests don't touch them |
| **Observability** - Query metrics/logs | Yes | Assert memory usage, check for error logs |

**Examples:**

```typescript
// Mailpit helper - ARRANGE: no emails exist, ASSERT: email was sent
const emails = await n8nContainer.services.mailpit.getMessages();
expect(emails).toHaveLength(1);

// Gitea helper - ARRANGE: create repo before test
const repo = await n8nContainer.services.gitea.createRepo('test-repo');
// Now test source control connection via UI

// Observability helper - ASSERT: check metrics after load test
const memory = await n8nContainer.services.observability.metrics.query('process_resident_memory_bytes');
expect(memory[0].value).toBeLessThan(500_000_000);

// Redis/Postgres - no helper needed, n8n connects automatically
// Tests don't need to interact with these directly
```

**Rule of thumb:** If you'd otherwise need `docker exec` or raw HTTP calls in your test, you need a helper.

### Minimal Service (No Helper)

**1. Create `services/my-service.ts`:**

```typescript
import { GenericContainer, Wait } from 'testcontainers';
import type { Service, ServiceResult } from './types';

const HOSTNAME = 'myservice';
const PORT = 8080;

export interface MyServiceMeta {
  host: string;
  port: number;
}

export type MyServiceResult = ServiceResult<MyServiceMeta>;

export const myService: Service<MyServiceResult> = {
  description: 'My service description',

  async start(network, projectName) {
    const container = await new GenericContainer('myimage:latest')
      .withNetwork(network)
      .withNetworkAliases(HOSTNAME)
      .withExposedPorts(PORT)
      .withWaitStrategy(Wait.forListeningPorts())
      .withLabels({
        'com.docker.compose.project': projectName,
        'com.docker.compose.service': HOSTNAME,
      })
      .withName(`${projectName}-${HOSTNAME}`)
      .withReuse()
      .start();

    return {
      container,
      meta: { host: HOSTNAME, port: PORT },
    };
  },

  // Optional: env vars for n8n
  env(result) {
    return {
      MY_SERVICE_HOST: result.meta.host,
      MY_SERVICE_PORT: String(result.meta.port),
    };
  },
};
```

**2. Register in `services/types.ts` and `services/registry.ts`:**

```typescript
// types.ts - add to SERVICE_NAMES array
export const SERVICE_NAMES = [
  // ...existing
  'myService',
] as const;

// registry.ts - add to services object
import { myService } from './my-service';

export const services: Record<ServiceName, Service<ServiceResult>> = {
  // ...existing
  myService,
};
```

**Done.** Use with `services: ['myService']` in tests.

> **Note:** The `ServiceName` type is derived from `SERVICE_NAMES`, and `Record<ServiceName, ...>` ensures the registry includes all services. TypeScript will error if they're out of sync.

### Service With Helper

Add a helper class and factory to the service file:

```typescript
// ... service definition from above ...

// Helper class
export class MyServiceHelper {
  constructor(
    private readonly container: StartedTestContainer,
    private readonly meta: MyServiceMeta,
  ) {}

  async doSomething(): Promise<string> {
    // Interact with the service
    const response = await fetch(`http://${this.container.getHost()}:${this.container.getMappedPort(PORT)}/api`);
    return response.text();
  }
}

// Factory function
export function createMyServiceHelper(ctx: HelperContext): MyServiceHelper {
  const result = ctx.serviceResults.myService;
  if (!result) {
    throw new Error('MyService not running. Add services: ["myService"] to test.use()');
  }
  return new MyServiceHelper(result.container, result.meta as MyServiceMeta);
}

// Type registration (enables autocomplete)
declare module './types' {
  interface ServiceHelpers {
    myService: MyServiceHelper;
  }
}
```

**Register in `services/types.ts` and `services/registry.ts`:**

```typescript
// types.ts - add to SERVICE_NAMES array
export const SERVICE_NAMES = [
  // ...existing
  'myService',
] as const;

// registry.ts - add service and helper factory
import { myService, createMyServiceHelper } from './my-service';

export const services = { ...existing, myService };
export const helperFactories = { ...existing, myService: createMyServiceHelper };
```

**Use in tests:**

```typescript
test('my test', async ({ n8nContainer }) => {
  const result = await n8nContainer.services.myService.doSomething();
});
```

### Optional: Add Capability Shortcut

In `fixtures/capabilities.ts`:

```typescript
export const CAPABILITIES = {
  // ...existing
  'my-capability': { services: ['myService'] },
};
```

Now usable as `test.use({ capability: 'my-capability' })`.

## Available Services

| Service | Helper | Description |
|---------|--------|-------------|
| `postgres` | - | PostgreSQL database |
| `redis` | - | Redis for queue mode |
| `mailpit` | ✓ | Email testing (SMTP + UI) |
| `gitea` | ✓ | Git server for source control |
| `keycloak` | ✓ | OIDC/SSO provider |
| `victoriaLogs` | - | VictoriaLogs for log storage |
| `victoriaMetrics` | - | VictoriaMetrics for metrics |
| `vector` | - | Vector log collector (depends on victoriaLogs) |
| `tracing` | ✓ | Jaeger for distributed tracing |
| `proxy` | - | HTTP proxy (MockServer) |
| `taskRunner` | - | External task runner |
| `loadBalancer` | - | Caddy for multi-main |

**Note:** For observability (logs + metrics), enable all three: `['victoriaLogs', 'victoriaMetrics', 'vector']`.
The `observability` capability shortcut handles this automatically: `test.use({ capability: 'observability' })`.

## CLI Options

| Option | Description |
|--------|-------------|
| `--postgres` | Use PostgreSQL instead of SQLite |
| `--queue` | Enable queue mode (adds Redis + PostgreSQL) |
| `--mains <n>` | Number of main instances |
| `--workers <n>` | Number of worker instances |
| `--plan <name>` | Cloud plan preset (trial, starter, pro-1, pro-2, enterprise) |
| `--name <name>` | Custom project name for parallel runs |
| `--env KEY=VALUE` | Set environment variables |
| `--observability` | Enable metrics/logs stack |
| `--oidc` | Enable Keycloak |
| `--source-control` | Enable Gitea |

## Cleanup

```bash
# Remove all containers and networks
pnpm stack:clean:all
```

## Tips

- **Container Reuse**: Set `TESTCONTAINERS_REUSE_ENABLE=true` for faster restarts
- **Parallel Testing**: Use `--name` to run multiple stacks without conflicts
- **Custom Image**: Set `N8N_DOCKER_IMAGE=n8nio/n8n:dev` to use a different image
- **Multi-Main**: Requires queue mode and license key in `N8N_LICENSE_ACTIVATION_KEY`
