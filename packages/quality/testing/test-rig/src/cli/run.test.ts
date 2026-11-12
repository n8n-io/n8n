import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { MANIFEST_PATH, PLAYWRIGHT_DIR } from './manifest';
import { parseRunArgs, runFailed } from './run';

const row = { name: 'a', variant: 'before' as const, image: 'n8nio/n8n:1', passed: 2, total: 2 };

describe('runFailed', () => {
	it('fails when a variant did not pass every run', () => {
		expect(runFailed([row, { ...row, variant: 'after', passed: 1 }])).toBe(true);
	});

	it('passes when every variant passed every run', () => {
		expect(runFailed([row, { ...row, variant: 'after' }])).toBe(false);
	});

	it('fails when an image is missing', () => {
		expect(runFailed([row, { ...row, passed: 0, note: 'image missing' }])).toBe(true);
	});
});

describe('parseRunArgs', () => {
	const now = new Date('2026-01-02T03:04:05.678Z');

	it('runs every scenario five times in both variants by default', () => {
		expect(parseRunArgs([], now)).toEqual({
			scenarios: [],
			runs: 5,
			variants: ['before', 'after'],
			out: join(tmpdir(), 'test-rig-results', '2026-01-02T03-04-05-678Z'),
			manifest: MANIFEST_PATH,
			playwrightDir: PLAYWRIGHT_DIR,
		});
	});

	it('reads scenarios, runs, variant, out, manifest and playwright dir', () => {
		expect(
			parseRunArgs(
				'one two --runs 3 --variant after --out /out --manifest /m.json --playwright-dir /pw'.split(
					' ',
				),
				now,
			),
		).toEqual({
			scenarios: ['one', 'two'],
			runs: 3,
			variants: ['after'],
			out: '/out',
			manifest: '/m.json',
			playwrightDir: '/pw',
		});
	});

	it.each(['0', '-1', '1.5', 'x'])('rejects --runs %s', (runs) => {
		expect(() => parseRunArgs([`--runs=${runs}`])).toThrow('--runs must be a positive integer');
	});

	it('rejects an unknown variant', () => {
		expect(() => parseRunArgs(['--variant', 'middle'])).toThrow(
			'--variant must be before or after',
		);
	});
});
