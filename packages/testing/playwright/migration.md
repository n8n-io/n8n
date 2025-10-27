# Cypress to Playwright Migration Guide

## Migration Process

### 1. Review Original Test
- Examine the Cypress test file to understand what functionality it's testing
- Note the test structure, assertions, and user interactions
- Identify any special setup or teardown requirements

### 2. Scaffold New Test
- Create Playwright test file with exact same test names as Cypress
- Add commented descriptions of what each test is trying to achieve
- Keep the same test structure and organization

### 3. Analyze Dependencies
- Review what page models, composables, and helpers the Cypress test uses
- Check existing Playwright infrastructure in `composables/`, `helpers/`, `pages/`
- Identify which components are already available vs need to be created

### 4. Study Building Blocks
- Review existing Playwright tests to understand correct patterns
- Check how similar functionality is implemented in other migrated tests
- Follow established conventions for page objects and test structure

### 5. Plan Migration Approach
- Determine the best strategy for translating Cypress commands to Playwright
- Plan any new page objects or helpers needed
- Consider test data requirements and setup

### 6. Execute Migration
- Migrate tests one at a time
- Maintain original test intent and coverage
- Follow Playwright best practices and n8n conventions

### 7. Verify Results
- Test using `pnpm test:local --grep "test-name" --reporter=line`
- Ensure all assertions pass and behavior matches original
- Validate test runs reliably and consistently

## Key Differences: Cypress vs Playwright

- **Selectors**: Cypress uses `cy.get()` → Playwright uses `page.locator()`
- **Assertions**: Cypress auto-waits → Playwright uses `expect()` with built-in waiting
- **Page Navigation**: `cy.visit()` → `page.goto()`
- **Element Interaction**: `cy.click()` → `locator.click()`
- **Text Content**: `cy.contains()` → `expect(locator).toContainText()`

## Testing Commands

```bash
# Run specific test with grep
pnpm --filter n8n-playwright test:local --grep "test-name" --reporter=line

# Run full test suite in directory
pnpm --filter n8n-playwright test:local --reporter=line
```
