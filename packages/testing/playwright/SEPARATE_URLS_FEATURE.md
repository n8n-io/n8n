# Separate Backend and Frontend URL Support

## Overview

This feature enables Playwright tests to run against separate backend and frontend servers, which is essential for development workflows where:
- Backend runs on port 5680
- Frontend dev server runs on port 8080

## Problem Solved

Previously, Playwright tests could only use a single URL (`N8N_BASE_URL`) for both browser navigation and API calls. This meant:
- You couldn't test against a frontend dev server (port 8080) while the backend was on a different port (5680)
- The `test:dev` command existed but the underlying infrastructure didn't properly support separate URLs

## Solution

Added support for separate backend and frontend URLs through:
1. Environment variable: `N8N_EDITOR_URL` for frontend (already existed but not fully implemented)
2. New fixtures: `backendUrl` and `frontendUrl` that intelligently resolve URLs
3. Updated all API calls to use `backendUrl`
4. Updated all browser navigation to use `frontendUrl`

## Environment Variables

| Variable | Purpose | Priority |
|----------|---------|----------|
| `N8N_BASE_URL` | Backend URL (also used for frontend if `N8N_EDITOR_URL` not set) | Required for backend |
| `N8N_EDITOR_URL` | Frontend URL (overrides `N8N_BASE_URL` for frontend only) | Optional (frontend) |

### Resolution Logic

**Backend URL** (used for API calls):
```
N8N_BASE_URL → container URL
```

**Frontend URL** (used for browser navigation):
```
N8N_EDITOR_URL → N8N_BASE_URL → container URL
```

## Files Modified

### Core Changes

1. **`utils/url-helper.ts`**
   - Added `getBackendUrl()`: Returns backend URL from environment
   - Added `getFrontendUrl()`: Returns frontend URL from environment

2. **`fixtures/base.ts`**
   - Added `backendUrl` fixture: Worker-scoped fixture for backend API URL
   - Added `frontendUrl` fixture: Worker-scoped fixture for frontend UI URL
   - Updated `baseURL` fixture to use `frontendUrl`
   - Updated `api` fixture to use `backendUrl` for API context
   - Updated `dbSetup` fixture to use `backendUrl` for database operations
   - Updated `n8nContainer` to check `getBackendUrl()` instead of direct env access
   - Updated error messages in `chaos` and `proxyServer` fixtures

3. **`playwright.config.ts`**
   - Added `BACKEND_URL` and `FRONTEND_URL` constants
   - Updated `WEB_SERVER_URL` to use frontend URL
   - Updated `N8N_PORT` environment variable to use backend URL port

4. **`playwright-projects.ts`**
   - Updated `isLocal` check to use `getBackendUrl()`
   - Updated project `baseURL` configurations to use `getFrontendUrl()`

5. **`global-setup.ts`**
   - Updated to use `getBackendUrl()` for database reset operations
   - Updated log messages to be more generic

### Documentation

6. **`README.md`**
   - Added "Separate Backend and Frontend URLs" section
   - Documented environment variables and their priorities
   - Added code examples showing fixture usage
   - Explained the resolution logic

## Usage Examples

### Running Tests with Separate URLs

```bash
# Development mode (backend on 5680, frontend on 8080)
N8N_BASE_URL=http://localhost:5680 N8N_EDITOR_URL=http://localhost:8080 pnpm test:local

# Or use the convenience command
pnpm test:dev
```

### In Test Code

```typescript
import { test, expect } from '../fixtures/base';

test('example test', async ({ n8n, api, backendUrl, frontendUrl }) => {
  // Browser navigation automatically uses frontendUrl
  await n8n.workflows.createNew();

  // API calls automatically use backendUrl
  const workflows = await api.getWorkflows();

  // Direct access if needed
  console.log(`Frontend: ${frontendUrl}`);
  console.log(`Backend: ${backendUrl}`);
});
```

## Backward Compatibility

✅ **Fully backward compatible**

- Existing tests work without changes
- Single `N8N_BASE_URL` still works as before
- Container tests continue to use single URL
- No breaking changes to test APIs

## Testing Scenarios

### Scenario 1: Single URL (Traditional)
```bash
N8N_BASE_URL=http://localhost:5680 pnpm test:local
```
Result: Both `backendUrl` and `frontendUrl` = `http://localhost:5680`

### Scenario 2: Separate URLs (Development)
```bash
N8N_BASE_URL=http://localhost:5680 N8N_EDITOR_URL=http://localhost:8080 pnpm test:local
```
Result:
- `backendUrl` = `http://localhost:5680`
- `frontendUrl` = `http://localhost:8080`

### Scenario 3: Container Mode
```bash
pnpm test:container:standard
```
Result: Both URLs point to the same dynamically created container

## Benefits

1. **Development Workflow**: Test against frontend dev server with hot reload
2. **Separation of Concerns**: API calls clearly separated from UI navigation
3. **Flexibility**: Can test different frontend/backend combinations
4. **Type Safety**: TypeScript fixtures provide proper typing
5. **No Breaking Changes**: Existing tests continue to work

## Implementation Notes

- All URL resolution happens at the worker scope for performance
- Uses nullish coalescing (`??`) for safer fallback behavior
- Consistent error messages across fixtures
- Clear fixture dependency graph maintained
