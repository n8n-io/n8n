import { parseHookLine } from './control';

describe('parseHookLine', () => {
	it('parses an event with detail', () => {
		expect(
			parseHookLine('[test-rig] 2026-10-07T10:00:00.000Z pid=7 hit job-fetched {"jobId":"3"}'),
		).toEqual({ event: 'hit', point: 'job-fetched', detail: { jobId: '3' } });
	});

	it('parses an event without detail behind a log prefix', () => {
		expect(
			parseHookLine('worker-1 | [test-rig] 2026-10-07T10:00:00.000Z pid=7 release gate'),
		).toEqual({
			event: 'release',
			point: 'gate',
			detail: {},
		});
	});

	it('keeps an empty detail when the JSON is cut off', () => {
		expect(parseHookLine('[test-rig] t pid=1 hit gate {"a":')?.detail).toEqual({});
	});

	it('ignores other lines', () => {
		expect(parseHookLine('Worker started')).toBeUndefined();
		expect(parseHookLine('[test-rig] malformed')).toBeUndefined();
	});
});
