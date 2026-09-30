import { afterEach, describe, expect, test, vi } from 'vitest';

import { MetricsHelper } from '../services/victoria-metrics';

describe('MetricsHelper', () => {
	afterEach(() => vi.unstubAllGlobals());

	test('reads recent samples when the caller sets a latency offset', async () => {
		const payload = { status: 'success', data: { result: [{ metric: {}, value: [1, '182'] }] } };
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
		vi.stubGlobal('fetch', fetchMock);

		const result = await new MetricsHelper('http://localhost:8428').waitForMetric('heap_used', {
			latencyOffset: '1s',
		});

		expect(result?.value).toBe(182);
		expect(fetchMock).toHaveBeenCalledWith(
			'http://localhost:8428/api/v1/query?query=heap_used&latency_offset=1s',
		);
	});

	test('keeps the default query offset for other callers', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ status: 'success', data: { result: [] } })));
		vi.stubGlobal('fetch', fetchMock);

		await new MetricsHelper('http://localhost:8428').query('heap_used');

		expect(fetchMock).toHaveBeenCalledWith('http://localhost:8428/api/v1/query?query=heap_used');
	});
});
