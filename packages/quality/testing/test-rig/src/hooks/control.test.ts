import { parseHookLine } from './control';

describe('parseHookLine', () => {
	it('parses a line with detail', () => {
		expect(
			parseHookLine('[test-rig] 2026-11-10T16:00:00.000Z pid=12 hit job-start {"jobId":"7"}'),
		).toEqual({
			at: Date.parse('2026-11-10T16:00:00.000Z'),
			event: 'hit',
			point: 'job-start',
			detail: { jobId: '7' },
		});
	});

	it('parses a line without detail after a log prefix', () => {
		expect(
			parseHookLine('worker-1 | [test-rig] 2026-11-10T16:00:00.000Z pid=1 installed job-start'),
		).toEqual({
			at: Date.parse('2026-11-10T16:00:00.000Z'),
			event: 'installed',
			point: 'job-start',
			detail: {},
		});
	});

	it('keeps an empty detail when the JSON is invalid', () => {
		expect(
			parseHookLine('[test-rig] 2026-11-10T16:00:00.000Z pid=1 hit p {broken')?.detail,
		).toEqual({});
	});

	it.each([
		'Enqueued execution 1',
		'[test-rig]',
		'[test-rig] 2026-11-10T16:00:00.000Z hit p',
		'[other] 2026-11-10T16:00:00.000Z pid=1 hit p',
	])('ignores %j', (line) => {
		expect(parseHookLine(line)).toBeUndefined();
	});
});
