import { describe, expect, it } from 'vitest';

import { describeSplit, findLockfileSplits, peerAtoms } from './lockfile-splits.js';
import type { LockGraph } from '../utils/pnpm-lock-parser.js';

const graph = (
	snapshotKeys: Record<string, string[]>,
	importers: Record<string, Record<string, { specifier: string; version: string }>> = {},
): LockGraph => ({
	snapshotKeys: new Map(Object.entries(snapshotKeys)),
	importers: new Map(Object.entries(importers).map(([k, v]) => [k, new Map(Object.entries(v))])),
});

describe('peerAtoms', () => {
	it('drops the leading version and keeps top-level peers', () => {
		expect([...peerAtoms('zod@3.25.76(a@1.0.0)(b@2.0.0)')]).toEqual([
			['a', '1.0.0'],
			['b', '2.0.0'],
		]);
	});

	it('collects nested peers, which is where the differentiator usually hides', () => {
		expect(
			peerAtoms('x@1(openai@6.46.0(@smithy/signature-v4@5.3.5))').get('@smithy/signature-v4'),
		).toBe('5.3.5');
	});

	it('keeps the scope when splitting a scoped name from its version', () => {
		expect(peerAtoms('x@1(@opentelemetry/api@1.9.1)').get('@opentelemetry/api')).toBe('1.9.1');
	});

	it('skips fragments that carry no version, such as a patch hash', () => {
		expect([...peerAtoms('x@1(patch_hash=abc123)(a@1.0.0)').keys()]).toEqual(['a']);
	});

	it('returns nothing for a key with no peer context', () => {
		expect(peerAtoms('zod@3.25.76').size).toBe(0);
	});
});

describe('findLockfileSplits', () => {
	it('ignores a library with one context', () => {
		expect(findLockfileSplits(graph({ zod: ['zod@3.25.76(a@1)'] }), ['zod'])).toEqual([]);
	});

	it('ignores a library that is not in the curated list', () => {
		expect(
			findLockfileSplits(graph({ lodash: ['lodash@4(a@1)', 'lodash@4(a@2)'] }), ['zod']),
		).toEqual([]);
	});

	it('reports the peers that differ across contexts', () => {
		const [split] = findLockfileSplits(
			graph({ zod: ['zod@3(a@1.0.0)(shared@9)', 'zod@3(a@2.0.0)(shared@9)'] }),
			['zod'],
		);
		expect(split.differingPeers).toEqual([{ name: 'a', versions: ['1.0.0', '2.0.0'] }]);
	});

	it('treats a peer present in only one context as a difference', () => {
		const [split] = findLockfileSplits(graph({ zod: ['zod@3', 'zod@3(a@1.0.0)'] }), ['zod']);
		expect(split.differingPeers).toEqual([{ name: 'a', versions: ['(absent)', '1.0.0'] }]);
	});

	it('attributes each context to the importers that resolve it', () => {
		const [split] = findLockfileSplits(
			graph(
				{ zod: ['zod@3(a@1)', 'zod@3(a@2)'] },
				{
					'packages/one': { zod: { specifier: 'catalog:', version: '3(a@1)' } },
					'packages/two': { zod: { specifier: 'catalog:', version: '3(a@2)' } },
				},
			),
			['zod'],
		);
		expect(split.variants.map((v) => v.importers)).toEqual([['packages/one'], ['packages/two']]);
	});

	it('names the workspace package that declares a differing peer directly', () => {
		const [split] = findLockfileSplits(
			graph(
				{ zod: ['zod@3(a@1)', 'zod@3(a@2)'] },
				{
					'packages/one': { a: { specifier: '1', version: '1' } },
				},
			),
			['zod'],
		);
		expect(split.culprits).toEqual([
			{ importer: 'packages/one', peer: 'a', specifier: '1', resolved: '1' },
		]);
	});
});

describe('describeSplit', () => {
	it('states the count, the differing peer and the declaring package', () => {
		const [split] = findLockfileSplits(
			graph(
				{ zod: ['zod@3(a@1)', 'zod@3(a@2)'] },
				{
					'packages/one': { a: { specifier: '1', version: '1' } },
				},
			),
			['zod'],
		);
		const message = describeSplit(split);
		expect(message).toContain('"zod" resolves to 2 peer contexts');
		expect(message).toContain('a (1 vs 2)');
		expect(message).toContain('packages/one declares a "1"');
	});
});

describe('culprit ordering', () => {
	it('leads with the pinned declaration, since a catalog reference cannot fork the graph', () => {
		const [split] = findLockfileSplits(
			graph(
				{ zod: ['zod@3(a@1)', 'zod@3(a@2)'] },
				{
					'packages/catalogued': { a: { specifier: 'catalog:', version: '2' } },
					'packages/pinned': { a: { specifier: '1', version: '1' } },
				},
			),
			['zod'],
		);
		expect(split.culprits.map((c) => c.importer)).toEqual([
			'packages/pinned',
			'packages/catalogued',
		]);
	});
});
