# Contributing to TaxFlow Enhanced

First off, thank you for considering contributing to TaxFlow Enhanced! It's people like you that make TaxFlow Enhanced such a great tool.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
3. [Development Setup](#development-setup)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Commit Message Guidelines](#commit-message-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Testing Guidelines](#testing-guidelines)
9. [Documentation Guidelines](#documentation-guidelines)

---

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Pledge

We are committed to making participation in this project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

---

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS 14.0]
 - Browser: [e.g. Chrome 120, Safari 17]
 - Node Version: [e.g. 18.17.0]
 - TaxFlow Version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any examples** of how it would be used

**Enhancement Template:**

```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions.

**Additional context**
Add any other context or screenshots about the feature request.
```

### Contributing Code

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Write or update tests
5. Ensure all tests pass
6. Update documentation
7. Submit a pull request

---

## Development Setup

### Prerequisites

- Node.js 18.0 or higher
- npm 9.0 or higher
- Git 2.30 or higher

### Initial Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/taxflow-enhanced.git
cd taxflow-enhanced

# Add upstream remote
git remote add upstream https://github.com/original-owner/taxflow-enhanced.git

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### Verify Setup

```bash
# Run all tests
npm run test:run

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

All commands should complete successfully.

---

## Development Workflow

### 1. Sync with Upstream

Before starting work, sync with upstream:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create Feature Branch

```bash
git checkout -b feature/your-feature-name

# Or for bug fixes:
git checkout -b fix/bug-description
```

**Branch Naming Conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `test/` - Test additions/changes
- `refactor/` - Code refactoring
- `perf/` - Performance improvements
- `chore/` - Maintenance tasks

### 3. Make Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits focused and atomic

### 4. Test Your Changes

```bash
# Run tests
npm run test:run

# Type check
npm run typecheck

# Lint
npm run lint

# Build to ensure no build errors
npm run build
```

### 5. Commit Changes

Follow our [commit message guidelines](#commit-message-guidelines):

```bash
git add .
git commit -m "feat: add new feature description"
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

---

## Coding Standards

### TypeScript

- **Use TypeScript** for all new code
- **Enable strict mode** - no `any` types
- **Proper typing** - use interfaces and types
- **Type guards** instead of type casting

```typescript
// Good
interface TaxData {
  income: Decimal;
  deductions: Decimal;
}

function calculateTax(data: TaxData): Decimal {
  return data.income.minus(data.deductions);
}

// Bad
function calculateTax(data: any) {
  return data.income - data.deductions; // No type safety
}
```

### React Components

- **Functional components** with hooks
- **Props interfaces** for all components
- **Memoization** where appropriate
- **Error boundaries** for fault tolerance

```tsx
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  // Component logic
  return <div>{title}</div>;
}
```

### Code Style

- **2 spaces** for indentation
- **Single quotes** for strings
- **Trailing commas** in multi-line lists
- **Semicolons** at end of statements
- **Arrow functions** for callbacks

### Naming Conventions

- **PascalCase** - Components, interfaces, types, classes
- **camelCase** - Functions, variables, methods
- **UPPER_CASE** - Constants
- **kebab-case** - File names, CSS classes

```typescript
// Components and types
export interface TaxCalculator {}
export function TaxWorkflow() {}

// Functions and variables
const calculateTax = () => {};
let userInput = '';

// Constants
const TAX_YEAR = 2024;
```

### File Organization

```
src/
├── components/       # React components
│   └── MyComponent/
│       ├── index.tsx        # Main component
│       ├── MyComponent.tsx  # Component implementation
│       └── MyComponent.test.tsx  # Tests
├── core/            # Business logic
├── nodes/           # Tax nodes
│   └── calculation/
│       ├── MyNode.ts
│       └── MyNode.test.ts
└── utils/           # Utility functions
```

---

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat** - New feature
- **fix** - Bug fix
- **docs** - Documentation only changes
- **style** - Code style changes (formatting, etc.)
- **refactor** - Code refactoring
- **perf** - Performance improvements
- **test** - Adding or updating tests
- **chore** - Maintenance tasks

### Scope (optional)

Component or feature affected:
- `core` - Workflow engine
- `nodes` - Tax nodes
- `ui` - User interface
- `config` - Configuration
- `deps` - Dependencies

### Examples

```bash
# Feature
feat(nodes): add Schedule D capital gains node

# Bug fix
fix(core): resolve cyclic dependency in workflow execution

# Documentation
docs: update deployment guide with Docker instructions

# Performance
perf(workflow): optimize topological sort algorithm

# Test
test(nodes): add integration tests for AGI calculator

# Refactor
refactor(ui): simplify Canvas component state management
```

---

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm run test:run`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No linting errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (for significant changes)

### Pull Request Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran and how to reproduce them.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged and published
```

### Review Process

1. **Automated Checks** - All CI checks must pass
2. **Code Review** - At least one approval required
3. **Testing** - Reviewer will test changes locally
4. **Documentation** - Verify docs are updated
5. **Merge** - Maintainer will merge when approved

---

## Testing Guidelines

### Test Requirements

- **All new features** must have tests
- **Bug fixes** should include regression tests
- **Maintain coverage** - don't decrease test coverage
- **Test edge cases** - not just happy paths

### Test Structure

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  describe('Feature Group', () => {
    it('should do something specific', () => {
      // Arrange
      const input = createTestData();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Test Types

**Unit Tests** - Individual functions and classes
```typescript
test('calculateTax returns correct amount', () => {
  const income = new Decimal(100000);
  const tax = calculateTax(income, 'single');
  expect(tax.toNumber()).toBe(18174.50);
});
```

**Component Tests** - React components
```typescript
test('renders node palette with all categories', () => {
  render(<NodePalette />);
  expect(screen.getByText('Input')).toBeInTheDocument();
  expect(screen.getByText('Calculation')).toBeInTheDocument();
});
```

**Integration Tests** - Multi-component workflows
```typescript
test('executes complete tax workflow', async () => {
  const workflow = createWorkflow();
  workflow.addNode('input', new ManualEntryNode());
  workflow.addNode('agi', new AGICalculatorNode());

  const result = await workflow.execute();
  expect(result.totalTax).toBeDefined();
});
```

### Running Tests

```bash
# All tests
npm run test:run

# Watch mode
npm run test

# Coverage
npm run test:coverage

# Specific file
npm run test MyComponent.test.tsx
```

---

## Documentation Guidelines

### Code Documentation

- **JSDoc** for all public APIs
- **Inline comments** for complex logic
- **Type annotations** are documentation

```typescript
/**
 * Calculates federal income tax using progressive tax brackets
 *
 * @param taxableIncome - Income after deductions
 * @param filingStatus - Tax filing status
 * @returns Calculated federal tax amount
 * @throws {Error} If filing status is invalid
 *
 * @example
 * ```typescript
 * const tax = calculateTax(new Decimal(75000), 'single');
 * console.log(tax.toString()); // "11663.00"
 * ```
 */
export function calculateTax(
  taxableIncome: Decimal,
  filingStatus: FilingStatus
): Decimal {
  // Implementation
}
```

### Documentation Updates

When making changes, update relevant documentation:

- **README.md** - For user-facing features
- **DEVELOPER_GUIDE.md** - For technical changes
- **USER_GUIDE.md** - For UI/UX changes
- **DEPLOYMENT.md** - For deployment changes
- **CHANGELOG.md** - For all notable changes

---

## Questions?

- **GitHub Issues** - For bugs and feature requests
- **GitHub Discussions** - For questions and discussions
- **Project Maintainers** - For other inquiries

---

Thank you for contributing to TaxFlow Enhanced! 🎉
