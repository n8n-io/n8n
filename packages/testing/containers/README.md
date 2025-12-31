# n8n Test Containers - Usage Guide

A simple way to spin up n8n container stacks for development and testing.

## Quick Start

```bash
# Start a basic n8n instance (SQLite database)
pnpm stack

# Start with PostgreSQL database
pnpm stack --postgres

# Start in queue mode (with Redis + PostgreSQL)
pnpm stack --queue

# Start with starter performance plan constraints
pnpm stack:starter
```

When started, you'll see:
- **URL**: http://localhost:[random-port]


## Common Usage Patterns

### Development with Container Reuse
```bash
# Enable container reuse (faster restarts)
pnpm run stack              # SQLite
pnpm run stack:postgres     # PostgreSQL
pnpm run stack:queue        # Queue mode
pnpm run stack:multi-main   # Multiple main instances
pnpm run stack:starter      # Starter performance plan
```

### Performance Plan Presets
```bash
# Use predefined performance plans (simulates cloud constraints, differs from cloud CPU wise due to non burstable docker)
pnpm stack --plan trial        # Trial: 0.75GB RAM, 0.2 CPU (SQLite only)
pnpm stack --plan starter      # Starter: 0.75GB RAM, 0.2 CPU (SQLite only)
pnpm stack --plan pro-1       # Pro-1: 1.25GB RAM, 0.5 CPU (SQLite only)
pnpm stack --plan pro-2       # Pro-2: 2.5GB RAM, 0.75 CPU (SQLite only)
pnpm stack --plan enterprise  # Enterprise: 8GB RAM, 1.0 CPU (SQLite only)
```

### Queue Mode with Scaling
```bash
# Custom scaling: 3 main instances, 5 workers
pnpm stack --queue --mains 3 --workers 5

# Single main, 2 workers
pnpm stack --queue --workers 2
```

### Environment Variables
```bash
# Set custom environment variables
pnpm run stack --postgres --env N8N_LOG_LEVEL=info --env N8N_ENABLED_MODULES=insights
```

### Parallel Testing
```bash
# Run multiple stacks in parallel with unique names
pnpm run stack --name test-1 --postgres
pnpm run stack --name test-2 --queue
```


## Custom Container Config

### Via Command Line
```bash
# Pass any n8n env vars to containers
N8N_TEST_ENV='{"N8N_METRICS":"true"}' npm run stack:standard
N8N_TEST_ENV='{"N8N_LOG_LEVEL":"debug","N8N_METRICS":"true","N8N_ENABLED_MODULES":"insights"}' npm run stack:postgres
```

## Programmatic Usage

```typescript
import { createN8NStack } from './containers/n8n-test-containers';

// Simple SQLite instance
const stack = await createN8NStack();

// PostgreSQL with custom environment
const stack = await createN8NStack({
  postgres: true,
  env: { N8N_LOG_LEVEL: 'debug' }
});

// Queue mode with scaling
const stack = await createN8NStack({
  queueMode: { mains: 2, workers: 3 }
});

// Resource-constrained container (simulating cloud plans)
const stack = await createN8NStack({
  resourceQuota: {
    memory: 0.375,  // 384MB RAM
    cpu: 0.25       // 250 millicore CPU
  }
});

// Use the stack
console.log(`n8n available at: ${stack.baseUrl}`);

// Clean up when done
await stack.stop();
```

## Configuration Options

| Option | Description | Example |
|--------|-------------|---------|
| `--postgres` | Use PostgreSQL instead of SQLite | `npm run stack -- --postgres` |
| `--queue` | Enable queue mode with Redis | `npm run stack -- --queue` |
| `--mains <n>` | Number of main instances (requires queue mode) | `--mains 3` |
| `--workers <n>` | Number of worker instances (requires queue mode) | `--workers 5` |
| `--name <name>` | Custom project name for parallel runs | `--name my-test` |
| `--env KEY=VALUE` | Set environment variables | `--env N8N_LOG_LEVEL=debug` |
| `--plan <plan>` | Use performance plan preset | `--plan starter` |

## Performance Plans

Simulate cloud plan resource constraints for testing. **Performance plans are SQLite-only** (like cloud n8n):

```bash
# CLI usage
pnpm stack --plan trial        # 0.375GB RAM, 0.2 CPU cores
pnpm stack --plan starter      # 0.375GB RAM, 0.2 CPU cores
pnpm stack --plan pro-1       # 0.625GB RAM, 0.5 CPU cores
pnpm stack --plan pro-2       # 1.25GB RAM, 0.75 CPU cores
pnpm stack --plan enterprise  # 4GB RAM, 1.0 CPU cores
```

**Common Cloud Plan Quotas:**
- **Trial/Starter**: 0.375GB RAM, 0.2 CPU cores
- **Pro-1**: 0.625GB RAM, 0.5 CPU cores
- **Pro-2**: 1.25GB RAM, 0.75 CPU cores
- **Enterprise**: 4GB RAM, 1.0 CPU cores

Resource quotas are applied using Docker's `--memory` and `--cpus` flags for realistic cloud simulation.

## Package.json Scripts

| Script | Description | Equivalent CLI |
|--------|-------------|----------------|
| `stack` | Basic SQLite instance | `pnpm stack` |
| `stack:postgres` | PostgreSQL database | `pnpm stack --postgres` |
| `stack:queue` | Queue mode | `pnpm stack --queue` |
| `stack:multi-main` | Multi-main setup | `pnpm stack --mains 2 --workers 1` |
| `stack:starter` | Starter performance plan (SQLite only) | `pnpm stack --plan starter` |

## Container Architecture

### Single Instance (Default)
```
┌─────────────┐
│    n8n      │ ← SQLite database
│  (SQLite)   │
└─────────────┘
```

### With PostgreSQL
```
┌─────────────┐    ┌──────────────┐
│    n8n      │────│ PostgreSQL   │
│             │    │              │
└─────────────┘    └──────────────┘
```

### Queue Mode
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  n8n-main   │────│ PostgreSQL   │    │   Redis     │
└─────────────┘    └──────────────┘    └─────────────┘
┌─────────────┐                        │             │
│ n8n-worker  │────────────────────────┘             │
└─────────────┘                                      │
┌─────────────┐                                      │
│ n8n-worker  │──────────────────────────────────────┘
└─────────────┘
```

### Multi-Main with Load Balancer
```
                    ┌──────────────┐
                ────│              │ ← Entry point
               /    │ Load Balancer│
┌─────────────┐     └──────────────┘
│ n8n-main-1  │────┐
└─────────────┘    │ ┌──────────────┐    ┌─────────────┐
┌─────────────┐    ├─│ PostgreSQL   │    │   Redis     │
│ n8n-main-2  │────┤ └──────────────┘    └─────────────┘
└─────────────┘    │                     │             │
┌─────────────┐    │ ┌─────────────────────────────────┤
│ n8n-worker  │────┘ │                                 │
└─────────────┘      └─────────────────────────────────┘
```

## Cleanup

```bash
# Remove all n8n containers and networks
pnpm run stack:clean:all


## Tips

- **Container Reuse**: Set `TESTCONTAINERS_REUSE_ENABLE=true` for faster development cycles
- **Parallel Testing**: Use `--name` parameter to run multiple stacks without conflicts
- **Queue Mode**: Automatically enables PostgreSQL (required for queue mode)
- **Multi-Main**: Requires queue mode and special licensing read from N8N_LICENSE_ACTIVATION_KEY environment variable
- **Performance Plans**: Use `--plan` for quick cloud plan simulation
- **Log Monitoring**: Use the `ContainerTestHelpers` class for advanced log monitoring in tests

## Docker Image

By default, uses the `n8nio/n8n:local` image. Override with:
```bash
export N8N_DOCKER_IMAGE=n8nio/n8n:dev
pnpm run stack
```
