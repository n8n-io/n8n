import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { collectFormatTargets, formatRootFiles } from './format.mjs';

const temporaryDirectories = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

function createFixture({ git = true, files = {} } = {}) {
	const dir = mkdtempSync(join(tmpdir(), 'format-script-test-'));
	temporaryDirectories.push(dir);

	if (git) {
		execFileSync('git', ['init', '-q'], { cwd: dir });
	}

	for (const [filePath, content] of Object.entries(files)) {
		const fullPath = join(dir, filePath);
		mkdirSync(dirname(fullPath), { recursive: true });
		writeFileSync(fullPath, content);
	}

	return dir;
}

function toRelativeSorted(rootDir, paths) {
	return paths.map((entry) => relative(rootDir, entry).replaceAll('\\', '/')).sort();
}

function createFakeBinaries(rootDir, names = ['prettier', 'biome']) {
	const suffix = process.platform === 'win32' ? '.cmd' : '';
	for (const name of names) {
		const binPath = join(rootDir, 'node_modules', '.bin', `${name}${suffix}`);
		mkdirSync(dirname(binPath), { recursive: true });
		writeFileSync(binPath, '');
	}
}

describe('collectFormatTargets', () => {
	it('collects root and nested targets while skipping packages, nested node_modules, and gitignored dirs', () => {
		const dir = createFixture({
			git: true,
			files: {
				'.gitignore': 'node_modules\n.agent-setup/\ncustom-ignored/\n*.ignored.json\n',
				'turbo.json': '{}\n',
				'lefthook.yml': 'output: []\n',
				'knip.ts': 'export default {};\n',
				'scripts/helper.js': 'export const x = 1;\n',
				'.github/workflows/ci.yml': 'name: CI\n',
				'.github/scripts/node_modules/pkg/index.js': 'module.exports = {};\n',
				'.github/scripts/node_modules/pkg/package.json': '{}\n',
				'.github/scripts/node_modules/pkg/workflow.yml': 'name: ignored\n',
				'scripts/experimental/rig/node_modules/dep/index.ts': 'export {};\n',
				'.agent-setup/summary.json': '{}\n',
				'custom-ignored/data.json': '{}\n',
				'local.ignored.json': '{}\n',
				'.turbo/cache.json': '{}\n',
				'packages/cli/src/index.ts': 'export {};\n',
				'packages/cli/config.yml': 'name: pkg\n',
				'node_modules/root-pkg/index.js': 'module.exports = {};\n',
			},
		});

		const { prettierTargets, biomeTargets } = collectFormatTargets(dir);

		assert.deepEqual(toRelativeSorted(dir, prettierTargets), [
			'.github/workflows/ci.yml',
			'lefthook.yml',
		]);
		assert.deepEqual(toRelativeSorted(dir, biomeTargets), [
			'knip.ts',
			'scripts/helper.js',
			'turbo.json',
		]);
	});

	it('skips nested node_modules even when node_modules is not in .gitignore', () => {
		const dir = createFixture({
			git: true,
			files: {
				'turbo.json': '{}\n',
				'.github/scripts/node_modules/pkg/index.js': 'module.exports = {};\n',
				'deep/nested/node_modules/pkg/config.yml': 'a: 1\n',
			},
		});

		const { prettierTargets, biomeTargets } = collectFormatTargets(dir);

		assert.deepEqual(toRelativeSorted(dir, prettierTargets), []);
		assert.deepEqual(toRelativeSorted(dir, biomeTargets), ['turbo.json']);
	});

	it('skips tracked files that have been deleted from disk', () => {
		const dir = createFixture({
			git: true,
			files: {
				'kept.json': '{}\n',
				'deleted.json': '{}\n',
			},
		});

		execFileSync('git', ['add', 'kept.json', 'deleted.json'], { cwd: dir });
		rmSync(join(dir, 'deleted.json'));

		const { prettierTargets, biomeTargets } = collectFormatTargets(dir);

		assert.deepEqual(toRelativeSorted(dir, prettierTargets), []);
		assert.deepEqual(toRelativeSorted(dir, biomeTargets), ['kept.json']);
	});

	it('falls back to recursive walk outside a git repository and skips nested node_modules and directories', () => {
		const dir = createFixture({
			git: false,
			files: {
				'turbo.json': '{}\n',
				'.github/workflows/ci.yml': 'name: CI\n',
				'.github/scripts/node_modules/pkg/index.js': 'module.exports = {};\n',
				'.turbo/cache.json': '{}\n',
				'packages/cli/index.ts': 'export {};\n',
				'dir.json/nested.ts': 'export {};\n',
			},
		});
		// Ensure a directory whose name ends with a target extension is never treated as a file.
		mkdirSync(join(dir, 'empty-dir.yml'), { recursive: true });

		const { prettierTargets, biomeTargets } = collectFormatTargets(dir);

		assert.deepEqual(toRelativeSorted(dir, prettierTargets), ['.github/workflows/ci.yml']);
		assert.deepEqual(toRelativeSorted(dir, biomeTargets), ['dir.json/nested.ts', 'turbo.json']);
	});

	it('returns empty arrays when no matching files exist', () => {
		const dir = createFixture({
			git: true,
			files: {
				'README.md': '# Hello\n',
			},
		});

		const { prettierTargets, biomeTargets } = collectFormatTargets(dir);

		assert.deepEqual(prettierTargets, []);
		assert.deepEqual(biomeTargets, []);
	});
});

describe('formatRootFiles', () => {
	it('invokes prettier and biome with argument arrays when both target lists are non-empty', () => {
		const dir = createFixture({
			git: true,
			files: {
				'turbo.json': '{}\n',
				'.github/workflows/ci.yml': 'name: CI\n',
				'dir with spaces/config.json': '{}\n',
			},
		});
		createFakeBinaries(dir);

		const calls = [];
		formatRootFiles({
			rootDir: dir,
			run: (bin, args) => {
				calls.push({ bin, args });
			},
		});

		assert.equal(calls.length, 2);
		assert.match(calls[0].bin, /prettier(\.cmd)?$/);
		assert.deepEqual(calls[0].args, [
			'--config',
			resolve(dir, '.prettierrc.js'),
			'--ignore-path',
			resolve(dir, '.prettierignore'),
			'--write',
			resolve(dir, '.github/workflows/ci.yml'),
		]);

		assert.match(calls[1].bin, /biome(\.cmd)?$/);
		assert.deepEqual(calls[1].args.slice(0, 3), [
			'format',
			'--write',
			`--config-path=${resolve(dir, 'biome.jsonc')}`,
		]);
		assert.deepEqual(
			calls[1].args.slice(3).sort(),
			[resolve(dir, 'dir with spaces/config.json'), resolve(dir, 'turbo.json')].sort(),
		);
	});

	it('skips invoking prettier or biome when their target lists are empty', () => {
		const dir = createFixture({
			git: true,
			files: {
				'README.md': '# No targets\n',
			},
		});

		const calls = [];
		const result = formatRootFiles({
			rootDir: dir,
			run: (bin, args) => {
				calls.push({ bin, args });
			},
		});

		assert.deepEqual(calls, []);
		assert.deepEqual(result, { prettierTargets: [], biomeTargets: [] });
	});

	it('only invokes biome when there are no prettier targets', () => {
		const dir = createFixture({
			git: true,
			files: {
				'turbo.json': '{}\n',
			},
		});
		createFakeBinaries(dir, ['biome']);

		const calls = [];
		formatRootFiles({
			rootDir: dir,
			run: (bin, args) => {
				calls.push({ bin, args });
			},
		});

		assert.equal(calls.length, 1);
		assert.match(calls[0].bin, /biome(\.cmd)?$/);
	});

	it('throws a clear error when a required formatter binary is missing', () => {
		const dir = createFixture({
			git: true,
			files: {
				'turbo.json': '{}\n',
			},
		});

		assert.throws(
			() =>
				formatRootFiles({
					rootDir: dir,
					run: () => {},
				}),
			/biome(\.cmd)? not found at path: .*Please run `pnpm i` first/s,
		);
	});
});
