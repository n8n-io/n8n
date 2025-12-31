# Performance Testing Strategy Research

## Executive Summary

This document synthesizes industry trends, n8n codebase analysis, and recent PR activity to inform a comprehensive performance testing strategy for n8n workflow automation platform.

---

## Part 1: Industry Trends

### Performance Testing Market (2024-2025)

**Market Growth**
- Performance testing market valued at **$926.6M (2024)**, projected to reach **$1.39B by 2033** (4.7% CAGR)
- **83% of Fortune 500 companies** have integrated automated performance testing into CI/CD pipelines
- AI-powered testing tools usage increased **60% between 2022-2024**

**Key Trends**

| Trend | Description | Adoption |
|-------|-------------|----------|
| **Shift-Left Testing** | Integrating performance testing earlier in CI/CD reduces production issues by up to 30% | High |
| **Continuous Performance Monitoring** | Real-time insights throughout SDLC, not just at release points | Growing |
| **AI-Driven Testing** | Automatic anomaly detection, bottleneck prediction, optimization suggestions | 70% using AI failure analysis |
| **Tiered Approach** | Lightweight smoke tests → trend analysis → comprehensive load tests | Best Practice |

**Benefits Observed**
- Performance regressions caught within hours instead of weeks
- 30-50% reduction in performance-related production issues
- 75% average pass rate in continuous testing workflows (TestGrid 2025)

**Challenges**
- Benchmarks are resource-intensive and time-consuming
- No practical systems for seamlessly integrating optimizations into real CI/CD pipelines
- Balancing comprehensive coverage with fast feedback

### No-Code/Low-Code Market Trends (2024-2025)

**Market Growth**
- 84% of organizations already use low/no-code tools
- By 2025, 75% of large enterprises will rely on 4+ platforms
- Gartner forecasts low-code market exceeding **$30B in 2024**

**Key Performance Challenges**

| Challenge | Impact | Prevalence |
|-----------|--------|------------|
| **Scalability** | Small projects work, enterprise-grade workloads struggle | Common |
| **Legacy Integration** | 58% cite as biggest cloud transformation challenge | High |
| **Limited Customization** | Complex workflows hit platform limits | Moderate |
| **Security/Compliance** | Every access point must be secured | Growing |
| **AI Integration** | Only fraction achieve full-scale implementation | Emerging |

**n8n Relevance**
- n8n faces similar challenges: workflows that "try to replace ETL data"
- AI agents and code nodes add memory pressure unique to automation platforms
- Multi-tenant cloud requires strict resource isolation

---

## Part 2: n8n Codebase Analysis

### Performance-Sensitive Areas

#### 1. Execution Repository (High Impact)

**Location**: `packages/@n8n/db/src/repositories/execution.repository.ts`

**Key Observations**:
- Complex query builder patterns with multiple joins (execution data, metadata, annotations)
- Batch size limits: `MAX_UPDATE_BATCH_SIZE = 900` for IN-clause operations
- Hard deletion batch size: `100` executions per cycle
- Special handling for legacy SQLite (non-pooling driver can't use transactions under high concurrency)

**Performance Risks**:
- Large execution tables slow down queries without proper indexing
- `findMultipleExecutions()` with `includeData` option loads heavy JSON blobs
- Metadata filtering uses LEFT JOIN which can be expensive

```typescript
// Line 95-103: Potentially expensive metadata join
qb.leftJoin(ExecutionMetadata, 'md', 'md.executionId = execution.id');
for (const md of filters.metadata) {
  if (md.exactMatch) {
    qb.andWhere('md.key = :key AND md.value = :value', md);
  } else {
    qb.andWhere('md.key = :key AND LOWER(md.value) LIKE LOWER(:value)', md);
  }
}
```

#### 2. Execution Pruning Service (Reliability Critical)

**Location**: `packages/cli/src/services/pruning/executions-pruning.service.ts`

**Architecture**:
- Soft deletion: Every 60 minutes
- Hard deletion: Every 15 minutes, batch of 100
- Under high volume: Hard deletion accelerates to 1-second intervals

**Race Condition Fixed Recently**: PR #23575 addressed race condition on leadership change

**Performance Risks**:
- High execution volume can lead to pruning backlog
- Binary data deletion is I/O intensive
- Leader election changes can cause timing issues

#### 3. Expression Evaluation (CPU Intensive)

**Location**: `packages/workflow/src/expression*.ts` (29 files)

**Key Components**:
- `expression.ts` - Core evaluation
- `expression-evaluator-proxy.ts` - Proxy-based sandboxing
- `expression-sandboxing.ts` - Security boundaries
- `expression-parser.ts` - Parsing logic
- `*-extensions.ts` - Array, string, date, number, object extensions

**Performance Risks**:
- Every node execution evaluates expressions
- Complex expressions with nested calls compound
- Security sandboxing adds overhead

#### 4. Chat Hub Queries (Recently Optimized)

**PR #23397**: "Make Chat db queries faster"
- Main query dropped from **~25ms to 1ms** on 100k sessions
- Added database indices on `lastMessageAt`
- Removed unnecessary relations loading
- Eliminated unnecessary transactions

**Remaining Opportunities** (noted in PR):
- Credential access checks (nontrivial)
- Finding Chat workflows with enabled triggers

#### 5. Canvas Operations (Frontend)

**Location**: `packages/frontend/editor-ui/src/app/composables/useCanvasOperations.ts`

**Performance Risks**:
- Large workflows (100+ nodes) cause rendering slowdowns
- Connection updates trigger full re-renders
- No virtualization for large workflows

### Data Size Sensitivity (SQLite Specific)

**SQLite-Specific Code Paths**:

```typescript
// execution.repository.ts:365-377
const { type: dbType, sqlite: sqliteConfig } = this.globalConfig.database;
if (dbType === 'sqlite' && sqliteConfig.poolSize === 0) {
  // Non-pooling sqlite can't use transactions under high concurrency
  // Falls back to non-atomic inserts
}
```

**Query Patterns Affected by Data Volume**:
- `findSoftDeletedExecutions()` - Grows with execution history
- `softDeletePrunableExecutions()` - Scans by max age/count
- Metadata queries with LIKE patterns

**Repositories with Pagination/Limits**:
- `data-table-rows.repository.ts`
- `chat-session.repository.ts`
- `insights-by-period.repository.ts`
- `insights-raw.repository.ts`

---

## Part 3: Recent PR Analysis (Last 100 Non-Community PRs)

### Performance-Related PRs

| PR | Title | Impact |
|----|-------|--------|
| **#23397** | Make Chat db queries faster | **25ms → 1ms** query optimization |
| **#23575** | Fix race condition in executions pruning on leadership change | Reliability fix |
| **#23580** | Remove flat format for binary data | Code cleanup |
| **#23572** | Remove Pyodide | Memory footprint reduction |
| **#23473** | Allow running get-node-examples tool in parallel | AI builder concurrency |

### Refactoring PRs (Potential Performance Implications)

| PR | Title | Risk Area |
|----|-------|-----------|
| **#23449** | Remove 'beginTransaction' parameter from withTransaction | Transaction behavior change |
| **#23519** | Rework credential access checking on Chat hub | Query pattern change |
| **#23537** | Tighten typing for Python runner | Type safety, no perf impact |
| **#23353** | Remove oversized payloads from logs | Memory optimization |

### Core Changes (High Scrutiny Needed)

| PR | Changes | Files Changed |
|----|---------|---------------|
| **#23590** | Only encrypt partial oauth state | Security-sensitive |
| **#23480** | Use hardened docker images | Infrastructure |
| **#23431** | Add patch method for credentials public API | New API surface |
| **#23463** | All requests to OpenAI include platform header | External API |

### Test Infrastructure PRs (Relevant to Strategy)

| PR | Title | Purpose |
|----|-------|---------|
| **#23690** | Refactor Playwright container capabilities | Test infrastructure |
| **#23579** | Test rebalance | Test optimization |
| **#23534** | Update test metrics, perf test, source control | Metrics collection |
| **#23522** | Add more ChatHub e2e tests | Coverage expansion |
| **#23500** | Codecov bundle analysis | Build metrics |

### Summary Statistics

- **36 PRs** labeled as `core` in last 100 merged
- **3 PRs** with explicit performance keywords
- **12 PRs** touching database/query logic
- **5 PRs** modifying execution-related code

---

## Part 4: Testing Type Matrix

### Where Each Testing Type Applies

| Testing Type | Target Areas | Tool | Data Sensitivity |
|--------------|-------------|------|------------------|
| **Microbenchmarks** | Expression evaluation, JSON serialization, utility functions | Vitest bench | Low (in-memory) |
| **Integration Performance** | Repository queries, pruning service, API endpoints | Jest + testcontainers | Medium (seeded DB) |
| **Load Testing** | Webhook throughput, execution queue, multi-main | k6 / Artillery | High (realistic data volume) |
| **Browser Performance** | Canvas rendering, NDV interactions, form submission | Playwright | Medium (workflow size) |
| **Memory Profiling** | AI agents, code nodes, large data transforms | Node.js inspector | High (workflow complexity) |
| **Reliability Testing** | Backpressure, worker saturation, cron collision | Custom harness | High (production-like) |

### Data Size Sensitivity by Component

| Component | Small Data | Medium Data | Large Data |
|-----------|------------|-------------|------------|
| Expression eval | ~20k ops/s | ~15k ops/s | ~8k ops/s (est) |
| Execution queries | <5ms | 10-50ms | 100ms+ |
| Pruning cycle | <1s | 5-30s | Minutes |
| Canvas render | 60fps | 30fps | <15fps |
| Webhook response | <10ms | 20-50ms | 100ms+ |

### Deployment Profile Impact

| Profile | Memory | Typical Use Case | Testing Priority |
|---------|--------|------------------|------------------|
| **Trial/Starter** | 768MB | Personal, small teams | Memory pressure, startup time |
| **Pro 1** | 1.25GB | SMB | Concurrent executions |
| **Pro 2** | 2.5GB | Growing business | AI agents, data transforms |
| **Enterprise** | 8GB | Large org | Multi-main, high throughput |

---

## Part 5: Recommended Testing Strategy

### Phase 1: Foundation (Current POC)
- [x] Expression engine microbenchmarks
- [x] Regression detection with weekly baselines
- [x] Vitest bench infrastructure

### Phase 2: Query Performance
- [ ] Repository query benchmarks (seeded data)
- [ ] SQLite vs PostgreSQL comparison
- [ ] Execution table growth simulation

### Phase 3: Browser/Canvas
- [ ] Canvas rendering with 10/50/100/500 node workflows
- [ ] NDV interaction timing
- [ ] Workflow list pagination

### Phase 4: System Load
- [ ] Webhook throughput (k6)
- [ ] Execution queue saturation
- [ ] Multi-main sync overhead

### Phase 5: Reliability
- [ ] Backpressure scenarios
- [ ] Worker saturation
- [ ] Cron collision (`:00` timing)
- [ ] Memory pressure (AI agents)

---

## Sources

### Performance Testing Trends
- [DevOps.com - Performance Testing in CI/CD](https://devops.com/integrating-performance-testing-into-ci-cd-a-practical-framework/)
- [Red Hat - Continuous Performance Testing](https://developers.redhat.com/articles/2025/10/15/how-red-hat-has-redefined-continuous-performance-testing)
- [Tweag - Continuous Performance Testing](https://www.tweag.io/blog/2025-10-30-continuous-performance-testing/)
- [TestGrid - 2025 Benchmark Report](https://testgrid.io/blog/continuous-testing-trends-2025/)
- [Market Growth Reports - Performance Testing Market](https://www.marketgrowthreports.com/market-reports/performance-testing-market-110376)

### No-Code/Low-Code Trends
- [Kissflow - Workflow Automation Stats](https://kissflow.com/workflow/workflow-automation-statistics-trends/)
- [Kissflow - No-Code Automation Benchmarks](https://kissflow.com/no-code/no-code-automation-benchmarks-enterprise-stats/)
- [Vellum - No-Code AI Workflow Tools](https://www.vellum.ai/blog/no-code-ai-workflow-automation-tools-guide)
- [CFlow - AI Workflow Automation Trends](https://www.cflowapps.com/ai-workflow-automation-trends/)
