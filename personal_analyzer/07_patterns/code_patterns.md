# Code Patterns in n8n

## TL;DR
n8n có nhiều coding patterns đặc trưng: **Typed Connections** (ai_languageModel, ai_tool), **supplyData vs execute** (resource vs data nodes), **Expression Evaluation** (per-item resolution), **Versioned Nodes** (multiple versions), **Error Wrapping** (typed errors with context).

---

## 1. Node Connection Types

```typescript
// Resource nodes output specialized connections
export class LLMOpenAI implements INodeType {
  description: INodeTypeDescription = {
    outputs: [NodeConnectionTypes.AiLanguageModel],  // Not 'main'
  };

  // Use supplyData for resource nodes
  async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
    const llm = new ChatOpenAI({ /* ... */ });
    return { response: llm };
  }
}

// Data nodes use regular execute
export class HttpRequest implements INodeType {
  description: INodeTypeDescription = {
    outputs: ['main'],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // Returns data items
    return [[{ json: { result: 'data' } }]];
  }
}

// Consumer nodes receive via typed inputs
export class Agent implements INodeType {
  description: INodeTypeDescription = {
    inputs: [
      'main',
      { type: NodeConnectionTypes.AiLanguageModel, displayName: 'Model' },
      { type: NodeConnectionTypes.AiTool, displayName: 'Tools' },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const llm = await this.getInputConnectionData(
      NodeConnectionTypes.AiLanguageModel, 0
    );
    // llm is ChatOpenAI instance
  }
}
```

---

## 2. Per-Item Parameter Resolution

```typescript
// Parameters resolved per-item with expressions
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const results: INodeExecutionData[] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    // Expression {{ $json.url }} resolved for this item
    const url = this.getNodeParameter('url', itemIndex) as string;

    // Default value pattern
    const timeout = this.getNodeParameter('timeout', itemIndex, 30000) as number;

    // Nested parameter path
    const headers = this.getNodeParameter('options.headers', itemIndex, {}) as IDataObject;

    const response = await this.helpers.httpRequest({ url, timeout, headers });
    results.push({ json: response, pairedItem: { item: itemIndex } });
  }

  return [results];
}
```

---

## 3. Versioned Node Pattern

```typescript
// packages/nodes-base/nodes/Set/Set.node.ts

import { SetV1 } from './v1/SetV1.node';
import { SetV2 } from './v2/SetV2.node';

export class Set extends VersionedNodeType {
  constructor() {
    const nodeVersions: IVersionedNodeType['nodeVersions'] = {
      1: new SetV1(),
      2: new SetV2(),
    };

    super(nodeVersions, {
      displayName: 'Set',
      name: 'set',
      defaultVersion: 2,
    });
  }
}

// Version-specific implementation
// v1/SetV1.node.ts
export class SetV1 implements INodeType {
  description: INodeTypeDescription = {
    version: 1,
    properties: [/* v1 properties */],
  };

  async execute() { /* v1 logic */ }
}

// v2/SetV2.node.ts
export class SetV2 implements INodeType {
  description: INodeTypeDescription = {
    version: 2,
    properties: [/* v2 properties - breaking changes ok */],
  };

  async execute() { /* v2 logic */ }
}
```

---

## 4. Error Wrapping Pattern

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();

  for (let i = 0; i < items.length; i++) {
    try {
      const result = await this.doSomething(i);
      returnData.push({ json: result });

    } catch (error) {
      // Wrap with context
      if (error instanceof NodeApiError || error instanceof NodeOperationError) {
        throw error;  // Already wrapped
      }

      // Wrap raw errors
      throw new NodeOperationError(
        this.getNode(),
        error as Error,
        {
          itemIndex: i,
          description: 'Failed to process item',
        }
      );
    }
  }
}

// For API errors specifically
catch (error) {
  throw new NodeApiError(
    this.getNode(),
    error,
    {
      httpCode: error.response?.status,
      itemIndex: i,
    }
  );
}
```

---

## 5. Continue on Fail Pattern

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const result = await this.processItem(items[i], i);
      returnData.push({ json: result, pairedItem: { item: i } });

    } catch (error) {
      // Check if should continue
      if (this.continueOnFail()) {
        // Add error as item instead of throwing
        returnData.push({
          json: {
            error: (error as Error).message,
          },
          pairedItem: { item: i },
        });
        continue;
      }

      // Otherwise propagate error
      throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
    }
  }

  return [returnData];
}
```

---

## 6. Declarative HTTP Pattern

```typescript
// No execute() needed - purely declarative
export const SlackApiDescription: INodeTypeDescription = {
  requestDefaults: {
    baseURL: 'https://slack.com/api',
    headers: { 'Content-Type': 'application/json' },
  },

  properties: [
    {
      displayName: 'Resource',
      name: 'resource',
      type: 'options',
      options: [
        { name: 'Message', value: 'message' },
      ],
    },
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      options: [
        {
          name: 'Send',
          value: 'send',
          routing: {
            request: {
              method: 'POST',
              url: '/chat.postMessage',
            },
          },
        },
      ],
    },
    {
      displayName: 'Channel',
      name: 'channel',
      type: 'string',
      routing: {
        send: { type: 'body', property: 'channel' },
      },
    },
  ],
};

// RoutingNode handles execution automatically
```

---

## 7. Static Data Pattern

```typescript
// For tracking state across executions
async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
  const staticData = this.getWorkflowStaticData('node');

  // Get last state
  const lastTimestamp = staticData.lastTimestamp as number ?? 0;

  // Fetch new items
  const newItems = await fetchItemsSince(lastTimestamp);

  if (newItems.length === 0) {
    return null;  // No new data
  }

  // Update state (auto-persisted)
  staticData.lastTimestamp = newItems[newItems.length - 1].timestamp;

  return [[newItems.map(item => ({ json: item }))]];
}
```

---

## File References

| Pattern | Example Location |
|---------|-----------------|
| Typed Connections | `packages/@n8n/nodes-langchain/nodes/` |
| Versioned Nodes | `packages/nodes-base/nodes/Set/` |
| Error Wrapping | `packages/workflow/src/errors/` |
| Declarative HTTP | `packages/nodes-base/nodes/Slack/` |

---

## Key Takeaways

1. **Typed Connections**: AI nodes use specific connection types for type safety.

2. **supplyData vs execute**: Resource providers vs data processors.

3. **Per-Item Resolution**: Expressions evaluated for each item.

4. **Graceful Degradation**: continueOnFail converts errors to output items.

5. **Declarative First**: Use routing config over code when possible.
