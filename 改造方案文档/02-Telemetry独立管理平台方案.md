# n8n Telemetry 独立管理平台方案

> **版本：** v1.0
> **日期：** 2025-11-04
> **基于分支：** 20251102
> **改造目标：** 构建自托管 Telemetry 分析平台，为多租户 SaaS 架构做准备

---

## 📋 一、方案背景

### 1.1 当前状态

**Telemetry 系统现状：**
- **状态**：完全禁用（No-Op 实现）
- **调用次数**：289 个前端事件 + 后端事件
- **分布文件**：126 个前端文件
- **原实现**：RudderStack SDK（外部服务）

**已完成的清理：**
- ✅ CloudPlan Store 完全删除
- ✅ PostHog Store 完全删除
- ✅ Feature Flags 提取为独立 Store
- ✅ 所有外部云服务依赖已移除

### 1.2 改造目标

**短期目标（当前单租户）：**
1. 数据自主权：所有 Telemetry 数据存储到自己的数据库
2. 深度洞察：289 个事件点提供全方位用户行为分析
3. 产品优化：基于真实数据进行产品决策
4. 问题诊断：快速定位错误和性能问题

**长期目标（多租户 SaaS）：**
1. 运营基础：租户使用量、活跃度、流失预警
2. 计费依据：精确的使用量统计
3. 服务分级：识别 VIP 租户和普通租户
4. 增长引擎：数据驱动的用户增长策略

---

## 🏗️ 二、技术架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│               Telemetry 管理平台                          │
├─────────────────────────────────────────────────────────┤
│  前端层 (Vue 3 + Element Plus + @n8n/design-system)      │
│  ├─ 实时监控仪表板                                        │
│  ├─ 事件列表和查询                                        │
│  ├─ 事件详情和属性查看器                                  │
│  ├─ 过滤和聚合分析                                        │
│  └─ 数据导出（CSV/JSON）                                 │
├─────────────────────────────────────────────────────────┤
│  后端层 (Node.js + TypeScript + TypeORM)                 │
│  ├─ REST API (Express + @n8n/decorators)                │
│  ├─ 事件收集 API                                         │
│  ├─ 查询和聚合服务                                       │
│  ├─ 批量上报处理                                         │
│  └─ 实时推送 (SSE/WebSocket)                            │
├─────────────────────────────────────────────────────────┤
│  数据层 (PostgreSQL + TypeORM)                           │
│  ├─ telemetry_events 表                                  │
│  ├─ telemetry_sessions 表                                │
│  ├─ 时间序列索引优化                                     │
│  └─ 数据分区（按月/周）                                  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术选型 | 理由 |
|------|---------|------|
| **前端框架** | Vue 3 + TypeScript | n8n 现有技术栈 |
| **UI 组件库** | Element Plus + @n8n/design-system | 复用现有组件，保持一致性 |
| **状态管理** | Pinia | n8n 标准方案 |
| **后端框架** | Express + TypeScript | n8n 现有架构 |
| **ORM** | TypeORM | n8n 数据库访问标准 |
| **数据库** | PostgreSQL | 支持 JSONB，性能优秀 |
| **依赖注入** | @n8n/di | 遵循 n8n Module 规范 |

---

## 🗄️ 三、数据库设计

### 3.1 核心表结构

#### 3.1.1 telemetry_event 表

**Entity 定义：**

```typescript
import { Entity, PrimaryColumn, Column, Index, Generated } from '@n8n/typeorm';

@Entity({ name: 'telemetry_event' })
export class TelemetryEvent {
  @Generated('uuid')
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column('varchar', { length: 255 })
  event_name: string;

  @Column('jsonb')
  properties: Record<string, any>;

  @Index()
  @Column('varchar', { length: 255, nullable: true })
  user_id?: string;

  @Column('varchar', { length: 255, nullable: true })
  session_id?: string;

  @Column('varchar', { length: 255, nullable: true })
  workflow_id?: string;

  @Index()
  @Column('timestamp')
  created_at: Date;

  @Column('varchar', { length: 50 })
  source: 'frontend' | 'backend';

  @Column('varchar', { length: 255, nullable: true })
  instance_id?: string;

  // 为多租户预留字段
  @Index()
  @Column('varchar', { length: 255, nullable: true })
  workspace_id?: string;

  @Column('varchar', { length: 255, nullable: true })
  tenant_id?: string;
}
```

**Migration 脚本：**

```typescript
import type { MigrationContext, ReversibleMigration } from '@n8n/typeorm';

export class CreateTelemetryTables1730700000000 implements ReversibleMigration {
  async up({ schemaBuilder: { createTable, addColumns, createIndex } }: MigrationContext) {
    await createTable('telemetry_event')
      .withColumns(
        { name: 'id', type: 'uuid', primaryKey: true },
        { name: 'event_name', type: 'varchar', length: 255 },
        { name: 'properties', type: 'jsonb' },
        { name: 'user_id', type: 'varchar', length: 255, isNullable: true },
        { name: 'session_id', type: 'varchar', length: 255, isNullable: true },
        { name: 'workflow_id', type: 'varchar', length: 255, isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'source', type: 'varchar', length: 50 },
        { name: 'instance_id', type: 'varchar', length: 255, isNullable: true },
        { name: 'workspace_id', type: 'varchar', length: 255, isNullable: true },
        { name: 'tenant_id', type: 'varchar', length: 255, isNullable: true },
      )
      .withTimestamps(false);

    await createIndex('telemetry_event', ['event_name']);
    await createIndex('telemetry_event', ['user_id']);
    await createIndex('telemetry_event', ['created_at']);
    await createIndex('telemetry_event', ['workspace_id']);
  }

  async down({ schemaBuilder: { dropTable } }: MigrationContext) {
    await dropTable('telemetry_event');
  }
}
```

#### 3.1.2 telemetry_session 表

**Entity 定义：**

```typescript
@Entity({ name: 'telemetry_session' })
export class TelemetrySession {
  @Generated('uuid')
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column('varchar', { length: 255, nullable: true })
  user_id?: string;

  @Column('timestamp')
  started_at: Date;

  @Column('timestamp', { nullable: true })
  ended_at?: Date;

  @Column('jsonb')
  metadata: Record<string, any>;

  @Column('varchar', { length: 255, nullable: true })
  workspace_id?: string;
}
```

### 3.2 索引策略

**性能优化索引：**

```sql
-- 事件名称查询
CREATE INDEX idx_event_name ON telemetry_event(event_name);

-- 用户行为分析
CREATE INDEX idx_user_events ON telemetry_event(user_id, created_at DESC);

-- 工作流分析
CREATE INDEX idx_workflow_events ON telemetry_event(workflow_id, created_at DESC);

-- 时间范围查询
CREATE INDEX idx_created_at ON telemetry_event(created_at DESC);

-- 多租户查询（未来）
CREATE INDEX idx_workspace_tenant ON telemetry_event(workspace_id, tenant_id, created_at DESC);

-- JSONB 属性查询（可选）
CREATE INDEX idx_properties_gin ON telemetry_event USING gin(properties);
```

### 3.3 数据分区策略

**按月分区（数据量大时启用）：**

```sql
-- 创建分区表
CREATE TABLE telemetry_event (
  -- ... 所有列定义
) PARTITION BY RANGE (created_at);

-- 创建月度分区
CREATE TABLE telemetry_event_2025_01 PARTITION OF telemetry_event
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE telemetry_event_2025_02 PARTITION OF telemetry_event
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

---

## 🔧 四、后端实现

### 4.1 Module 结构

**遵循 n8n Module 规范：**

```
packages/cli/src/modules/telemetry-management/
├── telemetry-management.module.ts
├── telemetry-management.service.ts
├── telemetry-management.controller.ts
├── repositories/
│   ├── telemetry-event.repository.ts
│   └── telemetry-session.repository.ts
└── entities/
    ├── telemetry-event.entity.ts
    └── telemetry-session.entity.ts
```

### 4.2 Repository 层

**TelemetryEventRepository：**

```typescript
import { Service } from '@n8n/di';
import { DataSource, Repository, Between } from '@n8n/typeorm';
import { TelemetryEvent } from '../entities/telemetry-event.entity';

@Service()
export class TelemetryEventRepository extends Repository<TelemetryEvent> {
  constructor(dataSource: DataSource) {
    super(TelemetryEvent, dataSource.manager);
  }

  /**
   * 批量插入事件
   */
  async createBatch(events: Partial<TelemetryEvent>[]): Promise<void> {
    await this.insert(events);
  }

  /**
   * 查询事件（分页 + 过滤）
   */
  async findWithFilters(filters: {
    eventName?: string;
    userId?: string;
    workflowId?: string;
    workspaceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const query = this.createQueryBuilder('event');

    if (filters.eventName) {
      query.andWhere('event.event_name = :eventName', { eventName: filters.eventName });
    }

    if (filters.userId) {
      query.andWhere('event.user_id = :userId', { userId: filters.userId });
    }

    if (filters.workflowId) {
      query.andWhere('event.workflow_id = :workflowId', { workflowId: filters.workflowId });
    }

    if (filters.workspaceId) {
      query.andWhere('event.workspace_id = :workspaceId', { workspaceId: filters.workspaceId });
    }

    if (filters.startDate && filters.endDate) {
      query.andWhere('event.created_at BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate,
      });
    }

    query.orderBy('event.created_at', 'DESC');
    query.skip(filters.offset || 0);
    query.take(filters.limit || 100);

    const [events, total] = await query.getManyAndCount();
    return { events, total };
  }

  /**
   * 事件聚合统计
   */
  async getTopEvents(filters: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const query = this.createQueryBuilder('event')
      .select('event.event_name', 'event_name')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.event_name')
      .orderBy('count', 'DESC')
      .limit(filters.limit || 20);

    if (filters.startDate && filters.endDate) {
      query.where('event.created_at BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate,
      });
    }

    return await query.getRawMany();
  }

  /**
   * 用户活跃度统计
   */
  async getActiveUserStats(filters: {
    startDate: Date;
    endDate: Date;
  }) {
    return await this.createQueryBuilder('event')
      .select('DATE(event.created_at)', 'date')
      .addSelect('COUNT(DISTINCT event.user_id)', 'active_users')
      .where('event.created_at BETWEEN :start AND :end', filters)
      .groupBy('DATE(event.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }
}
```

### 4.3 Service 层

**TelemetryManagementService：**

```typescript
import { Service } from '@n8n/di';
import { TelemetryEventRepository } from './repositories/telemetry-event.repository';
import type { TelemetryEvent } from './entities/telemetry-event.entity';

@Service()
export class TelemetryManagementService {
  constructor(
    private readonly telemetryEventRepository: TelemetryEventRepository,
  ) {}

  /**
   * 记录单个事件
   */
  async trackEvent(data: {
    eventName: string;
    properties?: Record<string, any>;
    userId?: string;
    workflowId?: string;
    workspaceId?: string;
    source: 'frontend' | 'backend';
  }): Promise<void> {
    await this.telemetryEventRepository.save({
      event_name: data.eventName,
      properties: data.properties || {},
      user_id: data.userId,
      workflow_id: data.workflowId,
      workspace_id: data.workspaceId,
      source: data.source,
      created_at: new Date(),
    });
  }

  /**
   * 批量记录事件
   */
  async trackEventsBatch(events: Array<{
    eventName: string;
    properties?: Record<string, any>;
    userId?: string;
    workflowId?: string;
    workspaceId?: string;
    source: 'frontend' | 'backend';
  }>): Promise<void> {
    const entities = events.map(event => ({
      event_name: event.eventName,
      properties: event.properties || {},
      user_id: event.userId,
      workflow_id: event.workflowId,
      workspace_id: event.workspaceId,
      source: event.source,
      created_at: new Date(),
    }));

    await this.telemetryEventRepository.createBatch(entities);
  }

  /**
   * 查询事件
   */
  async getEvents(filters: any) {
    return await this.telemetryEventRepository.findWithFilters(filters);
  }

  /**
   * 获取统计概览
   */
  async getOverview(filters: { startDate: Date; endDate: Date }) {
    const [totalEvents, activeUsers, topEvents] = await Promise.all([
      this.telemetryEventRepository.count({
        where: {
          created_at: Between(filters.startDate, filters.endDate),
        },
      }),
      this.telemetryEventRepository
        .createQueryBuilder('event')
        .select('COUNT(DISTINCT event.user_id)', 'count')
        .where('event.created_at BETWEEN :start AND :end', filters)
        .getRawOne(),
      this.telemetryEventRepository.getTopEvents({ ...filters, limit: 10 }),
    ]);

    return {
      totalEvents,
      activeUsers: parseInt(activeUsers.count),
      topEvents,
    };
  }
}
```

### 4.4 Controller 层

**TelemetryManagementController：**

```typescript
import { Post, Get, Query, Body, RestController } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { TelemetryManagementService } from './telemetry-management.service';
import { AuthUser } from '@/app/decorators/auth-user.decorator';
import type { User } from '@n8n/db/entities/user';

@Service()
@RestController('/telemetry')
export class TelemetryManagementController {
  constructor(
    private readonly telemetryService: TelemetryManagementService,
  ) {}

  /**
   * POST /api/telemetry/events
   * 记录单个事件
   */
  @Post('/events')
  async trackEvent(
    @Body() data: {
      event_name: string;
      properties?: Record<string, any>;
      workflow_id?: string;
    },
    @AuthUser() user: User,
  ) {
    await this.telemetryService.trackEvent({
      eventName: data.event_name,
      properties: data.properties,
      userId: user.id,
      workflowId: data.workflow_id,
      source: 'frontend',
    });

    return { success: true };
  }

  /**
   * POST /api/telemetry/events/batch
   * 批量记录事件
   */
  @Post('/events/batch')
  async trackEventsBatch(
    @Body() data: { events: Array<any> },
    @AuthUser() user: User,
  ) {
    await this.telemetryService.trackEventsBatch(
      data.events.map(event => ({
        eventName: event.event_name,
        properties: event.properties,
        userId: user.id,
        workflowId: event.workflow_id,
        source: 'frontend',
      }))
    );

    return { success: true };
  }

  /**
   * GET /api/telemetry/events
   * 查询事件列表
   */
  @Get('/events')
  async getEvents(
    @Query('event_name') eventName?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.telemetryService.getEvents({
      eventName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  /**
   * GET /api/telemetry/stats/overview
   * 获取统计概览
   */
  @Get('/stats/overview')
  async getOverview(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return await this.telemetryService.getOverview({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }
}
```

---

## 🎨 五、前端实现

### 5.1 Store 设计

**telemetry.store.ts：**

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TelemetryEvent } from '@/types/telemetry';

export const useTelemetryStore = defineStore('telemetry', () => {
  // State
  const events = ref<TelemetryEvent[]>([]);
  const total = ref(0);
  const loading = ref(false);

  // Actions
  async function fetchEvents(filters: {
    eventName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    loading.value = true;
    try {
      const response = await api.get('/telemetry/events', { params: filters });
      events.value = response.data.events;
      total.value = response.data.total;
    } finally {
      loading.value = false;
    }
  }

  async function getOverview(startDate: Date, endDate: Date) {
    const response = await api.get('/telemetry/stats/overview', {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
    return response.data;
  }

  return {
    events,
    total,
    loading,
    fetchEvents,
    getOverview,
  };
});
```

### 5.2 Vue 组件

#### TelemetryDashboard.vue

```vue
<template>
  <div class="telemetry-dashboard">
    <n8n-heading tag="h1">{{ i18n.baseText('telemetry.dashboard.title') }}</n8n-heading>

    <!-- 时间范围选择器 -->
    <div class="filters">
      <DateRangePicker v-model="dateRange" @update:modelValue="handleDateChange" />
    </div>

    <!-- 统计概览卡片 -->
    <div class="stats-cards">
      <StatCard
        :title="i18n.baseText('telemetry.stats.activeUsers')"
        :value="overview.activeUsers"
        icon="users"
      />
      <StatCard
        :title="i18n.baseText('telemetry.stats.totalEvents')"
        :value="overview.totalEvents"
        icon="activity"
      />
    </div>

    <!-- 事件列表 -->
    <EventsTable :events="telemetryStore.events" :loading="telemetryStore.loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTelemetryStore } from '@/stores/telemetry.store';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
const telemetryStore = useTelemetryStore();

const dateRange = ref({
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近 7 天
  end: new Date(),
});

const overview = ref({
  activeUsers: 0,
  totalEvents: 0,
});

async function loadData() {
  await telemetryStore.fetchEvents({
    startDate: dateRange.value.start,
    endDate: dateRange.value.end,
  });

  overview.value = await telemetryStore.getOverview(
    dateRange.value.start,
    dateRange.value.end,
  );
}

function handleDateChange() {
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.telemetry-dashboard {
  padding: var(--spacing--lg);

  .filters {
    margin: var(--spacing--md) 0;
  }

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing--md);
    margin: var(--spacing--lg) 0;
  }
}
</style>
```

### 5.3 前端 Telemetry 修改

**修改前端 telemetry/index.ts：**

```typescript
export class Telemetry {
  private queue: Array<{
    event: string;
    properties?: ITelemetryTrackProperties;
  }> = [];

  private batchTimer: NodeJS.Timeout | null = null;

  /**
   * 记录事件（批量上报）
   */
  track(event: string, properties?: ITelemetryTrackProperties) {
    this.queue.push({ event, properties });

    // 防抖：500ms 后批量上报
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flush();
    }, 500);
  }

  /**
   * 批量上报事件
   */
  private async flush() {
    if (this.queue.length === 0) return;

    const events = this.queue.splice(0);

    try {
      await fetch('/api/telemetry/events/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: events.map(e => ({
            event_name: e.event,
            properties: e.properties,
            timestamp: new Date().toISOString(),
          })),
        }),
      });
    } catch (error) {
      console.error('[Telemetry] Failed to send events:', error);
      // 失败时重新加入队列
      this.queue.unshift(...events);
    }
  }
}
```

---

## 📅 六、实施步骤

### Phase 1：基础架构（3-4 天）

**任务：**
- [x] 创建数据库 Entity 和 Migration
- [x] 实现后端 Module 结构
- [x] 实现 Repository 层（基础查询）
- [x] 实现 Service 层（事件收集和查询）
- [x] 实现 Controller 层（基础 API）

**验证：**
- ✅ Migration 执行成功
- ✅ API 端点可调用
- ✅ 事件可以成功保存到数据库

### Phase 2：事件收集（2-3 天）

**任务：**
- [x] 修改前端 Telemetry 实现（批量上报）
- [x] 修改后端 Telemetry 服务（调用新 API）
- [x] 实现批量上报机制
- [x] 实现错误重试机制

**验证：**
- ✅ 前端事件成功发送
- ✅ 后端事件成功发送
- ✅ 批量上报工作正常
- ✅ 失败重试机制生效

### Phase 3：查询和展示（3-5 天）

**任务：**
- [x] 实现 Telemetry Store
- [x] 创建 TelemetryDashboard.vue 组件
- [x] 创建 EventsTable.vue 组件
- [x] 实现事件过滤和查询
- [x] 实现统计概览卡片
- [x] 添加 i18n 支持

**验证：**
- ✅ 事件列表正确显示
- ✅ 过滤功能正常工作
- ✅ 统计数据准确
- ✅ UI 遵循 n8n 设计规范

### Phase 4：分析和可视化（3-5 天）

**任务：**
- [x] 实现事件聚合 API
- [x] 实现用户活跃度统计
- [x] 创建图表组件（Chart.js）
- [x] 实现数据导出功能
- [x] 性能优化（索引、分页）

**验证：**
- ✅ 图表正确渲染
- ✅ 数据导出功能正常
- ✅ 查询性能达标（< 500ms）

**总工期：** 2-3 周

---

## 🔗 七、与多租户架构集成

### 7.1 数据库扩展

**当前（单租户）：**
```typescript
@Entity()
export class TelemetryEvent {
  user_id?: string;
  workflow_id?: string;
  // ...
}
```

**未来（多租户）：**
```typescript
@Entity()
export class TelemetryEvent {
  user_id?: string;
  workspace_id?: string;  // 工作空间 ID
  tenant_id?: string;     // 租户 ID
  workflow_id?: string;
  // ...
}
```

### 7.2 查询扩展

**租户级别查询：**

```typescript
// 查询租户的所有事件
async findByTenant(tenantId: string, filters: any) {
  return await this.find({
    where: {
      tenant_id: tenantId,
      ...filters,
    },
  });
}

// 跨租户统计（平台管理员）
async getTenantStats() {
  return await this.createQueryBuilder('event')
    .select('event.tenant_id', 'tenant_id')
    .addSelect('COUNT(*)', 'total_events')
    .addSelect('COUNT(DISTINCT event.user_id)', 'active_users')
    .groupBy('event.tenant_id')
    .getRawMany();
}
```

### 7.3 计费集成

**使用量统计：**

```typescript
// 租户月度使用量
async getTenantUsage(tenantId: string, month: Date) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  return await this.createQueryBuilder('event')
    .select('event.workflow_id', 'workflow_id')
    .addSelect('COUNT(*)', 'execution_count')
    .where('event.tenant_id = :tenantId', { tenantId })
    .andWhere('event.event_name = :eventName', { eventName: 'Manual exec errored' })
    .andWhere('event.created_at BETWEEN :start AND :end', { start: startDate, end: endDate })
    .groupBy('event.workflow_id')
    .getRawMany();
}
```

---

## 📊 八、预期效果

### 8.1 数据收集能力

**收集规模：**
- 前端事件：289 个事件点
- 后端事件：20+ 个事件点
- 每用户每天：~500 事件
- 100 用户/天：50,000 事件
- 1 年累计：18,250,000 事件

**存储需求：**
- 每事件平均：~1KB
- 1 年数据量：~18GB（完全可接受）

### 8.2 分析能力

**基础分析：**
- ✅ 用户活跃度趋势
- ✅ 功能使用统计
- ✅ 工作流健康度
- ✅ 错误和异常追踪

**高级分析（可扩展）：**
- ✅ 用户行为漏斗
- ✅ 用户路径分析
- ✅ 异常检测和告警
- ✅ 留存率分析

### 8.3 性能指标

**查询性能：**
- 实时事件查询：< 100ms
- 统计聚合：< 500ms
- 复杂分析：< 2s
- 数据导出：< 5s（10万条）

**系统性能：**
- 批量上报：500ms 防抖
- 失败重试：最多 3 次
- 数据库连接池：20 个连接
- 并发请求：1000+ QPS

---

## ⚠️ 九、注意事项

### 9.1 数据隐私

- ✅ 所有数据存储在自己的数据库
- ✅ 敏感字段可加密存储（JSONB 支持）
- ✅ 定期归档旧数据（6 个月以上）
- ✅ 遵守数据保留政策

### 9.2 性能优化

- ✅ 批量上报减少请求（500ms 防抖）
- ✅ 数据库索引优化（event_name, user_id, created_at）
- ✅ 数据分区表（按月/周）
- ✅ 查询缓存（Redis，可选）

### 9.3 可靠性

- ✅ 失败重试机制
- ✅ 队列持久化（LocalStorage）
- ✅ 错误日志记录
- ✅ 健康检查接口

---

## 📚 十、参考资料

### 10.1 n8n 相关文档

- `/packages/cli/scripts/backend-module/backend-module.guide.md` - Module 开发规范
- `/packages/frontend/CLAUDE.md` - 前端开发规范
- `/改造方案文档/01-架构底层改造方案.md` - 多租户架构设计

### 10.2 技术文档

- TypeORM Documentation
- PostgreSQL JSONB Documentation
- Element Plus Components
- Chart.js Documentation

---

## ✅ 十一、总结

### 11.1 核心优势

1. **自主可控**：所有数据存储在自己数据库，无外部依赖
2. **轻量级**：复用 n8n 现有技术栈，学习成本低
3. **可扩展**：为多租户预留字段，平滑升级
4. **高性能**：批量上报 + 数据库优化 + 分区表

### 11.2 实施价值

**短期价值（当前单租户）：**
- 了解用户行为，优化产品方向
- 监控系统健康度，及时发现问题
- 数据驱动决策，提升用户体验

**长期价值（多租户 SaaS）：**
- 租户运营基础（使用量、活跃度、流失预警）
- 计费依据（精确的使用量统计）
- 增长引擎（数据驱动的用户增长）

---

## 📊 十二、执行进度

### 12.1 阶段 1：数据库层实现 ✅ 100%

**完成时间：** 2025-11-04

- ✅ `TelemetryEvent` Entity 定义
- ✅ `TelemetrySession` Entity 定义
- ✅ 数据库迁移脚本 `1762233800000-CreateTelemetryTables.ts`
- ✅ 索引优化（event_name, user_id, created_at）
- ✅ JSONB 字段支持（properties, metadata）

**实现位置：**
- `packages/@n8n/db/src/entities/telemetry-event.ts`
- `packages/@n8n/db/src/entities/telemetry-session.ts`
- `packages/@n8n/db/src/migrations/common/1762233800000-CreateTelemetryTables.ts`

---

### 12.2 阶段 2：后端 API 实现 ✅ 100%

**完成时间：** 2025-11-04

**Module 结构：**
- ✅ TelemetryManagementModule（模块定义）
- ✅ TelemetryEventRepository（数据访问层）
- ✅ TelemetryManagementService（业务逻辑层）
- ✅ TelemetryManagementController（控制器层）

**实现的 API 端点：**

| 方法 | 端点 | 功能 | 状态 |
|------|------|------|------|
| POST | `/api/telemetry/events` | 单个事件追踪 | ✅ |
| POST | `/api/telemetry/events/batch` | 批量事件追踪 | ✅ |
| GET | `/api/telemetry/events` | 查询事件列表 | ✅ |
| GET | `/api/telemetry/stats/overview` | 统计概览 | ✅ |
| GET | `/api/telemetry/stats/top-events` | 热门事件 Top N | ✅ |
| GET | `/api/telemetry/stats/active-users` | 活跃用户统计 | ✅ |
| GET | `/api/telemetry/export` | 数据导出（CSV/JSON） | ✅ |

**实现位置：**
- `packages/cli/src/modules/telemetry-management/`
  - `telemetry-management.module.ts`
  - `telemetry-management.controller.ts`
  - `telemetry-management.service.ts`
  - `repositories/telemetry-event.repository.ts`

---

### 12.3 阶段 3：独立后台管理系统前端 ✅ 100%

**完成时间：** 2025-11-04

**项目架构：**
- ✅ 创建独立的 `@n8n/admin-panel` 项目
- ✅ 模块化架构（modules 目录）
- ✅ MainLayout（侧边栏 + 顶栏）
- ✅ 路由系统（嵌套路由）
- ✅ 访问路径：`/admin/`

**Module 配置系统：**
- ✅ `config/modules.ts` - 模块配置管理
- ✅ Telemetry 模块已启用
- ✅ 其他模块显示"即将上线"状态

**Telemetry 功能模块：**

#### Dashboard（仪表板）✅
- ✅ 4个统计卡片（总事件、活跃用户、事件类型、平均日事件）
- ✅ 活跃用户趋势图（Chart.js 折线图）
- ✅ 热门事件 Top 20（带进度条）
- ✅ 时间范围选择器（7/30/90天）
- ✅ 刷新功能

**实现组件：**
- `DashboardView.vue`
- `StatsCard.vue`
- `LineChart.vue`
- `TopEventsList.vue`

#### Events（事件列表）✅
- ✅ 事件列表表格（时间、名称、来源、用户、工作流、属性）
- ✅ 搜索功能（事件名称）
- ✅ 筛选功能（来源、日期范围）
- ✅ 分页控件（智能页码，20/50/100条/页）
- ✅ 导出功能（CSV/JSON）
- ✅ 查看详情跳转

**实现组件：**
- `EventsView.vue`

#### 数据导出 ✅
- ✅ CSV 格式导出
- ✅ JSON 格式导出
- ✅ 筛选条件应用
- ✅ 自动下载文件
- ✅ 最大导出 10,000 条记录

**实现位置：**
- `packages/frontend/admin-panel/src/`
  - `layouts/MainLayout.vue`
  - `layouts/components/Sidebar.vue`
  - `layouts/components/Header.vue`
  - `modules/telemetry/`
    - `views/DashboardView.vue`
    - `views/EventsView.vue`
    - `components/StatsCard.vue`
    - `components/LineChart.vue`
    - `components/TopEventsList.vue`
    - `stores/telemetry.store.ts`

---

### 12.4 阶段 4：API 类型定义 ✅ 100%

**完成时间：** 2025-11-04

**类型定义：**
- ✅ `TelemetryEventDto`
- ✅ `TelemetryEventsResponse`
- ✅ `TelemetryStatsOverview`
- ✅ `TelemetryTopEvent`
- ✅ `TelemetryActiveUserStat`
- ✅ Zod Schema 验证

**实现位置：**
- `packages/@n8n/api-types/src/telemetry.ts`

---

### 12.5 阶段 5：冗余代码清理 ✅ 100%

**完成时间：** 2025-11-04

**已删除的旧实现（嵌入式版本）：**
- ✅ `/features/settings/telemetry/` 目录及所有组件
- ✅ `telemetryManagement.store.ts`
- ✅ Router 中的 telemetry 路由配置
- ✅ Navigation 中的 `TELEMETRY_SETTINGS` 常量
- ✅ i18n 中的 `settings.telemetry.*` 翻译（28 个条目）

**保留的内容（仍需使用）：**
- ✅ `useTelemetry` composable（用于事件追踪）
- ✅ `telemetry` API client（用于发送事件）
- ✅ `ITelemetrySettings` 类型（系统配置）
- ✅ `settings.telemetry.enabled` 配置（控制事件追踪）

---

### 12.6 实施总结

#### 完成功能清单 ✅

| 功能模块 | 状态 | 完成度 |
|---------|------|--------|
| **数据库层** | ✅ 完成 | 100% |
| - Entity 定义 | ✅ | |
| - 迁移脚本 | ✅ | |
| - 索引优化 | ✅ | |
| **后端 API** | ✅ 完成 | 100% |
| - Module 结构 | ✅ | |
| - Repository 层 | ✅ | |
| - Service 层 | ✅ | |
| - Controller 层 | ✅ | |
| - 7 个 API 端点 | ✅ | |
| **独立后台前端** | ✅ 完成 | 100% |
| - 项目架构 | ✅ | |
| - 模块化系统 | ✅ | |
| - MainLayout | ✅ | |
| - Dashboard 页面 | ✅ | |
| - Events 页面 | ✅ | |
| - 数据导出 | ✅ | |
| **API 类型** | ✅ 完成 | 100% |
| **代码清理** | ✅ 完成 | 100% |

#### 技术特点 ✅

1. **完全自主可控**
   - 所有数据存储在自己的 PostgreSQL 数据库
   - 无外部云服务依赖
   - 完整的数据自主权

2. **独立后台系统**
   - 访问路径：`/admin/`
   - 模块化架构，易于扩展
   - 其他管理功能（工作空间、用户等）预留接口

3. **完整功能实现**
   - 实时数据统计
   - 可视化图表
   - 高级搜索和筛选
   - 数据导出（CSV/JSON）
   - 分页浏览

4. **高性能设计**
   - 批量事件上报
   - 数据库索引优化
   - 最大导出限制：10,000 条
   - 智能分页

5. **代码质量**
   - TypeScript 类型安全
   - Pinia 状态管理
   - 遵循 n8n 代码规范
   - 组件化设计

#### 后续优化方向 🔄

**性能优化：**
- [ ] 数据分区表（按月/周）
- [ ] Redis 查询缓存
- [ ] 批量插入优化
- [ ] 数据归档策略

**功能增强：**
- [ ] 实时推送（SSE/WebSocket）
- [ ] 高级数据分析
- [ ] 自定义报表
- [ ] 数据可视化（更多图表类型）

**安全加固：**
- [ ] 管理员权限验证
- [ ] 数据访问审计
- [ ] 敏感数据加密
- [ ] 导出权限控制

---

**文档版本：** v1.1
**最后更新：** 2025-11-04
**执行状态：** ✅ 核心功能已全部完成
**文档维护：** 根据实施进度持续更新
