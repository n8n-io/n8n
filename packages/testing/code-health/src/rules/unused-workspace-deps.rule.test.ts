import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { UnusedWorkspaceDepsRule } from './unused-workspace-deps.rule.js';

interface ManifestOpts {
	name: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	scripts?: Record<string, string>;
	bin?: Record<string, string>;
}

describe('UnusedWorkspaceDepsRule', () => {
	let tmpDir: string;
	let rule: UnusedWorkspaceDepsRule;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-test-'));
		rule = new UnusedWorkspaceDepsRule();
		rule.configure({ options: { allowUnused: [] } });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function writeFile(relativePath: string, content: string): void {
		const fullPath = path.join(tmpDir, relativePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	/** Writes `packages/<dir>/package.json`. Only `packages/**` is in scope for the rule. */
	function writePackage(dir: string, manifest: ManifestOpts): void {
		writeFile(`packages/${dir}/package.json`, `${JSON.stringify(manifest, null, 2)}\n`);
	}

	function context(): CodeHealthContext {
		return { rootDir: tmpDir };
	}

	async function unusedNames(): Promise<string[]> {
		const violations = await rule.analyze(context());
		return violations.map((violation) => violation.message.split('"')[1]);
	}

	/** The consumer under test, plus the workspace package it declares. */
	function writeConsumer(manifest: Omit<ManifestOpts, 'name'> = {}): void {
		writePackage('consumer', { name: 'consumer', ...manifest });
	}

	describe('detection', () => {
		it('flags a workspace dependency that no file in the package mentions', async () => {
			writeConsumer({ dependencies: { '@n8n/config': 'workspace:*' } });
			writeFile('packages/consumer/src/index.ts', "export const answer = 'unrelated';\n");

			expect(await unusedNames()).toEqual(['@n8n/config']);
		});

		it('flags an unused workspace devDependency', async () => {
			writeConsumer({ devDependencies: { '@n8n/vitest-config': 'workspace:*' } });
			writeFile('packages/consumer/vitest.config.ts', 'export default { test: {} };\n');

			expect(await unusedNames()).toEqual(['@n8n/vitest-config']);
		});

		it('reports the declaration line and the package path', async () => {
			writeConsumer({ dependencies: { '@n8n/errors': 'workspace:*' } });

			const [violation] = await rule.analyze(context());

			expect(violation.file).toBe(path.join(tmpDir, 'packages/consumer/package.json'));
			expect(violation.line).toBeGreaterThan(1);
			expect(violation.message).toContain('packages/consumer');
			expect(violation.message).toContain('@n8n/errors');
			expect(violation.severity).toBe('warning');
		});

		it('flags a dependency whose only mention is prose in a markdown file', async () => {
			// Regression from #38377: a doc naming `packages/@n8n/instance-ai/foo.ts`
			// as an example path must not vouch for the dependency edge.
			writeConsumer({ devDependencies: { '@n8n/instance-ai': 'workspace:*' } });
			writeFile(
				'packages/consumer/docs/impact-map.md',
				'A new `packages/@n8n/instance-ai/foo.ts`\n',
			);

			expect(await unusedNames()).toEqual(['@n8n/instance-ai']);
		});

		it('does not treat a longer neighbouring name as a mention', async () => {
			// `ai-node-sdk-version.ts` must not vouch for `@n8n/ai-node-sdk`.
			writeConsumer({ dependencies: { '@n8n/ai-node-sdk': 'workspace:*' } });
			writeFile('packages/consumer/src/index.ts', "import '@n8n/ai-node-sdk-version';\n");

			expect(await unusedNames()).toEqual(['@n8n/ai-node-sdk']);
		});
	});

	describe('must not be reported', () => {
		it('a dependency imported from src', async () => {
			writeConsumer({ dependencies: { '@n8n/utils': 'workspace:*' } });
			writeFile('packages/consumer/src/index.ts', "import { x } from '@n8n/utils';\n");

			expect(await unusedNames()).toEqual([]);
		});

		it('a dependency used only by a config file outside src', async () => {
			writeConsumer({ devDependencies: { '@n8n/eslint-config': 'workspace:*' } });
			writeFile(
				'packages/consumer/eslint.config.mjs',
				"import { nodeConfig } from '@n8n/eslint-config/node';\nexport default nodeConfig;\n",
			);

			expect(await unusedNames()).toEqual([]);
		});

		it('a dependency referenced by a tsconfig "extends"', async () => {
			writeConsumer({ devDependencies: { '@n8n/typescript-config': 'workspace:*' } });
			writeFile(
				'packages/consumer/tsconfig.json',
				'{ "extends": "@n8n/typescript-config/tsconfig.common.json" }\n',
			);

			expect(await unusedNames()).toEqual([]);
		});

		it('a type-only import', async () => {
			writeConsumer({ dependencies: { 'n8n-workflow': 'workspace:*' } });
			writeFile(
				'packages/consumer/src/index.ts',
				"import type { INode } from 'n8n-workflow';\nexport type Node = INode;\n",
			);

			expect(await unusedNames()).toEqual([]);
		});

		it('a dependency invoked by a scripts entry through its package name', async () => {
			writeConsumer({
				devDependencies: { '@n8n/code-health': 'workspace:*' },
				scripts: { check: 'pnpm --filter=@n8n/code-health check' },
			});

			expect(await unusedNames()).toEqual([]);
		});

		it('a dependency invoked by a scripts entry through its bin name', async () => {
			// `"test:changed": "janitor test-scoped"` — the package name never appears.
			writePackage('janitor', { name: '@n8n/playwright-janitor', bin: { janitor: 'bin/x.mjs' } });
			writeConsumer({
				devDependencies: { '@n8n/playwright-janitor': 'workspace:*' },
				scripts: { 'test:changed': 'janitor test-scoped' },
			});

			expect(await unusedNames()).toEqual([]);
		});

		it('a bin name mentioned only in prose does not vouch for the dependency', async () => {
			writePackage('janitor', { name: '@n8n/playwright-janitor', bin: { janitor: 'bin/x.mjs' } });
			writeConsumer({ devDependencies: { '@n8n/playwright-janitor': 'workspace:*' } });
			writeFile('packages/consumer/src/index.ts', "export const role = 'janitor';\n");

			expect(await unusedNames()).toEqual(['@n8n/playwright-janitor']);
		});

		it('a dependency loaded via dynamic import', async () => {
			writeConsumer({ dependencies: { '@n8n/db': 'workspace:*' } });
			writeFile(
				'packages/consumer/src/lazy.ts',
				"export const load = async () => await import('@n8n/db');\n",
			);

			expect(await unusedNames()).toEqual([]);
		});

		it('a peerDependencies entry, and the devDependency that pairs with it', async () => {
			writeConsumer({
				peerDependencies: { 'n8n-workflow': 'workspace:*' },
				devDependencies: { 'n8n-workflow': 'workspace:*' },
			});

			expect(await unusedNames()).toEqual([]);
		});

		it('a dependency resolved by path rather than imported', async () => {
			// #38377 hit this: the eval harness used `n8n-core` for `__schema__` resolution.
			writeConsumer({ devDependencies: { 'n8n-core': 'workspace:*' } });
			writeFile(
				'packages/consumer/evaluations/resolve.ts',
				"export const schema = require.resolve('n8n-core/dist/__schema__');\n",
			);

			expect(await unusedNames()).toEqual([]);
		});

		it('a dependency referenced only by a .bin path', async () => {
			writePackage('node-cli', { name: '@n8n/node-cli', bin: { 'n8n-node': 'bin/run.js' } });
			writeConsumer({ dependencies: { '@n8n/node-cli': 'workspace:*' } });
			writeFile(
				'packages/consumer/bin/create-node.cjs',
				"const bin = require.resolve('.bin/n8n-node');\n",
			);

			expect(await unusedNames()).toEqual([]);
		});

		it('a CSS asset import', async () => {
			writeConsumer({ dependencies: { '@n8n/design-system': 'workspace:*' } });
			writeFile(
				'packages/consumer/src/styles.scss',
				"@use '@n8n/design-system/css/_tokens.scss';\n",
			);

			expect(await unusedNames()).toEqual([]);
		});

		it('a third-party dependency, however unused', async () => {
			writeConsumer({ dependencies: { lodash: 'catalog:', axios: '^1.6.0' } });

			expect(await unusedNames()).toEqual([]);
		});

		it('a Turbo build-ordering edge listed in allowUnused', async () => {
			rule.configure({ options: { allowUnused: ['packages/consumer#@n8n/build-only'] } });
			writeConsumer({ devDependencies: { '@n8n/build-only': 'workspace:*' } });

			expect(await unusedNames()).toEqual([]);
		});
	});

	describe('nested workspace packages', () => {
		it('does not let a nested package vouch for its parent', async () => {
			writePackage('host', { name: 'host', dependencies: { '@n8n/i18n': 'workspace:*' } });
			writePackage('host/frontend', { name: 'host-frontend' });
			writeFile('packages/host/frontend/src/index.ts', "import '@n8n/i18n';\n");

			expect(await unusedNames()).toEqual(['@n8n/i18n']);
		});

		it('still credits the parent for its own usage', async () => {
			writePackage('host', { name: 'host', dependencies: { '@n8n/i18n': 'workspace:*' } });
			writePackage('host/frontend', { name: 'host-frontend' });
			writeFile('packages/host/src/index.ts', "import '@n8n/i18n';\n");

			expect(await unusedNames()).toEqual([]);
		});
	});
});
