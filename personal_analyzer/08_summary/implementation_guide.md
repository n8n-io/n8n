# Implementation Guide - Áp dụng patterns vào project

## TL;DR
Hướng dẫn áp dụng các patterns từ n8n vào project của bạn. Focus vào: Node-based plugin system, Expression evaluation, Queue-based scaling, LangChain integration. Step-by-step với code examples.

---

## 1. Building a Plugin System

### Core Interfaces

```typescript
// Define plugin interface
interface IPlugin {
  name: string;
  version: number;
  description: IPluginDescription;
  execute(context: IExecutionContext): Promise<IPluginOutput>;
}

interface IPluginDescription {
  displayName: string;
  inputs: string[];
  outputs: string[];
  properties: IProperty[];
}

interface IProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'options';
  default?: any;
  required?: boolean;
  options?: { name: string; value: any }[];
}
```

### Plugin Registry

```typescript
class PluginRegistry {
  private plugins: Map<string, IPlugin> = new Map();

  register(plugin: IPlugin): void {
    const key = `${plugin.name}:${plugin.version}`;
    this.plugins.set(key, plugin);
    this.plugins.set(plugin.name, plugin);  // Latest
  }

  get(name: string, version?: number): IPlugin | undefined {
    const key = version ? `${name}:${version}` : name;
    return this.plugins.get(key);
  }

  async loadFromDirectory(dir: string): Promise<void> {
    const files = await glob(`${dir}/**/*.plugin.{ts,js}`);
    for (const file of files) {
      const module = await import(file);
      const PluginClass = module.default;
      const instance = new PluginClass();
      this.register(instance);
    }
  }
}
```

### Plugin Implementation

```typescript
// Example plugin
export default class HttpPlugin implements IPlugin {
  name = 'http';
  version = 1;

  description: IPluginDescription = {
    displayName: 'HTTP Request',
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      { name: 'url', type: 'string', required: true },
      { name: 'method', type: 'options', options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
      ], default: 'GET' },
    ],
  };

  async execute(context: IExecutionContext): Promise<IPluginOutput> {
    const url = context.getParameter('url');
    const method = context.getParameter('method');

    const response = await fetch(url, { method });
    const data = await response.json();

    return { data: [{ json: data }] };
  }
}
```

---

## 2. Expression Evaluation

### Simple Expression Engine

```typescript
class ExpressionEngine {
  private context: Record<string, any>;

  constructor(context: Record<string, any>) {
    this.context = context;
  }

  evaluate(expression: string): any {
    // Extract expression: {{ $json.name }} -> $json.name
    const match = expression.match(/\{\{\s*(.+?)\s*\}\}/);
    if (!match) return expression;

    const expr = match[1];

    // Create safe evaluation context
    const sandbox = {
      $json: this.context.json,
      $item: this.context.item,
      $node: this.context.nodeOutputs,
      $now: new Date(),
      // Add more context as needed
    };

    // Safe evaluation (use vm2 or similar in production)
    try {
      const fn = new Function(...Object.keys(sandbox), `return ${expr}`);
      return fn(...Object.values(sandbox));
    } catch (error) {
      throw new Error(`Expression error: ${expr}`);
    }
  }

  resolveParameters(params: Record<string, any>, itemIndex: number): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.includes('{{')) {
        resolved[key] = this.evaluate(value);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }
}
```

---

## 3. Execution Engine

### Simple Workflow Executor

```typescript
class WorkflowExecutor {
  private registry: PluginRegistry;
  private runData: Map<string, IPluginOutput[]> = new Map();

  constructor(registry: PluginRegistry) {
    this.registry = registry;
  }

  async execute(workflow: IWorkflow): Promise<IExecutionResult> {
    const stack: IExecutionItem[] = [];
    const waiting: Map<string, IWaitingData> = new Map();

    // Find start node
    const startNode = this.findStartNode(workflow);
    stack.push({ node: startNode, input: [{ json: {} }] });

    // Main execution loop
    while (stack.length > 0) {
      const item = stack.shift()!;
      const { node, input } = item;

      // Get plugin
      const plugin = this.registry.get(node.type);
      if (!plugin) throw new Error(`Unknown plugin: ${node.type}`);

      // Create context
      const context = new ExecutionContext(
        node,
        input,
        this.runData,
        workflow,
      );

      // Execute
      const output = await plugin.execute(context);

      // Store result
      this.runData.set(node.name, [output]);

      // Queue successors
      const successors = this.getSuccessors(workflow, node.name);
      for (const successor of successors) {
        const inputCount = this.getInputCount(workflow, successor);

        if (inputCount > 1) {
          // Multi-input node - check if all inputs ready
          if (!waiting.has(successor)) {
            waiting.set(successor, { inputs: new Array(inputCount).fill(null) });
          }
          const waitingData = waiting.get(successor)!;
          const inputIndex = this.getConnectionInputIndex(workflow, node.name, successor);
          waitingData.inputs[inputIndex] = output.data;

          if (waitingData.inputs.every(i => i !== null)) {
            stack.push({ node: workflow.nodes[successor], input: waitingData.inputs.flat() });
            waiting.delete(successor);
          }
        } else {
          stack.push({ node: workflow.nodes[successor], input: output.data });
        }
      }
    }

    return { runData: Object.fromEntries(this.runData) };
  }
}
```

---

## 4. Queue-Based Scaling

### Bull Queue Integration

```typescript
import Bull from 'bull';

class ExecutionQueue {
  private queue: Bull.Queue;

  constructor(redisUrl: string) {
    this.queue = new Bull('workflow-execution', redisUrl);
  }

  async addJob(workflowId: string, input: any): Promise<string> {
    const job = await this.queue.add({
      workflowId,
      input,
      timestamp: Date.now(),
    });
    return job.id.toString();
  }

  startWorker(executor: WorkflowExecutor, concurrency: number = 5): void {
    this.queue.process(concurrency, async (job) => {
      const { workflowId, input } = job.data;

      // Load workflow
      const workflow = await loadWorkflow(workflowId);

      // Execute
      const result = await executor.execute(workflow);

      // Save result
      await saveExecutionResult(job.id, result);

      return result;
    });
  }
}

// Usage
const queue = new ExecutionQueue('redis://localhost:6379');

// API server adds jobs
app.post('/execute', async (req, res) => {
  const jobId = await queue.addJob(req.body.workflowId, req.body.input);
  res.json({ jobId });
});

// Workers process jobs
queue.startWorker(executor, 10);  // 10 concurrent
```

---

## 5. LangChain Integration

### LLM Node Pattern

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

// Connection types
const ConnectionTypes = {
  Main: 'main',
  LLM: 'llm',
  Tool: 'tool',
  Memory: 'memory',
};

// LLM Provider Plugin
class OpenAIPlugin implements IPlugin {
  name = 'openai';
  description = {
    outputs: [ConnectionTypes.LLM],  // Outputs LLM, not data
    properties: [
      { name: 'model', type: 'options', options: [
        { name: 'GPT-4', value: 'gpt-4' },
        { name: 'GPT-3.5', value: 'gpt-3.5-turbo' },
      ]},
      { name: 'temperature', type: 'number', default: 0.7 },
    ],
  };

  async supplyResource(context: IExecutionContext): Promise<BaseChatModel> {
    const apiKey = await context.getCredential('openaiApiKey');
    const model = context.getParameter('model');
    const temperature = context.getParameter('temperature');

    return new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      temperature,
    });
  }
}

// Agent Plugin that consumes LLM
class AgentPlugin implements IPlugin {
  name = 'agent';
  description = {
    inputs: [ConnectionTypes.Main, ConnectionTypes.LLM, ConnectionTypes.Tool],
    outputs: [ConnectionTypes.Main],
  };

  async execute(context: IExecutionContext): Promise<IPluginOutput> {
    // Get LLM from connection
    const llm = await context.getInputResource(ConnectionTypes.LLM);
    const tools = await context.getInputResource(ConnectionTypes.Tool) ?? [];

    const input = context.getInputData();
    const prompt = context.getParameter('prompt');

    // Use LangChain agent
    const executor = await initializeAgentExecutorWithOptions(
      tools,
      llm,
      { agentType: 'openai-functions' }
    );

    const result = await executor.invoke({ input: prompt });

    return { data: [{ json: { output: result.output } }] };
  }
}
```

---

## Quick Start Template

```typescript
// 1. Setup
const registry = new PluginRegistry();
await registry.loadFromDirectory('./plugins');

const executor = new WorkflowExecutor(registry);
const queue = new ExecutionQueue(process.env.REDIS_URL);

// 2. Define workflow
const workflow: IWorkflow = {
  nodes: {
    'trigger': { type: 'webhook', parameters: {} },
    'openai': { type: 'openai', parameters: { model: 'gpt-4' } },
    'agent': { type: 'agent', parameters: { prompt: '{{ $json.message }}' } },
    'respond': { type: 'response', parameters: {} },
  },
  connections: {
    'trigger': { main: [{ node: 'agent', input: 0 }] },
    'openai': { llm: [{ node: 'agent', input: 1 }] },
    'agent': { main: [{ node: 'respond', input: 0 }] },
  },
};

// 3. Execute
const result = await executor.execute(workflow);
console.log(result);
```

---

## Key Implementation Tips

1. **Start Simple**: Begin với basic node types, add complexity gradually.

2. **Type Everything**: Define interfaces early, enforce với TypeScript.

3. **Test Plugins Independently**: Each plugin should be unit testable.

4. **Use Existing Libraries**: LangChain for AI, Bull for queues.

5. **Plan for Scale**: Design with queue mode in mind from start.

---

## File References

| Component | n8n Reference |
|-----------|---------------|
| Plugin Interface | `packages/workflow/src/interfaces.ts` |
| Execution Engine | `packages/core/src/execution-engine/workflow-execute.ts` |
| Queue System | `packages/cli/src/scaling/` |
| LangChain Nodes | `packages/@n8n/nodes-langchain/` |
