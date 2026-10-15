import { describe, expect, it } from 'vitest';

import {
	createTimeMapping,
	endpointKey,
	formatBytes,
	formatElapsed,
	prepareChartData,
	profileForRequest,
} from '../viewer/chart-data.mjs';
import { normalizePreferences } from '../viewer/preferences.mjs';

const point = (elapsedMs, recordingId = 'recording-1', segmentId = 'process-1') => ({
	elapsedMs,
	recordingId,
	segmentId,
	memory: { rss: 1024, heapUsed: 512 },
});
const request = {
	id: 1,
	api: 'internal',
	method: 'GET',
	route: '/rest/workflows/:id',
	elapsedMs: 2000,
	durationMs: 100,
	segmentId: 'process-1',
	recordingId: 'recording-1',
};
const session = {
	settings: { intervalMs: 1000 },
	recordingIntervals: [
		{ id: 'recording-1', startElapsedMs: 0, endElapsedMs: 2000 },
		{ id: 'recording-2', startElapsedMs: 8000, endElapsedMs: 9000 },
	],
	pauses: [{ startElapsedMs: 2000, endElapsedMs: 8000 }],
};

describe('memory timeline', () => {
	it('removes overlapping pause and scrape gaps once and preserves source times', () => {
		const points = [
			point(1000),
			point(2000),
			point(8000, 'recording-2'),
			point(9000, 'recording-2'),
		];
		const original = structuredClone(points);
		const visible = createTimeMapping(points, session, false);
		const compressed = createTimeMapping(points, session, true);
		expect(visible.toDisplay(8000)).toBe(8000);
		expect(compressed.toDisplay(8000)).toBe(2000);
		expect(compressed.toDisplay(5000)).toBe(2000);
		expect(compressed.toDisplay(9000)).toBe(3000);
		expect(compressed.gaps).toEqual([{ start: 2000, end: 8000 }]);
		expect(compressed.isBreak(points[1], points[2])).toBe(true);
		expect(points).toEqual(original);
	});

	it('breaks lines across short pauses and process restarts', () => {
		const points = [
			point(1000),
			point(2000, 'recording-2'),
			point(3000, 'recording-2', 'process-2'),
		];
		const data = prepareChartData({ report: { timeline: points, session }, hideGaps: false });
		expect(data.lines.rss.filter((entry) => entry[1] === null)).toHaveLength(2);
		expect(data.lines.external).toEqual([]);
	});

	it('uses API type, method, and route for favorites and retains individual calls', () => {
		const publicRequest = { ...request, id: 2, api: 'public' };
		const postRequest = { ...request, id: 3, method: 'POST' };
		const secondCall = { ...request, id: 4, elapsedMs: 3000 };
		const report = {
			session,
			timeline: [point(1000)],
			requests: { recent: [request, publicRequest, postRequest, secondCall] },
		};
		const favorites = new Set([endpointKey(request)]);
		const data = prepareChartData({ report, favorites });
		expect(data.endpoints).toHaveLength(1);
		expect(data.endpoints[0].requests.map((entry) => entry.request.id)).toEqual([1, 4]);
		const selected = prepareChartData({ report, favorites, selectedRequest: 'process-1:2' });
		expect(selected.endpoints).toHaveLength(2);
		expect(selected.focus).toEqual({ start: 0, end: 4100 });
	});

	it('selects checkpoints only from the same interval and process', () => {
		const wrongInterval = { segmentId: 'process-1', recordingId: 'recording-2', elapsedMs: 2200 };
		const wrongProcess = { segmentId: 'process-2', recordingId: 'recording-1', elapsedMs: 2200 };
		const matching = { segmentId: 'process-1', recordingId: 'recording-1', elapsedMs: 2500 };
		expect(profileForRequest([wrongInterval, wrongProcess, matching], request)).toBe(matching);
		expect(profileForRequest([wrongInterval, wrongProcess], request)).toBeUndefined();
		const oldRequest = { ...request, recordingId: undefined };
		const oldProfile = { segmentId: 'process-1', elapsedMs: 2500 };
		expect(profileForRequest([oldProfile], oldRequest)).toBe(oldProfile);
	});

	it('formats axes across memory and time scales', () => {
		expect(formatBytes(1024)).toBe('1 KiB');
		expect(formatBytes(2 * 1024 ** 3)).toBe('2 GiB');
		expect(formatElapsed(0.5)).toBe('1 ms');
		expect(formatElapsed(50.51)).toBe('51 ms');
		expect(formatElapsed(2000)).toBe('2 s');
		expect(formatElapsed(120_000)).toBe('2 min');
		expect(formatElapsed(7_200_000)).toBe('2 h');
	});
});

describe('chart preferences', () => {
	it('drops malformed favorites and preserves unique endpoint identities', () => {
		const key = endpointKey(request);
		expect(
			normalizePreferences({
				version: 1,
				favorites: [key, key, null, 'invalid', '{}', '["other","GET","/"]'],
				hideGaps: true,
			}),
		).toEqual({ favorites: [key], hideGaps: true });
		expect(normalizePreferences({ version: 0, favorites: [key], hideGaps: true })).toEqual({
			favorites: [],
			hideGaps: false,
		});
	});
});
