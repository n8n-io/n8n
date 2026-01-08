# n8n Worker Architecture Documentation

This document provides a comprehensive overview of how worker nodes work in n8n's distributed execution system.

## Table of Contents

1. [Overview](#overview)
2. [Worker Architecture](#worker-architecture)
3. [Communication Mechanisms](#communication-mechanisms)
4. [Workflow Execution](#workflow-execution)
5. [Pub/Sub Command System](#pubsub-command-system)
6. [Workflow-to-Worker Routing](#workflow-to-worker-routing)
7. [Key Files Reference](#key-files-reference)

## Overview

n8n workers are **independent processes** that execute workflows in a distributed manner. They connect to shared Redis and database infrastructure to enable horizontal scaling.

### Core Concept

```
┌─────────────┐         Redis          ┌─────────────┐
│ Main Process│  ──────────────────────▶│   Worker    │
│             │   Bull Queue (Jobs)     │  Process    │
│             │   Pub/Sub (Commands)    │             │
│             │◀──────────────────────  │             │
└─────────────┘                         └─────────────┘
        │                                       │
        └───────────── PostgreSQL/MySQL ───────┘
```

## Worker Architecture

### Starting a Worker

Workers are launched via CLI command:

```bash
n8n worker --concurrency=10 --max-jobs=100
```

> Omit `--max-jobs` if you want the worker to continue running indefinitely.

Configuration options:
- `--concurrency`: Number of concurrent jobs (default: 10, min recommended: 5)
- `--max-jobs`: (Optional) Number of jobs to process before shutting down (default: unlimited)
- `N8N_CONCURRENCY_PRODUCTION_LIMIT`: Environment variable override

Example for a single-use worker that should terminate after completing one execution:

```bash
n8n worker --concurrency=1 --max-jobs=1
```

### Worker Initialization Sequence

From `packages/cli/src/commands/worker.ts`:

1. **Constructor**: Forces execution mode to `queue`
2. **init()**: Initializes critical components:
   - Crash journal
   - License system
   - Credentials overwrites
   - Binary data service
   - External hooks
   - Event bus
   - **Scaling service** (queue connection)
   - **Orchestration** (Redis pub/sub)
3. **initScalingService()**:
   - Calls `ScalingService.setupQueue()` - connects to Redis/Bull queue
   - Calls `ScalingService.setupWorker(concurrency, options)` - starts processing jobs and enforces optional job limits
4. **run()**: Optionally starts HTTP server for health checks, metrics, and credential overwrites

### Worker HTTP Server (Optional)

From `packages/cli/src/scaling/worker-server.ts`:

Endpoints:
- `/healthz` - Health check
- `/healthz/readiness` - Database + Redis readiness
- `/metrics` - Prometheus metrics (if enabled)
- `/<endpoint>` - Credential overwrites (POST)

### Scaling Characteristics

- **Horizontal Scaling**: Multiple worker processes can run independently
- **Stateless Workers**: All state in Redis + Database
- **Graceful Shutdown**: Waits for running jobs to complete
- **Job Recovery**: Leader process detects and marks crashed executions
- **Concurrency Control**: Per-worker concurrency limit

## Communication Mechanisms

Workers use **two separate communication channels**:

### 1. Bull Queue (Job Distribution)

**Technology**: Bull.js queue backed by Redis

**Purpose**: Job distribution and job-specific messages

**Queue Setup** (from `packages/cli/src/scaling/scaling.service.ts`):

```typescript
this.queue = new BullQueue(QUEUE_NAME, {
  prefix,
  settings: { maxStalledCount: 0 },
  createClient: (type) => service.createClient({ type: `${type}(bull)` })
});
```

**Queue Name**: `jobs` (constant: `QUEUE_NAME`)

**Job Type**: `job` (constant: `JOB_TYPE_NAME`)

**Job Data Structure** (from `packages/cli/src/scaling/scaling.types.ts`):

```typescript
export type JobData = {
  workflowId: string;
  executionId: string;
  loadStaticData: boolean;
  pushRef?: string;
  streamingEnabled?: boolean;
};
```

**Job Messages** (sent via `job.progress()`):
- `respond-to-webhook` - Worker → Main (webhook response)
- `job-finished` - Worker → Main (execution complete)
- `job-failed` - Worker → Main (execution error)
- `send-chunk` - Worker → Main (streaming data chunk)
- `abort-job` - Main → Worker (cancel execution)

**Adding Jobs** (from `packages/cli/src/scaling/scaling.service.ts:191-214`):

```typescript
async addJob(jobData: JobData, { priority }: { priority: number }) {
  const jobOptions: JobOptions = {
    priority,              // Realtime: 50, Others: 100
    removeOnComplete: true,
    removeOnFail: true,
  };

  await this.queue.add(JOB_TYPE_NAME, jobData, jobOptions);
}
```

**Worker Job Processing** (from `packages/cli/src/scaling/scaling.service.ts:83-109`):

```typescript
setupWorker(concurrency: number, options?: { maxJobs?: number }) {
  let processed = 0;

  void this.queue.process(JOB_TYPE_NAME, concurrency, async (job: Job) => {
    try {
      await this.jobProcessor.processJob(job);
    } finally {
      if (options?.maxJobs && ++processed >= options.maxJobs) {
        options.onMaxJobsReached?.();
      }
    }
  });
}
```

This optional limit is what powers the `--max-jobs` flag surfaced by the `n8n worker` command, making it easy to spin up one-off workers that exit automatically after completing their assigned executions.

### 2. Redis Pub/Sub (System Commands)

**Technology**: Redis Pub/Sub

**Channels**:
- `n8n.commands` - Commands from main to workers (configurable prefix)
- `n8n.worker-response` - Responses from workers to main

**Message Flow**:

```
Publisher.publishCommand()
    ↓
Redis Channel: n8n.commands
    ↓
Subscriber receives message
    ↓
PubSubEventBus.emit(eventName, payload)
    ↓
PubSubRegistry dispatches to @OnPubSubEvent handlers
```

**Components**:

1. **Publisher** (`packages/cli/src/scaling/pubsub/publisher.service.ts`)
   - Publishes commands to Redis channels
   - Adds metadata: `senderId`, `selfSend`, `debounce`

2. **Subscriber** (`packages/cli/src/scaling/pubsub/subscriber.service.ts`)
   - Listens to Redis channels
   - Filters out self-sent messages (unless `selfSend=true`)
   - Applies debouncing (300ms) for non-immediate commands

3. **PubSubEventBus** (`packages/cli/src/scaling/pubsub/pubsub.eventbus.ts`)
   - Typed event emitter for local event dispatching

4. **PubSubRegistry** (`packages/cli/src/scaling/pubsub/pubsub.registry.ts`)
   - Registers handlers decorated with `@OnPubSubEvent`
   - Filters handlers by instance type and role

## Workflow Execution

### Job Processing Flow

From `packages/cli/src/scaling/job-processor.ts`:

```
1. Worker picks job from queue (via Bull's queue.process())
    ↓
2. JobProcessor.processJob(job)
    ↓
3. Fetch execution from database (with workflow data)
    ↓
4. Load workflow static data if needed
    ↓
5. Create Workflow instance
    ↓
6. Setup execution lifecycle hooks (getLifecycleHooksForScalingWorker)
    ↓
7. Execute workflow:
   - Manual mode: ManualExecutionService.runManually()
   - Auto mode: WorkflowExecute.processRunExecutionData()
    ↓
8. Track running job in runningJobs map
    ↓
9. Wait for execution completion
    ↓
10. Send job-finished message via job.progress()
    ↓
11. Remove from runningJobs map
```

### Execution Context

**WorkflowExecute** (from `n8n-core`): Core execution engine

**AdditionalData**: Execution timeout, settings, hooks

**Lifecycle Hooks** (`getLifecycleHooksForScalingWorker()`):
- `sendResponse` handler → sends webhook responses via Bull
- `sendChunk` handler → sends streaming chunks via Bull
- `workflowExecuteAfter` → saves execution results
- Node execution hooks (before/after)

### Key Differences in Worker Hooks

Uses `hookFunctionsSaveWorker()` instead of `hookFunctionsSave()`:
- **Does NOT** delete executions (main process handles cleanup)
- **Does** save workflow static data
- **Does** execute error workflows
- Manual mode workers send push updates to UI

### Key Classes

#### ScalingService
- **Pattern**: Singleton service managing queue infrastructure
- **File**: `packages/cli/src/scaling/scaling.service.ts`
- **Responsibilities**:
  - Queue setup and connection
  - Worker registration (`setupWorker()`)
  - Job management (add, stop, query)
  - Queue recovery (detects dangling executions)
  - Queue metrics collection

#### JobProcessor
- **Pattern**: Job execution handler
- **File**: `packages/cli/src/scaling/job-processor.ts`
- **Responsibilities**:
  - Processing individual jobs
  - Managing running jobs map
  - Stopping jobs on cancellation
  - Encoding/decoding webhook responses
  - Generating running job summaries

#### WorkerStatusService
- **Pattern**: Command/Response via PubSub
- **File**: `packages/cli/src/scaling/worker-status.service.ee.ts`
- **Flow**:
  1. Main sends `get-worker-status` command
  2. Worker receives via `@OnPubSubEvent` decorator
  3. Worker generates status (CPU, memory, running jobs)
  4. Worker publishes response to `worker-response` channel
  5. Main receives and broadcasts to UI via Push

## Pub/Sub Command System

### Available Commands

From `packages/cli/src/scaling/pubsub/pubsub.event-map.ts`:

#### Lifecycle Commands
- `reload-license` - Reload license configuration
- `restart-event-bus` - Restart event bus
- `reload-external-secrets-providers` - Reload secret providers

#### Credential Commands
- `reload-overwrite-credentials` - Update credential overwrites

#### SSO Commands
- `reload-oidc-config` - Reload OIDC configuration
- `reload-saml-config` - Reload SAML configuration
- `reload-sso-provisioning-configuration` - Reload provisioning

#### Community Package Commands
- `community-package-install` - Install package
  - Payload: `{ packageName: string, packageVersion: string }`
- `community-package-update` - Update package
  - Payload: `{ packageName: string, packageVersion: string }`
- `community-package-uninstall` - Uninstall package
  - Payload: `{ packageName: string }`

#### Worker Commands
- `get-worker-id` - Request worker ID
- `get-worker-status` - Request worker status

#### Multi-Main Commands
- `add-webhooks-triggers-and-pollers` - Activate workflow webhooks/triggers
  - Payload: `{ workflowId: string, activeVersionId: string }`
- `remove-triggers-and-pollers` - Deactivate workflow triggers
  - Payload: `{ workflowId: string }`
- `display-workflow-activation` - Show workflow activated
- `display-workflow-deactivation` - Show workflow deactivated
- `display-workflow-activation-error` - Show activation error
- `relay-execution-lifecycle-event` - Forward execution events
- `clear-test-webhooks` - Clear test webhooks

### Special Command Types

From `packages/cli/src/scaling/constants.ts`:

#### SELF_SEND_COMMANDS

Commands sent to sender as well (multi-main coordination):
- `add-webhooks-triggers-and-pollers`
- `remove-triggers-and-pollers`

#### IMMEDIATE_COMMANDS

Commands NOT debounced (processed immediately):
- `add-webhooks-triggers-and-pollers`
- `remove-triggers-and-pollers`
- `relay-execution-lifecycle-event`

All other commands have **300ms debouncing** to reduce duplicate processing.

### Using @OnPubSubEvent Decorator

From `packages/@n8n/decorators/src/pubsub/on-pubsub-event.ts`:

```typescript
@Service()
class MyService {
  // Only runs on main processes
  @OnPubSubEvent('reload-license', { instanceType: 'main' })
  async handleLicenseReload() {
    // Handler logic
  }

  // Only runs on worker processes
  @OnPubSubEvent('get-worker-status', { instanceType: 'worker' })
  async publishWorkerResponse() {
    // Handler logic
  }

  // Only runs on leader main (multi-main setup)
  @OnPubSubEvent('community-package-install', {
    instanceType: 'main',
    instanceRole: 'leader'
  })
  async handlePackageInstall() {
    // Handler logic
  }
}
```

### Example: Worker Status Request Flow

```typescript
// 1. Main requests worker status
// packages/cli/src/scaling/worker-status.service.ee.ts:23-27
async requestWorkerStatus() {
  await this.publisher.publishCommand({
    command: 'get-worker-status'
  });
}

// 2. Publisher adds metadata and sends to Redis
await this.client.publish(
  'n8n:n8n.commands',
  JSON.stringify({
    command: 'get-worker-status',
    senderId: 'main-abc123',
    selfSend: false,
    debounce: true
  })
);

// 3. Subscriber receives and parses message (with 300ms debounce)
this.client.on('message', (channel, str) => {
  const msg = this.parseMessage(str, channel);
  if (msg.debounce) debouncedHandlerFn(msg);
  else handlerFn(msg);
});

// 4. PubSubEventBus emits event
this.pubsubEventBus.emit('get-worker-status', msg.payload);

// 5. Worker handler receives event
@OnPubSubEvent('get-worker-status', { instanceType: 'worker' })
async publishWorkerResponse() {
  await this.publisher.publishWorkerResponse({
    senderId: this.instanceSettings.hostId,
    response: 'response-to-get-worker-status',
    payload: this.generateStatus()  // CPU, memory, running jobs
  });
}

// 6. Main receives response and broadcasts to UI
@OnPubSubEvent('response-to-get-worker-status', { instanceType: 'main' })
handleWorkerStatusResponse(payload: WorkerStatus) {
  this.push.broadcast({
    type: 'sendWorkerStatusMessage',
    data: { workerId: payload.senderId, status: payload }
  });
}
```

## Workflow-to-Worker Routing

### Current Status: NOT SUPPORTED

n8n does **NOT** currently support routing specific workflows to specific workers. All workers are identical and process jobs from a shared queue on a first-available basis (with priority).

### How It Works Now

```
Main Process
    ├─> Queue: "jobs" (all workflows)
    │
    ├─> Worker 1 (processes any workflow)
    ├─> Worker 2 (processes any workflow)
    └─> Worker 3 (processes any workflow)
```

All jobs:
- Go into a single Bull queue: `'jobs'`
- Use a single job type: `'job'`
- Are picked up by any available worker
- Only differentiated by priority (realtime: 50, others: 100)

### Limitations

The `workflowId` IS included in the job data, but it's only used for execution - not for routing decisions.

**No configuration exists for**:
- Assigning workers to specific workflows
- Filtering jobs by workflow at the worker level
- Creating separate job queues per workflow
- Worker pools or job segregation

### What Would Be Required to Implement Routing

#### Option 1: Named Job Types (Recommended)

Bull.js supports **named processors**, which would enable workflow-based routing.

**Changes Required**:

1. **Modify job enqueueing** (`ScalingService.addJob`):
   ```typescript
   // Instead of:
   await queue.add('job', jobData, options)

   // Do:
   await queue.add(`workflow-${workflowId}`, jobData, options)
   // or
   await queue.add(workflowGroup, jobData, options)  // 'heavy-jobs', 'light-jobs'
   ```

2. **Modify worker setup** (`ScalingService.setupWorker`):
   ```typescript
   // Instead of processing all 'job' types:
   queue.process('job', concurrency, processor)

   // Process specific types:
   for (const jobType of configuredJobTypes) {
     queue.process(jobType, concurrency, processor)
   }
   ```

3. **Add worker configuration**:
   ```bash
   # Worker 1 handles specific workflows
   N8N_WORKER_JOB_TYPES=workflow-123,workflow-456 n8n worker

   # Worker 2 handles different workflows
   N8N_WORKER_JOB_TYPES=workflow-789 n8n worker

   # Worker 3 handles all workflows (wildcard)
   N8N_WORKER_JOB_TYPES=* n8n worker
   ```

4. **Files to modify**:
   - `packages/cli/src/scaling/scaling.service.ts` - Update `addJob()` and `setupWorker()`
   - `packages/@n8n/config/src/configs/scaling-mode.config.ts` - Add worker configuration
   - `packages/cli/src/commands/worker.ts` - Read and apply worker configuration
   - `packages/cli/src/scaling/constants.ts` - Support multiple job type names

**Pros**:
- Minimal infrastructure changes
- Uses Bull.js built-in features
- All workers still share the same Redis queue

**Cons**:
- Jobs may stall if no matching worker is available

#### Option 2: Multiple Queues

Create separate Bull queue instances for different workflow groups.

**Changes Required**:
- Instantiate separate Bull queues (per workflow or workflow group)
- Each queue gets its own Redis namespace
- Main process determines which queue to add jobs to based on workflow
- Workers connect to specific queues based on configuration

**Pros**:
- Complete isolation between workflow groups
- Better resource management

**Cons**:
- More complex setup
- Higher Redis resource usage
- Harder to balance load across queues

#### Option 3: Manual Job Filtering (NOT Recommended)

Workers fetch all jobs but check `job.data.workflowId` before processing.

**Cons**:
- Inefficient - jobs sit in queue even if no matching worker exists
- Violates Bull.js design patterns
- Jobs may stall indefinitely

### Current Workarounds

If you need different resource allocation for different workflows:
- Run workers on different machines with different hardware resources
- Use workflow **priorities** (realtime: 50, others: 100)
- Adjust per-worker **concurrency** (`--concurrency`) and optional **lifetime job caps** (`--max-jobs`)

But you still **cannot guarantee** a specific workflow runs on a specific worker.

## Key Files Reference

### Worker Core
- `packages/cli/src/commands/worker.ts` - Main worker command entry point
- `packages/cli/src/scaling/worker-server.ts` - HTTP server for worker endpoints
- `packages/cli/src/scaling/worker-status.service.ee.ts` - Worker status monitoring

### Queue & Scaling
- `packages/cli/src/scaling/scaling.service.ts` - Queue and worker management
- `packages/cli/src/scaling/job-processor.ts` - Job execution logic
- `packages/cli/src/scaling/scaling.types.ts` - Type definitions
- `packages/cli/src/scaling/constants.ts` - Queue constants

### Pub/Sub System
- `packages/cli/src/scaling/pubsub/publisher.service.ts` - Redis pubsub publishing
- `packages/cli/src/scaling/pubsub/subscriber.service.ts` - Redis pubsub subscription
- `packages/cli/src/scaling/pubsub/pubsub.registry.ts` - Event handler registration
- `packages/cli/src/scaling/pubsub/pubsub.eventbus.ts` - Local event bus
- `packages/cli/src/scaling/pubsub/pubsub.types.ts` - Pub/Sub type definitions
- `packages/cli/src/scaling/pubsub/pubsub.event-map.ts` - Event payload mapping

### Decorators
- `packages/@n8n/decorators/src/pubsub/on-pubsub-event.ts` - Event handler decorator
- `packages/@n8n/decorators/src/pubsub/pubsub-metadata.ts` - Metadata storage

### Configuration
- `packages/@n8n/config/src/configs/scaling-mode.config.ts` - Scaling configuration

### Example Services Using Pub/Sub
- `packages/cli/src/credentials-overwrites.ts` - Credential overwrites
- `packages/cli/src/modules/community-packages/community-packages.service.ts` - Package management
- `packages/cli/src/license.ts` - License management
- `packages/cli/src/active-workflow-manager.ts` - Workflow activation

## Design Patterns

### Key Architectural Patterns

1. **Dependency Injection**: Uses `@n8n/di` container throughout
2. **Decorator-based Configuration**: `@OnPubSubEvent`, `@Service`, `@Command`
3. **Event-Driven**: Internal event bus for lifecycle hooks
4. **Queue-based Distribution**: Bull.js for job distribution
5. **Pub/Sub for Coordination**: Redis pub/sub for cross-process communication
6. **Hook System**: Extensible lifecycle hooks for execution stages
7. **Job Progress Streaming**: Bull's progress mechanism for bidirectional communication
8. **Publisher/Subscriber Pattern**: Mediator pattern with pub/sub

### Benefits

- **Decoupled Communication**: Processes don't need direct connections
- **Horizontal Scaling**: Add workers without code changes
- **Multi-Main Support**: Coordinate between multiple main processes
- **Type Safety**: TypeScript ensures correct payloads
- **Flexible Filtering**: Route events by instance type/role
- **Resilient**: Redis handles message delivery and queuing
- **Stateless Workers**: All state persisted externally
- **Graceful Shutdown**: Jobs complete before process exits

---

*Document created: 2026-01-02*
*Based on n8n codebase investigation*
