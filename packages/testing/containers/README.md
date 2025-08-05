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
- **Log Monitoring**: Use the `ContainerTestHelpers` class for advanced log monitoring in tests

## Docker Image

By default, uses the `n8nio/n8n:local` image. Override with:
```bash
export N8N_DOCKER_IMAGE=n8nio/n8n:dev
pnpm run stack
```
