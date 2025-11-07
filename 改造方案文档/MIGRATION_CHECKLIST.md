# 数据库迁移执行检查清单

> **迁移名称：** MultitenantTransformation (1762511301780)
> **检查日期：** _____________
> **执行人：** _____________

---

## 📋 迁移前检查（Pre-Migration Checklist）

### 1. 环境准备

- [ ] 确认当前 n8n 版本和分支
- [ ] 确认数据库类型和版本
- [ ] 确认有足够的磁盘空间（至少 2 倍数据库大小）
- [ ] 确认数据库连接正常
- [ ] 确认有数据库管理员权限

### 2. 备份（Critical - 必须完成）

- [ ] 完整备份生产数据库
  ```bash
  # PostgreSQL
  pg_dump n8n_production > backup_$(date +%Y%m%d_%H%M%S).sql

  # MySQL
  mysqldump n8n_production > backup_$(date +%Y%m%d_%H%M%S).sql

  # SQLite
  cp ~/.n8n/database.sqlite backup_$(date +%Y%m%d_%H%M%S).sqlite
  ```
- [ ] 验证备份文件完整性
- [ ] 将备份存储到安全位置
- [ ] 测试备份恢复流程

### 3. 数据完整性检查

- [ ] 检查孤儿 workflows（期望：0）
  ```sql
  SELECT COUNT(*) FROM workflow_entity W
  WHERE NOT EXISTS (
    SELECT 1 FROM shared_workflow SW
    WHERE SW.workflowId = W.id AND SW.role = 'workflow:owner'
  );
  ```

- [ ] 检查孤儿 credentials（期望：0）
  ```sql
  SELECT COUNT(*) FROM credentials_entity C
  WHERE NOT EXISTS (
    SELECT 1 FROM shared_credentials SC
    WHERE SC.credentialsId = C.id AND SC.role = 'credential:owner'
  );
  ```

- [ ] 检查无效的 project 引用（期望：0）
  ```sql
  SELECT COUNT(*) FROM shared_workflow SW
  WHERE NOT EXISTS (SELECT 1 FROM project P WHERE P.id = SW.projectId);

  SELECT COUNT(*) FROM shared_credentials SC
  WHERE NOT EXISTS (SELECT 1 FROM project P WHERE P.id = SC.projectId);
  ```

- [ ] 记录数据统计
  ```sql
  SELECT COUNT(*) as total_workflows FROM workflow_entity;
  SELECT COUNT(*) as total_credentials FROM credentials_entity;
  SELECT COUNT(*) as total_projects FROM project;
  SELECT COUNT(*) as total_shared_workflows FROM shared_workflow;
  SELECT COUNT(*) as total_shared_credentials FROM shared_credentials;
  ```

### 4. 测试环境验证

- [ ] 在测试环境完整执行迁移
- [ ] 测试迁移回滚功能
- [ ] 验证数据完整性
- [ ] 测试应用功能正常
- [ ] 记录迁移耗时

### 5. 停机计划

- [ ] 确定维护窗口时间
- [ ] 通知用户停机时间
- [ ] 准备停机公告
- [ ] 协调相关团队

### 6. 应急预案

- [ ] 准备回滚脚本
- [ ] 准备故障排查文档
- [ ] 确认紧急联系人
- [ ] 准备监控告警

---

## 🚀 迁移执行检查（Migration Execution）

### 1. 执行前最后检查

- [ ] 再次确认备份完成
- [ ] 停止 n8n 服务
- [ ] 停止所有 workers
- [ ] 关闭所有数据库连接
- [ ] 记录迁移开始时间：___________

### 2. 执行迁移

- [ ] 运行迁移命令
  ```bash
  cd packages/cli
  pnpm typeorm migration:run
  ```

- [ ] 监控迁移进度
- [ ] 查看日志输出
- [ ] 记录任何错误或警告
- [ ] 记录迁移结束时间：___________
- [ ] 计算迁移耗时：___________ 分钟

### 3. 迁移后立即验证

- [ ] 检查迁移状态
  ```bash
  pnpm typeorm migration:show
  ```

- [ ] 验证 MultitenantTransformation 标记为已执行 (✓)

---

## ✅ 迁移后验证（Post-Migration Verification）

### 1. 数据库结构验证

- [ ] workflow_entity 表有 projectId 列
  ```sql
  DESCRIBE workflow_entity;  -- MySQL
  \d workflow_entity;        -- PostgreSQL
  ```

- [ ] credentials_entity 表有 projectId 列
  ```sql
  DESCRIBE credentials_entity;
  ```

- [ ] shared_workflow 表已删除（期望：错误）
  ```sql
  SELECT COUNT(*) FROM shared_workflow;
  ```

- [ ] shared_credentials 表已删除（期望：错误）
  ```sql
  SELECT COUNT(*) FROM shared_credentials;
  ```

### 2. 数据完整性验证

- [ ] 所有 workflows 有 projectId（期望：0）
  ```sql
  SELECT COUNT(*) FROM workflow_entity WHERE projectId IS NULL;
  ```

- [ ] 所有 credentials 有 projectId（期望：0）
  ```sql
  SELECT COUNT(*) FROM credentials_entity WHERE projectId IS NULL;
  ```

- [ ] 所有 projectId 指向有效 project（期望：0）
  ```sql
  SELECT COUNT(*) FROM workflow_entity W
  WHERE NOT EXISTS (SELECT 1 FROM project P WHERE P.id = W.projectId);

  SELECT COUNT(*) FROM credentials_entity C
  WHERE NOT EXISTS (SELECT 1 FROM project P WHERE P.id = C.projectId);
  ```

- [ ] 数据数量对比（应该相等）
  ```sql
  -- 记录迁移后的数据
  SELECT COUNT(*) as workflows_after FROM workflow_entity;
  SELECT COUNT(*) as credentials_after FROM credentials_entity;
  ```
  - 迁移前 workflows: ___________
  - 迁移后 workflows: ___________
  - 迁移前 credentials: ___________
  - 迁移后 credentials: ___________

### 3. 外键约束验证

- [ ] 测试外键约束（期望：失败）
  ```sql
  INSERT INTO workflow_entity (id, name, active, nodes, connections, projectId, versionId)
  VALUES ('test-invalid', 'Test', false, '[]', '{}', 'non-existent-project', 'v1');
  ```

### 4. 索引验证

- [ ] 验证索引创建
  ```sql
  -- MySQL/PostgreSQL
  SHOW INDEX FROM workflow_entity;
  SHOW INDEX FROM credentials_entity;

  -- SQLite
  SELECT * FROM sqlite_master WHERE type='index' AND tbl_name='workflow_entity';
  ```

- [ ] 确认以下索引存在：
  - `idx_workflow_project_id`
  - `idx_workflow_project_active`
  - `idx_credentials_project_id`

### 5. 级联删除测试

- [ ] 创建测试 project 和 workflow
  ```sql
  INSERT INTO project (id, name, type) VALUES ('test-cascade', 'Test Cascade', 'personal');
  INSERT INTO workflow_entity (id, name, active, nodes, connections, projectId, versionId)
  VALUES ('wf-cascade-test', 'Test Cascade', false, '[]', '{}', 'test-cascade', 'v1');
  ```

- [ ] 删除 project
  ```sql
  DELETE FROM project WHERE id = 'test-cascade';
  ```

- [ ] 验证 workflow 被级联删除
  ```sql
  SELECT COUNT(*) FROM workflow_entity WHERE id = 'wf-cascade-test';
  -- 期望：0
  ```

---

## 🎯 应用功能验证

### 1. 启动服务

- [ ] 启动 n8n 主服务
- [ ] 启动 workers（如有）
- [ ] 检查启动日志无错误

### 2. 基本功能测试

- [ ] 登录系统成功
- [ ] 可以查看 workflows 列表
- [ ] 可以打开 workflow 编辑器
- [ ] 可以保存 workflow
- [ ] 可以执行 workflow
- [ ] 可以查看 credentials 列表
- [ ] 可以创建新 credential
- [ ] 可以编辑 credential
- [ ] 可以删除 credential

### 3. Project 功能测试

- [ ] 切换 project 成功
- [ ] 只能看到当前 project 的 workflows
- [ ] 只能看到当前 project 的 credentials
- [ ] 可以在不同 project 间切换

### 4. 权限测试

- [ ] 创建 workflow 时自动关联当前 project
- [ ] 创建 credential 时自动关联当前 project
- [ ] 无法访问其他 project 的资源

### 5. 性能测试

- [ ] Workflow 列表加载速度正常
- [ ] Credentials 列表加载速度正常
- [ ] 查询性能无明显下降
- [ ] 数据库 CPU/内存使用正常

---

## 📝 问题记录

### 迁移过程中的问题

| 问题 | 严重程度 | 描述 | 解决方案 | 状态 |
|-----|---------|------|---------|------|
|     |         |      |         |      |

### 验证过程中的问题

| 问题 | 严重程度 | 描述 | 解决方案 | 状态 |
|-----|---------|------|---------|------|
|     |         |      |         |      |

---

## 🔄 回滚程序（如需要）

### 回滚决策

- [ ] 与技术负责人确认需要回滚
- [ ] 记录回滚原因：___________________________
- [ ] 确认回滚时间窗口：___________

### 执行回滚

- [ ] 停止 n8n 服务
- [ ] 执行回滚迁移
  ```bash
  cd packages/cli
  pnpm typeorm migration:revert
  ```
- [ ] 验证回滚成功
- [ ] 恢复服务
- [ ] 验证应用功能

### 回滚验证

- [ ] shared_workflow 表恢复
- [ ] shared_credentials 表恢复
- [ ] projectId 列已删除
- [ ] 数据完整性验证
- [ ] 应用功能正常

---

## 📊 迁移报告

### 基本信息

- **执行日期：** ___________
- **执行人：** ___________
- **数据库类型：** ___________ (MySQL/PostgreSQL/SQLite)
- **数据库版本：** ___________
- **n8n 版本：** ___________

### 数据统计

- **Workflows 数量：** ___________
- **Credentials 数量：** ___________
- **Projects 数量：** ___________

### 时间统计

- **备份时间：** ___________ 分钟
- **迁移时间：** ___________ 分钟
- **验证时间：** ___________ 分钟
- **总停机时间：** ___________ 分钟

### 迁移结果

- [ ] ✅ 成功
- [ ] ❌ 失败（已回滚）
- [ ] ⚠️ 部分成功（有问题但可接受）

### 备注

_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---

## 👥 签字确认

### 执行人员

- **执行人签字：** _______________ **日期：** ___________
- **复核人签字：** _______________ **日期：** ___________

### 审批人员

- **技术负责人：** _______________ **日期：** ___________
- **项目负责人：** _______________ **日期：** ___________

---

**文档版本：** v1.0
**最后更新：** 2025-01-07
**文档状态：** ✅ 准备就绪
