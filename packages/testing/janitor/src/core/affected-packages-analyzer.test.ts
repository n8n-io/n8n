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
