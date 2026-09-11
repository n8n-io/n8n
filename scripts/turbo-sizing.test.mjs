// node --test scripts/turbo-sizing.test.mjs
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	DEFAULT_PROCESS_MEM_MB,
	MAX_CONCURRENCY,
	computeConcurrency,
	findConcurrencyArg,
	parseConcurrencyEnv,
	resolveConcurrency,
	resolveNodeOptions,
	resolveSizing,
} from './turbo-sizing.mjs';

const GB = 1024;
const MACHINE_16GB = { totalMemMb: 16 * GB, cpuCount: 10 };

describe('computeConcurrency', () => {
	it('keeps concurrency x cap inside the RAM of common machines', () => {
		for (const totalGb of [6, 8, 16, 24, 32, 64, 128]) {
			const machine = { totalMemMb: totalGb * GB, cpuCount: 16 };
			const concurrency = computeConcurrency(machine);
			assert.ok(
				concurrency * DEFAULT_PROCESS_MEM_MB <=
					Math.max(machine.totalMemMb, DEFAULT_PROCESS_MEM_MB),
				`${totalGb} GB got concurrency ${concurrency}`,
			);
		}
	});

	it('gives a 16 GB machine the same concurrency that CI pins', () => {
		assert.equal(computeConcurrency(MACHINE_16GB), 2);
	});

	it('never returns less than one worker, even on a box smaller than the cap', () => {
		assert.equal(computeConcurrency({ totalMemMb: 4 * GB, cpuCount: 2 }), 1);
	});

	it("never exceeds turbo's own default", () => {
		assert.equal(computeConcurrency({ totalMemMb: 512 * GB, cpuCount: 128 }), MAX_CONCURRENCY);
	});

	it('is limited by the CPU count on a RAM-rich, CPU-poor machine', () => {
		assert.equal(computeConcurrency({ totalMemMb: 128 * GB, cpuCount: 2 }), 2);
	});

	it('gives more workers when the per-process cap is smaller', () => {
		const small = computeConcurrency({ ...MACHINE_16GB, processMemMb: 2048 });
		assert.ok(small > computeConcurrency(MACHINE_16GB));
	});
});

describe('findConcurrencyArg', () => {
	it('reads the joined form', () => {
		assert.equal(findConcurrencyArg(['--filter=n8n', '--concurrency=5']), '5');
	});

	it('reads the separated form', () => {
		assert.equal(findConcurrencyArg(['--concurrency', '5', '--summarize']), '5');
	});

	it('returns undefined when absent', () => {
		assert.equal(findConcurrencyArg(['--filter=n8n']), undefined);
	});

	it('does not match a different flag with the same prefix', () => {
		assert.equal(findConcurrencyArg(['--concurrency-limit=5']), undefined);
	});
});

describe('parseConcurrencyEnv', () => {
	it('accepts an integer and a percentage', () => {
		assert.equal(parseConcurrencyEnv('3'), '3');
		assert.equal(parseConcurrencyEnv(' 50% '), '50%');
	});

	it('rejects an unset, empty, zero, or non-numeric value', () => {
		for (const raw of [undefined, '', '  ', '0', '-2', 'many', '2.5']) {
			assert.equal(parseConcurrencyEnv(raw), undefined, `accepted ${JSON.stringify(raw)}`);
		}
	});
});

describe('resolveConcurrency precedence', () => {
	const base = { machine: MACHINE_16GB };

	it('lets an explicit flag win over the environment variable', () => {
		const result = resolveConcurrency({ ...base, flag: '5', env: { TURBO_CONCURRENCY: '3' } });
		assert.deepEqual(result, { concurrency: '5', source: 'flag' });
	});

	it('lets the environment variable win over the computed default', () => {
		const result = resolveConcurrency({ ...base, env: { TURBO_CONCURRENCY: '3' } });
		assert.deepEqual(result, { concurrency: '3', source: 'env' });
	});

	it('falls back to the computed default', () => {
		const result = resolveConcurrency({ ...base, env: {} });
		assert.deepEqual(result, { concurrency: '2', source: 'computed' });
	});

	it('ignores an invalid environment variable and computes instead', () => {
		const result = resolveConcurrency({ ...base, env: { TURBO_CONCURRENCY: 'lots' } });
		assert.equal(result.source, 'computed');
	});

	it('treats an empty or blank flag as absent', () => {
		for (const flag of [undefined, '', '   ']) {
			const result = resolveConcurrency({ ...base, flag, env: { TURBO_CONCURRENCY: '3' } });
			assert.equal(result.concurrency, '3', `flag ${JSON.stringify(flag)} was not ignored`);
		}
	});

	it('returns a flag value unvalidated, so turbo reports a bad one', () => {
		const result = resolveConcurrency({ ...base, flag: 'banana', env: {} });
		assert.deepEqual(result, { concurrency: 'banana', source: 'flag' });
	});

	it('accepts a number as the flag, which is how parseArgs callers pass it', () => {
		assert.equal(resolveConcurrency({ ...base, flag: 4, env: {} }).concurrency, '4');
	});

	// The CI policy belongs to resolveSizing(). Keeping it out of here is what
	// lets agent-setup.mjs share the order without inheriting the no-op.
	it('knows nothing about CI', () => {
		const result = resolveConcurrency({ ...base, env: { CI: 'true' } });
		assert.deepEqual(result, { concurrency: '2', source: 'computed' });
	});
});

describe('resolveNodeOptions', () => {
	it('adds the cap when NODE_OPTIONS is unset', () => {
		assert.equal(resolveNodeOptions(undefined, 6144), '--max-old-space-size=6144');
	});

	it('appends the cap to existing options', () => {
		assert.equal(
			resolveNodeOptions('--enable-source-maps', 6144),
			'--enable-source-maps --max-old-space-size=6144',
		);
	});

	it('keeps a cap the caller already set', () => {
		assert.equal(
			resolveNodeOptions('--max-old-space-size=2048', 6144),
			'--max-old-space-size=2048',
		);
	});
	it('overrides an existing cap when asked, because Node reads the last one', () => {
		assert.equal(
			resolveNodeOptions('--max-old-space-size=2048', 6144, { override: true }),
			'--max-old-space-size=2048 --max-old-space-size=6144',
		);
	});
});

describe('resolveSizing', () => {
	const base = { machine: MACHINE_16GB };

	it('prepends the computed concurrency and keeps the caller arguments', () => {
		const sizing = resolveSizing({ ...base, args: ['--filter=n8n'], env: {} });
		assert.deepEqual(sizing.args, ['--concurrency=2', '--filter=n8n']);
		assert.equal(sizing.nodeOptions, `--max-old-space-size=${DEFAULT_PROCESS_MEM_MB}`);
		assert.equal(sizing.source, 'computed');
	});

	it('adds nothing when the caller already set the concurrency', () => {
		const sizing = resolveSizing({ ...base, args: ['--concurrency=5'], env: {} });
		assert.deepEqual(sizing.args, ['--concurrency=5']);
		assert.equal(sizing.source, 'flag');
	});

	it('changes neither arguments nor NODE_OPTIONS under CI', () => {
		const env = { CI: 'true', NODE_OPTIONS: '--max-old-space-size=6144' };
		const sizing = resolveSizing({ ...base, args: ['--filter=n8n'], env });
		assert.deepEqual(sizing.args, ['--filter=n8n']);
		assert.equal(sizing.nodeOptions, env.NODE_OPTIONS);
		assert.equal(sizing.source, 'ci');
		assert.equal(sizing.concurrency, undefined);
	});

	it('injects no memory cap under CI when the workflow set none', () => {
		const sizing = resolveSizing({ ...base, args: [], env: { CI: 'true' } });
		assert.equal(sizing.nodeOptions, undefined);
	});

	it('reports the concurrency a CI workflow pinned itself', () => {
		const sizing = resolveSizing({ ...base, args: ['--concurrency=5'], env: { CI: 'true' } });
		assert.equal(sizing.concurrency, '5');
		assert.deepEqual(sizing.args, ['--concurrency=5']);
	});
});
