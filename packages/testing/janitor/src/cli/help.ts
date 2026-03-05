/**
 * CLI Help Messages
 *
 * Centralized help text for all commands.
 */

export function showHelp(): void {
	console.log(`
Playwright Janitor - Static analysis for Playwright test architecture

Usage:
  playwright-janitor [command] [options]

Commands:
  (default)          Run static analysis rules
  rules              Show detailed information about all rules (for AI agents)
  baseline           Create/update baseline of known violations
  inventory          Show codebase inventory (pages, components, flows, tests)
  impact             Analyze impact of file changes (which tests to run)
  method-impact      Find tests that use a specific method (e.g., CanvasPage.addNode)
  tcr                Run TCR (Test && Commit || Revert) workflow
  discover           Discover test specs and capabilities (for orchestration)
  orchestrate        Distribute specs across shards using capability-aware bin-packing

Analysis Options:
  --config=<path>    Path to janitor.config.js (default: ./janitor.config.js)
  --rule=<id>        Run a specific rule
  --file=<path>      Analyze a specific file
  --files=<p1,p2>    Analyze multiple files (comma-separated)
  --json             Output as JSON
  --verbose, -v      Detailed output with suggestions
  --fix              Preview fixes (dry run)
  --fix --write      Apply fixes to disk
  --list, -l         List available rules
  --allow-in-expect  Skip selector-purity violations inside expect()
  --ignore-baseline  Show all violations, ignoring .janitor-baseline.json
  --help, -h         Show this help

Examples:
  playwright-janitor                         # Run all rules
  playwright-janitor --rule=dead-code        # Run specific rule
  playwright-janitor inventory               # Show codebase structure
  playwright-janitor impact --file=pages/X   # Show what tests are affected
  playwright-janitor --fix --write           # Apply auto-fixes

For command-specific help:
  playwright-janitor rules --help
  playwright-janitor baseline --help
  playwright-janitor inventory --help
  playwright-janitor impact --help
  playwright-janitor method-impact --help
  playwright-janitor tcr --help
  playwright-janitor discover --help
  playwright-janitor orchestrate --help
`);
}

export function showInventoryHelp(): void {
	console.log(`
Inventory - Generate JSON inventory of codebase structure

Usage: playwright-janitor inventory [options]

Options:
  --summary, -s        Compact output (~500 tokens) - counts, facade props, categories
  --category=<name>    Filter to single category with method names only
  --file=<path>        Detailed info for a single file (full method signatures)

Categories: pages, components, composables, services, fixtures, helpers, factories, testData

Examples:
  playwright-janitor inventory --summary              # AI-friendly overview
  playwright-janitor inventory --category=pages       # All pages, method names only
  playwright-janitor inventory --file=CanvasPage.ts   # Full details for one file
  playwright-janitor inventory                        # Full inventory (verbose)

Progressive disclosure for AI:
  1. --summary to understand the landscape
  2. --category=X to explore a specific area
  3. --file=X.ts for detailed method signatures
`);
}

export function showImpactHelp(): void {
	console.log(`
Impact - Find affected tests for changed files

Options: --file=<path>, --files=<p1,p2>, --json, --test-list, --verbose
Example: playwright-janitor impact --test-list | xargs npx playwright test
`);
}

export function showMethodImpactHelp(): void {
	console.log(`
Method Impact - Find tests using a specific method

Options: --method=<Class.method>, --index, --json, --test-list, --verbose
Example: playwright-janitor method-impact --method=CanvasPage.addNode
`);
}

export function showTcrHelp(): void {
	console.log(`
TCR - Test && Commit || Revert workflow

Options:
  --execute, -x           Actually commit/revert (default: dry run)
  --message=<msg>         Commit message
  --target-branch=<name>  Branch to diff against
  --max-diff-lines=<n>    Skip if diff exceeds N lines
  --test-command=<cmd>    Test command (files appended). Must match allowlist if configured
  --json, --verbose

Example: playwright-janitor tcr --execute -m="Fix bug"
`);
}

export function showBaselineHelp(): void {
	console.log(`
Baseline - Snapshot current violations for incremental cleanup

Creates .janitor-baseline.json with all current violations. When this file
exists, janitor and TCR only fail on NEW violations not in the baseline.

Usage:
  playwright-janitor baseline              # Create/update baseline
  playwright-janitor baseline --verbose    # Show what's being baselined

Workflow:
  1. Run 'janitor baseline' to snapshot current state
  2. Commit .janitor-baseline.json
  3. Now TCR only fails on new violations
  4. As you fix violations, re-run 'janitor baseline' to update

Example:
  playwright-janitor baseline && git add .janitor-baseline.json
`);
}

export function showDiscoverHelp(): void {
	console.log(`
Discover - Find test specs and their capabilities via AST analysis

Statically discovers spec files and extracts capability tags.
Outputs JSON to stdout. Pipe to jq for human-readable output.

Usage:
  playwright-janitor discover

Output:
  { specs: [{ path, capabilities }], skipTags }

Config:
  skipTags: string[]       Tags that exclude specs (default: [])
  capabilityPrefix: string Prefix for capability extraction (default: '@capability:')

Skip detection:
  - test.fixme() and test.skip() are always detected via AST
  - Specs with ALL tests skipped are excluded from output
  - skipTags provides additional tag-based filtering

Example:
  playwright-janitor discover | jq '.specs | length'
`);
}

export function showOrchestrateHelp(): void {
	console.log(`
Orchestrate - Distribute specs across shards using capability-aware bin-packing

Groups tests by capability to minimize fixture overhead, then uses greedy
bin-packing to balance test time across shards. Outputs JSON to stdout.

Usage:
  playwright-janitor orchestrate --shards=<N>                    # Full result as JSON
  playwright-janitor orchestrate --shards=<N> --shard-index=<I>  # Specs for one shard

Options:
  --shards=<N>         Number of shards (required)
  --shard-index=<I>    Output specs for a single shard (0-indexed)
  --impact             Only include specs affected by changed files (git diff)
  --file=<path>        With --impact: specify changed files explicitly

Config:
  orchestration.metricsPath      Path to metrics JSON (relative to rootDir)
  orchestration.defaultDuration  Duration for specs without metrics (default: 60s)
  orchestration.maxGroupDuration Max group size before splitting (default: 5min)

Output:
  { shards: [{ shard, specs, testTime, capabilities, fixtureCount }], totalTestTime }

Examples:
  playwright-janitor orchestrate --shards=14 | jq '.shards[0].specs'
  playwright-janitor orchestrate --shards=8 --impact
  playwright-janitor orchestrate --shards=4 --impact --file=pages/CanvasPage.ts
`);
}

export function showRulesHelp(): void {
	console.log(`
Rules - Show detailed information about available rules

Usage:
  playwright-janitor rules              # List all rules with descriptions
  playwright-janitor rules --json       # Output as JSON (for AI agents)
  playwright-janitor rules --verbose    # Include what each rule catches

Output includes:
  - Rule ID and name
  - Description
  - Severity (error/warning)
  - Whether it's fixable
  - What patterns it catches
  - Exceptions/allowed patterns

Example:
  playwright-janitor rules --json | jq '.[] | select(.id == "selector-purity")'
`);
}
