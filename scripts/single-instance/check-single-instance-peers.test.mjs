import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	violationsFor,
	peersFor,
	diffBaseline,
	droppedPeers,
} from './check-single-instance-peers.mjs';

describe('violationsFor', () => {
	it('flags a curated lib declared in dependencies', () => {
		assert.deepEqual(
			violationsFor('pkg-a', 'packages/@n8n/pkg-a', { dependencies: { zod: 'catalog:' } }),
			['zod'],
		);
	});

	it('does not flag a curated lib declared as a peerDependency', () => {
		assert.deepEqual(
			violationsFor('pkg-b', 'packages/@n8n/pkg-b', { peerDependencies: { zod: 'catalog:' } }),
			[],
		);
	});

	it('exempts host packages', () => {
		assert.deepEqual(
			violationsFor('n8n', 'packages/cli', { dependencies: { zod: 'catalog:' } }),
			[],
		);
	});

	it('exempts frontend packages', () => {
		assert.deepEqual(
			violationsFor('n8n-editor-ui', 'packages/frontend/editor-ui', {
				dependencies: { zod: 'catalog:' },
			}),
			[],
		);
	});

	it('exempts pin-only libs (reflect-metadata)', () => {
		assert.deepEqual(
			violationsFor('pkg-c', 'packages/@n8n/pkg-c', {
				dependencies: { 'reflect-metadata': 'catalog:' },
			}),
			[],
		);
	});
});

describe('peersFor', () => {
	it('returns curated libs declared as peerDependencies', () => {
		assert.deepEqual(
			peersFor('pkg-b', 'packages/@n8n/pkg-b', { peerDependencies: { zod: 'catalog:' } }),
			['zod'],
		);
	});

	it('exempts host and frontend packages', () => {
		assert.deepEqual(
			peersFor('n8n', 'packages/cli', { peerDependencies: { zod: 'catalog:' } }),
			[],
		);
		assert.deepEqual(
			peersFor('ui', 'packages/frontend/editor-ui', { peerDependencies: { zod: 'catalog:' } }),
			[],
		);
	});
});

describe('diffBaseline', () => {
	it('reports baselined violations and fails un-baselined ones', () => {
		const { reported, failures } = diffBaseline(
			{ 'pkg-a': ['zod'], 'pkg-new': ['form-data'] },
			{ 'pkg-a': ['zod'] },
		);
		assert.deepEqual(reported, [{ name: 'pkg-a', lib: 'zod' }]);
		assert.deepEqual(failures, [{ name: 'pkg-new', lib: 'form-data' }]);
	});
});

describe('droppedPeers', () => {
	it('flags a locked peer that a package no longer declares', () => {
		assert.deepEqual(droppedPeers({ 'pkg-a': ['zod'] }, { 'pkg-a': ['zod', 'form-data'] }), [
			{ name: 'pkg-a', lib: 'form-data' },
		]);
	});

	it('passes when every locked peer is still declared', () => {
		assert.deepEqual(droppedPeers({ 'pkg-a': ['zod'] }, { 'pkg-a': ['zod'] }), []);
	});
});
