# Anti-Patterns & Improvement Areas

## TL;DR
Một số areas cần cải thiện trong n8n: **Large Monolithic Files** (workflow-execute.ts 86KB), **JSON Blob Storage** (execution data as JSON), **Tight Coupling** (some services), **Limited Type Safety** (IDataObject = any). Suggestions for improvement included.

---

## Identified Issues

### 1. Large Monolithic Files

```
packages/core/src/execution-engine/workflow-execute.ts - 86KB
packages/workflow/src/interfaces.ts - 95KB
packages/workflow/src/node-helpers.ts - 58KB
```

**Problem**: Files quá lớn, khó maintain và test.

**Suggestion**:
```typescript
// Split workflow-execute.ts into:
// - execution-orchestrator.ts (main loop)
// - node-executor.ts (node execution)
// - successor-scheduler.ts (queuing logic)
// - execution-state.ts (state management)
```

---

### 2. IDataObject = any

```typescript
// packages/workflow/src/interfaces.ts

export interface IDataObject {
  [key: string]: any;  // Loses type safety
}

// Used everywhere:
interface INodeExecutionData {
  json: IDataObject;  // Any shape
}
```

**Problem**: Type safety lost, runtime errors possible.

**Suggestion**:
```typescript
// Use generics for typed payloads
interface ITypedNodeExecutionData<T extends Record<string, unknown>> {
  json: T;
}

// Node-specific types
interface SlackMessageData {
  channel: string;
  text: string;
  ts?: string;
}

// Usage
const data: ITypedNodeExecutionData<SlackMessageData> = {
  json: { channel: '#general', text: 'Hello' }
};
```

---

### 3. JSON Blob Storage

```typescript
// Execution data stored as JSON blob
@Column('simple-json')
data: IRunExecutionData;

// Problems:
// - No query on execution data fields
// - Large blob for big workflows
// - No partial updates
```

**Suggestion**:
```typescript
// Separate tables for queryable data
@Entity()
class NodeExecution {
  @PrimaryColumn()
  id: string;

  @Column()
  executionId: string;

  @Column()
  nodeName: string;

  @Column()
  status: string;

  @Column('jsonb')  // PostgreSQL JSONB for indexing
  outputData: object;

  @Index()
  @Column()
  startedAt: Date;
}
```

---

### 4. Callback Hell in Hooks

```typescript
// Current hook pattern
additionalData.hooks = {
  workflowExecuteBefore: [
    async () => { /* ... */ },
    async () => { /* ... */ },
  ],
  nodeExecuteAfter: [
    async (nodeName, data) => { /* ... */ },
  ],
};

// Problems:
// - No ordering guarantee
// - No error isolation
// - Hard to manage
```

**Suggestion**:
```typescript
// Event-based with priority
@EventHandler('workflow.executeBefore', { priority: 100 })
async onWorkflowStart(event: WorkflowStartEvent): Promise<void> {
  // Isolated handler
}

// Or middleware pattern
const hookPipeline = new HookPipeline()
  .use(loggingHook)
  .use(metricsHook)
  .use(notificationHook);
```

---

### 5. Implicit Dependencies

```typescript
// Some nodes directly call Container.get
async execute(this: IExecuteFunctions) {
  const service = Container.get(SomeService);  // Implicit dependency
  // ...
}

// Problems:
// - Hard to test
// - Hidden dependencies
// - Breaks DI principle
```

**Suggestion**:
```typescript
// Provide via execution context
async execute(this: IExecuteFunctions) {
  const service = this.getService(SomeService);  // Explicit
  // Testable via mock context
}
```

---

### 6. Error Message Inconsistency

```typescript
// Various error creation patterns
throw new Error('Failed');
throw new NodeOperationError(node, 'Failed');
throw new NodeApiError(node, error);
throw new ApplicationError('Failed');

// Inconsistent error info
```

**Suggestion**:
```typescript
// Standardized error factory
class NodeErrors {
  static operation(
    node: INode,
    message: string,
    options?: ErrorOptions
  ): NodeOperationError {
    return new NodeOperationError(node, message, {
      ...options,
      // Auto-add context
      timestamp: Date.now(),
      nodeType: node.type,
    });
  }

  static api(
    node: INode,
    response: AxiosError,
    options?: ErrorOptions
  ): NodeApiError {
    return new NodeApiError(node, response, {
      ...options,
      httpCode: response.response?.status,
      endpoint: response.config?.url,
    });
  }
}
```

---

### 7. Synchronous Expression Evaluation

```typescript
// Expression evaluation blocks event loop
const value = expression.resolveSimpleParameterValue(
  rawValue,
  // ...
);  // Synchronous

// For complex expressions with many items, can block
```

**Suggestion**:
```typescript
// Async evaluation with batching
async function resolveExpressions(
  items: INodeExecutionData[],
  expressions: Map<string, string>,
): Promise<ResolvedValues[]> {
  // Process in batches
  const batchSize = 100;
  const results: ResolvedValues[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => resolveForItem(item, expressions))
    );
    results.push(...batchResults);

    // Yield to event loop
    await setImmediate();
  }

  return results;
}
```

---

## Summary of Recommendations

| Issue | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Large files | Medium | High | Maintainability |
| IDataObject typing | High | Medium | Type safety |
| JSON blob storage | Medium | High | Performance |
| Callback hooks | Low | Medium | Code quality |
| Implicit deps | Medium | Low | Testability |
| Error consistency | Low | Low | DX |
| Sync expressions | Medium | High | Performance |

---

## Key Takeaways

1. **Technical Debt**: Some areas accumulated debt from rapid growth.

2. **Type Safety Gap**: IDataObject undermines TypeScript benefits.

3. **Scalability Concerns**: JSON blob storage limits query capabilities.

4. **Testing Friction**: Implicit dependencies make unit testing harder.

5. **Good Foundation**: Core architecture solid, improvements incremental.
