import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { anything, below, includes, is, isNot, Scenario, variant } from './scenario';

describe('Scenario', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'test-rig-scenario-'));
	});

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('fails the run on a failed check, after it stops the stack and attaches the record', async () => {
		const stop = vi.fn(async () => await Promise.resolve());
		const attached: string[] = [];
		const attach = async (_name: string, { body }: { body: string }) => {
			attached.push(body);
			await Promise.resolve();
		};
		const s = new Scenario('demo', { n8nContainers: () => [], stop }, dir);

		await expect(
			s.run({ attach }, async () => {
				s.verify({ always: [['exit code', 1, is(0)]] });
				await Promise.resolve();
			}),
		).rejects.toThrow('failed checks: exit code: 1 is 0');
		expect(stop).toHaveBeenCalledTimes(1);
		expect(attached.map((body) => JSON.parse(body) as unknown)).toMatchObject([
			{
				scenario: 'demo',
				failedChecks: ['exit code: 1 is 0'],
			},
		]);
	});

	it('runs the always checks and the checks of its own variant only', () => {
		vi.stubEnv('TEST_RIG_VARIANT', 'before');
		const s = new Scenario(
			'demo',
			{ n8nContainers: () => [], stop: async () => await Promise.resolve() },
			dir,
		);
		vi.unstubAllEnvs();

		const failed = s.verify({
			always: [['shared', 1, is(2)]],
			before: [['own', 1, is(3)]],
			after: [['other', 1, is(4)]],
		});

		expect(failed).toEqual(['shared: 1 is 2', 'own: 1 is 3']);
		expect(s.result.failedChecks).toEqual(failed);
	});
});

describe('variant', () => {
	afterEach(() => vi.unstubAllEnvs());

	it.each([
		['before', 'before'],
		['after', 'after'],
		['', 'after'],
		['other', 'after'],
	])('reads %j as %s', (value, expected) => {
		vi.stubEnv('TEST_RIG_VARIANT', value);
		expect(variant()).toBe(expected);
	});
});

describe('matchers', () => {
	it.each([
		['is', is({ a: [1] }), { a: [1] }, { a: [2] }],
		['isNot', isNot(0), 1, 0],
		['below', below(5), 4, 5],
		['below with a non-number', below(5), 4, '4'],
		['includes in an array', includes({ a: 1 }), [{ a: 1 }], [{ a: 2 }]],
		['includes in a string', includes('ab'), 'xaby', 'xy'],
		['includes with a value that is not an array or string', includes('ab'), 'ab', 12],
	])('%s', (_label, expectation, pass, fail) => {
		expect(expectation.test(pass)).toBe(true);
		expect(expectation.test(fail)).toBe(false);
	});

	it('anything accepts any value', () => {
		expect([undefined, null, 0, 'x'].every((value) => anything.test(value))).toBe(true);
	});

	it('describes each expectation', () => {
		expect([is(1), isNot('a'), below(3), includes(2), anything].map((e) => e.describe)).toEqual([
			'is 1',
			'is not "a"',
			'is below 3',
			'includes 2',
			'is anything',
		]);
	});
});
