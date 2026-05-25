import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { affectedPackages, findWorkspaceRoot } from './affected-packages-analyzer.js';

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

	if (opts.turboTasks) {
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
		const rootDir = makeFixture({
			patterns: ['packages/*'],
			packages: {
				'packages/workflow': { name: 'workflow' },
				'packages/core': { name: 'core', deps: ['workflow'] },
				'packages/cli': { name: 'cli', deps: ['core'] },
				'packages/unrelated': { name: 'unrelated' },
			},
		});
		expect(affectedPackages({ rootDir, changedFiles: ['packages/workflow/src/index.ts'] })).toEqual(
			['cli', 'core', 'workflow'],
		);
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
