import { describe, expect, it } from 'vitest';

import {
	describeSplit,
	findLockfileSplits,
	isPinned,
	peerAtoms,
	remediationFor,
} from './lockfile-splits.js';
import type { ImporterSection, LockGraph } from '../utils/pnpm-lock-parser.js';

type TestDep = { specifier: string; version: string; section?: ImporterSection };

/**
 * Build a `LockGraph`. When `importers` is omitted every snapshot key is seeded from its own
 * published importer, so a test that is not about reachability does not have to model it.
 */
const graph = (
	snapshotKeys: Record<string, string[]>,
	importers?: Record<string, Record<string, TestDep>>,
	snapshotDeps: Record<string, string[]> = {},
): LockGraph => {
	const entries = Object.entries(snapshotKeys);
	const seeded: Record<string, Record<string, TestDep>> = {};
	if (!importers) {
		let i = 0;
		for (const [name, keys] of entries) {
			for (const key of keys) {
				seeded[`packages/seed-${i++}`] = {
					[name]: { specifier: 'catalog:', version: key.slice(name.length + 1) },
				};
			}
		}
	}
	return {
		snapshotKeys: new Map(entries),
		importers: new Map(
			Object.entries(importers ?? seeded).map(([path, deps]) => [
				path,
				new Map(
					Object.entries(deps).map(([name, d]) => [
						name,
						{ specifier: d.specifier, version: d.version, section: d.section ?? 'dependencies' },
					]),
				),
			]),
		),
		snapshotDeps: new Map(Object.entries(snapshotDeps)),
	};
};

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
					'packages/one': {
						zod: { specifier: 'catalog:', version: '3(a@1)' },
						a: { specifier: '1', version: '1' },
					},
					'packages/two': { zod: { specifier: 'catalog:', version: '3(a@2)' } },
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
					'packages/one': {
						zod: { specifier: 'catalog:', version: '3(a@1)' },
						a: { specifier: '1', version: '1' },
					},
					'packages/two': { zod: { specifier: 'catalog:', version: '3(a@2)' } },
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
					'packages/catalogued': {
						zod: { specifier: 'catalog:', version: '3(a@2)' },
						a: { specifier: 'catalog:', version: '2' },
					},
					'packages/pinned': {
						zod: { specifier: 'catalog:', version: '3(a@1)' },
						a: { specifier: '1', version: '1' },
					},
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

describe('isPinned', () => {
	const culprit = (specifier: string) => ({
		importer: 'packages/one',
		peer: 'a',
		specifier,
		resolved: '1',
	});

	it('treats the default catalog as unable to fork the graph', () => {
		expect(isPinned(culprit('catalog:'))).toBe(false);
	});

	it('treats a workspace link as unable to fork the graph', () => {
		expect(isPinned(culprit('workspace:*'))).toBe(false);
	});

	it('treats a named catalog as forking, since it exists to resolve differently', () => {
		expect(isPinned(culprit('catalog:undici-v7'))).toBe(true);
	});

	it('treats a literal range as forking', () => {
		expect(isPinned(culprit('^1.0.0'))).toBe(true);
	});
});

describe('published reachability', () => {
	const twoContexts = { zod: ['zod@3(a@1)', 'zod@3(a@2)'] };

	it('ignores a context reachable only through a devDependency', () => {
		const splits = findLockfileSplits(
			graph(twoContexts, {
				'packages/ships': { zod: { specifier: 'catalog:', version: '3(a@1)' } },
				'packages/tooling': {
					zod: { specifier: 'catalog:', version: '3(a@2)', section: 'devDependencies' },
				},
			}),
			['zod'],
		);
		expect(splits).toEqual([]);
	});

	it('counts a context both of whose importers publish it', () => {
		const splits = findLockfileSplits(
			graph(twoContexts, {
				'packages/one': { zod: { specifier: 'catalog:', version: '3(a@1)' } },
				'packages/two': {
					zod: { specifier: 'catalog:', version: '3(a@2)', section: 'optionalDependencies' },
				},
			}),
			['zod'],
		);
		expect(splits).toHaveLength(1);
	});

	it('reaches a transitive context through published snapshot edges', () => {
		const splits = findLockfileSplits(
			graph(
				twoContexts,
				{
					'packages/one': { zod: { specifier: 'catalog:', version: '3(a@1)' } },
					'packages/two': { dep: { specifier: '1.0.0', version: '1.0.0' } },
				},
				{ 'dep@1.0.0': ['zod@3(a@2)'] },
			),
			['zod'],
		);
		expect(splits).toHaveLength(1);
	});
});

describe('remediationFor', () => {
	const splitWith = (importers: Record<string, Record<string, TestDep>>) =>
		findLockfileSplits(graph({ zod: ['zod@3(a@1)', 'zod@3(a@2)'] }, importers), ['zod'])[0];

	it('points at the catalog when a workspace package pins the differing dependency', () => {
		const split = splitWith({
			'packages/one': {
				zod: { specifier: 'catalog:', version: '3(a@1)' },
				a: { specifier: '1', version: '1' },
			},
			'packages/two': { zod: { specifier: 'catalog:', version: '3(a@2)' } },
		});
		expect(remediationFor(split)).toContain('catalog');
		expect(remediationFor(split)).not.toContain('third party');
	});

	it('points at the third-party requirer when nothing in the repo pins it', () => {
		const split = splitWith({
			'packages/one': { zod: { specifier: 'catalog:', version: '3(a@1)' } },
			'packages/two': { zod: { specifier: 'catalog:', version: '3(a@2)' } },
		});
		expect(remediationFor(split)).toContain('third party');
		expect(remediationFor(split)).toContain('pnpm why');
	});
});
