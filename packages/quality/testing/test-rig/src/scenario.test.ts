import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioStack } from './scenario';
import {
	anything,
	atMost,
	below,
	excludes,
	failedChecks,
	includes,
	is,
	isNot,
	Scenario,
} from './scenario';

describe('expectations', () => {
	it.each([
		[is({ a: [1] }), { a: [1] }, { a: [2] }],
		[isNot('crashed'), 'error', 'crashed'],
		[below(10), 9, 10],
		[atMost(10), 10, 11],
		[includes('7'), ['6', '7'], ['6']],
		[includes('ok'), 'all ok', 'all bad'],
		[excludes('7'), ['6'], ['7']],
	])('%o passes %o and fails %o', (expectation, good, bad) => {
		expect(expectation.test(good)).toBe(true);
		expect(expectation.test(bad)).toBe(false);
	});

	it('fails numeric limits on non-numbers', () => {
		expect(below(10).test(undefined)).toBe(false);
		expect(atMost(10).test('5')).toBe(false);
	});

	it('accepts anything', () => {
		expect(anything.test(undefined)).toBe(true);
	});
});

describe('failedChecks', () => {
	it('lists failed checks with their value and expectation', () => {
		expect(
			failedChecks([
				['exit code', 0, is(0)],
				['status', 'crashed', isNot('crashed')],
				['missing', undefined, is(1)],
			]),
		).toEqual(['status: "crashed" is not "crashed"', 'missing: undefined is 1']);
	});
});

describe('Scenario', () => {
	let dir: string;
	const stopped: string[] = [];
	const stack: ScenarioStack = {
		stackStartMs: 1234,
		n8nContainers: () => [],
		stop: async () => {
			stopped.push('stopped');
			await Promise.resolve();
		},
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'test-rig-scenario-'));
		stopped.length = 0;
		vi.stubEnv('TEST_RIG_RESULTS_FILE', join(dir, 'out', 'results.jsonl'));
		vi.stubEnv('TEST_IMAGE_N8N', 'n8nio/n8n:1.2.3');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		rmSync(dir, { recursive: true, force: true });
	});

	const results = () =>
		readFileSync(join(dir, 'out', 'results.jsonl'), 'utf8')
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line) as Record<string, unknown>);

	it('runs the checks of its variant', () => {
		vi.stubEnv('TEST_RIG_VARIANT', 'before');
		const s = new Scenario('demo', stack, dir);
		expect(
			s.verify({
				always: [['shared', 1, is(2)]],
				before: [['b', 1, is(1)]],
				after: [['a', 1, is(2)]],
			}),
		).toEqual(['shared: 1 is 2']);
		expect(s.variant).toBe('before');
	});

	it('records a passing run with its timeline and stops the stack', async () => {
		const s = new Scenario('demo', stack, dir);
		await s.run({ errors: [] }, async () => {
			s.mark('one', { n: 1 });
			s.set({ answer: 42 });
			expect(await s.race('race', { slow: new Promise(() => {}), fast: Promise.resolve() })).toBe(
				'fast',
			);
			s.verify({ after: [['ok', true, is(true)]] });
		});
		const [line] = results();
		expect(line).toMatchObject({
			scenario: 'demo',
			variant: 'after',
			image: 'n8nio/n8n:1.2.3',
			stackStartMs: 1234,
			answer: 42,
			passed: true,
			failedChecks: [],
		});
		expect((line.timeline as Array<{ step: string }>).map((t) => t.step)).toEqual(['one', 'race']);
		expect(stopped).toEqual(['stopped']);
	});

	it('records failed checks and test errors as a failed run', async () => {
		const s = new Scenario('demo', stack, dir);
		await s.run({ errors: [] }, async () => {
			s.verify({ after: [['ok', false, is(true)]] });
			await Promise.resolve();
		});
		await new Scenario('demo', stack, dir).run({ errors: ['soft failure'] }, async () => {
			await Promise.resolve();
		});
		expect(results().map((line) => line.passed)).toEqual([false, false]);
	});

	it('records a thrown error, rethrows it and still stops the stack', async () => {
		const s = new Scenario('demo', stack, dir);
		await expect(
			s.run({ errors: [] }, async () => {
				await Promise.reject(new Error('boom'));
			}),
		).rejects.toThrow('boom');
		expect(results()[0]).toMatchObject({ passed: false, error: 'boom' });
		expect(stopped).toEqual(['stopped']);
	});
});
