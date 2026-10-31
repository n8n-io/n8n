import { execFileSync } from 'child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({ execFileSync: vi.fn() }));

const NON_APP_FILES = [
	'packages/cli/src/server.test.ts',
	'packages/frontend/editor-ui/src/App.spec.vue',
	'packages/core/src/task.test.js',
	'packages/core/src/task.spec.mjs',
	'packages/cli/src/__tests__/helpers.ts',
	'packages/cli/src/__mocks__/service.ts',
	'packages/cli/src/__fixtures__/workflow.ts',
	'packages/cli/src/test/helpers.ts',
	'packages/cli/test/integration/server.ts',
	'packages/frontend/editor-ui/src/components/Button.stories.ts',
	'packages/cli/src/types.d.ts',
	'packages/cli/src/types.d.mts',
	'packages/cli/package.json',
	'packages/cli/tsconfig.json',
	'packages/cli/vitest.config.ts',
	'packages/cli/scripts/build.mjs',
	'packages/cli/src/schema.json',
	'packages/cli/src/README.md',
	'packages/cli/dist/server.js',
	'packages/quality/testing/test-impact/src/select.ts',
	'packages/quality/testing/janitor/src/cli.ts',
	'packages/@n8n/eslint-config/src/base.ts',
	'packages/@n8n/node-cli/src/index.ts',
	'packages/@n8n/backend-test-utils/src/index.ts',
	'packages/frontend/@n8n/storybook/src/main.ts',
	'packages/frontend/@n8n/frontend-vite-config/src/index.ts',
	'scripts/build.mjs',
	'.github/scripts/check.ts',
];

async function distribute(selection) {
	execFileSync.mockReturnValue(JSON.stringify(selection));
	await import('./distribute-tests.mjs');
}

describe('E2E coverage warning', () => {
	const originalArgv = process.argv;
	let stderr;

	beforeEach(() => {
		vi.resetModules();
		process.argv = [
			'node',
			'distribute-tests.mjs',
			'--matrix',
			'1',
			'--impact',
			'--files=packages/cli/src/server.ts',
		];
		stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		process.argv = originalArgv;
		vi.restoreAllMocks();
	});

	it('counts and lists only uncovered app source files', async () => {
		const appFiles = [
			'packages/cli/src/server.ts',
			'packages/frontend/editor-ui/src/App.vue',
			'packages/nodes-base/nodes/Markdown/Markdown.node.ts',
			'packages/@n8n/nodes-langchain/nodes/agents/Agent.node.ts',
			'packages/@n8n/utils/src/index.ts',
		];
		await distribute({ mode: 'scoped', specs: [], uncovered: [...NON_APP_FILES, ...appFiles] });

		expect(stderr).toHaveBeenCalledWith(
			`  ⚠ 5 changed file(s) have no E2E coverage — not run, relying on unit + sanity: ${appFiles.join(', ')}`,
		);
	});

	it('uses the app source count for the sample limit', async () => {
		const appFiles = Array.from({ length: 7 }, (_, i) => `packages/core/src/source-${i}.ts`);
		await distribute({ mode: 'scoped', specs: [], uncovered: [...NON_APP_FILES, ...appFiles] });

		expect(stderr).toHaveBeenCalledWith(
			`  ⚠ 7 changed file(s) have no E2E coverage — not run, relying on unit + sanity: ${appFiles.slice(0, 5).join(', ')}, +2 more`,
		);
	});

	it.each([NON_APP_FILES, [], undefined])(
		'does not warn without uncovered app source',
		async (uncovered) => {
			await distribute({ mode: 'scoped', specs: [], uncovered });

			expect(stderr).not.toHaveBeenCalledWith(expect.stringContaining('have no E2E coverage'));
		},
	);

	it('keeps broad selection without a coverage warning', async () => {
		await distribute({ mode: 'broad', uncovered: ['packages/cli/src/server.ts'] });

		expect(stderr).not.toHaveBeenCalledWith(expect.stringContaining('have no E2E coverage'));
		expect(stderr).toHaveBeenCalledWith('  mode: broad');
	});

	it('keeps the full uncovered list in selector JSON output', async () => {
		const selection = {
			mode: 'scoped',
			specs: [],
			uncovered: [...NON_APP_FILES, 'packages/cli/src/server.ts'],
		};
		const output = JSON.stringify(selection);
		execFileSync.mockReturnValue(output);
		const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
		process.argv = [
			'node',
			fileURLToPath(new URL('./select-affected-e2e.mjs', import.meta.url)),
			...selection.uncovered,
		];

		await import('./select-affected-e2e.mjs');

		expect(stdout).toHaveBeenCalledWith(output);
	});
});
