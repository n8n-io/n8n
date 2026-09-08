# @n8n/rules-engine

Generic, typed rules engine for static analysis tools.

## Usage

```typescript
import { BaseRule, RuleRunner, toJSON } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';

// 1. Define a context type
interface MyContext {
  rootDir: string;
  files: string[];
}

// 2. Create a rule
class NoTodoRule extends BaseRule<MyContext> {
  readonly id = 'no-todo';
  readonly name = 'No TODO comments';
  readonly description = 'Flag TODO comments in source files';
  readonly severity = 'warning' as const;

  analyze(context: MyContext): Violation[] {
    // Your analysis logic here
    return [];
  }
}

// 3. Run it
const runner = new RuleRunner<MyContext>();
runner.registerRule(new NoTodoRule());

const report = await runner.run({ rootDir: '/project', files: [] }, '/project');
console.log(toJSON(report, '/project'));
```

## API

### `BaseRule<TContext>`

Abstract base class. Extend it to create rules.

- `id`, `name`, `description`, `severity` — rule metadata
- `fixable` — whether the rule supports auto-fixing (default: `false`)
- `analyze(context)` — returns `Violation[]` or `Promise<Violation[]>`
- `fix(context, violations)` — returns `FixResult[]` (override for fixable rules)
- `configure(settings)` — apply runtime settings (severity, options)
- `createViolation(file, line, column, message, suggestion?, fixable?, fixData?)` — helper

### `RuleRunner<TContext>`

Registry and executor for rules.

- `registerRule(rule)` — add a rule
- `applySettings(settingsMap)` — configure rules by id
- `enableOnly(ruleIds)` — run only specific rules
- `run(context, projectRoot, options?)` — run all enabled rules, returns `Report`
- `runRule(ruleId, context, projectRoot, options?)` — run a single rule
- `isRuleFixable(ruleId)` — check if a rule supports fixing
- `getRuleDetails()` — list all rules with metadata

### `toJSON(report, rootDir?)`

Serialize a report to JSON, optionally converting absolute paths to relative.

### Baseline

Incremental adoption — only flag new violations, not pre-existing ones.

- `generateBaseline(report, rootDir)` — snapshot current violations
- `saveBaseline(baseline, filePath)` — write to disk
- `loadBaseline(filePath)` — read from disk
- `filterReportByBaseline(report, baseline, rootDir)` — remove known violations

## Consumers

- `@n8n/code-health` — monorepo dependency and code quality checks
- `@n8n/playwright-janitor` — Playwright test architecture enforcement (planned)
