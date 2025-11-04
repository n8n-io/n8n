# Telemetry 删除执行计划

> 基于完整分析报告生成的实际操作指南

## 快速概览

- **总文件数**: 161 个文件
- **总调用次数**: 553 次
- **预计工作量**: 2-3 天（分阶段执行）
- **风险等级**: 中等（需要仔细测试）

## 执行阶段总览

| 阶段 | 文件数 | 工作量 | 风险 | 状态 |
|------|--------|--------|------|------|
| 阶段 1: 后端清理 | 9 | 2-3小时 | 低 | ⏸ 待开始 |
| 阶段 2: 测试文件清理 | ~20 | 1-2小时 | 极低 | ⏸ 待开始 |
| 阶段 3: 实验功能清理 | 8 | 1小时 | 低 | ⏸ 待开始 |
| 阶段 4: 高频文件处理 | 20 | 4-5小时 | 高 | ⏸ 待开始 |
| 阶段 5: 批量目录处理 | ~100 | 6-8小时 | 中 | ⏸ 待开始 |
| 阶段 6: 核心文件处理 | 3 | 2小时 | 高 | ⏸ 待开始 |
| 阶段 7: 验证与测试 | - | 3-4小时 | - | ⏸ 待开始 |

---

## 阶段 1: 后端清理 (最高优先级)

### 目标
清理 9 个后端文件中的 telemetry 调用

### 文件清单

#### 1.1 核心文件 - telemetry.event-relay.ts
- **路径**: `packages/cli/src/events/relays/telemetry.event-relay.ts`
- **调用次数**: 61 次
- **处理策略**: 
  - 这个文件是后端 telemetry 的核心中继
  - 包含大量 `this.telemetry.track()` 和 `this.telemetry.identify()` 调用
  - **建议**: 考虑整个文件或大部分方法体删除/简化
  - 保留文件结构，将所有 track/identify 调用改为空操作
- **预计时间**: 1.5 小时

#### 1.2 服务层文件 (3个)
```
packages/cli/src/concurrency/concurrency-control.service.ts (1 调用)
packages/cli/src/modules/data-table/data-table-size-validator.service.ts (1 调用)
packages/cli/src/evaluation.ee/test-runner/test-runner.service.ee.ts (2 调用)
```
- **处理策略**: 逐个文件删除 telemetry.track() 调用
- **预计时间**: 30 分钟

#### 1.3 控制器文件 (3个)
```
packages/cli/src/evaluation.ee/test-runs.controller.ee.ts (1 调用)
packages/cli/src/modules/mcp/mcp.controller.ts (1 调用)
packages/cli/src/modules/mcp/mcp-api-key.service.ts (1 调用)
```
- **处理策略**: 逐个文件删除 telemetry.track() 调用
- **预计时间**: 30 分钟

#### 1.4 MCP 工具 (2个)
```
packages/cli/src/modules/mcp/tools/search-workflows.tool.ts (2 调用)
packages/cli/src/modules/mcp/tools/get-workflow-details.tool.ts (2 调用)
```
- **处理策略**: 删除 telemetry.track() 调用
- **预计时间**: 15 分钟

### 验证步骤
```bash
# 运行后端测试
cd packages/cli
pnpm test

# 运行类型检查
pnpm typecheck

# 运行 lint
pnpm lint
```

### 提交信息模板
```
后端清理：移除 Telemetry 追踪调用 (阶段 1)

- 清理 telemetry.event-relay.ts 中的 61 个追踪调用
- 移除服务层、控制器、MCP 工具中的追踪
- 总计清理 9 个后端文件
```

---

## 阶段 2: 测试文件清理 (低风险)

### 目标
清理约 20 个测试文件中的 telemetry mock 和调用

### 高频测试文件 (Top 5)
```
app/composables/useCanvasOperations.test.ts (25 调用)
features/shared/nodeCreator/nodeCreator.store.test.ts (9 调用)
app/plugins/telemetry.test.ts (8 调用)
features/workflows/workflowHistory/views/WorkflowHistory.test.ts (7 调用)
features/ai/evaluation.ee/views/EvaluationsRootView.test.ts (6 调用)
```

### 处理策略
1. 删除所有 `useTelemetry()` 的 mock
2. 删除所有 `telemetry.track()` 的断言
3. 保留测试的业务逻辑部分

### 批量处理命令
```bash
# 查找所有测试文件中的 telemetry
find packages/frontend/editor-ui/src -name "*.test.ts" -o -name "*.test.vue" | \
  xargs grep -l "telemetry\|useTelemetry"
```

### 验证步骤
```bash
# 运行前端测试
cd packages/frontend/editor-ui
pnpm test

# 运行特定测试
pnpm test useCanvasOperations.test.ts
```

### 提交信息模板
```
测试清理：移除 Telemetry 相关测试代码 (阶段 2)

- 清理 20 个测试文件中的 telemetry mock
- 移除 telemetry 断言，保留业务逻辑
```

---

## 阶段 3: 实验功能清理 (中等风险)

### 目标
清理 8 个实验功能 stores 中的 telemetry

### 文件清单
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

### 处理策略
- 这些都是 Pinia stores
- 删除 `useTelemetry()` 引用
- 删除所有 `telemetry.track()` 调用
- 保留业务逻辑

### 批量处理
```bash
# 定位所有实验功能 stores
find packages/frontend/editor-ui/src/experiments -name "*.store.ts" | \
  xargs grep -l "telemetry"
```

### 验证步骤
```bash
# 运行相关测试
pnpm test experiments

# 类型检查
pnpm typecheck
```

### 提交信息模板
```
实验功能清理：移除 Telemetry 追踪 (阶段 3)

- 清理 8 个实验功能 stores 中的追踪代码
- 保留业务逻辑不变
```

---

## 阶段 4: 高频文件手动处理 (高风险)

### 目标
手动处理调用次数最多的 20 个文件

### 优先级列表

#### P0 - 超高频文件 (≥10 调用)
1. **useCanvasOperations.ts** (11 调用) - 核心画布操作
2. **RunData.vue** (11 调用) - NDV 运行数据显示
3. **WorkflowsView.vue** (9 调用) - 工作流列表视图

**处理要点**:
- 仔细阅读每个 telemetry.track() 调用上下文
- 确保删除后不影响业务逻辑
- 可能需要保留某些追踪调用对应的注释说明业务意图
- 每个文件单独提交，方便回滚

#### P1 - 高频文件 (8 调用)
4. **NodeDetailsView.vue** (8 调用) - NDV 主视图
5. **ProjectSettings.vue** (8 调用) - 项目设置
6. **personalizedTemplatesV3.store.ts** (8 调用) - 已在阶段 3

**处理要点**:
- 这些是核心 UI 组件
- 删除前需要理解每个追踪点的业务含义
- 考虑在删除后添加注释说明原追踪目的

#### P2 - 中高频文件 (6-7 调用)
7-20. 其他文件...

### 逐文件处理清单

#### useCanvasOperations.ts
```typescript
// 需要处理的典型模式：
// 1. 节点添加/删除/移动追踪
// 2. 连接创建/删除追踪
// 3. 操作撤销/重做追踪

// 处理方法：
// - 删除所有 telemetry.track() 行
// - 移除 useTelemetry() import
// - 保留所有业务逻辑
```

### 验证步骤（每个文件）
```bash
# 1. 修改文件
# 2. 运行类型检查
pnpm typecheck

# 3. 运行相关测试
pnpm test [文件名]

# 4. 启动开发服务器，手动测试相关功能
pnpm dev

# 5. 提交单个文件的更改
git add [文件路径]
git commit -m "清理: 移除 [文件名] 中的 telemetry 追踪"
```

### 预计时间
- 每个超高频文件: 20-30 分钟
- 每个高频文件: 15-20 分钟
- 每个中高频文件: 10-15 分钟
- 总计: 4-5 小时

---

## 阶段 5: 按目录批量处理 (中等风险)

### 目标
按目录批量清理剩余约 100 个文件

### 处理顺序

#### 5.1 App Composables (44 个文件)
- **目录**: `app/composables/`
- **策略**: 逐个文件审查，批量删除
- **注意**: 这些是核心工具函数，需特别小心
- **预计时间**: 2-3 小时

#### 5.2 App Components (38 个文件)
- **目录**: `app/components/`
- **策略**: 简单组件可批量处理，复杂组件单独处理
- **预计时间**: 1.5-2 小时

#### 5.3 NDV 相关 (~76 个文件)
- **目录**: `features/ndv/`
- **子目录优先级**:
  1. parameters/components/ (20 个)
  2. runData/components/ (19 个)
  3. shared/views/ (15 个)
  4. settings/components/ (11 个)
  5. panel/components/ (11 个)
- **策略**: 按子目录批量处理
- **预计时间**: 2-3 小时

#### 5.4 其他 Features (~50 个文件)
- **目录**: `features/workflows/`, `features/execution/`, `features/credentials/` 等
- **策略**: 按功能模块批量处理
- **预计时间**: 1.5-2 小时

### 批量处理工具脚本

```bash
#!/bin/bash
# cleanup-telemetry-dir.sh
# 使用方法: ./cleanup-telemetry-dir.sh <directory>

DIR=$1
if [ -z "$DIR" ]; then
    echo "Usage: $0 <directory>"
    exit 1
fi

echo "Processing directory: $DIR"

# 查找所有包含 telemetry 的文件
files=$(find "$DIR" -name "*.ts" -o -name "*.vue" | xargs grep -l "telemetry\|useTelemetry" 2>/dev/null)

for file in $files; do
    echo "Processing: $file"
    
    # 备份原文件
    cp "$file" "$file.bak"
    
    # TODO: 这里需要手动编辑每个文件
    # 自动化脚本需要处理多行调用，比较复杂
    
    echo "Please manually edit: $file"
    read -p "Press enter when done..."
    
    # 验证语法
    if ! grep -q "telemetry" "$file"; then
        echo "✓ Cleaned: $file"
        rm "$file.bak"
    else
        echo "⚠ Warning: Still contains telemetry: $file"
    fi
done

echo "Batch processing complete for $DIR"
```

### 提交策略
- 每个子目录一次提交
- 提交信息格式: `清理: 移除 [目录名] 中的 telemetry 追踪 ([文件数] 个文件)`

---

## 阶段 6: 核心文件最后处理 (最高风险)

### 目标
处理 3 个核心初始化文件

### 文件清单

#### 6.1 useTelemetry.ts
- **路径**: `app/composables/useTelemetry.ts`
- **当前功能**: 定义 useTelemetry composable
- **修改策略**:
  ```typescript
  // 改为空实现
  export function useTelemetry() {
    return {
      track: () => {},
      page: () => {},
      identify: () => {},
    }
  }
  ```
- **注意**: 这是最后一步，确保所有其他文件已清理

#### 6.2 init.ts
- **路径**: `packages/frontend/editor-ui/src/init.ts`
- **包含**: `telemetry.identify()` 调用
- **修改策略**: 删除 identify 调用和相关代码

#### 6.3 router.ts
- **路径**: `packages/frontend/editor-ui/src/router.ts`
- **包含**: `telemetry.page()` 调用（路由变化追踪）
- **修改策略**: 删除 page 调用

### 验证步骤
```bash
# 完整构建
pnpm build

# 完整测试
pnpm test

# 启动应用，测试关键流程
pnpm dev
```

### 提交信息模板
```
核心文件清理：完成 Telemetry 系统移除 (阶段 6)

- 将 useTelemetry composable 改为空实现
- 移除 init.ts 中的 identify 调用
- 移除 router.ts 中的 page 追踪
- Telemetry 系统完全移除
```

---

## 阶段 7: 验证与测试

### 7.1 自动化测试
```bash
# 1. 运行完整测试套件
cd packages/frontend/editor-ui
pnpm test

# 2. 运行后端测试
cd packages/cli
pnpm test

# 3. 类型检查
pnpm typecheck

# 4. Lint 检查
pnpm lint

# 5. 构建验证
pnpm build > build.log 2>&1
tail -n 50 build.log
```

### 7.2 手动测试清单

#### 关键用户流程
- [ ] 创建新工作流
- [ ] 添加节点到画布
- [ ] 连接节点
- [ ] 配置节点参数
- [ ] 执行工作流
- [ ] 查看执行结果
- [ ] 保存工作流
- [ ] 创建凭证
- [ ] 项目设置
- [ ] 安装社区节点

#### NDV (Node Details View) 测试
- [ ] 打开 NDV
- [ ] 切换 NDV 标签
- [ ] 查看运行数据（Table/JSON）
- [ ] Pin/Unpin 数据
- [ ] 编辑参数
- [ ] 测试节点执行

#### 模板功能测试
- [ ] 浏览模板
- [ ] 使用模板创建工作流
- [ ] 个性化推荐（如果启用实验功能）

### 7.3 回归测试检查点

搜索残留的 telemetry 引用：
```bash
# 查找残留的 telemetry 调用
grep -r "telemetry\.track\|telemetry\.page\|telemetry\.identify" packages/frontend/editor-ui/src --include="*.ts" --include="*.vue" | grep -v ".test."

# 查找残留的 useTelemetry 引用
grep -r "useTelemetry()" packages/frontend/editor-ui/src --include="*.ts" --include="*.vue" | grep -v ".test."

# 检查 import 语句
grep -r "from.*useTelemetry" packages/frontend/editor-ui/src --include="*.ts" --include="*.vue"
```

### 7.4 性能验证
- 打开浏览器开发者工具
- 检查 Console 无报错
- 检查 Network 无失败请求
- 验证应用响应速度正常

---

## 风险管理

### 高风险点识别

1. **useCanvasOperations.ts** (11 调用)
   - 影响范围: 画布所有操作
   - 降低风险: 充分的手动测试

2. **RunData.vue** (11 调用)
   - 影响范围: NDV 数据显示
   - 降低风险: 测试所有数据显示模式

3. **telemetry.event-relay.ts** (61 调用)
   - 影响范围: 后端事件系统
   - 降低风险: 保留文件结构，只清空方法体

### 回滚策略

每个阶段独立提交，可以逐阶段回滚：

```bash
# 查看提交历史
git log --oneline | grep "清理\|telemetry"

# 回滚到特定提交
git revert <commit-hash>

# 或者回滚最后 N 个提交
git revert HEAD~N..HEAD
```

### 应急预案

如果发现重大问题：
1. 立即停止清理工作
2. 记录问题现象和复现步骤
3. 回滚到最后一个稳定提交
4. 分析问题根因
5. 调整清理策略
6. 重新执行清理

---

## 进度追踪

### 总体进度

```
[阶段 1] ⏸ 后端清理          0/9   (0%)
[阶段 2] ⏸ 测试文件清理     0/20  (0%)
[阶段 3] ⏸ 实验功能清理     0/8   (0%)
[阶段 4] ⏸ 高频文件处理     0/20  (0%)
[阶段 5] ⏸ 批量目录处理     0/100 (0%)
[阶段 6] ⏸ 核心文件处理     0/3   (0%)
[阶段 7] ⏸ 验证与测试       0/10  (0%)

总进度: 0/170 (0%)
```

### 每日进度记录

**第 1 天**:
- [ ] 阶段 1: 后端清理
- [ ] 阶段 2: 测试文件清理
- [ ] 阶段 3: 实验功能清理

**第 2 天**:
- [ ] 阶段 4: 高频文件处理 (前 10 个)
- [ ] 阶段 5: 开始批量处理 (app/composables)

**第 3 天**:
- [ ] 阶段 4: 高频文件处理 (后 10 个)
- [ ] 阶段 5: 继续批量处理 (其他目录)
- [ ] 阶段 6: 核心文件处理
- [ ] 阶段 7: 完整验证

---

## 完成标准

### 功能完整性
- ✅ 所有业务功能正常工作
- ✅ 无 console 错误或警告
- ✅ UI/UX 无异常

### 代码质量
- ✅ 无残留的 telemetry 调用
- ✅ 类型检查通过
- ✅ Lint 检查通过
- ✅ 所有测试通过

### 文档更新
- ✅ 更新 CHANGELOG
- ✅ 更新改造方案文档
- ✅ 记录删除过程中的发现和注意事项

---

## 后续工作

完成 Telemetry 清理后：
1. 考虑删除 Telemetry 相关的包依赖（如有）
2. 清理 Telemetry 配置文件
3. 更新文档说明系统已不再收集追踪数据
4. 考虑添加替代的本地分析方案（可选）

---

## 附录

### 相关文档
- [05-Telemetry调用模式完整分析报告.md](./05-Telemetry调用模式完整分析报告.md)
- [05-Telemetry文件分类详细列表.md](./05-Telemetry文件分类详细列表.md)
- [04-追踪系统完全清理报告.md](./04-追踪系统完全清理报告.md)

### 常用命令参考

```bash
# 搜索 telemetry 调用
grep -r "telemetry\." packages/frontend/editor-ui/src --include="*.ts" --include="*.vue"

# 统计文件数
grep -r "telemetry\." packages/frontend/editor-ui/src --include="*.ts" --include="*.vue" | wc -l

# 按文件统计
grep -r "telemetry\." packages/frontend/editor-ui/src --include="*.ts" --include="*.vue" | \
  awk -F: '{print $1}' | sort | uniq -c | sort -rn

# 按目录统计
grep -r "telemetry\." packages/frontend/editor-ui/src --include="*.ts" --include="*.vue" | \
  awk -F: '{print $1}' | xargs -I {} dirname {} | sort | uniq -c | sort -rn
```

