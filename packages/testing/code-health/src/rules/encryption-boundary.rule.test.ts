import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { EncryptionBoundaryRule } from './encryption-boundary.rule.js';

const BOUNDARY_CONFIG = `import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';
import { encryptionBoundaryConfig } from '@n8n/eslint-config/encryption-boundary';

export default defineConfig(baseConfig, encryptionBoundaryConfig);
`;

const NODE_CONFIG = `import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(nodeConfig);
`;

const BASE_CONFIG = `import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig);
`;

describe('EncryptionBoundaryRule', () => {
	let rootDir: string;
	let rule: EncryptionBoundaryRule;

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-encryption-boundary-'));
		rule = new EncryptionBoundaryRule();
	});

	afterEach(() => {
		fs.rmSync(rootDir, { recursive: true, force: true });
	});

	function write(relativePath: string, content: string): string {
		const fullPath = path.join(rootDir, relativePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
		return fullPath;
	}

	function writePackage(
		dir: string,
		deps: Record<string, string>,
		section = 'dependencies',
		config: string | null = BOUNDARY_CONFIG,
	): void {
		write(
			`${dir}/package.json`,
			JSON.stringify({ name: path.basename(dir), [section]: deps }, null, 2),
		);
		if (config !== null) write(`${dir}/eslint.config.mjs`, config);
	}

	async function analyze(): Promise<string[]> {
		const context: CodeHealthContext = { rootDir };
		const violations = await rule.analyze(context);
		return violations.map((v) => `${path.relative(rootDir, v.file)}:${v.line} ${v.message}`);
	}

	describe('config coverage', () => {
		it('accepts a package that composes encryptionBoundaryConfig', async () => {
			writePackage('packages/a', { 'n8n-core': 'workspace:*' });

			expect(await analyze()).toEqual([]);
		});

		it('accepts a package on nodeConfig', async () => {
			writePackage('packages/a', { 'n8n-core': 'workspace:*' }, 'dependencies', NODE_CONFIG);

			expect(await analyze()).toEqual([]);
		});

		it('flags a package on baseConfig only', async () => {
			writePackage('packages/a', { 'n8n-core': 'workspace:*' }, 'dependencies', BASE_CONFIG);

			const violations = await analyze();

			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain('packages/a/eslint.config.mjs:1');
			expect(violations[0]).toContain('does not compose the encryption boundary');
		});

		it('flags a boundary import that is never used', async () => {
			const imported = `${BASE_CONFIG}import { encryptionBoundaryConfig } from '@n8n/eslint-config/encryption-boundary';\n`;
			writePackage('packages/a', { 'n8n-core': 'workspace:*' }, 'dependencies', imported);

			expect(await analyze()).toHaveLength(1);
		});

		it('flags a package with no ESLint config at all', async () => {
			writePackage('packages/a', { 'n8n-core': 'workspace:*' }, 'dependencies', null);

			const violations = await analyze();

			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain('packages/a/package.json:1');
			expect(violations[0]).toContain('has no ESLint config');
		});

		it('treats @n8n/db and devDependencies as triggers too', async () => {
			writePackage('packages/a', { '@n8n/db': 'workspace:*' }, 'devDependencies', BASE_CONFIG);

			expect(await analyze()).toHaveLength(1);
		});

		it('ignores packages that cannot reach the primitives', async () => {
			writePackage('packages/a', { 'n8n-workflow': 'workspace:*' }, 'dependencies', BASE_CONFIG);
			write('packages/a/src/index.ts', '// eslint-disable-next-line\nexport const x = 1;\n');

			expect(await analyze()).toEqual([]);
		});

		it('flags a guarded rule downgraded in the config', async () => {
			const downgraded = `${BOUNDARY_CONFIG.trimEnd()}
export const extra = {
	rules: {
		'n8n-local-rules/no-deployment-key-delete': 'off',
		'n8n-local-rules/no-legacy-cipher-methods': ['warn'],
		'n8n-local-rules/no-uncaught-json-parse': 'off',
	},
};
`;
			writePackage('packages/a', { 'n8n-core': 'workspace:*' }, 'dependencies', downgraded);

			const violations = await analyze();

			expect(violations).toHaveLength(2);
			expect(violations[0]).toContain('eslint.config.mjs:8');
			expect(violations[0]).toContain('no-deployment-key-delete');
			expect(violations[1]).toContain('eslint.config.mjs:9');
			expect(violations[1]).toContain('no-legacy-cipher-methods');
		});
	});

	describe('directives in source files', () => {
		beforeEach(() => {
			writePackage('packages/a', { 'n8n-core': 'workspace:*' });
		});

		it('accepts directives that name unrelated rules', async () => {
			write(
				'packages/a/src/index.ts',
				[
					'// eslint-disable-next-line @typescript-eslint/no-explicit-any',
					'export const a: any = 1; // eslint-disable-line no-console',
					'/* eslint-disable @typescript-eslint/naming-convention */',
					'/* eslint no-console: "off" */',
					'// eslint-enable',
					'',
				].join('\n'),
			);

			expect(await analyze()).toEqual([]);
		});

		it('flags every bare disable form', async () => {
			write(
				'packages/a/src/index.ts',
				[
					'// eslint-disable-next-line',
					'export const a = 1; // eslint-disable-line -- legacy',
					'/* eslint-disable */',
					'export const b = 2;',
					'',
				].join('\n'),
			);

			const violations = await analyze();

			expect(violations.map((v) => v.split(' ')[0])).toEqual([
				'packages/a/src/index.ts:1',
				'packages/a/src/index.ts:2',
				'packages/a/src/index.ts:3',
			]);
			expect(violations[2]).toContain('`eslint-disable` directive silences every lint rule');
		});

		it('flags directives that name a guarded rule, with or without the plugin prefix', async () => {
			write(
				'packages/a/src/index.ts',
				[
					'// eslint-disable-next-line n8n-local-rules/no-legacy-cipher-methods',
					'export const a = 1; // eslint-disable-line no-console, no-deployment-key-delete',
					'/* eslint-disable n8n-local-rules/no-misplaced-cipher-primitives */',
					'/* eslint n8n-local-rules/no-encryption-guardrail-disable: "off" */',
					'',
				].join('\n'),
			);

			const violations = await analyze();

			expect(violations).toHaveLength(4);
			expect(violations[0]).toContain('no-legacy-cipher-methods');
			expect(violations[1]).toContain('no-deployment-key-delete');
			expect(violations[2]).toContain('no-misplaced-cipher-primitives');
			expect(violations[3]).toContain('inline ESLint configuration comment');
		});

		it('ignores directive text inside string literals', async () => {
			write(
				'packages/a/src/generate.ts',
				[
					"export const header = '/* eslint-disable */';",
					'export const line = `// eslint-disable-next-line`;',
					'export const trailing = "x"; // eslint-disable-line no-console',
					'',
				].join('\n'),
			);

			expect(await analyze()).toEqual([]);
		});

		it('does not read the explanation after -- as a rule list', async () => {
			write(
				'packages/a/src/index.ts',
				'// eslint-disable-next-line no-console -- unrelated to no-deployment-key-delete\nexport const a = 1;\n',
			);

			expect(await analyze()).toEqual([]);
		});

		it('skips test files and migrations, like the ESLint rules do', async () => {
			const bare = '/* eslint-disable */\nexport const a = 1;\n';
			write('packages/a/src/index.test.ts', bare);
			write('packages/a/src/thing.spec.ts', bare);
			write('packages/a/src/__tests__/helper.ts', bare);
			write('packages/a/test/setup.ts', bare);
			write('packages/a/src/migrations/common/1-Init.ts', bare);
			write('packages/a/node_modules/dep/index.js', bare);
			write('packages/a/dist/index.js', bare);

			expect(await analyze()).toEqual([]);
		});

		it('scans a file only once when packages nest', async () => {
			writePackage('packages/a/nested', { 'n8n-core': 'workspace:*' });
			write('packages/a/nested/src/index.ts', '// eslint-disable-next-line\nexport const a = 1;\n');

			expect(await analyze()).toHaveLength(1);
		});
	});
});
