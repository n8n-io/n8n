# BolekFlow Wrapper

Thin Bolek-specific wrapper for n8n workflows.

## Quick Start

```bash
npm install
npm run dev
```

Wrapper runs on http://localhost:3001
n8n runs on http://localhost:5678 (inside docker-compose)

## API Endpoints

All endpoints require Bearer token: `Authorization: Bearer test_token_for_dev`

### Execute Workflow
```bash
POST /api/agent/workflows/execute
Body: { workflowId: string, inputs: {...} }
Response: { runId, status, result, executionTime }
```

### Get Execution Status
```bash
GET /api/agent/workflows/:id/status/:runId
Response: { runId, status, result, error, executionTime }
```

### List Workflows
```bash
GET /api/agent/workflows/list
Response: { workflows: [...] }
```

### Cancel Execution
```bash
POST /api/agent/workflows/:id/cancel/:runId
Response: { success: boolean }
```

### Health Check
```bash
GET /health
```

## Architecture

```
BolekAI (orchestrator)
  ↓ (HTTP POST)
BolekFlow Wrapper (:3001)
  ├─ Translate Bolek workflow request → n8n format
  ├─ Call n8n API (:5678)
  └─ Translate execution results → Bolek format
  ↓
n8n (:5678)
  └─ Execute workflow nodes, return results
```

## Files

- `src/index.ts` — Hono server with 4 endpoints
- `src/adapter.ts` — n8n API translation
- `src/logger.ts` — Structured logging
- `src/types.ts` — TypeScript interfaces
- `docker-compose.yml` — Run both wrapper + n8n
- `package.json` — Dependencies

## Running

With Docker:
```bash
docker-compose up
```

Locally:
```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Integration with BolekAI

BolekAI calls this wrapper to execute workflows:
- `POST http://localhost:3001/api/agent/workflows/execute`
- Wrapper translates to n8n format
- Returns runId for polling status
- BolekAI can poll: `GET /api/agent/workflows/:id/status/:runId`

No direct calls from BolekAI to n8n.
