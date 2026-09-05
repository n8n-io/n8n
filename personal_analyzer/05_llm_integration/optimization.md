# LLM Optimization - Caching, Streaming, Rate Limits

## TL;DR
n8n optimize LLM calls qua: **Streaming** (real-time response), **Caching** (LangChain cache layer), **Rate Limiting** (provider-specific handling), và **Token Management** (context window control). AI Workflow Builder dùng Anthropic prompt caching cho efficiency.

---

## Streaming

```typescript
// packages/@n8n/nodes-langchain/nodes/llms/LLMOpenAi/LLMOpenAi.node.ts

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const streaming = this.getNodeParameter('options.streaming', 0, false);

  if (streaming) {
    const stream = await llm.stream(prompt);
    let fullResponse = '';

    for await (const chunk of stream) {
      fullResponse += chunk.content;

      // Send chunk to UI in real-time
      this.sendMessageToUI({
        type: 'stream',
        nodeId: this.getNode().id,
        content: chunk.content,
      });
    }

    return [[{ json: { response: fullResponse } }]];
  }

  // Non-streaming
  const response = await llm.invoke(prompt);
  return [[{ json: { response: response.content } }]];
}
```

---

## Caching

```typescript
// LangChain cache integration
import { InMemoryCache } from 'langchain/cache';

// Global cache (in-memory)
const cache = new InMemoryCache();

// Create LLM with caching
const llm = new ChatOpenAI({
  modelName: 'gpt-4',
  cache,  // Enable caching
});

// Identical prompts return cached response
// Cache key: model + prompt hash
```

### Anthropic Prompt Caching

```typescript
// packages/@n8n/ai-workflow-builder.ee/src/llm-config.ts

export function createLLM(): ChatAnthropic {
  return new ChatAnthropic({
    model: 'claude-sonnet-4-20250514',
    anthropicApiKey: config.apiKey,

    // Enable prompt caching beta
    clientOptions: {
      defaultHeaders: {
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
    },
  });
}

// System prompt cached server-side
// Reduces cost and latency for repeated calls
```

---

## Rate Limiting

```typescript
// packages/@n8n/nodes-langchain/utils/rate-limiter.ts

class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );

    if (this.requests.length >= this.maxRequests) {
      // Wait until oldest request expires
      const waitTime = this.requests[0] + this.windowMs - now;
      await sleep(waitTime);
      return this.acquire();
    }

    this.requests.push(now);
  }
}

// Usage in node
const rateLimiter = new RateLimiter(60, 60000);  // 60 req/min

async execute() {
  await rateLimiter.acquire();
  const response = await llm.invoke(prompt);
}
```

### Provider Error Handling

```typescript
// Handle rate limit errors from providers
try {
  const response = await llm.invoke(prompt);
} catch (error) {
  if (error.status === 429) {
    // Rate limited
    const retryAfter = error.headers?.['retry-after'] ?? 60;
    await sleep(retryAfter * 1000);

    // Retry
    return llm.invoke(prompt);
  }
  throw error;
}
```

---

## Token Management

```typescript
// packages/@n8n/nodes-langchain/utils/token-counter.ts

import { encodingForModel } from 'js-tiktoken';

export function countTokens(text: string, model: string): number {
  const encoding = encodingForModel(model);
  return encoding.encode(text).length;
}

export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  model: string,
): string {
  const encoding = encodingForModel(model);
  const tokens = encoding.encode(text);

  if (tokens.length <= maxTokens) {
    return text;
  }

  // Truncate and decode
  const truncated = tokens.slice(0, maxTokens);
  return encoding.decode(truncated);
}

// Usage
const prompt = truncateToTokenLimit(longText, 3000, 'gpt-4');
```

---

## Batching Requests

```typescript
// Process multiple items with batching
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const batchSize = this.getNodeParameter('batchSize', 0, 10) as number;
  const returnData: INodeExecutionData[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Parallel processing within batch
    const results = await Promise.all(
      batch.map(async (item, idx) => {
        const prompt = this.getNodeParameter('prompt', i + idx) as string;
        return llm.invoke(prompt);
      })
    );

    returnData.push(...results.map(r => ({ json: { response: r.content } })));

    // Wait between batches
    if (i + batchSize < items.length) {
      await sleep(1000);  // 1 second delay
    }
  }

  return [returnData];
}
```

---

## File References

| Component | File Path |
|-----------|-----------|
| LLM Nodes | `packages/@n8n/nodes-langchain/nodes/llms/` |
| AI Builder | `packages/@n8n/ai-workflow-builder.ee/src/llm-config.ts` |
| Token Utils | `packages/@n8n/nodes-langchain/utils/` |

---

## Key Takeaways

1. **Streaming UX**: Real-time response display improves perceived performance.

2. **Prompt Caching**: Anthropic's feature reduces cost for repeated system prompts.

3. **Rate Limit Handling**: Built-in retry logic with exponential backoff.

4. **Token Counting**: Pre-check token counts to avoid context overflow.

5. **Batching**: Process items in batches với delays to respect rate limits.
