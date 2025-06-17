Here's the updated README:

```markdown
# Playwright E2E Test Guide

## Quick Start
```bash
npm test                 # Run all tests (fresh containers)
npm run test:local       # Run against http://localhost:5678
npm run dev              # Start dev stack (containers persist)
```

## Test Commands
```bash
# By Mode
npm run test:standard    # Basic n8n
npm run test:postgres    # PostgreSQL
npm run test:queue       # Queue mode
npm run test:multi-main  # HA setup

# Development
npm test -- --grep "workflow"           # Pattern match
```

## Dev Stacks
```bash
npm run dev                # Standard
npm run dev:postgres       # With PostgreSQL
npm run dev:queue          # With workers
npm run dev:multi-main     # Custom: 2 mains, 1 workers
npm run test:clean         # Remove all containers
```

## Custom Container Config

### Via Command Line
```bash
# Pass any n8n env vars to containers
N8N_TEST_ENV='{"N8N_METRICS":"true"}' npm run test:standard
N8N_TEST_ENV='{"N8N_LOG_LEVEL":"debug","N8N_METRICS":"true"}' npm run test:postgres
N8N_TEST_ENV='{"N8N_ENABLED_MODULES":"insights"}' npm test -- --project="mode:queue*"
```

## Test Tags
```typescript
test('basic test', ...)                              // All modes, fully parallel
test('postgres only @mode:postgres', ...)            // Mode-specific
test('needs clean db @db:reset', ...)                // Sequential per worker
test('chaos test @mode:multi-main @chaostest', ...) // Isolated per worker
```

## Tips
- `dev:*` = containers persist (for development)
- `test:*` = fresh containers (for testing)
- VS Code: Set `N8N_BASE_URL` in Playwright settings
- Pass custom env vars via `N8N_TEST_ENV='{"KEY":"value"}'`
```