# Telemetry 文件分类详细列表

## 1. 后端文件 (Backend - 9个)

### 1.1 核心事件中继 (最高优先级)
```
packages/cli/src/events/relays/telemetry.event-relay.ts (61 调用)
```

### 1.2 服务层文件
```
packages/cli/src/concurrency/concurrency-control.service.ts (1 调用)
packages/cli/src/modules/data-table/data-table-size-validator.service.ts (1 调用)
packages/cli/src/evaluation.ee/test-runner/test-runner.service.ee.ts (2 调用)
```

### 1.3 控制器文件
```
packages/cli/src/evaluation.ee/test-runs.controller.ee.ts (1 调用)
packages/cli/src/modules/mcp/mcp.controller.ts (1 调用)
packages/cli/src/modules/mcp/mcp-api-key.service.ts (1 调用)
```

### 1.4 MCP 工具
```
packages/cli/src/modules/mcp/tools/search-workflows.tool.ts (2 调用)
packages/cli/src/modules/mcp/tools/get-workflow-details.tool.ts (2 调用)
```

## 2. 测试文件 (Test Files - ~20个)

### 2.1 高频测试文件
```
app/composables/useCanvasOperations.test.ts (25 调用)
features/shared/nodeCreator/nodeCreator.store.test.ts (9 调用)
app/plugins/telemetry.test.ts (8 调用)
features/workflows/workflowHistory/views/WorkflowHistory.test.ts (7 调用)
features/ai/evaluation.ee/views/EvaluationsRootView.test.ts (6 调用)
```

### 2.2 其他测试文件
```
features/ndv/runData/schemaPreview.store.test.ts (3 调用)
app/composables/usePinnedData.test.ts (3 调用)
features/ndv/runData/components/VirtualSchema.test.ts (2 调用)
features/integrations/sourceControl.ee/components/SourceControlPushModal.test.ts (1 调用)
features/collaboration/projects/components/ProjectMoveResourceModal.test.ts (1 调用)
features/core/auth/views/SigninView.test.ts (1 调用)
app/composables/usePageRedirectionHelper.test.ts (1 调用)
app/stores/posthog.store.test.ts (1 调用)
app/components/FreeAiCreditsCallout.test.ts (1 调用)
app/components/Telemetry.test.ts (1 调用)
```

## 3. 实验功能 (Experiments - 8个)

```
experiments/personalizedTemplatesV3/stores/personalizedTemplatesV3.store.ts (8 调用)
experiments/templateRecoV2/stores/templateRecoV2.store.ts (6 调用)
experiments/readyToRunWorkflowsV2/stores/readyToRunWorkflowsV2.store.ts (5 调用)
experiments/readyToRunWorkflows/stores/readyToRunWorkflows.store.ts (5 调用)
experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store.ts (5 调用)
experiments/personalizedTemplates/stores/personalizedTemplates.store.ts (4 调用)
experiments/templatesDataQuality/stores/templatesDataQuality.store.ts (3 调用)
experiments/utils.ts (1 调用)
```

## 4. 核心初始化文件 (Core Init - 3个)

```
packages/frontend/editor-ui/src/init.ts (2 调用 - 包含 identify)
packages/frontend/editor-ui/src/router.ts (2 调用 - 包含 page)
app/composables/useTelemetry.ts (1 调用 - composable 定义)
```

## 5. App Composables (44个文件)

### 5.1 高频 composables (≥5 调用)
```
useCanvasOperations.ts (11 调用)
useCalloutHelpers.ts (6 调用)
usePushConnection/handlers/executionFinished.ts (6 调用)
```

### 5.2 中频 composables (2-4 调用)
```
usePinnedData.ts (4 调用)
useHistoryHelper.ts (3 调用)
useWorkflowExtraction.ts (3 调用)
useToast.ts (3 调用)
useWorkflowSaving.ts (3 调用)
useAutocompleteTelemetry.ts (2 调用)
useRunWorkflow.ts (2 调用)
usePageRedirectionHelper.ts (2 调用)
useNodeHelpers.ts (2 调用)
useWorkflowActivate.ts (2 调用)
```

## 6. App Components (38个文件)

### 6.1 高频组件 (≥5 调用)
```
NpsSurvey.vue (6 调用)
FocusPanel.vue (5 调用)
```

### 6.2 中频组件 (3-4 调用)
```
MainHeader/WorkflowDetails.vue (4 调用)
WorkflowProductionChecklist.vue (4 调用)
NodeExecuteButton.vue (4 调用)
MainSidebar.vue (3 调用)
layouts/ResourcesListLayout.vue (3 调用)
WorkflowSettings.vue (3 调用)
ContactPromptModal.vue (3 调用)
```

### 6.3 低频组件 (1-2 调用)
```
FromAiParametersModal.vue (2 调用)
FreeAiCreditsCallout.vue (2 调用)
DuplicateWorkflowDialog.vue (2 调用)
WorkflowCard.vue (2 调用)
BecomeTemplateCreatorCta/BecomeTemplateCreatorCta.vue (2 调用)
WorkflowShareModal.ee.vue (1 调用)
Telemetry.vue (1 调用)
```

## 7. App Views (14个文件)

```
WorkflowsView.vue (9 调用)
NodeView.vue (5 调用)
```

## 8. App Stores (7个文件)

```
workflows.store.ts (2 调用)
logs.store.ts (3 调用)
ui.store.ts (2 调用)
```

## 9. Features - NDV (Node Details View)

### 9.1 NDV Shared Views (15个)
```
NodeDetailsView.vue (8 调用)
NodeDetailsViewV2.vue (7 调用)
```

### 9.2 NDV Parameters Components (20个)
```
ParameterInput.vue (7 调用)
ResourceLocator/ResourceLocator.vue (4 调用)
WorkflowSelectorParameterInput/WorkflowSelectorParameterInput.vue (3 调用)
ParameterInputFull.vue (3 调用)
ParameterInputExpanded.vue (2 调用)
ExpressionEditModal.vue (2 调用)
ExpressionParameterInput.vue (2 调用)
FixedCollectionParameter.vue (2 调用)
ButtonParameter/ButtonParameter.vue (2 调用)
ImportCurlModal.vue (2 调用)
```

### 9.3 NDV Run Data Components (19个)
```
RunData.vue (11 调用)
RunDataTable.vue (2 调用)
RunDataJson.vue (2 调用)
RunDataJsonActions.vue (2 调用)
VirtualSchema.vue (2 调用)
```

### 9.4 NDV Settings Components (11个)
```
NodeSettingsTabs.vue (4 调用)
NodeSettingsInvalidNodeWarning.vue (3 调用)
NodeSettings.vue (2 调用)
NodeWebhooks.vue (2 调用)
```

### 9.5 NDV Panel Components (11个)
```
TriggerPanel.vue (4 调用)
InputPanel.vue (4 调用)
OutputPanel.vue (3 调用)
```

### 9.6 NDV Stores & Composables
```
schemaPreview.store.ts (2 调用)
settings/composables/useNodeSettingsParameters.ts (1 调用)
```

## 10. Features - Workflows

### 10.1 Workflow Diff (7个)
```
WorkflowDiffModal.vue (7 调用)
```

### 10.2 Workflow Templates (6个)
```
setupTemplate.store.ts (6 调用)
views/TemplatesSearchView.vue (3 调用)
components/SetupWorkflowCredentialsModal.vue (3 调用)
components/SetupTemplateFormStep.vue (2 调用)
views/TemplatesCollectionView.vue (1 调用)
views/TemplatesWorkflowView.vue (1 调用)
utils/templateActions.ts (1 调用)
```

### 10.3 Workflow History
```
views/WorkflowHistory.vue (1 调用)
```

## 11. Features - Execution

### 11.1 Execution Views (10个)
```
executions/views/ExecutionsView.vue (2 调用)
executions/views/WorkflowExecutionsView.vue (2 调用)
```

### 11.2 Execution Components (19个)
```
executions/components/ExecutionsFilter.vue (2 调用)
executions/components/global/GlobalExecutionsList.vue (2 调用)
executions/components/workflow/WorkflowExecutionAnnotationTags.ee.vue (2 调用)
insights/components/tables/InsightsTableWorkflows.vue (3 调用)
insights/components/InsightsSummary.vue (2 调用)
insights/components/InsightsDataRangePicker.vue (2 调用)
```

### 11.3 Execution Composables
```
executions/composables/useExecutionDebugging.ts (2 调用)
executions/composables/useExecutionHelpers.ts (2 调用)
```

### 11.4 Execution Logs
```
logs/composables/useLogsPanelLayout.ts (4 调用)
logs/composables/useLogsSelection.ts (2 调用)
```

## 12. Features - Credentials (7个)

```
views/CredentialsView.vue (2 调用)
components/CredentialEdit/CredentialEdit.vue (5 调用)
components/CredentialEdit/CredentialConfig.vue (2 调用)
components/CredentialsSelectModal.vue (2 调用)
components/NodeCredentials.vue (4 调用)
```

## 13. Features - Settings

### 13.1 Community Nodes (10个)
```
views/SettingsCommunityNodesView.vue (3 调用)
components/CommunityPackageInstallModal.vue (5 调用)
components/CommunityPackageManageConfirmModal.vue (3 调用)
components/CommunityPackageCard.vue (2 调用)
```

### 13.2 Other Settings
```
sso/views/SettingsSso.vue (2 调用)
apiKeys/views/SettingsApiView.vue (3 调用)
orchestration.ee/components/WorkerList.vue (2 调用)
usage/components/CommunityPlusEnrollmentModal.vue (3 调用)
```

## 14. Features - Collaboration

### 14.1 Projects Views (10个)
```
projects/views/ProjectSettings.vue (8 调用)
projects/views/ProjectVariables.vue (2 调用)
```

### 14.2 Projects Components (7个)
```
projects/components/ProjectMoveResourceModal.vue (3 调用)
projects/components/ProjectTabs.vue (2 调用)
projects/components/ProjectHeader.vue (2 调用)
```

## 15. Features - Project Roles (8个)

```
ProjectRolesView.vue (3 调用)
ProjectRoleView.vue (5 调用)
```

## 16. Features - AI

### 16.1 AI Assistant (9个)
```
assistant/assistant.store.ts (6 调用)
assistant/builder.store.ts (3 调用)
assistant/components/Agent/AskAssistantBuild.vue (4 调用)
assistant/components/Chat/AskAssistantChat.vue (4 调用)
```

### 16.2 AI Evaluation
```
evaluation.ee/views/EvaluationsRootView.vue (3 调用)
```

### 16.3 MCP Access
```
mcpAccess/composables/useMcp.ts (3 调用)
```

## 17. Features - Shared

### 17.1 Node Creator (20个)
```
nodeCreator/nodeCreator.store.ts (2 调用)
nodeCreator/views/NodeCreation.vue (2 调用)
nodeCreator/components/ItemTypes/NodeItem.vue (2 调用)
nodeCreator/components/Modes/ActionsMode.vue (1 调用)
nodeCreator/components/ItemTypes/ActionItem.vue (1 调用)
```

### 17.2 Code Editor
```
editors/components/CodeNodeEditor/CodeNodeEditor.vue (2 调用)
editors/components/CodeNodeEditor/AskAI/AskAI.vue (2 调用)
```

### 17.3 Command Bar (6个)
```
commandBar/composables/useWorkflowCommands.ts (2 调用)
commandBar/composables/useCommandBar.ts (2 调用)
commandBar/composables/useExecutionCommands.ts (2 调用)
```

## 18. Features - Integrations

### 18.1 Source Control (6个)
```
sourceControl.ee/components/SourceControlPushModal.vue (4 调用)
sourceControl.ee/components/SourceControlPullModal.vue (2 调用)
sourceControl.ee/sourceControl.utils.ts (2 调用)
```

### 18.2 Log Streaming
```
logStreaming.ee/components/EventDestinationSettingsModal.vue (2 调用)
```

## 19. Features - Core Data Table

```
dataTable/composables/useDataTableOperations.ts (6 调用)
dataTable/components/DataTableActions.vue (2 调用)
dataTable/components/AddDataTableModal.vue (2 调用)
dataTable/components/DataTableBreadcrumbs.vue (1 调用)
```

## 20. Features - Core Auth

```
auth/views/SigninView.vue (3 调用)
```

---

## 快速统计摘要

| 分类 | 文件数 | 平均调用/文件 | 优先级 |
|------|--------|---------------|--------|
| 后端文件 | 9 | 8.1 | 最高 ⭐⭐⭐ |
| 测试文件 | ~20 | 3.8 | 低 (不影响生产) |
| 实验功能 | 8 | 5.4 | 中 |
| 核心初始化 | 3 | 1.7 | 最高 ⭐⭐⭐ |
| App Composables | 44 | 3.4 | 高 ⭐⭐ |
| App Components | 38 | 2.6 | 中高 |
| NDV 相关 | ~76 | 3.2 | 高 ⭐⭐ |
| Workflows | 14 | 3.1 | 中高 |
| Execution | 29 | 2.3 | 中 |
| Credentials | 7 | 3.0 | 中 |
| Settings | 14 | 2.9 | 中 |
| Collaboration | 17 | 3.6 | 中 |
| AI 功能 | 12 | 4.0 | 中高 |
| 其他 Features | ~20 | 2.1 | 低-中 |

