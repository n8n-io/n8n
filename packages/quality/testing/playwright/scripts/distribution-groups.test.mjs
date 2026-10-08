import { describe, expect, it } from 'vitest';

import { buildDistributionGroups, filterDistributionSpecs } from './distribution-groups.mjs';

describe('buildDistributionGroups', () => {
	it('maps specs to sorted fixture-pool digests', () => {
		expect(
			buildDistributionGroups({
				profiles: [
					{ poolDigest: 'pool-b', specs: ['mixed.spec.ts', 'b.spec.ts'] },
					{ poolDigest: 'pool-a', specs: ['mixed.spec.ts', 'a.spec.ts'] },
				],
			}),
		).toEqual({
			'a.spec.ts': ['pool-a'],
			'b.spec.ts': ['pool-b'],
			'mixed.spec.ts': ['pool-a', 'pool-b'],
		});
	});

	it.each([
		[null, 'Playwright returned invalid profile data'],
		[{}, 'Playwright returned invalid profile data'],
		[{ profiles: [{}] }, 'Playwright returned an invalid fixture-pool profile'],
		[
			{ profiles: [{ poolDigest: 'pool-a', specs: [42] }] },
			'Playwright returned an invalid spec path',
		],
	])('rejects invalid reporter data', (report, message) => {
		expect(() => buildDistributionGroups(report)).toThrow(message);
	});
});

describe('filterDistributionSpecs', () => {
	it('removes specs omitted by project filtering and quarantine', () => {
		expect(
			filterDistributionSpecs(
				['runnable.spec.ts', 'licensed.spec.ts', 'quarantined.spec.ts'],
				['runnable.spec.ts', 'quarantined.spec.ts'],
				new Set(['quarantined.spec.ts']),
			),
		).toEqual(['runnable.spec.ts']);
	});
});
