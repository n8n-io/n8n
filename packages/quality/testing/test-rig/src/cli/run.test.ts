import { formatTable, imageFor, parseRunArgs, runFailed } from './run';
import type { Row } from './run';

describe('parseRunArgs', () => {
	const now = new Date('2026-10-07T10:00:00.000Z');

	it('defaults to five runs of both variants', () => {
		const options = parseRunArgs([], now);
		expect(options).toMatchObject({ scenarios: [], runs: 5, variants: ['before', 'after'] });
		expect(options.out).toContain('2026-10-07T10-00-00-000Z');
	});

	it('reads scenarios, runs, variant, after image and output dir', () => {
		expect(
			parseRunArgs(
				[
					'a',
					'b',
					'--runs',
					'2',
					'--variant',
					'after',
					'--after-image',
					'n8nio/n8n:x',
					'--out',
					'/o',
				],
				now,
			),
		).toMatchObject({
			scenarios: ['a', 'b'],
			runs: 2,
			variants: ['after'],
			afterImage: 'n8nio/n8n:x',
			out: '/o',
		});
	});

	it.each([[['--runs', '0']], [['--runs', 'two']], [['--variant', 'during']]])(
		'rejects %o',
		(args) => {
			expect(() => parseRunArgs(args, now)).toThrow('Usage:');
		},
	);
});

describe('imageFor', () => {
	const scenario = {
		issue: 'CAT-1',
		spec: 'x.spec.ts',
		before: 'n8nio/n8n:1',
		after: 'n8nio/n8n:2',
	};

	it('uses the after image override only where an after image exists', () => {
		expect(imageFor(scenario, 'after', 'n8nio/n8n:9')).toBe('n8nio/n8n:9');
		expect(imageFor(scenario, 'before', 'n8nio/n8n:9')).toBe('n8nio/n8n:1');
		expect(imageFor({ ...scenario, after: null }, 'after', 'n8nio/n8n:9')).toBeNull();
	});
});

describe('runFailed and formatTable', () => {
	const rows: Row[] = [
		{ name: 'a', variant: 'before', image: 'n8nio/n8n:1', passed: 2, total: 2 },
		{ name: 'a', variant: 'after', image: '-', note: 'no image' },
	];

	it('passes when every run passed and skips scenarios without an image', () => {
		expect(runFailed(rows, 2)).toBe(false);
	});

	it('fails on a failed run or a missing image', () => {
		expect(runFailed([{ ...rows[0], passed: 1 }], 2)).toBe(true);
		expect(runFailed([{ name: 'a', variant: 'after', image: 'x', note: 'image missing' }], 2)).toBe(
			true,
		);
	});

	it('prints one row per variant', () => {
		expect(formatTable(rows).split('\n')).toEqual([
			'scenario | variant | image | passed',
			'a | before | n8nio/n8n:1 | 2/2',
			'a | after | - | no image',
		]);
	});
});
