import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { chunkTargets, collectFormatTargets, formatRootFiles } from './format.mjs';

const FORMAT_SCRIPT_PATH = fileURLToPath(new URL('./format.mjs', import.meta.url));

const temporaryDirectories = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

function createFixture({ git = true, files = {}, prefix = 'format-script-test-' } = {}) {
	const dir = mkdtempSync(join(tmpdir(), prefix));
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

function createFakeFormatters(rootDir, names = ['prettier', 'biome']) {
	const definitions = {
		prettier: {
			packageName: 'prettier',
			packageJson: { name: 'prettier', bin: './bin/prettier.cjs' },
			entryPoint: 'bin/prettier.cjs',
		},
		biome: {
			packageName: '@biomejs/biome',
			packageJson: { name: '@biomejs/biome', bin: { biome: 'bin/biome' } },
			entryPoint: 'bin/biome',
		},
	};

	for (const name of names) {
		const def = definitions[name];
		const packageDir = join(rootDir, 'node_modules', ...def.packageName.split('/'));
		mkdirSync(dirname(join(packageDir, def.entryPoint)), { recursive: true });
		writeFileSync(join(packageDir, 'package.json'), JSON.stringify(def.packageJson));
		writeFileSync(join(packageDir, def.entryPoint), '');
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

	it('skips symlinks pointing to regular files in both git and fallback walk modes', () => {
		for (const git of [true, false]) {
			const dir = createFixture({
				git,
				files: {
					'real.json': '{}\n',
					'target.txt': '{"a": 1}\n',
					'target-yml.txt': 'a: 1\n',
				},
			});
			symlinkSync(join(dir, 'target.txt'), join(dir, 'linked.json'));
			symlinkSync(join(dir, 'target-yml.txt'), join(dir, 'linked.yml'));

			const { prettierTargets, biomeTargets } = collectFormatTargets(dir);

			assert.deepEqual(toRelativeSorted(dir, prettierTargets), []);
			assert.deepEqual(toRelativeSorted(dir, biomeTargets), ['real.json']);
		}
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

describe('chunkTargets', () => {
	it('returns an empty list when given no targets', () => {
		assert.deepEqual(chunkTargets([]), []);
	});

	it('keeps targets in one batch when they fit within maxArgChars', () => {
		assert.deepEqual(chunkTargets(['a.json', 'b.json', 'c.json'], { maxArgChars: 100 }), [
			['a.json', 'b.json', 'c.json'],
		]);
	});

	it('splits targets into bounded batches while accounting for baseArgs', () => {
		const targets = ['alpha.json', 'bravo.json', 'charlie.json', 'delta.json'];
		// baseArgs overhead: ('node'.length + 3) + ('--write'.length + 3) = 7 + 10 = 17
		// Each target is 13..15 chars including +3 overhead, so maxArgChars = 46 fits at most 2 targets.
		const batches = chunkTargets(targets, {
			baseArgs: ['node', '--write'],
			maxArgChars: 46,
		});

		assert.equal(batches.length, 2);
		assert.deepEqual(batches, [
			['alpha.json', 'bravo.json'],
			['charlie.json', 'delta.json'],
		]);
	});

	it('places an oversized single target in its own batch without dropping it', () => {
		const longTarget = `${'a'.repeat(80)}.json`;
		const batches = chunkTargets(['short.json', longTarget, 'tail.json'], {
			baseArgs: ['node'],
			maxArgChars: 30,
		});

		assert.deepEqual(batches, [['short.json'], [longTarget], ['tail.json']]);
	});
});

describe('formatRootFiles', () => {
	it('invokes formatter entry points via process.execPath without a shell even when paths contain spaces', () => {
		const dir = createFixture({
			git: true,
			prefix: 'format script test ',
			files: {
				'turbo.json': '{}\n',
				'.github/workflows/ci.yml': 'name: CI\n',
				'dir with spaces/config.json': '{}\n',
			},
		});
		createFakeFormatters(dir);

		const calls = [];
		formatRootFiles({
			rootDir: dir,
			run: (bin, args, options) => {
				calls.push({ bin, args, options });
			},
		});

		assert.equal(calls.length, 2);
		assert.equal(calls[0].bin, process.execPath);
		assert.equal(calls[0].options.shell, undefined);
		assert.equal(calls[0].options.cwd, resolve(dir));
		assert.deepEqual(calls[0].options.stdio, ['ignore', 'ignore', 'inherit']);
		assert.deepEqual(calls[0].args, [
			resolve(dir, 'node_modules/prettier/bin/prettier.cjs'),
			'--config',
			resolve(dir, '.prettierrc.js'),
			'--ignore-path',
			resolve(dir, '.prettierignore'),
			'--write',
			resolve(dir, '.github/workflows/ci.yml'),
		]);

		assert.equal(calls[1].bin, process.execPath);
		assert.equal(calls[1].options.shell, undefined);
		assert.equal(calls[1].options.cwd, resolve(dir));
		assert.deepEqual(calls[1].options.stdio, ['ignore', 'ignore', 'inherit']);
		assert.deepEqual(calls[1].args.slice(0, 5), [
			resolve(dir, 'node_modules/@biomejs/biome/bin/biome'),
			'format',
			'--write',
			'--no-errors-on-unmatched',
			`--config-path=${resolve(dir, 'biome.jsonc')}`,
		]);
		assert.deepEqual(
			calls[1].args.slice(5).sort(),
			[resolve(dir, 'dir with spaces/config.json'), resolve(dir, 'turbo.json')].sort(),
		);
	});

	it('invokes formatters in multiple bounded batches when targets exceed maxArgChars', () => {
		const files = {};
		for (let i = 0; i < 6; i += 1) {
			files[`configs/file-${i}.yml`] = 'a: 1\n';
			files[`scripts/file-${i}.json`] = '{}\n';
		}
		const dir = createFixture({ git: true, files });
		createFakeFormatters(dir);

		const calls = [];
		const result = formatRootFiles({
			rootDir: dir,
			maxArgChars: 1,
			run: (bin, args, options) => {
				calls.push({ bin, args, options });
			},
		});

		const prettierEntry = resolve(dir, 'node_modules/prettier/bin/prettier.cjs');
		const biomeEntry = resolve(dir, 'node_modules/@biomejs/biome/bin/biome');
		const prettierCalls = calls.filter((call) => call.args[0] === prettierEntry);
		const biomeCalls = calls.filter((call) => call.args[0] === biomeEntry);

		assert.equal(prettierCalls.length, 6);
		assert.equal(biomeCalls.length, 6);
		assert.deepEqual(
			prettierCalls.flatMap((call) => call.args.slice(6)).sort(),
			result.prettierTargets.slice().sort(),
		);
		assert.deepEqual(
			biomeCalls.flatMap((call) => call.args.slice(5)).sort(),
			result.biomeTargets.slice().sort(),
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
		createFakeFormatters(dir, ['biome']);

		const calls = [];
		formatRootFiles({
			rootDir: dir,
			run: (bin, args) => {
				calls.push({ bin, args });
			},
		});

		assert.equal(calls.length, 1);
		assert.equal(calls[0].bin, process.execPath);
		assert.equal(calls[0].args[0], resolve(dir, 'node_modules/@biomejs/biome/bin/biome'));
	});

	it('throws a clear error when a required formatter package is missing', () => {
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
			/biome not found at path: .*Please run `pnpm i` first/s,
		);
	});

	it('throws a clear error when a formatter entry point file is missing', () => {
		const dir = createFixture({
			git: true,
			files: {
				'turbo.json': '{}\n',
				'node_modules/@biomejs/biome/package.json': JSON.stringify({
					name: '@biomejs/biome',
					bin: { biome: 'bin/biome' },
				}),
			},
		});

		assert.throws(
			() =>
				formatRootFiles({
					rootDir: dir,
					run: () => {},
				}),
			/biome not found at path: .*bin[/\\]biome.*Please run `pnpm i` first/s,
		);
	});
});

describe('CLI entrypoint guard', () => {
	it('runs formatRootFiles when invoked through a symlinked directory or script symlink and keeps stdout quiet', () => {
		const fixtureDir = createFixture({
			git: true,
			files: {
				'sample.json': '{}\n',
			},
		});
		const recordPath = join(fixtureDir, 'invocations.log');
		const biomeDir = join(fixtureDir, 'node_modules', '@biomejs', 'biome');
		mkdirSync(join(biomeDir, 'bin'), { recursive: true });
		writeFileSync(
			join(biomeDir, 'package.json'),
			JSON.stringify({ name: '@biomejs/biome', bin: { biome: 'bin/biome.cjs' } }),
		);
		writeFileSync(
			join(biomeDir, 'bin', 'biome.cjs'),
			[
				"const fs = require('node:fs');",
				`fs.appendFileSync(${JSON.stringify(recordPath)}, JSON.stringify(process.argv.slice(2)) + '\\n');`,
				"console.log('Formatted 1 file.');",
			].join('\n'),
		);

		const aliasRoot = mkdtempSync(join(tmpdir(), 'format-symlink-test-'));
		temporaryDirectories.push(aliasRoot);
		const dirLink = join(aliasRoot, 'scripts-alias');
		const fileLink = join(aliasRoot, 'format-alias.mjs');
		symlinkSync(dirname(FORMAT_SCRIPT_PATH), dirLink, 'dir');
		symlinkSync(FORMAT_SCRIPT_PATH, fileLink, 'file');

		const dirStdout = execFileSync(process.execPath, [join(dirLink, 'format.mjs')], {
			cwd: fixtureDir,
			encoding: 'utf8',
		});
		const fileStdout = execFileSync(process.execPath, [fileLink], {
			cwd: fixtureDir,
			encoding: 'utf8',
		});

		assert.equal(dirStdout, '');
		assert.equal(fileStdout, '');

		const invocations = readFileSync(recordPath, 'utf8')
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		assert.equal(invocations.length, 2);
		for (const args of invocations) {
			assert.ok(args.includes(resolve(fixtureDir, 'sample.json')));
		}
	});
});
