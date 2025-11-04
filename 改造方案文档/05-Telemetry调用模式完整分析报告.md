# Telemetry 调用模式完整分析报告

## 执行摘要

本报告详细分析了 n8n 代码库中所有 Telemetry 相关调用，为批量删除做准备。

## 1. 总体统计

### 文件数量统计
- **总文件数**: 161 个文件包含 telemetry 调用
- **前端文件**: ~145 个
- **后端文件**: ~16 个
- **总调用次数**: 553 次

### 调用类型分布
- `telemetry.track()`: 136 个文件
- `telemetry.page()`: 1 个文件 (router.ts)
- `telemetry.identify()`: 3 个文件 (init.ts, telemetry.test.ts, telemetry.event-relay.ts)
- `useTelemetry()`: 145 个文件

## 2. 高频文件 (Top 20)

这些文件包含最多的 telemetry 调用，建议**优先手动处理**：

| 排名 | 文件 | 调用次数 | 位置 |
|------|------|----------|------|
| 1 | telemetry.event-relay.ts | 61 | packages/cli/src/events/relays/ |
| 2 | useCanvasOperations.test.ts | 25 | app/composables/ |
| 3 | useCanvasOperations.ts | 11 | app/composables/ |
| 3 | RunData.vue | 11 | features/ndv/runData/components/ |
| 5 | WorkflowsView.vue | 9 | app/views/ |
| 5 | nodeCreator.store.test.ts | 9 | features/shared/nodeCreator/ |
| 7 | NodeDetailsView.vue | 8 | features/ndv/shared/views/ |
| 7 | ProjectSettings.vue | 8 | features/collaboration/projects/views/ |
| 7 | personalizedTemplatesV3.store.ts | 8 | experiments/personalizedTemplatesV3/stores/ |
| 7 | telemetry.test.ts | 8 | app/plugins/ |
| 11 | WorkflowDiffModal.vue | 7 | features/workflows/workflowDiff/ |
| 11 | NodeDetailsViewV2.vue | 7 | features/ndv/shared/views/ |
| 11 | ParameterInput.vue | 7 | features/ndv/parameters/components/ |
| 14 | setupTemplate.store.ts | 6 | features/workflows/templates/ |
| 14 | useDataTableOperations.ts | 6 | features/core/dataTable/composables/ |
| 14 | assistant.store.ts | 6 | features/ai/assistant/ |
| 14 | templateRecoV2.store.ts | 6 | experiments/templateRecoV2/stores/ |
| 14 | executionFinished.ts | 6 | app/composables/usePushConnection/handlers/ |
| 14 | useCalloutHelpers.ts | 6 | app/composables/ |
| 14 | NpsSurvey.vue | 6 | app/components/ |

## 3. 按目录分组统计 (Top 20)

按目录分组，用于**批量处理策略**：

| 排名 | 目录 | 文件数 | 说明 |
|------|------|--------|------|
| 1 | app/composables/ | 44 | 应用核心组合式函数 |
| 2 | app/components/ | 38 | 应用通用组件 |
| 3 | features/ndv/parameters/components/ | 20 | NDV 参数组件 |
| 4 | features/ndv/runData/components/ | 19 | NDV 运行数据组件 |
| 5 | features/ndv/shared/views/ | 15 | NDV 共享视图 |
| 6 | app/views/ | 14 | 应用视图 |
| 7 | features/ndv/settings/components/ | 11 | NDV 设置组件 |
| 7 | features/ndv/panel/components/ | 11 | NDV 面板组件 |
| 9 | features/settings/communityNodes/components/ | 10 | 社区节点设置 |
| 9 | features/collaboration/projects/views/ | 10 | 项目协作视图 |
| 11 | features/ai/assistant/ | 9 | AI 助手功能 |
| 12 | features/project-roles/ | 8 | 项目角色管理 |
| 12 | experiments/personalizedTemplatesV3/stores/ | 8 | 实验功能 stores |
| 14 | features/workflows/workflowDiff/ | 7 | 工作流差异比较 |
| 14 | features/credentials/components/CredentialEdit/ | 7 | 凭证编辑组件 |
| 14 | features/collaboration/projects/components/ | 7 | 项目协作组件 |
| 14 | app/stores/ | 7 | 应用状态管理 |
| 18 | features/workflows/templates/ | 6 | 工作流模板 |
| 18 | features/shared/commandBar/composables/ | 6 | 命令栏组合式函数 |
| 18 | features/integrations/sourceControl.ee/components/ | 6 | 源代码控制集成 |

## 4. 后端文件列表

后端文件数量较少，建议**优先处理**：

| 文件 | 调用次数 | 位置 |
|------|----------|------|
| telemetry.event-relay.ts | 61 | packages/cli/src/events/relays/ |
| concurrency-control.service.ts | 1 | packages/cli/src/concurrency/ |
| test-runs.controller.ee.ts | 1 | packages/cli/src/evaluation.ee/ |
| test-runner.service.ee.ts | 2 | packages/cli/src/evaluation.ee/test-runner/ |
| search-workflows.tool.ts | 2 | packages/cli/src/modules/mcp/tools/ |
| get-workflow-details.tool.ts | 2 | packages/cli/src/modules/mcp/tools/ |
| mcp-api-key.service.ts | 1 | packages/cli/src/modules/mcp/ |
| mcp.controller.ts | 1 | packages/cli/src/modules/mcp/ |
| data-table-size-validator.service.ts | 1 | packages/cli/src/modules/data-table/ |

## 5. 实验功能文件 (experiments/)

实验功能目录下的文件，可以**整体批量处理**：

| 文件 | 调用次数 |
|------|----------|
| personalizedTemplatesV3.store.ts | 8 |
| templateRecoV2.store.ts | 6 |
| readyToRunWorkflowsV2.store.ts | 5 |
| readyToRunWorkflows.store.ts | 5 |
| aiTemplatesStarterCollection.store.ts | 5 |
| personalizedTemplates.store.ts | 4 |
| templatesDataQuality.store.ts | 3 |
| utils.ts | 1 |

## 6. 特殊处理文件

以下文件需要**特别注意**：

### 6.1 核心初始化文件
- `packages/frontend/editor-ui/src/init.ts` - 包含 telemetry.identify() 调用
- `packages/frontend/editor-ui/src/router.ts` - 包含 telemetry.page() 调用

### 6.2 测试文件 (可以整体删除调用)
- useCanvasOperations.test.ts (25 次调用)
- nodeCreator.store.test.ts (9 次调用)
- telemetry.test.ts (8 次调用)
- WorkflowHistory.test.ts (7 次调用)
- EvaluationsRootView.test.ts (6 次调用)
- 以及其他 .test.ts 文件

### 6.3 工具/Composable 文件 (影响范围广)
- useTelemetry.ts - **定义 composable 本身**
- useAutocompleteTelemetry.ts - 自动完成追踪
- useCalloutHelpers.ts (6 次调用)
- useCanvasOperations.ts (11 次调用)

## 7. 建议的删除优先级

### 阶段 1: 后端清理 (最简单)
1. **telemetry.event-relay.ts** - 整个文件可能需要删除或大幅简化
2. 其他后端服务文件 (9个文件) - 逐个删除 telemetry.track() 调用

### 阶段 2: 测试文件清理 (低风险)
- 所有 .test.ts 文件中的 telemetry 调用
- 这些不影响生产代码

### 阶段 3: 实验功能清理 (中等风险)
- experiments/ 目录下的所有 stores (8个文件)
- 这些是实验性功能，影响范围有限

### 阶段 4: 高频文件手动处理 (高风险，需谨慎)
按以下顺序处理高频文件：
1. useCanvasOperations.ts (11 次)
2. RunData.vue (11 次)
3. WorkflowsView.vue (9 次)
4. NodeDetailsView.vue (8 次)
5. ProjectSettings.vue (8 次)

### 阶段 5: 按目录批量处理 (中等风险)
按照目录统计顺序，逐个目录清理：
1. app/composables/ (44 个文件)
2. app/components/ (38 个文件)
3. features/ndv/ 各子目录
4. features/settings/
5. features/collaboration/
6. 其他 features/

### 阶段 6: 核心文件最后处理 (最高风险)
1. init.ts - 删除 telemetry.identify()
2. router.ts - 删除 telemetry.page()
3. useTelemetry.ts - 将 composable 改为空实现

## 8. 技术建议

### 自动化处理策略
对于简单的 `telemetry.track()` 调用，可以使用正则表达式批量删除：
```bash
# 删除单行 telemetry.track 调用
sed -i '/^\s*telemetry\.track(/d' file.ts

# 删除多行 telemetry.track 调用（需要更复杂的脚本）
```

### 手动处理要点
1. **检查依赖**: 某些 telemetry 调用可能嵌入在业务逻辑中
2. **保留注释**: 如果 telemetry 调用说明了业务意图，考虑保留注释
3. **测试验证**: 删除后运行相关测试确保功能正常

## 9. 风险评估

### 低风险文件 (~50%)
- 测试文件
- 实验功能 stores
- 孤立的组件

### 中风险文件 (~40%)
- 一般 features/ 组件
- app/components/
- settings/ 相关文件

### 高风险文件 (~10%)
- app/composables/ 核心工具
- app/views/ 主视图
- NDV 核心组件
- init.ts, router.ts

## 10. 执行检查清单

- [ ] 阶段 1: 后端清理 (9-10 个文件)
- [ ] 阶段 2: 测试文件清理 (~20 个文件)
- [ ] 阶段 3: 实验功能清理 (8 个文件)
- [ ] 阶段 4: 高频文件手动处理 (前 20 个高频文件)
- [ ] 阶段 5: 按目录批量处理 (~100 个文件)
- [ ] 阶段 6: 核心文件最后处理 (3 个关键文件)
- [ ] 验证: 运行完整测试套件
- [ ] 验证: 手动测试关键用户流程

## 附录: 完整文件列表

（由于列表过长，建议使用搜索结果直接查看）

