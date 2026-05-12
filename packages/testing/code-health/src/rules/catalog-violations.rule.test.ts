import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { CatalogViolationsRule } from './catalog-violations.rule.js';

function createTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-test-'));
}

function writeFile(dir: string, relativePath: string, content: string): void {
	const fullPath = path.join(dir, relativePath);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, content);
}

describe('CatalogViolationsRule', () => {
	let tmpDir: string;
	let rule: CatalogViolationsRule;

	beforeEach(() => {
		tmpDir = createTempDir();
		rule = new CatalogViolationsRule();
		rule.configure({ options: { workspaceFile: 'pnpm-workspace.yaml' } });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function context(): CodeHealthContext {
		return { rootDir: tmpDir };
	}

	it('flags hardcoded version when dep exists in catalog', async () => {
		writeFile(
			tmpDir,
			'pnpm-workspace.yaml',
			`
packages:
  - packages/*
catalog:
  lodash: ^4.17.0
`,
		);
		writeFile(
			tmpDir,
			'packages/foo/package.json',
			JSON.stringify(
				{
					name: 'foo',
					dependencies: { lodash: '^4.17.21' },
				},
				null,
				2,
			),
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('lodash');
		expect(violations[0].message).toContain('"catalog:"');
	});

	it('flags hardcoded version when dep exists in named catalog', async () => {
		writeFile(
			tmpDir,
			'pnpm-workspace.yaml',
			`
packages:
  - packages/*
catalogs:
  frontend:
    vue: ^3.4.0
`,
		);
		writeFile(
			tmpDir,
			'packages/ui/package.json',
			JSON.stringify(
				{
					name: 'ui',
					dependencies: { vue: '^3.3.0' },
				},
				null,
				2,
			),
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('vue');
		expect(violations[0].message).toContain('"catalog:frontend"');
	});

	it('ignores deps that already use catalog reference', async () => {
		writeFile(
			tmpDir,
			'pnpm-workspace.yaml',
			`
packages:
  - packages/*
catalog:
  zod: ^3.0.0
`,
		);
		writeFile(
			tmpDir,
			'packages/core/package.json',
			JSON.stringify(
				{
					name: 'core',
					dependencies: { zod: 'catalog:' },
				},
				null,
				2,
			),
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('ignores workspace references', async () => {
		writeFile(
			tmpDir,
			'pnpm-workspace.yaml',
			`
packages:
  - packages/*
catalog: {}
`,
		);
		writeFile(
			tmpDir,
			'packages/cli/package.json',
			JSON.stringify(
				{
					name: 'cli',
					dependencies: { '@n8n/core': 'workspace:*' },
				},
				null,
				2,
			),
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('flags cross-package version mismatch for deps not in catalog', async () => {
		writeFile(
			tmpDir,
			'pnpm-workspace.yaml',
			`
packages:
  - packages/*
catalog: {}
`,
		);
		writeFile(
			tmpDir,
			'packages/a/package.json',
			JSON.stringify(
				{
					name: 'a',
					dependencies: { 'some-lib': '^1.0.0' },
				},
				null,
				2,
			),
		);
		writeFile(
			tmpDir,
			'packages/b/package.json',
			JSON.stringify(
				{
					name: 'b',
					dependencies: { 'some-lib': '^2.0.0' },
				},
				null,
				2,
			),
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(2);
		expect(violations[0].message).toContain('some-lib');
		expect(violations[0].message).toContain('2 different versions');
	});

	it('does not flag cross-package when versions match', async () => {
		writeFile(
			tmpDir,
			'pnpm-workspace.yaml',
			`
packages:
  - packages/*
catalog: {}
`,
		);
		writeFile(
			tmpDir,
			'packages/a/package.json',
			JSON.stringify(
				{
					name: 'a',
					dependencies: { 'some-lib': '^1.0.0' },
				},
				null,
				2,
			),
		);
		writeFile(
			tmpDir,
			'packages/b/package.json',
			JSON.stringify(
				{
					name: 'b',
					dependencies: { 'some-lib': '^1.0.0' },
				},
				null,
				2,
			),
		);

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});
});
