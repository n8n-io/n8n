# n8n Playwright Test Contribution Guide

> For running tests, see [README.md](./README.md)

## 🚀 Quick Start for Test Development

### Prerequisites
- **VS Code/Cursor Extension**: Install "Playwright Test for VSCode"
- **Local n8n Instance**: Local server or Docker

### Configuration
Add to your `/.vscode/settings.json`:
```json
{
  "playwright.env": {
    "N8N_BASE_URL": "http://localhost:5679",  // URL to test against (Don't use 5678 as that can wipe your dev instance DB)
    "SHOW_BROWSER": "true",                   // Show browser (useful with n8n.page.pause())
    "RESET_E2E_DB": "true"                    // Reset DB for fresh state
  }
}
```

### Running Tests
1. **Initial Setup**: Click "Run global setup" in Playwright extension to reset database
2. **Run Tests**: Click play button next to any test in the IDE
3. **Debug**: Add `await n8n.page.pause()` to hijack test execution

Troubleshooting:
- Why can't I run my test from the UI?
  - The tests are separated by groups for tests that can run in parallel or tests that need a DB reset each time. You can select the project in the test explorer.
- Not all my tests ran from the CLI
  - Currently the DB reset tests are a "dependency" of the parallel tests, this is to stop them running at the same time. So if the parallel tests fail the sequential tests won't run.

---

## 🏗️ Architecture Overview

Our test architecture supports both UI-driven and API-driven testing:

### UI Testing (Four-Layer Approach)
```
Tests (*.spec.ts)
    ↓ uses
Composables (*Composer.ts) - Business workflows
    ↓ orchestrates
Page Objects (*Page.ts) - UI interactions
    ↓ extends
BasePage - Common utilities
```

### API Testing (Two-Layer Approach)
```
Tests (*.spec.ts)
    ↓ uses
API Services (ApiHelpers + specialized helpers)
```

### Core Principle: Separation of Concerns
- **BasePage**: Generic interaction methods
- **Page Objects**: Element locators and simple actions
- **Composables**: Complex business workflows
- **API Services**: REST API interactions, workflow management
- **Tests**: Readable scenarios using composables or API services

---

## 📐 Lexical Conventions

### Page Objects: Three Types of Methods

#### 1. Element Getters (No `async`, return `Locator`)
```typescript
// From WorkflowsPage.ts
getSearchBar() {
  return this.page.getByTestId('resources-list-search');
}

getWorkflowByName(name: string) {
  return this.getWorkflowItems().filter({ hasText: name });
}

// From CanvasPage.ts
nodeByName(nodeName: string): Locator {
  return this.page.locator(`[data-test-id="canvas-node"][data-node-name="${nodeName}"]`);
}

saveWorkflowButton(): Locator {
  return this.page.getByRole('button', { name: 'Save' });
}
```

#### 2. Simple Actions (`async`, return `void`)
```typescript
// From WorkflowsPage.ts
async clickAddWorklowButton() {
  await this.clickByTestId('add-resource-workflow');
}

async searchWorkflows(searchTerm: string) {
  await this.clickByTestId('resources-list-search');
  await this.fillByTestId('resources-list-search', searchTerm);
}

// From CanvasPage.ts
async deleteNodeByName(nodeName: string): Promise<void> {
  await this.nodeDeleteButton(nodeName).click();
}

async openNode(nodeName: string): Promise<void> {
  await this.nodeByName(nodeName).dblclick();
}
```

#### 3. Query Methods (`async`, return data)
```typescript
// From CanvasPage.ts
async getPinnedNodeNames(): Promise<string[]> {
  const pinnedNodesLocator = this.page
    .getByTestId('canvas-node')
    .filter({ has: this.page.getByTestId('canvas-node-status-pinned') });

  const names: string[] = [];
  const count = await pinnedNodesLocator.count();

  for (let i = 0; i < count; i++) {
    const node = pinnedNodesLocator.nth(i);
    const name = await node.getAttribute('data-node-name');
    if (name) {
      names.push(name);
    }
  }

  return names;
}

// From NotificationsPage.ts
async getNotificationCount(text?: string | RegExp): Promise<number> {
  try {
    const notifications = text
      ? this.notificationContainerByText(text)
      : this.page.getByRole('alert');
    return await notifications.count();
  } catch {
    return 0;
  }
}
```

### Composables: Business Workflows
```typescript
// From WorkflowComposer.ts
export class WorkflowComposer {
  async executeWorkflowAndWaitForNotification(notificationMessage: string) {
    const responsePromise = this.n8n.page.waitForResponse(
      (response) =>
        response.url().includes('/rest/workflows/') &&
        response.url().includes('/run') &&
        response.request().method() === 'POST',
    );

    await this.n8n.canvas.clickExecuteWorkflowButton();
    await responsePromise;
    await this.n8n.notifications.waitForNotificationAndClose(notificationMessage);
  }

  async createWorkflow(name?: string) {
    await this.n8n.workflows.clickAddWorklowButton();
    const workflowName = name ?? 'My New Workflow';
    await this.n8n.canvas.setWorkflowName(workflowName);
    await this.n8n.canvas.saveWorkflow();
  }
}

// From ProjectComposer.ts
export class ProjectComposer {
  async createProject(projectName?: string) {
    await this.n8n.page.getByTestId('universal-add').click();
    await Promise.all([
      this.n8n.page.waitForResponse('**/rest/projects/*'),
      this.n8n.page.getByTestId('navigation-menu-item').filter({ hasText: 'Project' }).click(),
    ]);
    await this.n8n.notifications.waitForNotificationAndClose('saved successfully');
    await this.n8n.page.waitForLoadState();
    const projectNameUnique = projectName ?? `Project ${Date.now()}`;
    await this.n8n.projectSettings.fillProjectName(projectNameUnique);
    await this.n8n.projectSettings.clickSaveButton();
    const projectId = this.extractProjectIdFromPage('projects', 'settings');
    return { projectName: projectNameUnique, projectId };
  }
}
```

---

## 📁 File Structure & Naming

```
tests/
├── composables/         # Multi-page business workflows
│   ├── CanvasComposer.ts
│   ├── ProjectComposer.ts
│   └── WorkflowComposer.ts
├── pages/              # Page object models
│   ├── BasePage.ts
│   ├── CanvasPage.ts
│   ├── CredentialsPage.ts
│   ├── ExecutionsPage.ts
│   ├── NodeDisplayViewPage.ts
│   ├── NotificationsPage.ts
│   ├── ProjectSettingsPage.ts
│   ├── ProjectWorkflowsPage.ts
│   ├── SidebarPage.ts
│   ├── WorkflowSharingModal.ts
│   └── WorkflowsPage.ts
├── fixtures/           # Test fixtures and setup
├── services/           # API helpers
├── utils/              # Helper functions
├── config/             # Constants and configuration
│   ├── constants.ts
│   ├── intercepts.ts
│   └── test-users.ts
└── *.spec.ts          # Test files
```

### Naming Conventions
| Type | Pattern | Example |
|------|---------|---------|
| **Page Objects** | `{PageName}Page.ts` | `CredentialsPage.ts` |
| **Composables** | `{Domain}Composer.ts` | `WorkflowComposer.ts` |
| **Test Files** | `{number}-{feature}.spec.ts` | `1-workflows.spec.ts` |
| **Test IDs** | `kebab-case` | `data-test-id="save-button"` |

---

## ✅ Implementation Checklist

### When Adding a Page Object Method

```typescript
// From ExecutionsPage.ts - Good example
export class ExecutionsPage extends BasePage {
  // ✅ Getter: Returns Locator, no async
  getExecutionItems(): Locator {
    return this.page.locator('div.execution-card');
  }

  getLastExecutionItem(): Locator {
    const executionItems = this.getExecutionItems();
    return executionItems.nth(0);
  }

  // ✅ Action: Async, descriptive verb, returns void
  async clickDebugInEditorButton(): Promise<void> {
    await this.clickButtonByName('Debug in editor');
  }

  async clickLastExecutionItem(): Promise<void> {
    const executionItem = this.getLastExecutionItem();
    await executionItem.click();
  }

  // ❌ AVOID: Mixed concerns (this should be in a composable)
  async handlePinnedNodesConfirmation(action: 'Unpin' | 'Cancel'): Promise<void> {
    // This involves business logic and should be moved to a composable
  }
}
```

### When Creating a Composable

```typescript
// From CanvasComposer.ts - Good example
export class CanvasComposer {
  /**
   * Pin the data on a node. Then close the node.
   * @param nodeName - The name of the node to pin the data on.
   */
  async pinNodeData(nodeName: string) {
    await this.n8n.canvas.openNode(nodeName);
    await this.n8n.ndv.togglePinData();
    await this.n8n.ndv.close();
  }
}

// From ProjectComposer.ts - Good example with return data
export class ProjectComposer {
  async addCredentialToProject(
    projectName: string,
    credentialType: string,
    credentialFieldName: string,
    credentialValue: string,
  ) {
    await this.n8n.sideBar.openNewCredentialDialogForProject(projectName);
    await this.n8n.credentials.openNewCredentialDialogFromCredentialList(credentialType);
    await this.n8n.credentials.fillCredentialField(credentialFieldName, credentialValue);
    await this.n8n.credentials.saveCredential();
    await this.n8n.notifications.waitForNotificationAndClose('Credential successfully created');
    await this.n8n.credentials.closeCredentialDialog();
  }
}
```

### When Writing Tests

#### UI Tests
```typescript
// ✅ GOOD: From 1-workflows.spec.ts
test('should create a new workflow using add workflow button', async ({ n8n }) => {
  await n8n.workflows.clickAddWorklowButton();

  const workflowName = `Test Workflow ${Date.now()}`;
  await n8n.canvas.setWorkflowName(workflowName);
  await n8n.canvas.clickSaveWorkflowButton();

  await expect(
    n8n.notifications.notificationContainerByText('Workflow successfully created'),
  ).toBeVisible();
});

// ✅ GOOD: From 28-debug.spec.ts - Using helper functions
async function createBasicWorkflow(n8n, url = URLS.FAILING) {
  await n8n.workflows.clickAddWorklowButton();
  await n8n.canvas.addNode('Manual Trigger');
  await n8n.canvas.addNode('HTTP Request');
  await n8n.ndv.fillParameterInput('URL', url);
  await n8n.ndv.close();
  await n8n.canvas.clickSaveWorkflowButton();
  await n8n.notifications.waitForNotificationAndClose(NOTIFICATIONS.WORKFLOW_CREATED);
}

test('should enter debug mode for failed executions', async ({ n8n }) => {
  await createBasicWorkflow(n8n, URLS.FAILING);
  await n8n.workflowComposer.executeWorkflowAndWaitForNotification(NOTIFICATIONS.PROBLEM_IN_NODE);
  await importExecutionForDebugging(n8n);
  expect(n8n.page.url()).toContain('/debug');
});
```

#### API Tests
```typescript
// ✅ GOOD: API-driven workflow testing
test('should create workflow via API, activate it, trigger webhook externally @auth:owner', async ({ api }) => {
  const workflowDefinition = JSON.parse(
    readFileSync(resolveFromRoot('workflows', 'simple-webhook-test.json'), 'utf8'),
  );
  
  const createdWorkflow = await api.workflowApi.createWorkflow(workflowDefinition);
  await api.workflowApi.setActive(createdWorkflow.id, true);
  
  const testPayload = { message: 'Hello from Playwright test' };
  const webhookResponse = await api.workflowApi.triggerWebhook('test-webhook', { data: testPayload });
  expect(webhookResponse.ok()).toBe(true);
  
  const execution = await api.workflowApi.waitForExecution(createdWorkflow.id, 10000);
  expect(execution.status).toBe('success');
  
  const executionDetails = await api.workflowApi.getExecution(execution.id);
  expect(executionDetails.data).toContain('Hello from Playwright test');
});
```

---

## 🎯 Best Practices

### 1. Always Use BasePage Methods
```typescript
// ✅ GOOD - From NodeDisplayViewPage.ts
async fillParameterInput(labelName: string, value: string) {
  await this.getParameterByLabel(labelName).getByTestId('parameter-input-field').fill(value);
}

async clickBackToCanvasButton() {
  await this.clickByTestId('back-to-canvas');
}

// ❌ AVOID
async badExample() {
  await this.page.getByTestId('back-to-canvas').click();
}
```

### 2. Keep Page Objects Simple
```typescript
// ✅ GOOD - From CredentialsPage.ts
export class CredentialsPage extends BasePage {
  async openCredentialSelector() {
    await this.page.getByRole('combobox', { name: 'Select Credential' }).click();
  }

  async createNewCredential() {
    await this.clickByText('Create new credential');
  }

  async fillCredentialField(fieldName: string, value: string) {
    const field = this.page
      .getByTestId(`parameter-input-${fieldName}`)
      .getByTestId('parameter-input-field');
    await field.click();
    await field.fill(value);
  }
}
```

### 3. Use Constants for Repeated Values
```typescript
// From constants.ts
export const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';
export const MANUAL_TRIGGER_NODE_DISPLAY_NAME = 'When clicking 'Execute workflow'';
export const CODE_NODE_NAME = 'Code';
export const SET_NODE_NAME = 'Set';
export const HTTP_REQUEST_NODE_NAME = 'HTTP Request';

// From 28-debug.spec.ts
const NOTIFICATIONS = {
  WORKFLOW_CREATED: 'Workflow successfully created',
  EXECUTION_IMPORTED: 'Execution data imported',
  PROBLEM_IN_NODE: 'Problem in node',
  SUCCESSFUL: 'Successful',
  DATA_NOT_IMPORTED: "Some execution data wasn't imported",
};
```

### 4. Handle Dynamic Data
```typescript
// From test-users.ts
export const INSTANCE_OWNER_CREDENTIALS: UserCredentials = {
  email: 'nathan@n8n.io',
  password: DEFAULT_USER_PASSWORD,
  firstName: randFirstName(),
  lastName: randLastName(),
};

// From tests
const projectName = `Test Project ${Date.now()}`;
const workflowName = `Archive Test ${Date.now()}`;
```

### 5. Proper Waiting Strategies
```typescript
// ✅ GOOD - From ProjectComposer.ts
await Promise.all([
  this.n8n.page.waitForResponse('**/rest/projects/*'),
  this.n8n.page.getByTestId('navigation-menu-item').filter({ hasText: 'Project' }).click(),
]);

// From NotificationsPage.ts
async waitForNotification(text: string | RegExp, options: { timeout?: number } = {}): Promise<boolean> {
  const { timeout = 5000 } = options;
  try {
    const notification = this.notificationContainerByText(text).first();
    await notification.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}
```

---

## 🚨 Common Anti-Patterns

### ❌ Don't Mix Concerns
```typescript
// BAD: From WorkflowsPage.ts - Should be in composable
async archiveWorkflow(workflowItem: Locator) {
  await workflowItem.getByTestId('workflow-card-actions').click();
  await this.getArchiveMenuItem().click();
}

// GOOD: Simple page object method
async clickArchiveMenuItem() {
  await this.getArchiveMenuItem().click();
}
```

### ❌ Don't Use Raw Selectors in Tests
```typescript
// BAD: From 1-workflows.spec.ts
await expect(n8n.page.getByText('No workflows found')).toBeVisible();

// GOOD: Add getter to page object
await expect(n8n.workflows.getEmptyStateMessage()).toBeVisible();
```

### ❌ Don't Create Overly Specific Methods
```typescript
// BAD: Too specific
async createAndSaveNewCredentialForNotionApi(apiKey: string) {
  // Too specific! Break it down
}

// GOOD: From CredentialsPage.ts - Reusable parts
async openNewCredentialDialogFromCredentialList(credentialType: string): Promise<void>
async fillCredentialField(fieldName: string, value: string)
async saveCredential()
```

---

## 📝 Code Review Checklist

Before submitting your PR, ensure:

- [ ] All page object methods follow the getter/action/query pattern
- [ ] Complex workflows are in composables, not page objects
- [ ] Tests use composables, not low-level page methods
- [ ] Used `BasePage` methods instead of raw Playwright selectors
- [ ] Added JSDoc comments for non-obvious methods
- [ ] Test names clearly describe the business scenario
- [ ] No `waitForTimeout` - used proper Playwright waiting
- [ ] Constants used for repeated strings
- [ ] Dynamic data includes timestamps to avoid conflicts
- [ ] Methods are small and focused on one responsibility

---

## 🔍 Real Implementation Example

Here's a complete example from our codebase showing all layers:

```typescript
// 1. Page Object (ProjectSettingsPage.ts)
export class ProjectSettingsPage extends BasePage {
  // Simple action methods only
  async fillProjectName(name: string) {
    await this.page.getByTestId('project-settings-name-input').locator('input').fill(name);
  }

  async clickSaveButton() {
    await this.clickButtonByName('Save');
  }
}

// 2. Composable (ProjectComposer.ts)
export class ProjectComposer {
  async createProject(projectName?: string) {
    await this.n8n.page.getByTestId('universal-add').click();
    await Promise.all([
      this.n8n.page.waitForResponse('**/rest/projects/*'),
      this.n8n.page.getByTestId('navigation-menu-item').filter({ hasText: 'Project' }).click(),
    ]);
    await this.n8n.notifications.waitForNotificationAndClose('saved successfully');
    await this.n8n.page.waitForLoadState();
    const projectNameUnique = projectName ?? `Project ${Date.now()}`;
    await this.n8n.projectSettings.fillProjectName(projectNameUnique);
    await this.n8n.projectSettings.clickSaveButton();
    const projectId = this.extractProjectIdFromPage('projects', 'settings');
    return { projectName: projectNameUnique, projectId };
  }
}

// 3. Test (39-projects.spec.ts)
test('should filter credentials by project ID', async ({ n8n, api }) => {
  const { projectName, projectId } = await n8n.projectComposer.createProject();
  await n8n.projectComposer.addCredentialToProject(
    projectName,
    'Notion API',
    'apiKey',
    NOTION_API_KEY,
  );

  const credentials = await getCredentialsForProject(api, projectId);
  expect(credentials).toHaveLength(1);
});
```
