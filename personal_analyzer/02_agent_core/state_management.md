# State Management - Agent Execution State

## TL;DR
AI Agent trong n8n quản lý state qua `RequestResponseMetadata` chứa: **previousRequests** (accumulated steps), **iterationCount** (loop counter), và **itemIndex** (batch tracking). Agent state flows qua `ItemContext` cho mỗi iteration, với memory state managed riêng bởi LangChain.

---

## Agent State Architecture

```mermaid
graph TB
    subgraph "RequestResponseMetadata"
        PREV[previousRequests<br/>ToolCallData[]]
        ITER[iterationCount<br/>number]
        ITEM[itemIndex<br/>number]
        HITL[hitl?<br/>HitlMetadata]
        THINK[anthropic/google<br/>Thinking metadata]
    end

    subgraph "ItemContext"
        INPUT[input<br/>User message]
        STEPS[steps<br/>Previous tool calls]
        OPTS[options<br/>Agent configuration]
        TOOLS[tools<br/>Available tools]
    end

    subgraph "Memory State"
        CHAT[chatHistory<br/>BaseMessage[]]
        TOKEN[Token-limited<br/>conversation]
    end

    PREV --> STEPS
    ITER --> CHECK[Max Iterations Check]
    ITEM --> BATCH[Batch Processing]

    STEPS --> AGENT[Agent Reasoning]
    CHAT --> AGENT
```

---

## Core State Structures

### 1. RequestResponseMetadata

```typescript
// packages/@n8n/nodes-langchain/utils/agent-execution/types.ts

export type RequestResponseMetadata = {
  // Current batch item index
  itemIndex?: number;

  // Accumulated tool call history (agent scratchpad)
  previousRequests?: ToolCallData[];

  // Current iteration counter
  iterationCount?: number;

  // Human-in-the-loop approval data
  hitl?: HitlMetadata;

  // Extended thinking metadata (Anthropic)
  anthropic?: {
    thinkingContent?: string;        // Raw thinking text
    thinkingType?: 'thinking' | 'redacted_thinking';
    thinkingSignature?: string;      // Verification signature
  };

  // Extended thinking metadata (Google/Gemini)
  google?: {
    thoughtSignature?: string;       // Verification signature
  };
};
```

**Line-by-line Explanation:**
- `itemIndex`: Tracks which item in batch is being processed
- `previousRequests`: All tool calls và observations from prior iterations
- `iterationCount`: Loop counter for max iterations check
- `hitl`: Human approval data khi dùng approval gates
- `anthropic/google`: Extended thinking metadata cho các models hỗ trợ

---

### 2. ToolCallData (Step Entry)

```typescript
// packages/@n8n/nodes-langchain/utils/agent-execution/types.ts

export type ToolCallData = {
  action: {
    // Tool identifier
    tool: string;                           // e.g., "calculator"

    // Parameters passed to tool
    toolInput: Record<string, unknown>;     // e.g., { expression: "2+2" }

    // Action description/log
    log: string | number | true | object;   // "Calculating 2+2..."

    // Full LLM message for thinking blocks
    messageLog?: AIMessage[];               // Contains thinking content

    // Unique ID for this call
    toolCallId: string;                     // e.g., "call_abc123"

    // Call type
    type: string;                           // "tool_call"
  };

  // Tool execution result
  observation: string;                      // "The result is 4"
};
```

**Step Accumulation Flow:**
```
Iteration 1: steps = []
  → Agent calls tool A
  → steps = [{ action: { tool: 'A' }, observation: 'result A' }]

Iteration 2: steps = [step1]
  → Agent calls tool B
  → steps = [
      { action: { tool: 'A' }, observation: 'result A' },
      { action: { tool: 'B' }, observation: 'result B' }
    ]

Iteration 3: steps = [step1, step2]
  → Agent returns final answer
  → No new steps added
```

---

### 3. ItemContext (Per-Item State)

```typescript
// packages/@n8n/nodes-langchain/nodes/agents/Agent/agents/ToolsAgent/V3/helpers/prepareItemContext.ts

export interface ItemContext {
  // User input message
  input: string;

  // Accumulated agent steps (scratchpad)
  steps: ToolCallData[];

  // Agent configuration options
  options: AgentOptions;

  // Available tools for this item
  tools: Array<DynamicStructuredTool | Tool>;
}

// AgentOptions structure
interface AgentOptions {
  systemMessage?: string;           // System prompt
  maxIterations?: number;           // Max reasoning loops
  returnIntermediateSteps?: boolean;
  outputParser?: N8nOutputParser;
  sessionId?: string;               // Memory session ID
  maxTokensFromMemory?: number;     // Token limit for chat history
  enableStreaming?: boolean;        // Streaming mode
}
```

---

## State Flow Through Execution

### Building State at Each Iteration

```typescript
// packages/@n8n/nodes-langchain/utils/agent-execution/buildSteps.ts

export function buildSteps(
  response: EngineResponse<RequestResponseMetadata> | undefined,
  itemIndex: number,
): ToolCallData[] {
  const steps: ToolCallData[] = [];

  // 1. Carry forward ALL previous steps
  if (response?.metadata?.previousRequests) {
    steps.push(...response.metadata.previousRequests);
  }

  // 2. Add new tool responses from current iteration
  const responses = response?.actions || [];

  for (const tool of responses) {
    // Filter by item index (for batch processing)
    if (tool.action?.metadata?.itemIndex !== itemIndex) {
      continue;
    }

    const toolInput: IDataObject = {
      ...tool.action.input,
      id: tool.action.id,
    };

    // Extract tool name with fallback
    const toolName = resolveToolName(tool);

    steps.push({
      action: {
        tool: toolName,
        toolInput: {
          ...toolInput,
          log: toolInput.log,
        },
        log: toolInput.log || `Calling ${tool.action.nodeName}`,
        messageLog: extractMessageLog(tool),
        toolCallId: tool.action.id,
        type: 'tool_call',
      },
      observation: buildObservation(tool.data),  // Tool result
    });
  }

  return steps;
}

// Build observation from tool output
function buildObservation(data: IDataObject | IDataObject[]): string {
  if (Array.isArray(data)) {
    return data.map(item => JSON.stringify(item)).join('\n');
  }
  return JSON.stringify(data);
}
```

### Preparing Context for Each Item

```typescript
// packages/@n8n/nodes-langchain/nodes/agents/Agent/agents/ToolsAgent/V3/helpers/prepareItemContext.ts

export async function prepareItemContext(
  ctx: IExecuteFunctions | ISupplyDataFunctions,
  itemIndex: number,
  response?: EngineResponse<RequestResponseMetadata>,
): Promise<ItemContext> {
  // 1. Get user input for this item
  const input = ctx.getNodeParameter('text', itemIndex) as string;

  // 2. Build steps from previous iterations
  const steps = buildSteps(response, itemIndex);

  // 3. Get configuration options
  const options: AgentOptions = {
    systemMessage: ctx.getNodeParameter('systemMessage', itemIndex, '') as string,
    maxIterations: ctx.getNodeParameter('options.maxIterations', itemIndex, 10) as number,
    returnIntermediateSteps: ctx.getNodeParameter(
      'options.returnIntermediateSteps', itemIndex, false
    ) as boolean,
    sessionId: getSessionId(ctx, itemIndex),
    maxTokensFromMemory: ctx.getNodeParameter(
      'options.maxTokensFromMemory', itemIndex, undefined
    ) as number | undefined,
    enableStreaming: ctx.getNodeParameter(
      'options.enableStreaming', itemIndex, true
    ) as boolean,
  };

  // 4. Get tools from connections
  const tools = await getConnectedTools(ctx, itemIndex);

  return { input, steps, options, tools };
}
```

---

## Iteration Count Management

### Tracking Iterations

```typescript
// packages/@n8n/nodes-langchain/utils/agent-execution/buildResponseMetadata.ts

export function buildResponseMetadata(
  response: EngineResponse<RequestResponseMetadata> | undefined,
  itemIndex: number,
): RequestResponseMetadata {
  // Get current iteration count (0 if first iteration)
  const currentIterationCount = response?.metadata?.iterationCount ?? 0;

  return {
    // Carry forward all accumulated steps
    previousRequests: buildSteps(response, itemIndex),

    // Track which item this is for
    itemIndex,

    // Increment iteration counter
    iterationCount: currentIterationCount + 1,
  };
}
```

### Max Iterations Check

```typescript
// packages/@n8n/nodes-langchain/nodes/agents/Agent/agents/ToolsAgent/V3/helpers/checkMaxIterations.ts

export function checkMaxIterations(
  response: EngineResponse<RequestResponseMetadata> | undefined,
  maxIterations: number,
  node: INode,
): void {
  // Skip on first iteration (no response yet)
  if (response?.metadata?.iterationCount === undefined) {
    return;
  }

  // Check limit
  if (response.metadata.iterationCount >= maxIterations) {
    throw new NodeOperationError(
      node,
      `Max iterations (${maxIterations}) reached. ` +
      `The agent could not complete the task.`,
      { description: 'Increase max iterations or simplify the task.' }
    );
  }
}
```

---

## Memory State Management

### Loading Memory with Token Limits

```typescript
// packages/@n8n/nodes-langchain/utils/agent-execution/loadMemory.ts

export async function loadMemory(
  memory: BaseChatMemory | undefined,
  model: BaseChatModel,
  maxTokens?: number,
): Promise<BaseMessage[]> {
  if (!memory) {
    return [];
  }

  // Load full chat history
  const memoryVariables = await memory.loadMemoryVariables({});
  let chatHistory = memoryVariables.chat_history || [];

  // Apply token limit if specified
  if (maxTokens && chatHistory.length > 0) {
    chatHistory = await trimMessages(chatHistory, {
      maxTokens,
      tokenCounter: model,
      strategy: 'last',  // Keep most recent messages
      allowPartial: false,
    });
  }

  return chatHistory;
}
```

### Saving to Memory

```typescript
// packages/@n8n/nodes-langchain/utils/agent-execution/saveToMemory.ts

export async function saveToMemory(
  memory: BaseChatMemory | undefined,
  input: string,
  output: string,
): Promise<void> {
  if (!memory) {
    return;
  }

  // Save the conversation turn
  await memory.saveContext(
    { input },      // Human message
    { output },     // AI response
  );
}
```

---

## HITL (Human-in-the-Loop) State

### HITL Metadata Structure

```typescript
// packages/@n8n/nodes-langchain/utils/agent-execution/types.ts

export interface HitlMetadata {
  // Tool that needs approval
  toolName: string;

  // Parameters being passed
  toolParameters: Record<string, unknown>;

  // Whether approval is required
  requiresApproval: boolean;

  // Approval status
  approved?: boolean;

  // User who approved
  approvedBy?: string;

  // Approval timestamp
  approvedAt?: Date;
}
```

### Processing HITL Responses

```typescript
// packages/@n8n/nodes-langchain/nodes/agents/Agent/agents/ToolsAgent/V3/helpers/processHitlResponses.ts

export function processHitlResponses(
  response: EngineResponse<RequestResponseMetadata> | undefined,
): EngineResponse<RequestResponseMetadata> | undefined {
  if (!response?.actions) {
    return response;
  }

  // Filter and process approved actions
  const processedActions = response.actions.map(action => {
    const hitl = action.action.metadata?.hitl;

    if (hitl && hitl.requiresApproval) {
      if (!hitl.approved) {
        // Action was rejected - convert to error response
        return {
          ...action,
          data: { error: 'Tool call was rejected by user' },
        };
      }
      // Action was approved - proceed normally
    }

    return action;
  });

  return {
    ...response,
    actions: processedActions,
  };
}
```

---

## Batch State Management

### Batch Execution Context

```typescript
// packages/@n8n/nodes-langchain/nodes/agents/Agent/agents/ToolsAgent/V3/helpers/executeBatch.ts

export async function executeBatch(
  ctx: IExecuteFunctions | ISupplyDataFunctions,
  batch: INodeExecutionData[],
  startIndex: number,                    // Starting item index
  model: BaseChatModel,
  fallbackModel: BaseChatModel | null,
  memory: BaseChatMemory | undefined,
  response?: EngineResponse<RequestResponseMetadata>,
) {
  const returnData: INodeExecutionData[] = [];
  const requestAggregator = new RequestAggregator();

  // Process items in parallel
  const batchPromises = batch.map(async (_item, batchItemIndex) => {
    // Calculate global item index
    const itemIndex = startIndex + batchItemIndex;

    // Each item has its own context
    const itemContext = await prepareItemContext(ctx, itemIndex, response);

    // Run agent for this item
    return await runAgent(ctx, executor, itemContext, model, memory, response);
  });

  const batchResults = await Promise.all(batchPromises);

  // Aggregate results
  for (const result of batchResults) {
    if ('actions' in result) {
      // More tool calls needed
      requestAggregator.addRequest(result);
    } else {
      // Item finished
      returnData.push(finalizeResult(result));
    }
  }

  return requestAggregator.hasRequests()
    ? requestAggregator.build()
    : [returnData];
}
```

---

## State Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENT STATE FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   Initial State     │
                    │   ────────────────  │
                    │   steps: []         │
                    │   iterationCount: 0 │
                    │   memory: loaded    │
                    └─────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │              ITERATION LOOP                  │
        └─────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐   ┌───────────────────┐
        │  prepareItemContext │   │ checkMaxIterations │
        │  ─────────────────  │   │  ────────────────  │
        │  input: user msg    │   │  count >= max?     │
        │  steps: accumulated │   │  throw if yes      │
        │  tools: available   │   │                    │
        └───────────────────┘   └───────────────────┘
                    │
                    ▼
        ┌───────────────────┐
        │   runAgent        │
        │   ────────────    │
        │   LLM reasoning   │
        │   with context    │
        └───────────────────┘
                    │
            ┌───────┴───────┐
            │               │
            ▼               ▼
    ┌─────────────┐   ┌─────────────┐
    │  TOOL CALL  │   │   FINISH    │
    │  ─────────  │   │   ──────    │
    │  Extract    │   │  Save to    │
    │  actions    │   │  memory     │
    │             │   │             │
    │  Execute    │   │  Return     │
    │  tools      │   │  result     │
    └─────────────┘   └─────────────┘
            │
            ▼
    ┌─────────────────┐
    │ buildSteps      │
    │ ────────────    │
    │ Add new step:   │
    │ - action        │
    │ - observation   │
    │                 │
    │ Accumulate      │
    │ with previous   │
    └─────────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ buildResponseMeta   │
    │ ─────────────────── │
    │ previousRequests++  │
    │ iterationCount++    │
    └─────────────────────┘
            │
            └──────────────┐
                           │
                           ▼
                  ┌────────────────┐
                  │ Next Iteration │
                  │ ────────────── │
                  │ Repeat with    │
                  │ updated state  │
                  └────────────────┘
```

---

## File References

| Component | File Path |
|-----------|-----------|
| RequestResponseMetadata | `packages/@n8n/nodes-langchain/utils/agent-execution/types.ts` |
| buildSteps | `packages/@n8n/nodes-langchain/utils/agent-execution/buildSteps.ts` |
| prepareItemContext | `packages/@n8n/nodes-langchain/.../ToolsAgent/V3/helpers/prepareItemContext.ts` |
| buildResponseMetadata | `packages/@n8n/nodes-langchain/utils/agent-execution/buildResponseMetadata.ts` |
| checkMaxIterations | `packages/@n8n/nodes-langchain/.../ToolsAgent/V3/helpers/checkMaxIterations.ts` |
| loadMemory | `packages/@n8n/nodes-langchain/utils/agent-execution/loadMemory.ts` |
| processHitlResponses | `packages/@n8n/nodes-langchain/.../ToolsAgent/V3/helpers/processHitlResponses.ts` |

---

## Key Takeaways

1. **Steps as Scratchpad**: `previousRequests` accumulates tool calls + observations, forming agent's working memory.

2. **Iteration Tracking**: `iterationCount` prevents infinite loops với configurable max iterations.

3. **Per-Item Isolation**: Each batch item has independent `ItemContext` với riêng steps, input, tools.

4. **Memory Token Limits**: Chat history trimmed to `maxTokensFromMemory` để prevent context overflow.

5. **HITL Integration**: Human approval gates integrated via `HitlMetadata` trong response metadata.

6. **Extended Thinking**: Anthropic/Google thinking blocks preserved qua `anthropic`/`google` metadata fields.
