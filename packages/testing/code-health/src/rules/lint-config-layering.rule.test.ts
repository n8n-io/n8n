import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { LintConfigLayeringRule } from './lint-config-layering.rule.js';

const HEAD = `import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';
`;

describe('LintConfigLayeringRule', () => {
	let rootDir: string;
	let rule: LintConfigLayeringRule;

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-lint-layering-'));
		rule = new LintConfigLayeringRule();
	});

	afterEach(() => {
		fs.rmSync(rootDir, { recursive: true, force: true });
	});

	function writePackage(dir: string, config: string | null): void {
		const full = path.join(rootDir, dir);
		fs.mkdirSync(full, { recursive: true });
		fs.writeFileSync(path.join(full, 'package.json'), JSON.stringify({ name: dir }));
		if (config !== null) fs.writeFileSync(path.join(full, 'eslint.config.mjs'), config);
	}

	async function analyze(options: Record<string, unknown> = {}): Promise<string[]> {
		rule.configure({ enabled: true, severity: 'error', options });
		const context: CodeHealthContext = { rootDir };
		const violations = await rule.analyze(context);
		return violations.map((v) => `${path.relative(rootDir, v.file)}:${v.line} ${v.message}`);
	}

	describe('accepts', () => {
		it('a config that only extends its layer', async () => {
			writePackage('packages/a', `${HEAD}\nexport default defineConfig(backendConfig);\n`);

			expect(await analyze()).toEqual([]);
		});

		it('ignores and an additive plugin config', async () => {
			writePackage(
				'packages/a',
				`${HEAD}import playwright from 'eslint-plugin-playwright';\n
export default defineConfig(
	{ ignores: ['dist/**'] },
	backendConfig,
	playwright.configs['flat/recommended'],
);
`,
			);

			expect(await analyze()).toEqual([]);
		});

		it('a package-wide block that only raises rules', async () => {
			writePackage(
				'packages/a',
				`${HEAD}
export default defineConfig(backendConfig, {
	rules: {
		complexity: ['error', 27],
		'@typescript-eslint/naming-convention': ['error', { selector: 'default', format: ['camelCase'] }],
	},
});
`,
			);

			expect(await analyze()).toEqual([]);
		});

		it('a relaxation scoped to real paths', async () => {
			writePackage(
				'packages/a',
				`${HEAD}
export default defineConfig(backendConfig, {
	files: ['src/legacy/thing.ts'],
	rules: { 'n8n-local-rules/no-uncentralized-http': 'off' },
});
`,
			);

			expect(await analyze()).toEqual([]);
		});

		it('a relaxation scoped to test files', async () => {
			writePackage(
				'packages/a',
				`${HEAD}
export default defineConfig(backendConfig, {
	files: ['**/*.test.ts'],
	rules: { '@typescript-eslint/no-explicit-any': 'off' },
});
`,
			);

			expect(await analyze()).toEqual([]);
		});

		it('a package with no ESLint config', async () => {
			writePackage('packages/a', null);

			expect(await analyze()).toEqual([]);
		});

		it('an exempt package', async () => {
			writePackage(
				'packages/frontend/@n8n/eslint-plugin-design-system',
				"import tseslint from 'typescript-eslint';\nexport default tseslint.config();\n",
			);

			expect(
				await analyze({ exempt: ['packages/frontend/@n8n/eslint-plugin-design-system'] }),
			).toEqual([]);
		});
	});

	describe('reports', () => {
		it('a package-wide downgrade', async () => {
			writePackage(
				'packages/a',
				`${HEAD}
export default defineConfig(backendConfig, {
	rules: { '@typescript-eslint/no-explicit-any': 'warn' },
});
`,
			);

			const violations = await analyze();

			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain("turns '@typescript-eslint/no-explicit-any' down to 'warn'");
		});

		it('a package-wide off, and a numeric severity', async () => {
			writePackage(
				'packages/a',
				`${HEAD}
export default defineConfig(backendConfig, {
	rules: { 'no-empty': 'off', eqeqeq: 0 },
});
`,
			);

			expect(await analyze()).toHaveLength(2);
		});

		it('a downgrade in a block whose glob still covers the package', async () => {
			writePackage(
				'packages/a',
				`${HEAD}
export default defineConfig(backendConfig, {
	files: ['src/**/*.ts'],
	rules: { 'no-empty': 'off' },
});
`,
			);

			const violations = await analyze();

			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain("turns 'no-empty' down to 'off'");
		});

		it('a severity that is not a literal', async () => {
			writePackage(
				'packages/a',
				`${HEAD}
export default defineConfig(backendConfig, {
	rules: { 'no-debugger': process.env.CI ? 'error' : 'off' },
});
`,
			);

			const violations = await analyze();

			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain('is not a literal');
		});

		it('two shared layers at once', async () => {
			writePackage(
				'packages/a',
				`${HEAD}import { frontendConfig } from '@n8n/eslint-config/frontend';\n
export default defineConfig(backendConfig, frontendConfig);
`,
			);

			const violations = await analyze();

			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain('extends more than one shared layer');
		});

		it('an import of a retired subpath', async () => {
			writePackage(
				'packages/a',
				`import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(nodeConfig);
`,
			);

			const violations = await analyze();

			expect(violations).toHaveLength(2);
			expect(violations[0]).toContain("'@n8n/eslint-config/node', which no longer exists");
			expect(violations[1]).toContain('does not extend a shared ESLint layer');
		});

		it('a config that extends no layer', async () => {
			writePackage(
				'packages/a',
				"import tseslint from 'typescript-eslint';\nexport default tseslint.config();\n",
			);

			const violations = await analyze();

			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain('does not extend a shared ESLint layer');
		});
	});
});
