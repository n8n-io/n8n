import { describe, it, expect } from 'vitest';

import { distributeShards } from './shard-distributor.js';
import type { DiscoveredSpec } from './types.js';

const DEFAULT_CONFIG = { defaultDuration: 60_000, maxGroupDuration: 300_000 };

function spec(path: string, capabilities: string[] = []): DiscoveredSpec {
	return { path, capabilities };
}

describe('distributeShards', () => {
	it('returns 0 shards when no specs provided', () => {
		const result = distributeShards([], 3, {}, DEFAULT_CONFIG);

		expect(result.shards).toHaveLength(0);
		expect(result.totalTestTime).toBe(0);
	});

	it('assigns single spec to single shard', () => {
		const result = distributeShards([spec('test.spec.ts')], 1, {}, DEFAULT_CONFIG);

		expect(result.shards).toHaveLength(1);
		expect(result.shards[0].specs).toEqual(['test.spec.ts']);
		expect(result.shards[0].testTime).toBe(60_000);
	});

	it('strips empty shards when more shards than specs', () => {
		const result = distributeShards([spec('a.spec.ts'), spec('b.spec.ts')], 5, {}, DEFAULT_CONFIG);

		expect(result.shards).toHaveLength(2);
		expect(result.shards.every((s) => s.specs.length > 0)).toBe(true);
	});

	it('re-numbers shards sequentially after stripping empty ones', () => {
		const result = distributeShards([spec('a.spec.ts'), spec('b.spec.ts')], 5, {}, DEFAULT_CONFIG);

		expect(result.shards.map((s) => s.shard)).toEqual([1, 2]);
	});

	it('uses defaultDuration when metrics are missing', () => {
		const config = { defaultDuration: 30_000, maxGroupDuration: 300_000 };
		const result = distributeShards([spec('a.spec.ts')], 1, {}, config);

		expect(result.shards[0].testTime).toBe(30_000);
		expect(result.totalTestTime).toBe(30_000);
	});

	it('uses metric duration when available', () => {
		const metrics = { 'a.spec.ts': 120_000 };
		const result = distributeShards([spec('a.spec.ts')], 1, metrics, DEFAULT_CONFIG);

		expect(result.shards[0].testTime).toBe(120_000);
		expect(result.totalTestTime).toBe(120_000);
	});

	it('groups specs with the same capability on the same shard', () => {
		const specs = [
			spec('email1.spec.ts', ['email']),
			spec('email2.spec.ts', ['email']),
			spec('standard.spec.ts'),
		];
		const result = distributeShards(specs, 3, {}, DEFAULT_CONFIG);

		const emailShard = result.shards.find((s) => s.capabilities.includes('email'));
		expect(emailShard).toBeDefined();
		expect(emailShard!.specs).toContain('email1.spec.ts');
		expect(emailShard!.specs).toContain('email2.spec.ts');
	});

	it('places different capabilities on separate shards when space allows', () => {
		const specs = [spec('email.spec.ts', ['email']), spec('proxy.spec.ts', ['proxy'])];
		const result = distributeShards(specs, 2, {}, DEFAULT_CONFIG);

		const emailShard = result.shards.find((s) => s.capabilities.includes('email'));
		const proxyShard = result.shards.find((s) => s.capabilities.includes('proxy'));
		expect(emailShard).toBeDefined();
		expect(proxyShard).toBeDefined();
		expect(emailShard!.shard).not.toBe(proxyShard!.shard);
	});

	it('splits capability groups exceeding maxGroupDuration', () => {
		const metrics = {
			'email1.spec.ts': 200_000,
			'email2.spec.ts': 200_000,
		};
		const config = { defaultDuration: 60_000, maxGroupDuration: 200_000 };
		const specs = [spec('email1.spec.ts', ['email']), spec('email2.spec.ts', ['email'])];

		const result = distributeShards(specs, 2, metrics, config);

		const shardsWithEmail = result.shards.filter((s) => s.capabilities.includes('email'));
		expect(shardsWithEmail.length).toBeGreaterThanOrEqual(2);
	});

	it('balances shards with greedy bin-packing', () => {
		const metrics = {
			'heavy.spec.ts': 100_000,
			'medium.spec.ts': 50_000,
			'light1.spec.ts': 25_000,
			'light2.spec.ts': 25_000,
		};
		const specs = [
			spec('heavy.spec.ts'),
			spec('medium.spec.ts'),
			spec('light1.spec.ts'),
			spec('light2.spec.ts'),
		];

		const result = distributeShards(specs, 2, metrics, DEFAULT_CONFIG);

		const times = result.shards.map((s) => s.testTime).sort((a, b) => a - b);
		expect(times[0]).toBe(100_000);
		expect(times[1]).toBe(100_000);
	});

	it('calculates fixtureCount correctly', () => {
		const specs = [
			spec('email.spec.ts', ['email']),
			spec('proxy.spec.ts', ['proxy']),
			spec('standard.spec.ts'),
		];

		const result = distributeShards(specs, 1, {}, DEFAULT_CONFIG);
		const shard = result.shards[0];

		// 2 capabilities + standard specs = 3
		expect(shard.fixtureCount).toBe(3);
	});

	it('fixtureCount is 1 for shard with only standard specs', () => {
		const specs = [spec('a.spec.ts'), spec('b.spec.ts')];
		const result = distributeShards(specs, 1, {}, DEFAULT_CONFIG);

		expect(result.shards[0].fixtureCount).toBe(1);
	});

	it('fixtureCount is 1 for shard with only one capability and no standard specs', () => {
		const specs = [spec('email.spec.ts', ['email'])];
		const result = distributeShards(specs, 1, {}, DEFAULT_CONFIG);

		expect(result.shards[0].fixtureCount).toBe(1);
	});

	it('sorts capabilities alphabetically', () => {
		const specs = [spec('proxy.spec.ts', ['proxy']), spec('email.spec.ts', ['email'])];
		const result = distributeShards(specs, 1, {}, DEFAULT_CONFIG);

		expect(result.shards[0].capabilities).toEqual(['email', 'proxy']);
	});

	it('uses 1-indexed shard numbers', () => {
		const specs = [spec('a.spec.ts'), spec('b.spec.ts'), spec('c.spec.ts')];
		const result = distributeShards(specs, 3, {}, DEFAULT_CONFIG);

		expect(result.shards.map((s) => s.shard)).toEqual([1, 2, 3]);
	});

	it('totalTestTime equals sum of all spec durations', () => {
		const metrics = { 'a.spec.ts': 100_000, 'b.spec.ts': 200_000 };
		const specs = [spec('a.spec.ts'), spec('b.spec.ts'), spec('c.spec.ts')];

		const result = distributeShards(specs, 2, metrics, DEFAULT_CONFIG);

		expect(result.totalTestTime).toBe(100_000 + 200_000 + 60_000);
	});
	describe('shard-count limits', () => {
		const MIN = 5 * 60_000;
		const withLimit = { ...DEFAULT_CONFIG, targetShardDuration: MIN };
		const evenSpecs = (n: number, each: number) => ({
			specs: Array.from({ length: n }, (_, i) => spec(`s${i}.spec.ts`)),
			metrics: Object.fromEntries(Array.from({ length: n }, (_, i) => [`s${i}.spec.ts`, each])),
		});

		it('leaves the shard count unchanged when no limit is configured', () => {
			const { specs, metrics } = evenSpecs(6, 30_000);
			const result = distributeShards(specs, 6, metrics, DEFAULT_CONFIG);

			expect(result.shards).toHaveLength(6);
		});

		it('collapses a single-spec selection to one shard', () => {
			const result = distributeShards([spec('a.spec.ts')], 16, { 'a.spec.ts': 30_000 }, withLimit);

			expect(result.shards).toHaveLength(1);
		});

		it('still uses every shard for a full-suite selection', () => {
			const { specs, metrics } = evenSpecs(108, 60_000);
			const result = distributeShards(specs, 16, metrics, withLimit);

			expect(result.shards).toHaveLength(16);
		});

		it('never returns zero shards when the total test time is below the limit', () => {
			const { specs, metrics } = evenSpecs(2, 1_000);
			const result = distributeShards(specs, 16, metrics, withLimit);

			expect(result.shards).toHaveLength(1);
			expect(result.shards[0].specs).toHaveLength(2);
		});

		it('returns no shards for an empty selection even with a limit', () => {
			expect(distributeShards([], 16, {}, withLimit).shards).toHaveLength(0);
		});

		it('limits the shard count by minShardSpecs', () => {
			const { specs, metrics } = evenSpecs(6, 10 * 60_000);
			const result = distributeShards(specs, 16, metrics, {
				...DEFAULT_CONFIG,
				minShardSpecs: 3,
			});

			expect(result.shards).toHaveLength(2);
		});

		it('treats minShardSpecs of 1 as disabled', () => {
			const { specs, metrics } = evenSpecs(4, 10 * 60_000);
			const result = distributeShards(specs, 4, metrics, {
				...DEFAULT_CONFIG,
				minShardSpecs: 1,
			});

			expect(result.shards).toHaveLength(4);
		});

		it('applies the lower of the two limits', () => {
			const { specs, metrics } = evenSpecs(9, 5 * 60_000);
			const config = { ...DEFAULT_CONFIG, targetShardDuration: MIN, minShardSpecs: 3 };

			// by time: ceil(45/5) = 9 shards. by specs: floor(9/3) = 3 shards
			expect(distributeShards(specs, 16, metrics, config).shards).toHaveLength(3);
		});

		it('keeps bin-packing balanced within the limited shard count', () => {
			const metrics = {
				'a.spec.ts': 5 * 60_000,
				'b.spec.ts': 3 * 60_000,
				'c.spec.ts': 2 * 60_000,
			};
			const specs = [spec('a.spec.ts'), spec('b.spec.ts'), spec('c.spec.ts')];
			const result = distributeShards(specs, 16, metrics, withLimit);

			expect(result.shards).toHaveLength(2);
			expect(result.shards.map((s) => s.testTime).sort((x, y) => x - y)).toEqual([
				5 * 60_000,
				5 * 60_000,
			]);
		});
		it('never merges capability groups onto one shard', () => {
			const specs = [
				spec('proxy.spec.ts', ['proxy']),
				spec('email.spec.ts', ['email']),
				spec('oidc.spec.ts', ['oidc']),
				spec('kafka.spec.ts', ['kafka']),
			];
			const metrics = Object.fromEntries(specs.map((s) => [s.path, 45_000]));

			// 3 min total is far below the limit, but 4 capability groups need 4 shards
			const result = distributeShards(specs, 16, metrics, withLimit);

			expect(result.shards).toHaveLength(4);
			expect(result.shards.every((s) => s.fixtureCount === 1)).toBe(true);
		});

		it('never merges capability groups when a large group is split', () => {
			// 'proxy' totals 12 min and splits into 3 items, so the 5 capability items
			// need 5 shards even though there are only 3 distinct capabilities.
			const specs = [
				...Array.from({ length: 12 }, (_, i) => spec(`proxy${i}.spec.ts`, ['proxy'])),
				spec('email.spec.ts', ['email']),
				spec('oidc.spec.ts', ['oidc']),
			];
			const metrics = Object.fromEntries(specs.map((s) => [s.path, 60_000]));

			const result = distributeShards(specs, 16, metrics, withLimit);

			expect(result.shards.every((s) => s.fixtureCount === 1)).toBe(true);
		});

		it('still collapses specs that share one capability group', () => {
			const specs = Array.from({ length: 4 }, (_, i) => spec(`p${i}.spec.ts`, ['proxy']));
			const metrics = Object.fromEntries(specs.map((s) => [s.path, 45_000]));
			const result = distributeShards(specs, 16, metrics, withLimit);

			expect(result.shards).toHaveLength(1);
		});

		it('never exceeds numShards when capability groups outnumber the shards', () => {
			const specs = Array.from({ length: 6 }, (_, i) => spec(`c${i}.spec.ts`, [`cap${i}`]));
			const metrics = Object.fromEntries(specs.map((s) => [s.path, 10_000]));
			const result = distributeShards(specs, 2, metrics, withLimit);

			expect(result.shards).toHaveLength(2);
		});

		it('treats the duration limit as a target, not a hard minimum', () => {
			const { specs, metrics } = evenSpecs(12, 60_000);
			const result = distributeShards(specs, 16, metrics, withLimit);

			// ceil(12/5) = 3 shards of 4 min each — below MIN, and deliberately so:
			// floor() would give 2 shards of 6 min and add 2 min of wall-clock.
			expect(result.shards).toHaveLength(3);
			expect(Math.min(...result.shards.map((s) => s.testTime))).toBeLessThan(MIN);
		});
	});
});
