# Container Services Architecture Design

## Overview

This document describes the architecture for n8n test container services with a focus on:
- **Extensibility**: Adding new services should be trivial
- **Discoverability**: Test authors find helpers via autocomplete
- **Type Safety**: Full TypeScript support without manual wiring
- **Scalability**: Works for 10 or 100 services without code changes to core files

## Design Goals

1. **Single file per service**: Service definition + helpers live together
2. **Zero changes to core files** when adding a new service with helpers
3. **Full IDE autocomplete**: `n8nContainer.services.gitea.` shows all methods
4. **Explicit over magic**: No runtime reflection, decoration, or hidden behavior
5. **Graceful errors**: Clear messages when a service isn't running

---

## TypeScript Patterns Used

### 1. Declaration Merging

TypeScript allows interfaces to be extended across multiple files:

```typescript
// file1.ts
interface Registry {}

// file2.ts
declare module './file1' {
  interface Registry {
    foo: FooType;
  }
}

// file3.ts
declare module './file1' {
  interface Registry {
    bar: BarType;
  }
}

// Result: Registry = { foo: FooType; bar: BarType }
```

This lets each service file add its own helper type without modifying a central file.

### 2. Mapped Types for Factory Registration

```typescript
type HelperFactories = {
  [K in keyof ServiceHelpers]: (ctx: HelperContext) => ServiceHelpers[K];
};
```

This ensures the factory registry stays in sync with the type registry.

### 3. Proxy for Lazy Instantiation

```typescript
new Proxy({} as ServiceHelpers, {
  get(_, key) {
    return getOrCreateHelper(key);
  }
});
```

Helpers are only instantiated when accessed, and cached thereafter.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Test Code                                    │
│   await n8nContainer.services.gitea.createRepo('my-repo')           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           N8NStack                                   │
│   services: ServiceHelpers  ← Proxy with lazy instantiation         │
│   logs: VictoriaLogsHelper  ← Observability shortcut                │
│   metrics: VictoriaMetricsHelper  ← Observability shortcut          │
│   findContainers(pattern)   ← Container operations                  │
│   stopContainer(pattern)    ← Chaos testing support                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ GiteaHelper │ │ MinioHelper │ │ KeycloakH.  │
            └─────────────┘ └─────────────┘ └─────────────┘
                    │               │               │
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │  Container  │ │  Container  │ │  Container  │
            └─────────────┘ └─────────────┘ └─────────────┘
```

---

## File Structure

```
packages/testing/containers/
├── services/
│   ├── types.ts              # Core interfaces + ServiceHelpers base
│   ├── registry.ts           # Service registry + helper factory exports
│   ├── postgres.ts           # Service only (no helper needed)
│   ├── redis.ts              # Service only (no helper needed)
│   ├── gitea.ts              # Service + GiteaHelper
│   ├── mailpit.ts            # Service + MailpitHelper
│   ├── keycloak.ts           # Service + KeycloakHelper
│   ├── observability.ts      # Service + ObservabilityHelper
│   └── ...
├── helpers/
│   └── context.ts            # HelperContext creation utility
├── stack.ts                  # Stack orchestration + N8NStack interface
└── index.ts                  # Public exports
```

---

## Core Types

### `services/types.ts`

```typescript
import type { StartedTestContainer, StartedNetwork } from 'testcontainers';

/**
 * Base service interface - defines how to start a container.
 */
export interface Service<TResult extends ServiceResult = ServiceResult> {
  /** Human-readable description */
  readonly description: string;

  /** Start the container */
  start(
    network: StartedNetwork,
    projectName: string,
    config?: unknown,
  ): Promise<TResult>;

  /** Environment variables to pass to n8n (optional) */
  env?(result: TResult): Record<string, string>;

  /** Services that must start first (optional) */
  readonly dependsOn?: readonly string[];
}

/**
 * Result from starting a service.
 */
export interface ServiceResult<TMeta = unknown> {
  container: StartedTestContainer;
  meta: TMeta;
}

/**
 * Context passed to helper factories.
 * Provides access to containers and observability stack.
 */
export interface HelperContext {
  /** All started containers in the stack */
  containers: StartedTestContainer[];

  /** Find container by name pattern */
  findContainer(pattern: RegExp): StartedTestContainer | undefined;

  /** Observability stack (if victoria-logs + victoria-metrics running) */
  observability?: ObservabilityStack;

  /** Service results by name (for accessing meta) */
  serviceResults: Record<string, ServiceResult>;
}

/**
 * Observability stack shape.
 */
export interface ObservabilityStack {
  victoriaLogs: { meta: { queryEndpoint: string; internalEndpoint: string } };
  victoriaMetrics: { meta: { queryEndpoint: string; internalEndpoint: string } };
}

/**
 * Registry of service helpers - extended via declaration merging.
 *
 * Each service with helpers adds its type here:
 * ```typescript
 * declare module './types' {
 *   interface ServiceHelpers {
 *     gitea: GiteaHelper;
 *   }
 * }
 * ```
 */
export interface ServiceHelpers {
  // Extended by individual service files via declaration merging
}

/**
 * Factory function type for creating helpers.
 */
export type HelperFactory<T> = (ctx: HelperContext) => T;

/**
 * Registry of helper factories - must match ServiceHelpers keys.
 */
export type HelperFactories = {
  [K in keyof ServiceHelpers]: HelperFactory<ServiceHelpers[K]>;
};
```

---

## Service With Helper Example

### `services/gitea.ts`

```typescript
import type { StartedTestContainer, StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../images';
import type { Service, ServiceResult, HelperContext } from './types';

// ============================================================================
// Constants
// ============================================================================

const HOSTNAME = 'gitea';
const HTTP_PORT = 3000;
const SSH_PORT = 22;

export const GITEA_DEFAULT_ADMIN = 'giteaadmin';
export const GITEA_DEFAULT_PASSWORD = 'giteapassword';
export const GITEA_DEFAULT_EMAIL = 'admin@example.com';

// ============================================================================
// Service Definition
// ============================================================================

export interface GiteaMeta {
  hostname: string;
  httpPort: number;
  sshPort: number;
  adminUser: string;
  adminPassword: string;
}

export type GiteaResult = ServiceResult<GiteaMeta>;

export const gitea: Service<GiteaResult> = {
  description: 'Git server for source control testing',

  async start(network: StartedNetwork, projectName: string): Promise<GiteaResult> {
    const container = await new GenericContainer(TEST_CONTAINER_IMAGES.gitea)
      .withName(`${projectName}-gitea`)
      .withNetwork(network)
      .withNetworkAliases(HOSTNAME)
      .withExposedPorts(HTTP_PORT, SSH_PORT)
      .withEnvironment({
        GITEA__database__DB_TYPE: 'sqlite3',
        GITEA__server__DOMAIN: HOSTNAME,
        GITEA__server__ROOT_URL: `http://${HOSTNAME}:${HTTP_PORT}/`,
        GITEA__security__INSTALL_LOCK: 'true',
        GITEA__service__DISABLE_REGISTRATION: 'true',
      })
      .withWaitStrategy(Wait.forListeningPorts())
      .withLabels({
        'com.docker.compose.project': projectName,
        'com.docker.compose.service': 'gitea',
      })
      .withReuse()
      .start();

    // Create default admin user
    await execGiteaCommand(container, [
      'admin', 'user', 'create',
      '--username', GITEA_DEFAULT_ADMIN,
      '--password', GITEA_DEFAULT_PASSWORD,
      '--email', GITEA_DEFAULT_EMAIL,
      '--admin',
      '--must-change-password=false',
    ]);

    return {
      container,
      meta: {
        hostname: HOSTNAME,
        httpPort: HTTP_PORT,
        sshPort: SSH_PORT,
        adminUser: GITEA_DEFAULT_ADMIN,
        adminPassword: GITEA_DEFAULT_PASSWORD,
      },
    };
  },

  // Gitea doesn't provide env vars to n8n - no env() method needed
};

// ============================================================================
// Helper Class
// ============================================================================

/**
 * Helper for interacting with Gitea in tests.
 * Access via `n8nContainer.services.gitea` in tests.
 */
export class GiteaHelper {
  constructor(
    private readonly container: StartedTestContainer,
    private readonly meta: GiteaMeta,
  ) {}

  /** Create a new repository */
  async createRepo(name: string, options: { private?: boolean } = {}): Promise<GiteaRepo> {
    await this.apiCall('POST', '/api/v1/user/repos', {
      name,
      private: options.private ?? false,
      auto_init: true,
    });
    return new GiteaRepo(this.container, this.meta, name);
  }

  /** Create a new user */
  async createUser(
    username: string,
    password: string,
    email: string,
    options: { admin?: boolean } = {},
  ): Promise<void> {
    await execGiteaCommand(this.container, [
      'admin', 'user', 'create',
      '--username', username,
      '--password', password,
      '--email', email,
      ...(options.admin ? ['--admin'] : []),
      '--must-change-password=false',
    ]);
  }

  /** Add an SSH key for the default admin */
  async addSSHKey(title: string, publicKey: string): Promise<void> {
    await this.apiCall('POST', '/api/v1/user/keys', {
      title,
      key: publicKey,
      read_only: false,
    });
  }

  /** Get the SSH clone URL for a repo */
  getSSHUrl(repoName: string): string {
    return `ssh://git@${this.meta.hostname}/${this.meta.adminUser}/${repoName}.git`;
  }

  /** Get the HTTP clone URL for a repo */
  getHttpUrl(repoName: string): string {
    return `http://${this.meta.hostname}:${this.meta.httpPort}/${this.meta.adminUser}/${repoName}.git`;
  }

  private async apiCall(method: string, path: string, body?: unknown): Promise<void> {
    const auth = Buffer.from(
      `${this.meta.adminUser}:${this.meta.adminPassword}`
    ).toString('base64');

    await this.container.exec([
      'curl', '-X', method,
      `http://localhost:${this.meta.httpPort}${path}`,
      '-H', 'Content-Type: application/json',
      '-H', `Authorization: Basic ${auth}`,
      ...(body ? ['-d', JSON.stringify(body)] : []),
    ]);
  }
}

/**
 * Helper for a specific Gitea repository.
 */
export class GiteaRepo {
  constructor(
    private readonly container: StartedTestContainer,
    private readonly meta: GiteaMeta,
    public readonly name: string,
  ) {}

  /** Create a branch from an existing branch */
  async createBranch(branchName: string, from = 'main'): Promise<void> {
    await this.apiCall('POST', `/api/v1/repos/${this.meta.adminUser}/${this.name}/branches`, {
      new_branch_name: branchName,
      old_branch_name: from,
    });
  }

  /** Get the SSH clone URL */
  get sshUrl(): string {
    return `ssh://git@${this.meta.hostname}/${this.meta.adminUser}/${this.name}.git`;
  }

  private async apiCall(method: string, path: string, body?: unknown): Promise<void> {
    const auth = Buffer.from(
      `${this.meta.adminUser}:${this.meta.adminPassword}`
    ).toString('base64');

    await this.container.exec([
      'curl', '-X', method,
      `http://localhost:${this.meta.httpPort}${path}`,
      '-H', 'Content-Type: application/json',
      '-H', `Authorization: Basic ${auth}`,
      ...(body ? ['-d', JSON.stringify(body)] : []),
    ]);
  }
}

// ============================================================================
// Helper Factory (for registry)
// ============================================================================

/**
 * Factory function to create GiteaHelper from context.
 */
export function createGiteaHelper(ctx: HelperContext): GiteaHelper {
  const container = ctx.findContainer(/gitea/);
  if (!container) {
    throw new Error(
      'Gitea container not found. Add capability: "source-control" or services: ["gitea"]'
    );
  }

  const result = ctx.serviceResults['gitea'] as GiteaResult | undefined;
  if (!result) {
    throw new Error('Gitea service result not found');
  }

  return new GiteaHelper(container, result.meta);
}

// ============================================================================
// Type Registration (Declaration Merging)
// ============================================================================

declare module './types' {
  interface ServiceHelpers {
    gitea: GiteaHelper;
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function execGiteaCommand(
  container: StartedTestContainer,
  args: string[],
): Promise<void> {
  const command = [
    'su', 'git', '-c',
    `/usr/local/bin/gitea --config /data/gitea/conf/app.ini ${args.join(' ')}`,
  ];
  await container.exec(['bash', '-c', `cd /data/gitea && ${command.join(' ')}`]);
}
```

---

## Service Without Helper Example

### `services/redis.ts`

```typescript
import { GenericContainer, Wait } from 'testcontainers';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../images';
import type { Service, ServiceResult } from './types';

const HOSTNAME = 'redis';
const PORT = 6379;

export interface RedisMeta {
  host: string;
  port: number;
}

export type RedisResult = ServiceResult<RedisMeta>;

export const redis: Service<RedisResult> = {
  description: 'Redis for queue mode and caching',

  async start(network: StartedNetwork, projectName: string): Promise<RedisResult> {
    const container = await new GenericContainer(TEST_CONTAINER_IMAGES.redis)
      .withName(`${projectName}-redis`)
      .withNetwork(network)
      .withNetworkAliases(HOSTNAME)
      .withExposedPorts(PORT)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .withLabels({
        'com.docker.compose.project': projectName,
        'com.docker.compose.service': 'redis',
      })
      .withReuse()
      .start();

    return {
      container,
      meta: { host: HOSTNAME, port: PORT },
    };
  },

  env(result) {
    return {
      QUEUE_BULL_REDIS_HOST: result.meta.host,
      QUEUE_BULL_REDIS_PORT: String(result.meta.port),
      N8N_REDIS_HOST: result.meta.host,
      N8N_REDIS_PORT: String(result.meta.port),
    };
  },
};

// No helper needed - Redis is infrastructure only
// No declaration merging needed
```

---

## Helper Registry

### `services/index.ts`

```typescript
/**
 * Service Registry
 *
 * Single source of truth for all services and their helpers.
 */

// Service definitions
export { gitea, type GiteaResult, type GiteaMeta, GiteaHelper, GiteaRepo } from './gitea';
export { postgres, type PostgresResult } from './postgres';
export { redis, type RedisResult } from './redis';
export { mailpit, type MailpitResult, MailpitHelper } from './mailpit';
export { keycloak, type KeycloakResult, KeycloakHelper } from './keycloak';
export { victoriaLogs, type VictoriaLogsResult, VictoriaLogsHelper } from './victoria-logs';
export { victoriaMetrics, type VictoriaMetricsResult, VictoriaMetricsHelper } from './victoria-metrics';
// ... etc

// Types
export type { Service, ServiceResult, ServiceHelpers, HelperContext, HelperFactory } from './types';

// Import services for registry
import { gitea, createGiteaHelper } from './gitea';
import { postgres } from './postgres';
import { redis } from './redis';
import { mailpit, createMailpitHelper } from './mailpit';
import { keycloak, createKeycloakHelper } from './keycloak';
import { victoriaLogs, createVictoriaLogsHelper } from './victoria-logs';
import { victoriaMetrics, createVictoriaMetricsHelper } from './victoria-metrics';
import type { Service, HelperFactories } from './types';

/**
 * All available services.
 * Key is the service name used in `services: ['postgres', 'gitea']`.
 */
export const services: Record<string, Service> = {
  gitea,
  postgres,
  redis,
  mailpit,
  keycloak,
  'victoria-logs': victoriaLogs,
  'victoria-metrics': victoriaMetrics,
};

/**
 * Helper factories for services that have helpers.
 * Key must match a key in ServiceHelpers interface.
 *
 * NOTE: This object is typed as Partial<HelperFactories> because not all
 * services have helpers. TypeScript will error if a factory doesn't match
 * its declared type in ServiceHelpers.
 */
export const helperFactories: Partial<HelperFactories> = {
  gitea: createGiteaHelper,
  mailpit: createMailpitHelper,
  keycloak: createKeycloakHelper,
  'victoria-logs': createVictoriaLogsHelper,
  'victoria-metrics': createVictoriaMetricsHelper,
};

/** List of service names that have helpers */
export const servicesWithHelpers = Object.keys(helperFactories);
```

---

## N8NStack (Unified Entry Point)

The `N8NStack` interface returned by `createN8NStack()` provides a unified API for all test interactions:

```typescript
export interface N8NStack {
  /** Base URL for n8n API/UI */
  baseUrl: string;

  /** Stop all containers in the stack */
  stop: () => Promise<void>;

  /** All started containers */
  containers: StartedTestContainer[];

  /** Raw service results for advanced use cases */
  serviceResults: Record<string, ServiceResult>;

  /** Type-safe service helpers (Proxy with lazy instantiation) */
  services: ServiceHelpers;

  /** Shortcut for observability logs (requires observability capability) */
  logs: ServiceHelpers['observability']['logs'];

  /** Shortcut for observability metrics (requires observability capability) */
  metrics: ServiceHelpers['observability']['metrics'];

  /** Find containers by name pattern for chaos testing */
  findContainers: (namePattern: string | RegExp) => StartedTestContainer[];

  /** Stop a container by name pattern for chaos testing */
  stopContainer: (namePattern: string | RegExp) => Promise<StoppedTestContainer | null>;
}
```

### Usage in Tests

```typescript
test('example', async ({ n8nContainer }) => {
  // Access service helpers via .services
  await n8nContainer.services.gitea.createRepo('my-repo');
  await n8nContainer.services.mailpit.waitForMessage({ to: 'test@example.com' });

  // Access logs/metrics via shortcuts
  const logs = await n8nContainer.logs.query('level:error');

  // Chaos testing - find and stop containers
  const postgres = n8nContainer.findContainers('postgres*')[0];
  await n8nContainer.stopContainer('redis*');
});
```

## Test Usage Examples

### Before (Legacy Pattern)

```typescript
import { addGiteaRepo, addGiteaBranch, addGiteaSSHKey } from 'n8n-containers';

test('source control', async ({ n8nContainer }) => {
  // Manual container lookup
  const giteaContainer = n8nContainer.containers.find((c) =>
    c.getName().includes('gitea')
  );

  // Magic strings everywhere
  await addGiteaRepo(giteaContainer!, 'my-repo', 'giteaadmin', 'giteapassword');
  await addGiteaBranch(giteaContainer!, 'my-repo', 'develop', 'giteaadmin', 'giteapassword');
});
```

### After (Current Architecture)

```typescript
test('source control', async ({ n8nContainer }) => {
  // Discoverable via autocomplete
  const repo = await n8nContainer.services.gitea.createRepo('my-repo');
  await repo.createBranch('develop');

  // Or chain it
  const url = n8nContainer.services.gitea.getSSHUrl('my-repo');
});
```

### Full Test Example

```typescript
import { test, expect } from '../fixtures/base';

test.use({ capability: 'source-control' });

test.describe('Source Control', () => {
  test('should connect and switch branches', async ({ n8n, n8nContainer }) => {
    // Create repo with branches - fully typed, discoverable
    const repo = await n8nContainer.services.gitea.createRepo('test-repo');
    await repo.createBranch('development');
    await repo.createBranch('staging');

    // Connect via API
    await n8n.api.sourceControl.connect({ repositoryUrl: repo.sshUrl });

    // UI assertions...
    await n8n.navigate.toEnvironments();
    await expect(n8n.page.getByRole('option', { name: 'development' })).toBeVisible();
  });
});
```

---

## Adding a New Service (Step by Step)

### Service Without Helper

1. Create `services/minio.ts`:
```typescript
export const minio: Service<MinioResult> = {
  description: 'S3-compatible storage',
  async start(network, projectName) { ... },
  env(result) { return { ... }; },
};
```

2. Add to `services/index.ts`:
```typescript
export { minio } from './minio';
export const services = { ...existing, minio };
```

**Done.** 2 lines changed.

### Service With Helper

1. Create `services/minio.ts` with helper:
```typescript
export const minio: Service<MinioResult> = { ... };

export class MinioHelper {
  constructor(private container: StartedTestContainer, private meta: MinioMeta) {}
  async createBucket(name: string) { ... }
  async uploadFile(bucket: string, key: string, content: Buffer) { ... }
}

export function createMinioHelper(ctx: HelperContext): MinioHelper {
  const container = ctx.findContainer(/minio/);
  if (!container) throw new Error('Minio not running');
  const result = ctx.serviceResults['minio'] as MinioResult;
  return new MinioHelper(container, result.meta);
}

// Type registration
declare module './types' {
  interface ServiceHelpers {
    minio: MinioHelper;
  }
}
```

2. Add to `services/index.ts`:
```typescript
export { minio, MinioHelper, createMinioHelper } from './minio';
export const services = { ...existing, minio };
export const helperFactories = { ...existing, minio: createMinioHelper };
```

**Done.** Service file is self-contained, 2 lines in index.ts.

---

## Migration Plan

### Phase 1: Core Infrastructure
- [x] Create `services/types.ts` with new interfaces
- [x] Add Proxy-based services accessor to N8NStack
- [x] Pass serviceResults through stack orchestration

### Phase 2: Migrate Existing Services
- [ ] Gitea: Add GiteaHelper class, createGiteaHelper factory, declaration merge
- [ ] Mailpit: Migrate existing MailHelper to new pattern
- [ ] Keycloak: Add KeycloakHelper class
- [ ] Victoria*: Already have helper classes, add factories + declaration merge

### Phase 3: Update Tests
- [x] Update source-control tests to use `n8nContainer.services.gitea`
- [x] Update email tests to use `n8nContainer.services.mailpit`
- [x] Unified entry point - removed separate `chaos` fixture
- [ ] Deprecate standalone function exports (keep for backwards compat)

### Phase 4: Documentation
- [ ] Update README with new patterns
- [ ] Add JSDoc examples to all helpers
- [ ] Remove deprecated patterns from examples

---

## Trade-offs

| Aspect | Benefit | Cost |
|--------|---------|------|
| Declaration merging | Zero changes to core files | Slightly magical for TypeScript newcomers |
| Proxy-based access | Lazy instantiation, clean API | Runtime lookup (negligible perf impact) |
| Co-located helpers | Single source of truth | Larger service files |
| Factory pattern | Testable, explicit dependencies | Extra function per helper |

---

## Alternatives Considered

### Class-based Services
Each service as a class extending `BaseService`. Rejected because:
- More boilerplate for simple services
- Services are fundamentally stateless - classes add ceremony

### Decorator-based Registration
Use decorators to register helpers. Rejected because:
- Requires experimental decorators
- "Too magic" - harder to trace

### Manual Getter Registration
Add a getter to N8NStack for each service. Rejected because:
- Doesn't scale to 100 services
- Requires changes to core file for each new service
