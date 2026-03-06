import { describe, it, expect } from 'vitest';

import { orchestrate } from './orchestrator.js';
import type { DiscoveredSpec } from './test-discovery-analyzer.js';

const DEFAULT_CONFIG = { defaultDuration: 60_000, maxGroupDuration: 300_000 };

function spec(path: string, capabilities: string[] = []): DiscoveredSpec {
	return { path, capabilities };
}

describe('orchestrate', () => {
	it('returns 0 shards when no specs provided', () => {
		const result = orchestrate([], 3, {}, DEFAULT_CONFIG);

		expect(result.shards).toHaveLength(0);
		expect(result.totalTestTime).toBe(0);
	});

	it('assigns single spec to single shard', () => {
		const result = orchestrate([spec('test.spec.ts')], 1, {}, DEFAULT_CONFIG);

		expect(result.shards).toHaveLength(1);
		expect(result.shards[0].specs).toEqual(['test.spec.ts']);
		expect(result.shards[0].testTime).toBe(60_000);
	});

	it('strips empty shards when more shards than specs', () => {
		const result = orchestrate([spec('a.spec.ts'), spec('b.spec.ts')], 5, {}, DEFAULT_CONFIG);

		expect(result.shards).toHaveLength(2);
		expect(result.shards.every((s) => s.specs.length > 0)).toBe(true);
	});

	it('re-numbers shards sequentially after stripping empty ones', () => {
		const result = orchestrate([spec('a.spec.ts'), spec('b.spec.ts')], 5, {}, DEFAULT_CONFIG);

		expect(result.shards.map((s) => s.shard)).toEqual([1, 2]);
	});

	it('uses defaultDuration when metrics are missing', () => {
		const config = { defaultDuration: 30_000, maxGroupDuration: 300_000 };
		const result = orchestrate([spec('a.spec.ts')], 1, {}, config);

		expect(result.shards[0].testTime).toBe(30_000);
		expect(result.totalTestTime).toBe(30_000);
	});

	it('uses metric duration when available', () => {
		const metrics = { 'a.spec.ts': 120_000 };
		const result = orchestrate([spec('a.spec.ts')], 1, metrics, DEFAULT_CONFIG);

		expect(result.shards[0].testTime).toBe(120_000);
		expect(result.totalTestTime).toBe(120_000);
	});

	it('groups specs with the same capability on the same shard', () => {
		const specs = [
			spec('email1.spec.ts', ['email']),
			spec('email2.spec.ts', ['email']),
			spec('standard.spec.ts'),
		];
		const result = orchestrate(specs, 3, {}, DEFAULT_CONFIG);

		const emailShard = result.shards.find((s) => s.capabilities.includes('email'));
		expect(emailShard).toBeDefined();
		expect(emailShard!.specs).toContain('email1.spec.ts');
		expect(emailShard!.specs).toContain('email2.spec.ts');
	});

	it('places different capabilities on separate shards when space allows', () => {
		const specs = [spec('email.spec.ts', ['email']), spec('proxy.spec.ts', ['proxy'])];
		const result = orchestrate(specs, 2, {}, DEFAULT_CONFIG);

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

		const result = orchestrate(specs, 2, metrics, config);

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

		const result = orchestrate(specs, 2, metrics, DEFAULT_CONFIG);

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

		const result = orchestrate(specs, 1, {}, DEFAULT_CONFIG);
		const shard = result.shards[0];

		// 2 capabilities + standard specs = 3
		expect(shard.fixtureCount).toBe(3);
	});

	it('fixtureCount is 1 for shard with only standard specs', () => {
		const specs = [spec('a.spec.ts'), spec('b.spec.ts')];
		const result = orchestrate(specs, 1, {}, DEFAULT_CONFIG);

		expect(result.shards[0].fixtureCount).toBe(1);
	});

	it('fixtureCount is 1 for shard with only one capability and no standard specs', () => {
		const specs = [spec('email.spec.ts', ['email'])];
		const result = orchestrate(specs, 1, {}, DEFAULT_CONFIG);

		expect(result.shards[0].fixtureCount).toBe(1);
	});

	it('sorts capabilities alphabetically', () => {
		const specs = [spec('proxy.spec.ts', ['proxy']), spec('email.spec.ts', ['email'])];
		const result = orchestrate(specs, 1, {}, DEFAULT_CONFIG);

		expect(result.shards[0].capabilities).toEqual(['email', 'proxy']);
	});

	it('uses 1-indexed shard numbers', () => {
		const specs = [spec('a.spec.ts'), spec('b.spec.ts'), spec('c.spec.ts')];
		const result = orchestrate(specs, 3, {}, DEFAULT_CONFIG);

		expect(result.shards.map((s) => s.shard)).toEqual([1, 2, 3]);
	});

	it('totalTestTime equals sum of all spec durations', () => {
		const metrics = { 'a.spec.ts': 100_000, 'b.spec.ts': 200_000 };
		const specs = [spec('a.spec.ts'), spec('b.spec.ts'), spec('c.spec.ts')];

		const result = orchestrate(specs, 2, metrics, DEFAULT_CONFIG);

		expect(result.totalTestTime).toBe(100_000 + 200_000 + 60_000);
	});
});
