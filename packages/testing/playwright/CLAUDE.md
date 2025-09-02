# CLAUDE.md

Guidelines for working with the n8n Playwright testing framework.

## Project Structure

This package contains Playwright-based end-to-end tests for n8n workflow automation platform.

```
packages/testing/playwright/
├── pages/              # Page object models
├── composables/        # Reusable test utilities
├── fixtures/          # Test fixtures and base configurations
├── tests/             # Test files organized by feature
│   ├── ui/           # UI-focused tests
│   └── performance/  # Performance tests
├── workflows/         # Workflow JSON files for testing
├── services/          # API helpers and utilities
└── utils/             # Shared utility functions
```

## Development Guidelines

### Test Structure

- **Use TestRequirements pattern** for workflow imports:
  ```typescript
  await setupRequirements({
    workflow: {
      'workflow-file.json': 'Workflow Name',
    },
  });
  ```

- **Use constants** for node names and test data:
  ```typescript
  const NODES = {
    MANUAL_TRIGGER: 'Manual Trigger',
    CODE: 'Code',
    HTTP_REQUEST: 'HTTP Request',
  };
  ```

- **Follow test.beforeEach pattern** for common setup:
  ```typescript
  test.beforeEach(async ({ n8n }) => {
    await n8n.goHome();
  });
  ```

### Page Object Model

- **Pages are in /pages directory** - each UI component gets its own page class
- **Extend BasePage** for common functionality
- **Use descriptive method names** that reflect user actions
- **Return Locators for assertions**, async methods for actions

Example page object structure:
```typescript
export class MyPage extends BasePage {
  // Locators (getters)
  getSubmitButton(): Locator {
    return this.page.getByTestId('submit-button');
  }

  // Actions (async methods)
  async submitForm(): Promise<void> {
    await this.getSubmitButton().click();
  }
}
```

### Test Writing Best Practices

- **Use expect() for assertions** with Playwright matchers
- **Prefer data-test-id selectors** over CSS selectors
- **Use descriptive test names** that explain the behavior being tested
- **Group related tests** in describe blocks
- **Use setupRequirements** for workflow imports instead of manual imports

### Commands Available

```bash
# Run all UI tests locally
pnpm test:local

# Run specific test pattern
pnpm test:local --grep="logs"

# Run with specific reporter
pnpm test:local --reporter=line

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type checking
pnpm typecheck
```

### Working with Workflows

- **Place workflow JSON files** in `/workflows` directory
- **Use setupRequirements** to import workflows in tests
- **Name workflow files descriptively** (e.g., `Workflow_loop.json`)
- **Include workflow name** in setupRequirements call for clarity

### Debugging Tests

- **Use --debug flag** to run tests in debug mode
- **Check screenshots** in test-results directory after failures
- **Use trace files** for detailed debugging information
- **View video recordings** of test runs for visual debugging

### Page Object Integration

All page objects are accessible through the main `n8n` fixture:

```typescript
test('should interact with canvas', async ({ n8n }) => {
  await n8n.canvas.addNode('Manual Trigger');
  await n8n.logs.openLogsPanel();
  await n8n.ndv.execute();
});
```

### Common Patterns

**Workflow Testing:**
```typescript
test('workflow behavior', async ({ n8n, setupRequirements }) => {
  await setupRequirements({
    workflow: { 'test-workflow.json': 'Test Workflow' }
  });
  
  await n8n.canvas.clickExecuteWorkflowButton();
  await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
});
```

**Node Interaction:**
```typescript
// Opening nodes
await n8n.canvas.openNode('HTTP Request');

// Configuring in NDV
await n8n.ndv.fillParameterInput('URL', 'https://api.example.com');
await n8n.ndv.close();
```

**Logs Testing:**
```typescript
await n8n.logs.openLogsPanel();
await expect(n8n.logs.getLogEntries()).toHaveCount(3);
await expect(n8n.logs.getLogEntries().nth(0)).toContainText('Success');
```

## Migration Notes

When migrating from Cypress to Playwright:

- Replace `cy.` commands with `await n8n.` page object methods
- Convert `.should()` assertions to `expect()` with Playwright matchers
- Use `setupRequirements()` instead of direct workflow imports
- Replace Cypress selectors with Playwright locators
- Update async/await patterns throughout

## Error Handling

- **Timeouts**: Default timeout is 20s, adjust as needed
- **Flaky tests**: Use proper waits instead of arbitrary delays
- **Element not found**: Ensure elements exist before interaction
- **Race conditions**: Use Playwright's built-in waiting mechanisms