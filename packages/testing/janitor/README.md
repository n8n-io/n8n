# @n8n/playwright-janitor

Static analysis and architecture enforcement for Playwright test suites.

## Why?

Playwright tests are easy to write but hard to maintain at scale. Without guardrails, test code accumulates problems:

- **Selector duplication** - Same `getByTestId('button')` scattered across files
- **Leaky abstractions** - Tests directly manipulating the DOM instead of using page objects
- **Dead code** - Unused page object methods nobody deletes
- **Architecture drift** - Flows importing pages, pages importing tests, layers bleeding together
- **Orphaned test data** - Workflow files nobody references anymore

The janitor catches these problems through static analysis, enforcing your architecture before bad patterns spread.

## Architecture Model

The janitor enforces a layered architecture for Playwright test suites:

```
┌─────────────────────────────────────────────────────────┐
│                        Tests                            │
│   test('user can login', async ({ app }) => { ... })    │
└──────────────────────────┬──────────────────────────────┘
                           │ uses
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Flows / Composables                   │
│   await app.workflows.createAndRun('my-workflow')       │
└──────────────────────────┬──────────────────────────────┘
                           │ orchestrates
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      Page Objects                       │
│   await this.canvas.addNode('HTTP Request')             │
└──────────────────────────┬──────────────────────────────┘
                           │ encapsulates
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       Components                        │
│   await this.nodePanel.selectNode('Webhook')            │
└──────────────────────────┬──────────────────────────────┘
                           │ wraps
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Playwright API                       │
│   page.getByTestId(), page.locator(), page.click()      │
└─────────────────────────────────────────────────────────┘
```

**Key principles:**

1. **Dependencies flow downward** - Tests depend on flows, flows on pages, pages on components
2. **No skipping layers** - Tests should use flows, not reach directly into page internals
3. **Selectors belong in page objects** - Raw `getByTestId()` calls don't belong in tests or flows
4. **One home per selector** - Each test ID should be defined in exactly one page object

## Quick Start

### Installation

```bash
pnpm add -D @n8n/playwright-janitor
```

### Configuration

Create a `janitor.config.js` in your Playwright test root:

```typescript
import { defineConfig } from '@n8n/playwright-janitor';

export default defineConfig({
  rootDir: __dirname,

  // Where your different artifact types live
  patterns: {
    pages: ['pages/**/*.ts'],
    components: ['pages/components/**/*.ts'],
    flows: ['composables/**/*.ts'],       // or 'actions/**/*.ts', 'scenarios/**/*.ts'
    tests: ['tests/**/*.spec.ts'],
    services: ['services/**/*.ts'],
    fixtures: ['fixtures/**/*.ts'],
    helpers: ['helpers/**/*.ts'],
    factories: ['factories/**/*.ts'],
    testData: ['workflows/**/*'],          // Static JSON/fixtures
  },

  // The main page object facade that exposes sub-pages
  facade: {
    file: 'pages/AppPage.ts',
    className: 'AppPage',
    excludeTypes: ['Page', 'APIRequestContext'],
  },

  // What you call the fixture in your tests
  fixtureObjectName: 'app',  // test('...', async ({ app }) => ...)
});
```

### Run Analysis

```typescript
import { runAnalysis } from '@n8n/playwright-janitor';
import config from './janitor.config.js';

const report = runAnalysis(config);
console.log(`Found ${report.summary.totalViolations} violations`);
```

Or create a script:

```typescript
// scripts/run-janitor.ts
import { runAnalysis, toConsole } from '@n8n/playwright-janitor';
import config from '../janitor.config.js';

const report = runAnalysis(config);
toConsole(report);
process.exit(report.summary.totalViolations > 0 ? 1 : 0);
```

### Baseline (Incremental Cleanup)

For existing codebases with many violations, use a baseline to enable incremental cleanup:

```bash
# Create baseline of current violations
janitor baseline

# Commit the baseline
git add .janitor-baseline.json
git commit -m "chore: add janitor baseline"
```

Once a baseline exists, janitor and TCR **only fail on new violations**. Pre-existing violations are tracked but don't block commits.

**Safeguard:** TCR blocks commits that modify `.janitor-baseline.json`. This prevents accidentally "fixing" violations by updating the baseline instead of the actual code. Baseline updates must always be done manually.

```bash
# This now passes (only checks for NEW violations)
janitor tcr --execute -m="Add new feature"

# As you fix violations, update the baseline (manual commit required - TCR won't commit baseline changes)
janitor baseline
git add .janitor-baseline.json
git commit -m "chore: update baseline after cleanup"
```

**Baseline file format:** `.janitor-baseline.json` - tracks violations by file and content hash, so line number shifts don't cause false positives.

### List Rules

View all available rules with their descriptions:

```bash
# Human-readable list
janitor rules

# JSON output (for AI agents/automation)
janitor rules --json

# Verbose (includes target globs)
janitor rules --verbose
```

The JSON output is useful for AI agents that need to understand the rules before writing code.

### Test Discovery & Orchestration

Discover test specs via AST analysis and distribute them across CI shards:

```bash
# Discover specs and capabilities (JSON output)
janitor discover

# Distribute specs across shards (JSON output)
janitor orchestrate --shards=14

# Get specs for a single shard (0-indexed)
janitor orchestrate --shards=14 --shard-index=0

# Only include specs affected by git changes
janitor orchestrate --shards=14 --impact
```

Discovery detects `test.fixme()` and `test.skip()` via AST and excludes them automatically. Capability tags (`@capability:proxy`) are extracted for grouping.

### Workspace-Wide CI Test Scoping

The `affected-packages`, `scope`, and `test-scoped` subcommands operate at
the workspace level — they do not require a `janitor.config.js` and can be
invoked from any package via `pnpm exec janitor ...` (the package's bin is
named `janitor`). They replace the need for `turbo run --affected`, which
requires git history on the runner and is incompatible with `fetch-depth: 1`
checkouts.

**Pipeline:**

```
ci-filter (in install-and-build)
  │
  └─→ CHANGED_FILES (newline-separated)
        │
        ├─→ janitor affected-packages    (walks pnpm workspace dep graph)
        │     │
        │     └─→ AFFECTED_PACKAGES (space-separated list)
        │           │
        │           └─→ passed to test jobs as workflow input
        │
        └─→ CHANGED_FILES forwarded to test jobs
              │
              └─→ janitor test-scoped --runner=vitest  (per-package)
                    │
                    ├─→ SKIP        → exit 0 (no in-package changes)
                    ├─→ RUN_FULL    → spawn runner with no scope flags
                    └─→ scoped      → vitest related
```

**Usage:**

```bash
# Walk the workspace dep graph. Output: one package name per line.
CHANGED_FILES="packages/workflow/src/x.ts" janitor affected-packages

# Compute scope for the cwd package. Output: SKIP | RUN_FULL | <files>
janitor scope --runner=vitest

# Compute scope AND spawn the runner. Unrecognised flags forward to runner.
janitor test-scoped --runner=vitest --shard=1/2 --coverage
```

**Bailout triggers (force ALL packages):** `pnpm-lock.yaml`, root `package.json`.

**Empty `CHANGED_FILES` means "no signal → run everything", not "nothing
changed".** A `null`/empty value resolves to all packages (`affected-packages`)
and `RUN_FULL` (`scope`) — never `SKIP`, which would be a false green. ci-filter
relies on this: on a PR that touches more than `CI_FILTER_MAX_CHANGED_FILES`
(default 1000) files it emits an empty list instead of the full one, because the
joined paths would otherwise overflow the kernel's argv/env size limit and the
test job's shell couldn't even start. Such a change set affects nearly every
package anyway, so the full-suite fallback is both safe and correct.

**Per-package bailout (force full suite):** `vitest.config.*`,
`vite.config.*` (vitest reads vite config), `package.json`, `tsconfig.*`,
plus setup files at `<pkg>/vitest.setup.*` and
`<pkg>/src/__tests__/setup.*`. The scope analyzer detects these and emits
`RUN_FULL`; `test-scoped` then spawns the runner without scope flags.

**Turbo extra inputs:** `n8n-nodes-base#test`'s declared input
`../cli/src/public-api/v1/**/*.yml` is honoured — a change to that yml
marks nodes-base as affected.

**Global triggers force a full workspace run.** Some changes are invisible to
a per-package import-graph walk: a lockfile / root-manifest change, or an edit
to a universal sink (`packages/@n8n/db`, `packages/workflow`, `packages/core`)
whose runtime coupling to downstream packages isn't expressed as a static
import the test file can see. For these, scoping to "files in this package"
would find nothing and emit `SKIP` on every downstream — a silent false green.

The trigger list lives in one place, `core/global-triggers.ts`
(`GLOBAL_TRIGGER_FILES` for exact filenames, `GLOBAL_TRIGGER_PREFIXES` for
directories), and is consulted at **both** layers of the pipeline:

* `affectedPackages()` returns every package, so all jobs are listed as
  affected; and
* `computeScope()` returns `RUN_FULL` for the package, so each job actually
  runs its full suite instead of skipping.

Both checks are required — `affectedPackages` alone only decides which jobs are
*listed*; without the `computeScope` check the job would still `SKIP`. The
trade-off is over-testing on the rare PRs that touch these paths (the failure
mode is "ran too much", never "ran nothing"). To add a new universal sink, add
its directory prefix to `GLOBAL_TRIGGER_PREFIXES`.

## Rules

### Architecture Rules

#### `boundary-protection`

**Severity:** error

Prevents pages from importing other pages directly. Each page should be independent; if you need to compose pages, that's what the facade/flows layer is for.

```typescript
// Bad - WorkflowPage importing SettingsPage
import { SettingsPage } from './SettingsPage';

export class WorkflowPage {
  async openSettings() {
    await this.settingsPage.open(); // Coupling between pages
  }
}

// Good - Pages are independent, composition happens in flows
export class WorkflowPage {
  async getWorkflowName() {
    return this.header.getByTestId('workflow-name').textContent();
  }
}
```

#### `scope-lockdown`

**Severity:** error

Enforces explicit architectural intent for page objects. Each page must either:
1. Have a `container` getter (scoped component - must use container for all locators)
2. Have a navigation method (standalone top-level page - can use `this.page` directly)

This prevents ambiguous page objects and ensures consistent patterns.

```typescript
// Bad - Ambiguous page (neither container nor navigation method)
export class SettingsPage {
  async toggleOption() {
    await this.page.getByTestId('toggle').click(); // Is this a page or component?
  }
}

// Good - Standalone page with navigation method
export class SettingsPage {
  async goto() {
    await this.page.goto('/settings');
  }

  async toggleOption() {
    await this.page.getByTestId('toggle').click(); // OK - explicit standalone page
  }
}

// Good - Scoped component with container
export class NodePanel {
  get container() { return this.page.locator('.node-panel'); }

  async selectNode(name: string) {
    await this.container.getByTestId('node-item').click(); // Scoped to container
  }
}

// Bad - Component with container using unscoped locators
export class NodePanel {
  get container() { return this.page.locator('.node-panel'); }

  async selectNode(name: string) {
    await this.page.getByTestId('node-item').click(); // Escapes container!
  }
}
```

**Configuration:**

```typescript
rules: {
  'scope-lockdown': {
    enabled: true,
    severity: 'error',
    // Customize which method names indicate a standalone page
    navigationMethods: ['goto', 'navigate', 'visit', 'open'],
  },
}
```

#### `selector-purity`

**Severity:** error

Raw Playwright locators (`getByTestId`, `locator`, etc.) should only appear in page objects, not in tests or flows.

**Catches:**
- Direct page locator calls: `page.getByTestId()`, `app.page.locator()`
- Chained locator calls on variables: `someLocator.locator()`, `category.getByText()`

**Note:** Selectors inside `expect()` calls are allowed by default (`allowInExpect: true`). This recognizes that assertions often need to check specific elements.

```typescript
// Bad - Direct page locator in test
test('creates workflow', async ({ app }) => {
  await app.page.getByTestId('new-workflow-btn').click(); // Leaked selector
});

// Bad - Chained locator on returned Locator
test('finds links', async ({ app }) => {
  const category = app.settings.getCategory('nodes');
  const links = category.locator('a[href*="/workflow/"]'); // Leaked selector
});

// Good - Selector encapsulated in page object
test('creates workflow', async ({ app }) => {
  await app.workflows.create(); // Implementation hidden
});

// Good - Page object returns the specific element
test('finds links', async ({ app }) => {
  const links = app.settings.getWorkflowLinks('nodes'); // Selector in page object
});
```

#### `no-page-in-flow`

**Severity:** warning

Flows/composables shouldn't access `page` directly. They should work through page objects.

```typescript
// Bad - Flow reaching into page internals
export class WorkflowComposer {
  async createAndRun() {
    await this.app.page.getByTestId('run-btn').click(); // Direct page access
  }
}

// Good - Flow uses page objects
export class WorkflowComposer {
  async createAndRun() {
    await this.app.canvas.runWorkflow(); // Through page object
  }
}
```

Certain page-level operations are allowed (configurable via `allowPatterns`):
- `page.keyboard.*` - Keyboard shortcuts
- `page.evaluate()` - JavaScript execution
- `page.waitForLoadState()` - Navigation waits
- `page.waitForURL()` - URL assertions
- `page.reload()` - Page refresh

#### `api-purity`

**Severity:** warning

Raw HTTP calls (`request.get()`, `fetch()`) should go through API service classes, not appear directly in tests.

```typescript
// Bad - Raw HTTP in test
test('gets workflows', async ({ request }) => {
  const response = await request.get('/api/workflows');
});

// Good - Through API service
test('gets workflows', async ({ api }) => {
  const workflows = await api.workflows.list();
});
```

#### `no-raw-editor-navigation`

**Severity:** error

Tests must not navigate to the workflow editor with a raw `page.goto()`. The
editor renders a full-screen loading overlay (`node-view-loader`) while it
boots; `page.goto()` resolves before that overlay clears, so a test that
navigates raw and then clicks a canvas control hits a button Playwright reports
as "stable" while the overlay silently intercepts the click — the action hangs
until it times out. Entry composers (`n8n.start.fromImportedWorkflow()`,
`n8n.start.fromBlankCanvas()`) own the readiness wait, so navigation must go
through them. Only editor routes (`/workflow/<id>`, `/workflow/new`) are
flagged; the workflow list (`/workflows`) is not.

```typescript
// Bad - Raw navigation to the editor, canvas may still be covered by the loader
test('opens workflow', async ({ n8n }) => {
  await n8n.page.goto(`/workflow/${workflowId}`);
  await n8n.canvas.clickZoomToFitButton(); // can hang on the loading overlay
});

// Good - Entry composer waits for the canvas to be ready
test('opens workflow', async ({ n8n }) => {
  await n8n.start.fromImportedWorkflow('my-workflow.json');
  await n8n.canvas.clickZoomToFitButton();
});
```

Legitimate raw navigations (e.g. benchmarks measuring cold load time, or tests
exercising routing/URL behaviour directly) can opt out with a directive comment
on the preceding line, ideally with a reason after `--`:

```typescript
// janitor-disable-next-line no-raw-editor-navigation -- benchmark measures cold load
await n8n.page.goto(`/workflow/${workflowId}`);
```

#### `valid-owner-annotation`

**Severity:** error

Every spec must declare the team that owns it via a Playwright `owner`
annotation, and the team must be one of the canonical owners. The owner drives
flaky/failure-triage routing, so a missing owner means failures go nowhere and a
misspelled one (e.g. `'Instance AI'` instead of `'instanceAI'`) routes to a team
that doesn't exist.

The canonical list (`CANONICAL_OWNERS`) lives in the rule itself, mirroring the
"Ownership v2" register — update it there when ownership shifts. Owner is
recognised both as the annotation literal and as an `owner` config property
(e.g. `runMemoryBaseline({ owner })`).

```typescript
// Bad - no owner: triage can't route this spec's failures
test.describe('My feature', () => { ... });

// Bad - owner not in CANONICAL_OWNERS
test.describe('My feature', { annotation: [{ type: 'owner', description: 'Instance AI' }] }, () => { ... });

// Good - canonical owner
test.describe('My feature', { annotation: [{ type: 'owner', description: 'instanceAI' }] }, () => { ... });
```

A spec that legitimately has no team owner can opt out of the check with a
directive comment on the preceding line, ideally with a reason after `--`:

```typescript
// janitor-disable-next-line valid-owner-annotation -- vendor smoke, no team
{ type: 'owner', description: 'n/a' }
```

### Code Quality Rules

#### `dead-code`

**Severity:** warning | **Fixable:** yes

Detects unused public methods and properties in page objects. If nothing references a method, it's probably dead code.

```typescript
export class WorkflowPage {
  async usedMethod() { /* called from tests */ }
  async unusedMethod() { /* nobody calls this */ } // Violation
}
```

#### `deduplication`

**Severity:** warning

Detects the same `getByTestId()` value used in multiple page object files. Each test ID should have one authoritative home.

```typescript
// pages/WorkflowPage.ts
this.page.getByTestId('save-button'); // Duplicate

// pages/SettingsPage.ts
this.page.getByTestId('save-button'); // Duplicate
```

**Note:** Same ID within a single file is allowed (e.g., helper methods).

#### `test-data-hygiene`

**Severity:** warning

Detects:
- **Orphaned test data** - Workflow/expectation files not referenced by any test
- **Generic names** - Files named `test.json`, `data.json`, `workflow_1.json`
- **Ticket-only names** - Files named just `CAT-123.json` without description

```
workflows/
  webhook-with-retry.json     Good - Descriptive
  test.json                   Bad - Generic
  CAT-123.json                Bad - Ticket-only
  unused-workflow.json        Bad - Orphaned (if not referenced)
```

#### `duplicate-logic`

**Severity:** warning

Detects duplicate code using AST structural fingerprinting. Finds copy-paste patterns across tests, pages, flows, and helpers by normalizing code structure (ignoring variable names and literal values).

Catches:
- **Duplicate methods** - Same logic in multiple page objects
- **Duplicate tests** - Copy-pasted test bodies across files
- **Tests duplicating methods** - Test code that reimplements existing page object methods

```typescript
// pages/WorkflowPage.ts
async saveWorkflow() {
  await this.page.click('#save');
  await this.page.fill('#name', 'workflow');
  await this.page.waitForSelector('.saved');
}

// pages/CredentialPage.ts - Violation: duplicates WorkflowPage.saveWorkflow()
async saveCredential() {
  await this.page.click('#save');
  await this.page.fill('#name', 'credential');
  await this.page.waitForSelector('.saved');
}
```

**Threshold:** Methods/tests with fewer than 2 statements are ignored (configurable via `minStatements`).

## Configuration Reference

```typescript
interface JanitorConfig {
  /** Root directory for the Playwright test suite (absolute path) */
  rootDir: string;

  /** Directory patterns for different artifact types */
  patterns: {
    pages: string[];
    components: string[];
    flows: string[];
    tests: string[];
    services: string[];
    fixtures: string[];
    helpers: string[];
    factories: string[];
    testData: string[];
  };

  /** Files to exclude from page analysis (facades, base classes) */
  excludeFromPages: string[];

  /** Facade configuration - the main aggregator that exposes page objects */
  facade: {
    file: string;       // Path relative to rootDir
    className: string;  // e.g., 'AppPage'
    excludeTypes: string[]; // Types to exclude from mapping
  };

  /** The fixture object name used in tests */
  fixtureObjectName: string;  // e.g., 'app', 'po', 'n8n'

  /** The API fixture/helper object name */
  apiFixtureName: string;  // e.g., 'api'

  /** Patterns indicating raw API calls */
  rawApiPatterns: RegExp[];

  /** What you call the middle layer */
  flowLayerName: string;  // e.g., 'Composable', 'Action', 'Flow'

  /** Rule-specific configuration */
  rules: {
    [ruleId: string]: {
      enabled?: boolean;
      severity?: 'error' | 'warning' | 'off';
      allowPatterns?: RegExp[];
    };
  };

  /** Tags that exclude specs from discovery (e.g., ['@wip', '@local-only']) */
  skipTags: string[];

  /** Prefix for extracting capabilities from tags (default: '@capability:') */
  capabilityPrefix: string;

  /** Orchestration configuration for distributing specs across shards */
  orchestration: {
    /** Path to metrics JSON file (relative to rootDir) */
    metricsPath?: string;
    /** Default duration for specs without metrics (ms, default: 60000) */
    defaultDuration: number;
    /** Max group duration before splitting (ms, default: 300000) */
    maxGroupDuration: number;
    /** Only include specs matching this path prefix */
    specFilter?: string;
  };

  /** TCR configuration */
  tcr: {
    testCommand: string;  // Default: 'npx playwright test'
    workerCount?: number; // Default: 1
    allowedTestCommands?: string[]; // Restrict --test-command to these
  };
}
```

## Disabling Rules

### Globally

```typescript
// janitor.config.js
export default defineConfig({
  // ...
  rules: {
    'dead-code': { enabled: false },
    'deduplication': { severity: 'off' },
  },
});
```

### Per-Rule Allow Patterns

```typescript
rules: {
  'no-page-in-flow': {
    allowPatterns: [
      /\.page\.keyboard/,     // Allow keyboard shortcuts
      /\.page\.evaluate/,     // Allow JS execution
    ],
  },
}
```

## Programmatic API

```typescript
import {
  defineConfig,
  runAnalysis,
  createDefaultRunner,
  RuleRunner,
  BaseRule,
  toJSON,
  toConsole,
} from '@n8n/playwright-janitor';

// Simple usage
const report = runAnalysis(config);

// Custom runner with specific rules
const runner = new RuleRunner();
runner.registerRule(new BoundaryProtectionRule());
runner.registerRule(new SelectorPurityRule());

const { project, root } = createProject(config.rootDir);
const report = runner.run(project, root);

// Output
toConsole(report);           // Human-readable
const json = toJSON(report); // Machine-readable
```

## Writing Custom Rules

Extend `BaseRule` to create custom rules:

```typescript
import { SyntaxKind } from 'ts-morph';
import { BaseRule } from '@n8n/playwright-janitor';
import type { Project, SourceFile, Violation } from '@n8n/playwright-janitor';

export class NoHardcodedUrlsRule extends BaseRule {
  readonly id = 'no-hardcoded-urls';
  readonly name = 'No Hardcoded URLs';
  readonly description = 'URLs should come from configuration';
  readonly severity = 'warning' as const;

  getTargetGlobs(): string[] {
    return ['**/*.ts']; // Analyze all TypeScript files
  }

  analyze(project: Project, files: SourceFile[]): Violation[] {
    const violations: Violation[] = [];

    for (const file of files) {
      // Use ts-morph to analyze the AST
      const stringLiterals = file.getDescendantsOfKind(SyntaxKind.StringLiteral);

      for (const literal of stringLiterals) {
        const value = literal.getLiteralText();
        if (value.startsWith('http://') || value.startsWith('https://')) {
          violations.push(
            this.createViolation(
              file,
              literal.getStartLineNumber(),
              literal.getStart() - literal.getStartLinePos(),
              `Hardcoded URL found: ${value}`,
              'Move URL to configuration or environment variable',
            ),
          );
        }
      }
    }

    return violations;
  }
}

// Register with runner
const runner = createDefaultRunner();
runner.registerRule(new NoHardcodedUrlsRule());
```

## Integration with CI

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Janitor
  run: pnpm janitor
```

The janitor exits with code 1 if violations are found, failing the build.

## Philosophy

The janitor embodies these principles:

1. **Catch problems early** - Static analysis finds issues without running tests
2. **Enforce by default** - Good architecture should be the path of least resistance
3. **Configurable, not prescriptive** - Your naming conventions, your layers, your rules
4. **Fixable where possible** - Dead code removal shouldn't require manual work
5. **AI-friendly guardrails** - When AI generates test code, the janitor keeps it clean

## TCR (Test && Commit || Revert)

The janitor includes tools for TCR-style development workflows, where changes are automatically committed if tests pass, or reverted if they fail.

**Recommended Workflow:**

1. Run `pnpm janitor` to identify violations
2. Fix violations in your code
3. **Debug and verify** - Run affected tests manually, check behavior
4. **TCR as the last step** - Once confident, use TCR to safely commit

> **Why TCR last?** Running TCR immediately after fixing violations doesn't give you time to debug if something breaks. The revert happens automatically, and you lose your work. Fix → verify → TCR ensures you only commit working code.

### Impact Analysis

Determine which tests are affected by file changes:

```typescript
import { createProject, ImpactAnalyzer, formatImpactConsole } from '@n8n/playwright-janitor';

const { project } = createProject('./');
const analyzer = new ImpactAnalyzer(project);

// Analyze impact of changed files
const result = analyzer.analyze(['pages/CanvasPage.ts', 'pages/WorkflowPage.ts']);

console.log(`Affected tests: ${result.affectedTests.length}`);
result.affectedTests.forEach(t => console.log(`  - ${t}`));

// Or use the formatter
formatImpactConsole(result, true); // verbose mode
```

### Method-Level Impact

Track which tests use specific page object methods:

```typescript
import { createProject, MethodUsageAnalyzer } from '@n8n/playwright-janitor';

const { project } = createProject('./');
const analyzer = new MethodUsageAnalyzer(project);

// Build a complete index of method usages
const index = analyzer.buildIndex();
console.log(`Tracked ${Object.keys(index.methods).length} methods`);

// Find tests affected by a specific method change
const impact = analyzer.getMethodImpact('CanvasPage.addNode');
console.log(`Tests using CanvasPage.addNode():`);
impact.affectedTestFiles.forEach(t => console.log(`  - ${t}`));
```

### AST Diff Analysis

Detect which methods changed in a file compared to git HEAD:

```typescript
import { diffFileMethods, formatDiffConsole } from '@n8n/playwright-janitor';

const result = diffFileMethods('pages/CanvasPage.ts', 'HEAD');

console.log(`Changed methods:`);
for (const change of result.changedMethods) {
  const symbol = change.changeType === 'added' ? '+'
    : change.changeType === 'removed' ? '-' : '~';
  console.log(`  ${symbol} ${change.className}.${change.methodName}`);
}
```

### TCR Executor

Run the full TCR workflow:

```typescript
import { TcrExecutor } from '@n8n/playwright-janitor';

const tcr = new TcrExecutor();

// Dry run - analyze but don't commit/revert
const result = await tcr.run({ verbose: true });

console.log(`Changed files: ${result.changedFiles.length}`);
console.log(`Changed methods: ${result.changedMethods.length}`);
console.log(`Affected tests: ${result.affectedTests.length}`);
console.log(`Tests passed: ${result.testsPassed}`);

// Execute TCR - commit on success, revert on failure
const executed = await tcr.run({
  execute: true,
  commitMessage: 'feat: Add new workflow feature'
});

console.log(`Action taken: ${executed.action}`); // 'commit' | 'revert' | 'dry-run'
```

### Codebase Inventory

Generate a complete inventory of your test codebase:

```typescript
import { createProject, InventoryAnalyzer, formatInventoryJSON } from '@n8n/playwright-janitor';

const { project } = createProject('./');
const analyzer = new InventoryAnalyzer(project);

const inventory = analyzer.generate();

console.log(`Pages: ${inventory.summary.totalPages}`);
console.log(`Components: ${inventory.summary.totalComponents}`);
console.log(`Flows: ${inventory.summary.totalFlows}`);
console.log(`Test files: ${inventory.summary.totalTestFiles}`);
console.log(`Total tests: ${inventory.summary.totalTests}`);
console.log(`Total methods: ${inventory.summary.totalMethods}`);

// JSON output
const json = formatInventoryJSON(inventory);
```

### TCR Types

```typescript
interface TcrOptions {
  /** Git ref to compare against (default: HEAD) */
  baseRef?: string;
  /** Whether to actually commit/revert (false = dry run) */
  execute?: boolean;
  /** Custom commit message */
  commitMessage?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Override test command (default: from config or 'npx playwright test') */
  testCommand?: string;
}

interface TcrResult {
  changedFiles: string[];
  changedMethods: MethodChange[];
  affectedTests: string[];
  testsRun: string[];
  testsPassed: boolean;
  action: 'commit' | 'revert' | 'dry-run';
  durationMs: number;
}

interface MethodChange {
  className: string;
  methodName: string;
  changeType: 'added' | 'removed' | 'modified';
}

interface ImpactResult {
  changedFiles: string[];
  affectedFiles: string[];
  affectedTests: string[];
  graph: Record<string, string[]>;
}
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
