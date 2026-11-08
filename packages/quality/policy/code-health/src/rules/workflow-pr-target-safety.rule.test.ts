import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { WorkflowPrTargetSafetyRule } from './workflow-pr-target-safety.rule.js';

function createTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-workflow-test-'));
}

function writeWorkflow(dir: string, name: string, content: string): void {
	const fullPath = path.join(dir, '.github', 'workflows', name);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, content);
}

describe('WorkflowPrTargetSafetyRule', () => {
	let tmpDir: string;
	let rule: WorkflowPrTargetSafetyRule;

	beforeEach(() => {
		tmpDir = createTempDir();
		rule = new WorkflowPrTargetSafetyRule();
		rule.configure({ options: { allowedWorkflows: ['ci-cla-check.yml'] } });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function context(): CodeHealthContext {
		return { rootDir: tmpDir };
	}

	it('ignores workflows that only use pull_request', async () => {
		writeWorkflow(
			tmpDir,
			'safe.yml',
			`
name: Safe
on:
  pull_request:
    types: [opened]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
`,
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('flags any non-allowlisted workflow that uses pull_request_target', async () => {
		writeWorkflow(
			tmpDir,
			'risky.yml',
			`
name: Risky
on:
  pull_request_target:
    types: [opened]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`,
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].rule).toBe('workflow-pr-target-safety');
		expect(violations[0].message).toContain('pull_request_target');
		expect(violations[0].message).toContain('Prefer pull_request');
	});

	it('flags pull_request_target even when on: is a list', async () => {
		writeWorkflow(
			tmpDir,
			'list-trigger.yml',
			`
name: List
on: [pull_request_target]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`,
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(1);
	});

	it('allows pull_request_target in an allowlisted workflow with no checkout override', async () => {
		writeWorkflow(
			tmpDir,
			'ci-cla-check.yml',
			`
name: CLA Check
on:
  pull_request_target:
    types: [opened]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: .github/scripts/cla
`,
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('flags allowlisted workflow that checks out PR head sha', async () => {
		writeWorkflow(
			tmpDir,
			'ci-cla-check.yml',
			`
name: CLA Check
on:
  pull_request_target:
    types: [opened]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
`,
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('PR-author-controlled ref');
		expect(violations[0].message).toContain('their code, our keys');
	});

	it('flags allowlisted workflow that checks out github.head_ref', async () => {
		writeWorkflow(
			tmpDir,
			'ci-cla-check.yml',
			`
name: CLA Check
on:
  pull_request_target:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.head_ref }}
`,
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('PR-author-controlled ref');
	});

	it('flags allowlisted workflow that checks out PR fork repository', async () => {
		writeWorkflow(
			tmpDir,
			'ci-cla-check.yml',
			`
name: CLA Check
on:
  pull_request_target:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: \${{ github.event.pull_request.head.repo.full_name }}
`,
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('PR-author-controlled repository');
	});

	it('flags shell git checkout of PR head ref', async () => {
		writeWorkflow(
			tmpDir,
			'ci-cla-check.yml',
			`
name: CLA Check
on:
  pull_request_target:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Fetch PR
        run: |
          git fetch origin \${{ github.event.pull_request.head.sha }}
          git checkout FETCH_HEAD
`,
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('shell git command');
	});

	it('does not flag a checkout with no ref override', async () => {
		writeWorkflow(
			tmpDir,
			'ci-cla-check.yml',
			`
name: CLA Check
on:
  pull_request_target:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          path: vendor
`,
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('handles workflows with no triggers without throwing', async () => {
		writeWorkflow(tmpDir, 'broken.yml', 'name: Broken\njobs: {}\n');

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('skips files that are not valid YAML', async () => {
		writeWorkflow(tmpDir, 'invalid.yml', '::: not yaml :::\n\t- broken');

		await expect(rule.analyze(context())).resolves.toBeDefined();
	});
});
