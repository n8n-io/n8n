import { describe, expect, it } from 'vitest';

import { closureOf, matchChangedFiles } from './verify-npm-install.js';

const byName = new Map<string, { dir: string; relDir: string; pkg: Record<string, unknown> }>([
	[
		'a',
		{ dir: '/x/a', relDir: 'packages/a', pkg: { dependencies: { b: 'workspace:*', ext: '^1' } } },
	],
	['b', { dir: '/x/b', relDir: 'packages/b', pkg: { peerDependencies: { c: 'catalog:' } } }],
	['c', { dir: '/x/c', relDir: 'packages/c', pkg: { optionalDependencies: { d: 'workspace:*' } } }],
	['d', { dir: '/x/d', relDir: 'packages/d', pkg: {} }],
	['solo', { dir: '/x/solo', relDir: 'packages/solo', pkg: { dependencies: { ext: '^1' } } }],
]) as unknown as Parameters<typeof closureOf>[1];

describe('closureOf', () => {
	it('follows dependencies, peerDependencies and optionalDependencies transitively', () => {
		expect(closureOf(['a'], byName).sort()).toEqual(['a', 'b', 'c', 'd']);
	});

	it('ignores non-workspace (external) deps', () => {
		expect(closureOf(['solo'], byName).sort()).toEqual(['solo']);
	});

	it('terminates on a dependency cycle', () => {
		const cyclic = new Map([
			['a', { dir: '/x/a', relDir: 'packages/a', pkg: { dependencies: { b: 'workspace:*' } } }],
			['b', { dir: '/x/b', relDir: 'packages/b', pkg: { dependencies: { a: 'workspace:*' } } }],
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
