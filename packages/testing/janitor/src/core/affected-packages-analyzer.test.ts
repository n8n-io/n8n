import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
	affectedPackages,
	findWorkspaceRoot,
	parseJsoncFile,
	stripJsonComments,
} from './affected-packages-analyzer.js';

interface PackageSpec {
	name: string;
	deps?: string[];
}

interface TurboTaskSpec {
	taskId: string;
	inputs: string[];
}

function makeFixture(opts: {
	patterns: string[];
	packages: Record<string, PackageSpec>;
	turboTasks?: TurboTaskSpec[];
	/** Write turbo.json verbatim (e.g. to exercise JSONC comment handling). */
	turboJsonRaw?: string;
}): string {
	const root = join(tmpdir(), `janitor-affected-${Math.random().toString(36).slice(2)}`);
	mkdirSync(root, { recursive: true });
	writeFileSync(
		join(root, 'pnpm-workspace.yaml'),
		`packages:\n${opts.patterns.map((p) => `  - '${p}'`).join('\n')}\n`,
	);
	writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'monorepo-root' }));

	for (const [dir, spec] of Object.entries(opts.packages)) {
		const pkgDir = join(root, dir);
		mkdirSync(pkgDir, { recursive: true });
		const pkg: Record<string, unknown> = { name: spec.name };
		if (spec.deps && spec.deps.length > 0) {
			pkg.dependencies = Object.fromEntries(spec.deps.map((d) => [d, 'workspace:*']));
		}
		writeFileSync(join(pkgDir, 'package.json'), JSON.stringify(pkg));
	}

	if (opts.turboJsonRaw !== undefined) {
		writeFileSync(join(root, 'turbo.json'), opts.turboJsonRaw);
	} else if (opts.turboTasks) {
		writeFileSync(
			join(root, 'turbo.json'),
			JSON.stringify({
				tasks: Object.fromEntries(opts.turboTasks.map((t) => [t.taskId, { inputs: t.inputs }])),
			}),
		);
	}

	return root;
}

describe('affectedPackages', () => {
	it('returns all packages when CHANGED_FILES signal is missing', () => {
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: { 'packages/a': { name: 'a' }, 'packages/b': { name: 'b' } },
		});
		expect(affectedPackages({ rootDir, changedFiles: null })).toEqual(['a', 'b']);
	});

	it('returns empty when changed-files list is explicitly empty', () => {
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: { 'packages/a': { name: 'a' }, 'packages/b': { name: 'b' } },
		});
		expect(affectedPackages({ rootDir, changedFiles: [] })).toEqual([]);
	});

	it('returns just the directly-changed package when no deps', () => {
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: { 'packages/a': { name: 'a' }, 'packages/b': { name: 'b' } },
		});
		expect(affectedPackages({ rootDir, changedFiles: ['packages/a/src/index.ts'] })).toEqual(['a']);
	});

	it('includes transitive downstream packages', () => {
		// Uses non-global-trigger package names so this exercises the dep-graph
		// walk, not the workspace-wide bailout (workflow/core ARE global triggers).
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: {
				'packages/lib': { name: 'lib' },
				'packages/mid': { name: 'mid', deps: ['lib'] },
				'packages/app': { name: 'app', deps: ['mid'] },
				'packages/unrelated': { name: 'unrelated' },
			},
		});
		expect(affectedPackages({ rootDir, changedFiles: ['packages/lib/src/index.ts'] })).toEqual([
			'app',
			'lib',
			'mid',
		]);
	});

	it('expands all packages when a universal sink (workflow/core) changes', () => {
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: {
				'packages/workflow': { name: 'n8n-workflow' },
				'packages/core': { name: 'n8n-core' },
				'packages/unrelated': { name: 'unrelated' },
			},
		});
		expect(
			affectedPackages({ rootDir, changedFiles: ['packages/workflow/src/Workflow.ts'] }),
		).toEqual(['n8n-core', 'n8n-workflow', 'unrelated']);
		expect(affectedPackages({ rootDir, changedFiles: ['packages/core/src/x.ts'] })).toEqual([
			'n8n-core',
			'n8n-workflow',
			'unrelated',
		]);
	});

	it('expands all packages when pnpm-lock.yaml changes', () => {
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: { 'packages/a': { name: 'a' }, 'packages/b': { name: 'b' } },
		});
		expect(affectedPackages({ rootDir, changedFiles: ['pnpm-lock.yaml'] })).toEqual(['a', 'b']);
	});

	it('expands all packages when root package.json changes', () => {
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: { 'packages/a': { name: 'a' }, 'packages/b': { name: 'b' } },
		});
		expect(affectedPackages({ rootDir, changedFiles: ['package.json'] })).toEqual(['a', 'b']);
	});

	it('expands all packages when packages/@n8n/db/** changes (runtime-coupled schema)', () => {
		const rootDir = makeFixture({
			patterns: ['packages/*', 'packages/@n8n/*'],
			packages: {
				'packages/@n8n/db': { name: '@n8n/db' },
				'packages/cli': { name: 'n8n' },
				'packages/unrelated': { name: 'unrelated' },
			},
		});
		expect(
			affectedPackages({
				rootDir,
				changedFiles: ['packages/@n8n/db/src/entities/user.entity.ts'],
			}),
		).toEqual(['@n8n/db', 'n8n', 'unrelated']);
	});

	it('handles turbo extra-inputs pointing at another package', () => {
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: {
				'packages/cli': { name: 'n8n' },
				'packages/nodes-base': { name: 'n8n-nodes-base' },
			},
			turboTasks: [
				{ taskId: 'n8n-nodes-base#test', inputs: ['../cli/src/public-api/v1/**/*.yml'] },
			],
		});
		expect(
			affectedPackages({
				rootDir,
				changedFiles: ['packages/cli/src/public-api/v1/openapi.yml'],
			}),
		).toEqual(['n8n', 'n8n-nodes-base']);
	});

	it('parses a JSONC turbo.json (comments) for extra-inputs', () => {
		// turbo.json is JSONC — a plain JSON.parse throws on comments, which
		// silently emptied the affected list in CI. Ensure comments are tolerated.
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: {
				'packages/cli': { name: 'n8n' },
				'packages/nodes-base': { name: 'n8n-nodes-base' },
			},
			turboJsonRaw: `{
				// line comment before tasks
				"tasks": {
					/* block comment */
					"n8n-nodes-base#test": {
						"inputs": ["../cli/src/public-api/v1/**/*.yml"] // trailing line comment
					}
				}
			}`,
		});
		expect(
			affectedPackages({
				rootDir,
				changedFiles: ['packages/cli/src/public-api/v1/openapi.yml'],
			}),
		).toEqual(['n8n', 'n8n-nodes-base']);
	});

	it('matches nested workspace patterns (frontend/**)', () => {
		const rootDir = makeFixture({
			patterns: ['packages/frontend/**'],
			packages: {
				'packages/frontend/editor-ui': { name: 'editor-ui' },
				'packages/frontend/@n8n/stores': { name: 'stores' },
			},
		});
		expect(
			affectedPackages({ rootDir, changedFiles: ['packages/frontend/@n8n/stores/src/auth.ts'] }),
		).toEqual(['stores']);
	});
});

describe('findWorkspaceRoot', () => {
	it('walks up to find pnpm-workspace.yaml', () => {
		const root = makeFixture({
			patterns: ['packages/*'],
			packages: { 'packages/a': { name: 'a' } },
		});
		expect(findWorkspaceRoot(join(root, 'packages', 'a'))).toBe(root);
	});

	it('throws when no workspace root above startDir', () => {
		expect(() => findWorkspaceRoot('/')).toThrow(/Could not locate/);
	});
});

describe('stripJsonComments', () => {
	// The stripped output must stay valid JSON and preserve every value; each
	// case round-trips through JSON.parse to assert that.
	const parse = (jsonc: string): unknown => {
		const stripped = stripJsonComments(jsonc);
		try {
			return JSON.parse(stripped) as unknown;
		} catch (error) {
			throw new Error(`Not valid JSON after stripping: ${stripped} (${(error as Error).message})`);
		}
	};

	it('leaves plain JSON untouched', () => {
		const json = '{"a":1,"b":["x","y"],"c":{"d":true}}';
		expect(stripJsonComments(json)).toBe(json);
		expect(parse(json)).toEqual({ a: 1, b: ['x', 'y'], c: { d: true } });
	});

	it('strips a line comment', () => {
		expect(parse('{\n  // a comment\n  "a": 1\n}')).toEqual({ a: 1 });
	});

	it('strips a trailing line comment after a value', () => {
		expect(parse('{ "a": 1 // trailing\n}')).toEqual({ a: 1 });
	});

	it('strips a block comment', () => {
		expect(parse('{ /* block */ "a": 1 }')).toEqual({ a: 1 });
	});

	it('strips a multi-line block comment', () => {
		expect(parse('{\n/*\n line 1\n line 2\n*/\n"a": 1\n}')).toEqual({ a: 1 });
	});

	it('preserves // inside a string value', () => {
		expect(parse('{ "url": "https://example.com/x" }')).toEqual({
			url: 'https://example.com/x',
		});
	});

	it('preserves /* */ inside a string value', () => {
		expect(parse('{ "glob": "src/**/*.ts", "note": "/* not a comment */" }')).toEqual({
			glob: 'src/**/*.ts',
			note: '/* not a comment */',
		});
	});

	it('preserves an escaped quote inside a string, then strips a following comment', () => {
		expect(parse('{ "a": "he said \\"hi//\\"" /* c */ }')).toEqual({ a: 'he said "hi//"' });
	});

	it('preserves a string ending in a backslash-escaped backslash', () => {
		// The closing quote must still terminate the string after `\\`.
		expect(parse('{ "path": "C:\\\\tmp\\\\" }')).toEqual({ path: 'C:\\tmp\\' });
	});

	it('does not treat a lone slash as a comment', () => {
		expect(parse('{ "ratio": "1/2" }')).toEqual({ ratio: '1/2' });
	});

	it('handles a realistic JSONC turbo.json', () => {
		const turbo = `{
			// top comment
			"tasks": {
				/* build task */
				"build": { "outputs": ["dist/**"] }, // inline
				"test": { "inputs": ["src/**/*.ts"] }
			}
		}`;
		expect(parse(turbo)).toEqual({
			tasks: {
				build: { outputs: ['dist/**'] },
				test: { inputs: ['src/**/*.ts'] },
			},
		});
	});
});

describe('parseJsoncFile', () => {
	function writeTmp(contents: string): string {
		const dir = join(tmpdir(), `janitor-jsonc-${Math.random().toString(36).slice(2)}`);
		mkdirSync(dir, { recursive: true });
		const file = join(dir, 'turbo.json');
		writeFileSync(file, contents);
		return file;
	}

	it('reads and parses a JSONC file with comments', () => {
		const file = writeTmp('{\n  // comment\n  "a": 1 /* b */\n}');
		expect(parseJsoncFile(file)).toEqual({ a: 1 });
	});

	it('throws with the file path when the content is not valid JSON', () => {
		const file = writeTmp('{ "a": 1, }'); // trailing comma is NOT stripped
		expect(() => parseJsoncFile(file)).toThrow('Failed to parse');
	});
});
