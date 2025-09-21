# n8n Workflow Factory

A TypeScript-first builder for programmatically creating n8n workflows with full type safety and IntelliSense support.

## Quick Start

### Basic Webhook to Response Workflow

```typescript
import { WorkflowFactory } from "n8n-workflow/factory"

const workflow = WorkflowFactory
  .create({
    name: 'Simple API Endpoint',
    active: true,
    executionOrder: 'v1'
  })
  .add('n8n-nodes-base.webhook', {
    name: 'trigger',
    httpMethod: 'POST',
    path: 'api/data'
  })
  .add('n8n-nodes-base.respondToWebhook', {
    name: 'response',
    respondWith: 'firstIncomingItem',
    responseCode: 200
  })
  .connect('trigger', 'response')
  .build();

console.log(JSON.stringify(workflow, null, 2));
```
