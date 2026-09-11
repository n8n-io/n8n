import { describe, expect, it } from 'vitest';

import { parseDistributionMatrix, summarizeDistribution } from './distribution-counter.mjs';

describe('parseDistributionMatrix', () => {
	it('parses matrix metadata', () => {
		expect(
			parseDistributionMatrix(
				JSON.stringify([
					{
						shard: 1,
						specs: 'a.spec.ts b.spec.ts',
						images: 'n8n proxy',
						capabilities: ['proxy'],
						services: ['proxy'],
						fixturePools: ['pool-a'],
						fixtureCount: 1,
						testTime: 100,
					},
				]),
			),
		).toEqual([
			{
				shard: 1,
				specs: ['a.spec.ts', 'b.spec.ts'],
				images: ['n8n', 'proxy'],
				capabilities: ['proxy'],
				services: ['proxy'],
				fixturePools: ['pool-a'],
				fixtureCount: 1,
				testTime: 100,
			},
		]);
	});

	it('parses the empty-selection sentinel without metadata', () => {
		expect(
			parseDistributionMatrix(JSON.stringify([{ shard: 1, specs: '', images: '', skip: true }])),
		).toEqual([
			{
				shard: 1,
				specs: [],
				images: [],
				capabilities: [],
				services: [],
				fixturePools: [],
				fixtureCount: 0,
				testTime: 0,
			},
		]);
	});

	it('rejects missing distribution metadata', () => {
		expect(() =>
			parseDistributionMatrix(JSON.stringify([{ shard: 1, specs: 'a.spec.ts', images: 'n8n' }])),
		).toThrow('The distributor did not return distribution metadata');
	});
});

describe('summarizeDistribution', () => {
	it('reports duplicates and modeled-start discrepancies', () => {
		const matrix = [{ specs: ['a.spec.ts', 'b.spec.ts'] }, { specs: ['b.spec.ts'] }];
		const byShard = [
			{
				runnableSpecs: 2,
				runnableTests: 4,
				modeledStackStarts: 1,
				stackStarts: 2,
				extraStackStarts: 1,
				images: ['n8n', 'proxy'],
			},
			{
				runnableSpecs: 1,
				runnableTests: 2,
				modeledStackStarts: 1,
				stackStarts: 1,
				extraStackStarts: 0,
				images: ['n8n'],
			},
		];

		expect(summarizeDistribution('e2e', { mode: 'full' }, matrix, byShard)).toMatchObject({
			shards: 2,
			selectedSpecs: 3,
			uniqueSpecs: 2,
			duplicateSpecs: 1,
			runnableSpecs: 3,
			runnableTests: 6,
			modeledStackStarts: 2,
			stackStarts: 3,
			extraStackStarts: 1,
			declaredImageLoads: 3,
			images: { n8n: 2, proxy: 1 },
		});
	});
});
