# 🚀 n8n Playwright Test Writing Cheat Sheet

> **For AI Assistants**: This guide provides quick reference patterns for writing n8n Playwright tests using the established architecture.

## Quick Start Navigation Methods

### **n8n.start.*** Methods (Test Entry Points)
```typescript
// Start from home page
await n8n.start.fromHome();

// Start with blank canvas for new workflow
await n8n.start.fromBlankCanvas();

// Start with new project + blank canvas (returns projectId)
const projectId = await n8n.start.fromNewProjectBlankCanvas();

// Start with just a new project (no canvas)
const projectId = await n8n.start.fromNewProject();

// Import and start from existing workflow JSON
const result = await n8n.start.fromImportedWorkflow('simple-webhook-test.json');
const { workflowId, webhookPath } = result;
```

### **n8n.navigate.*** Methods (Page Navigation)
```typescript
// Basic navigation
await n8n.navigate.toHome();
await n8n.navigate.toWorkflow('new');
await n8n.navigate.toWorkflows(projectId);

// Settings & admin
await n8n.navigate.toVariables();
await n8n.navigate.toCredentials(projectId);
await n8n.navigate.toLogStreaming();
await n8n.navigate.toCommunityNodes();

// Project-specific navigation
await n8n.navigate.toProject(projectId);
await n8n.navigate.toProjectSettings(projectId);
```

## Common Test Patterns

### **Basic Workflow Test**
```typescript
test('should create and execute workflow', async ({ n8n }) => {
  await n8n.start.fromBlankCanvas();
  await n8n.canvas.addNode('Manual Trigger');
  await n8n.canvas.addNode('Set');
  await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Success');
});
```

### **Imported Workflow Test**
```typescript
test('should import and test webhook', async ({ n8n }) => {
  const { webhookPath } = await n8n.start.fromImportedWorkflow('webhook-test.json');

  await n8n.canvas.clickExecuteWorkflowButton();
  const response = await n8n.page.request.post(`/webhook-test/${webhookPath}`, {
    data: { message: 'Hello' }
  });
  expect(response.ok()).toBe(true);
});
```

### **Project-Scoped Test**
```typescript
test('should create credential in project', async ({ n8n }) => {
  const projectId = await n8n.start.fromNewProject();
  await n8n.navigate.toCredentials(projectId);

  await n8n.credentialsComposer.createFromList(
    'Notion API',
    { apiKey: '12345' },
    { name: `cred-${nanoid()}` }
  );
});
```

### **Node Configuration Test**
```typescript
test('should configure HTTP Request node', async ({ n8n }) => {
  await n8n.start.fromBlankCanvas();
  await n8n.canvas.addNode('Manual Trigger');
  await n8n.canvas.addNode('HTTP Request');

  await n8n.ndv.fillParameterInput('URL', 'https://api.example.com');
  await n8n.ndv.close();
  await n8n.canvas.saveWorkflow();
});
```

## Test Setup Patterns

### **Feature Flags Setup**
```typescript
test.beforeEach(async ({ n8n, api }) => {
  await api.enableFeature('sharing');
  await api.enableFeature('folders');
  await api.enableFeature('projectRole:admin');
  await api.setMaxTeamProjectsQuota(-1);
  await n8n.goHome();
});
```

### **API + UI Combined Test**
```typescript
test('should use API-created credential in UI', async ({ n8n, api }) => {
  const projectId = await n8n.start.fromNewProjectBlankCanvas();

  // Create via API
  await api.credentialApi.createCredential({
    name: 'test-cred',
    type: 'notionApi',
    data: { apiKey: '12345' },
    projectId
  });

  // Verify in UI
  await n8n.canvas.addNode('Notion');
  await expect(n8n.ndv.getCredentialSelect()).toHaveValue('test-cred');
});
```

### **Error/Edge Case Testing**
```typescript
test('should handle workflow execution error', async ({ n8n }) => {
  await n8n.start.fromImportedWorkflow('failing-workflow.json');
  await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Problem in node');
  await expect(n8n.canvas.getErrorIcon()).toBeVisible();
});
```

## Architecture Guidelines

### **Four-Layer UI Testing Architecture**
```
Tests (*.spec.ts)
    ↓ uses
Composables (*Composer.ts) - Business workflows
    ↓ orchestrates
Page Objects (*Page.ts) - UI interactions
    ↓ extends
BasePage - Common utilities
```

### **When to Use Each Layer**
- **Tests**: High-level scenarios, readable business logic
- **Composables**: Multi-step workflows (e.g., `executeWorkflowAndWaitForNotification`)
- **Page Objects**: Simple UI actions (e.g., `clickSaveButton`, `fillInput`)
- **BasePage**: Generic interactions (e.g., `clickByTestId`, `fillByTestId`)

### **Method Naming Conventions**
```typescript
// Page Object Getters (No async, return Locator)
getSearchBar() { return this.page.getByTestId('search'); }

// Page Object Actions (async, return void)
async clickSaveButton() { await this.clickButtonByName('Save'); }

// Page Object Queries (async, return data)
async getNotificationCount(): Promise<number> { /* ... */ }
```

## Quick Reference

### **Most Common Entry Points**
- `n8n.start.fromBlankCanvas()` - New workflow from scratch
- `n8n.start.fromImportedWorkflow('file.json')` - Test existing workflow
- `n8n.start.fromNewProjectBlankCanvas()` - Project-scoped testing

### **Most Common Navigation**
- `n8n.navigate.toCredentials(projectId)` - Credential management
- `n8n.navigate.toVariables()` - Environment variables
- `n8n.navigate.toWorkflow('new')` - New workflow canvas

### **Essential Assertions**
```typescript
// UI state verification
await expect(n8n.canvas.canvasPane()).toBeVisible();
await expect(n8n.notifications.getNotificationByTitle('Success')).toBeVisible();
await expect(n8n.ndv.getCredentialSelect()).toHaveValue(name);

// Node and workflow verification
await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
await expect(n8n.canvas.nodeByName('HTTP Request')).toBeVisible();
```

### **Common Composable Methods**
```typescript
// Workflow operations
await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Success');
await n8n.workflowComposer.createWorkflow('My Workflow');

// Project operations
const { projectName, projectId } = await n8n.projectComposer.createProject();

// Credential operations
await n8n.credentialsComposer.createFromList('Notion API', { apiKey: '123' });
await n8n.credentialsComposer.createFromNdv({ apiKey: '123' });
```

### **Dynamic Data Patterns**
```typescript
// Use nanoid for unique identifiers
import { nanoid } from 'nanoid';
const workflowName = `Test Workflow ${nanoid()}`;
const credentialName = `cred-${nanoid()}`;

// Use timestamps for uniqueness
const projectName = `Project ${Date.now()}`;
```

## AI Guidelines

### **✅ DO**
- Always use `n8n.start.*` methods for test entry points
- Use composables for business workflows, not page objects directly in tests
- Use `nanoid()` or timestamps for unique test data
- Follow the 4-layer architecture pattern
- Use proper waiting with `expect().toBeVisible()` instead of `waitForTimeout`

### **❌ DON'T**
- Use raw `page.goto()` instead of navigation helpers
- Mix business logic in page objects (move to composables)
- Use hardcoded selectors in tests (use page object getters)
- Create overly specific methods (keep them reusable)
- Use `any` types or `waitForTimeout`

### **Test Structure Template**
```typescript
import { test, expect } from '../../fixtures/base';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ n8n, api }) => {
    // Feature flags and setup
    await api.enableFeature('requiredFeature');
    await n8n.goHome();
  });

  test('should perform specific action', async ({ n8n }) => {
    // 1. Setup/Navigation
    await n8n.start.fromBlankCanvas();

    // 2. Actions using composables
    await n8n.workflowComposer.createBasicWorkflow();

    // 3. Assertions
    await expect(n8n.notifications.getNotificationByTitle('Success')).toBeVisible();
  });
});
```