import { describe, expect, it } from 'vitest';

import {
	closureOf,
	filesTriggerFullRun,
	matchChangedFiles,
	resolveTargets,
} from './verify-npm-install.js';

/** Build a WorkspacePkg fixture from `[depName, section]` pairs (only names + sections matter). */
function ws(name: string, deps: Array<[string, string]>) {
	return {
		relDir: `packages/${name}`,
		info: {
			filePath: `/x/${name}/package.json`,
			packageName: name,
			private: false,
			deps: deps.map(([depName, section]) => ({
				name: depName,
				version: '',
				line: 1,
				usesCatalog: false,
				section,
			})),
		},
	};
}

const byName = new Map([
	[
		'a',
		ws('a', [
			['b', 'dependencies'],
			['ext', 'dependencies'],
		]),
	],
	['b', ws('b', [['c', 'peerDependencies']])],
	['c', ws('c', [['d', 'optionalDependencies']])],
	['d', ws('d', [])],
	['solo', ws('solo', [['ext', 'dependencies']])],
	['dev-only', ws('dev-only', [['a', 'devDependencies']])],
]) as unknown as Parameters<typeof closureOf>[1];

describe('closureOf', () => {
	it('follows dependencies, peerDependencies and optionalDependencies transitively', () => {
		expect(closureOf(['a'], byName).sort()).toEqual(['a', 'b', 'c', 'd']);
	});

	it('ignores non-workspace (external) deps', () => {
		expect(closureOf(['solo'], byName).sort()).toEqual(['solo']);
	});

	it('does not follow devDependencies (they are not published)', () => {
		expect(closureOf(['dev-only'], byName).sort()).toEqual(['dev-only']);
	});

	it('terminates on a dependency cycle', () => {
		const cyclic = new Map([
			['a', ws('a', [['b', 'dependencies']])],
			['b', ws('b', [['a', 'dependencies']])],
		]) as unknown as Parameters<typeof closureOf>[1];
		expect(closureOf(['a'], cyclic).sort()).toEqual(['a', 'b']);
	});
});

describe('matchChangedFiles', () => {
	const dirs: Array<[string, string]> = [
		['pkg', 'packages/@n8n/pkg/'],
		['pkg-sub', 'packages/@n8n/pkg/sub/'],
	];

	it('maps a file to its owning package', () => {
		expect(matchChangedFiles(['packages/@n8n/pkg/src/x.ts'], dirs)).toEqual(['pkg']);
	});

	it('prefers the longest matching prefix when packages nest', () => {
		expect(matchChangedFiles(['packages/@n8n/pkg/sub/x.ts'], dirs)).toEqual(['pkg-sub']);
	});

	it('returns nothing for files outside any package', () => {
		expect(matchChangedFiles(['README.md'], dirs)).toEqual([]);
	});
});

describe('filesTriggerFullRun', () => {
	it('escalates on the catalog / root manifest', () => {
		expect(filesTriggerFullRun(['pnpm-workspace.yaml'])).toBe(true);
		expect(filesTriggerFullRun(['package.json'])).toBe(true);
	});

	it('escalates on a change to the single-instance tool itself', () => {
		expect(filesTriggerFullRun(['packages/testing/code-health/src/single-instance/libs.ts'])).toBe(
			true,
		);
	});

	it('does not escalate on an ordinary package source change', () => {
		expect(filesTriggerFullRun(['packages/core/src/index.ts'])).toBe(false);
	});
});

describe('resolveTargets', () => {
	it('does not mistake --report-only for a package name', () => {
		expect(resolveTargets(['a', '--report-only'], byName, '/x')).toEqual(['a']);
	});

	// Flag-only args must reach the usage error rather than silently verifying nothing.
	it('resolves no targets when only flags are passed', () => {
		expect(resolveTargets(['--report-only'], byName, '/x')).toEqual([]);
	});

	it('still expands --all alongside the flag', () => {
		expect(resolveTargets(['--all', '--report-only'], byName, '/x')?.sort()).toEqual([
			'a',
			'b',
			'c',
			'd',
			'dev-only',
			'solo',
		]);
	});
});
