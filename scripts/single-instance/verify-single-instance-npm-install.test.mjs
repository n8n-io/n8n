import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { closureOf, matchChangedFiles } from './verify-single-instance-npm-install.mjs';

const byName = new Map([
	['a', { dir: '/x/a', pkg: { dependencies: { b: 'workspace:*', ext: '^1.0.0' } } }],
	['b', { dir: '/x/b', pkg: { peerDependencies: { c: 'catalog:' } } }],
	['c', { dir: '/x/c', pkg: { optionalDependencies: { d: 'workspace:*' } } }],
	['d', { dir: '/x/d', pkg: {} }],
	['solo', { dir: '/x/solo', pkg: { dependencies: { ext: '^1.0.0' } } }],
]);

describe('closureOf', () => {
	it('follows dependencies, peerDependencies and optionalDependencies transitively', () => {
		assert.deepEqual(closureOf(['a'], byName).sort(), ['a', 'b', 'c', 'd']);
	});

	it('ignores non-workspace (external) deps', () => {
		assert.deepEqual(closureOf(['solo'], byName).sort(), ['solo']);
	});

	it('terminates on a dependency cycle', () => {
		const cyclic = new Map([
			['a', { dir: '/x/a', pkg: { dependencies: { b: 'workspace:*' } } }],
			['b', { dir: '/x/b', pkg: { dependencies: { a: 'workspace:*' } } }],
		]);
		assert.deepEqual(closureOf(['a'], cyclic).sort(), ['a', 'b']);
	});
});

describe('matchChangedFiles', () => {
	const dirs = [
		['pkg', 'packages/@n8n/pkg/'],
		['pkg-sub', 'packages/@n8n/pkg/sub/'],
	];

	it('maps a file to its owning package', () => {
		assert.deepEqual(matchChangedFiles(['packages/@n8n/pkg/src/x.ts'], dirs), ['pkg']);
	});

	it('prefers the longest matching prefix when packages nest', () => {
		assert.deepEqual(matchChangedFiles(['packages/@n8n/pkg/sub/x.ts'], dirs), ['pkg-sub']);
	});

	it('returns nothing for files outside any package', () => {
		assert.deepEqual(matchChangedFiles(['README.md'], dirs), []);
	});
});
