import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	ciMetricsContext,
	resolveCiMetricsWebhook,
	sendCiMetrics,
	type CiMetric,
} from './ci-metrics';

const metric: CiMetric = {
	metric_name: 'a11y-score',
	value: 12,
	unit: 'points',
	dimensions: { bucket: 'canvas' },
};

const webhook = { url: 'https://webhook.test/metrics', user: 'user', password: 'pass' };

/** Stands in for `fetch`, so no test needs a webhook to talk to. */
function stubFetch(response: Partial<Response> | Error) {
	const fetchMock = vi.fn((_url: string, _init: { body: string }) =>
		response instanceof Error ? Promise.reject(response) : Promise.resolve(response as Response),
	);
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('resolveCiMetricsWebhook', () => {
	test('prefers the explicit values over the environment', () => {
		expect(
			resolveCiMetricsWebhook(
				{ url: 'https://explicit.test' },
				{ QA_METRICS_WEBHOOK_URL: 'https://env.test', QA_METRICS_WEBHOOK_USER: 'env-user' },
			),
		).toEqual({ url: 'https://explicit.test', user: 'env-user', password: undefined });
	});
});

describe('sendCiMetrics', () => {
	test('posts the metrics under one benchmark name and reports how many landed', async () => {
		const fetchMock = stubFetch({ ok: true });

		const sent = await sendCiMetrics({
			benchmarkName: 'a11y-buckets',
			metrics: [metric],
			webhook,
			logPrefix: '[a11y]',
			context: ciMetricsContext(),
		});

		expect(sent).toBe(1);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(webhook.url);
		expect(JSON.parse(init.body)).toMatchObject({
			benchmark_name: 'a11y-buckets',
			metrics: [metric],
		});
	});

	test('sends nothing without a webhook url or without metrics', async () => {
		const fetchMock = stubFetch({ ok: true });

		const params = { benchmarkName: 'a11y-buckets', logPrefix: '[a11y]' };
		expect(await sendCiMetrics({ ...params, metrics: [metric], webhook: {} })).toBe(0);
		expect(await sendCiMetrics({ ...params, metrics: [], webhook })).toBe(0);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('skips the send when the credentials are incomplete', async () => {
		const fetchMock = stubFetch({ ok: true });

		const sent = await sendCiMetrics({
			benchmarkName: 'a11y-buckets',
			metrics: [metric],
			webhook: { url: webhook.url },
			logPrefix: '[a11y]',
		});

		expect(sent).toBe(0);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('drops the metrics rather than throwing when the webhook rejects them', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		stubFetch({ ok: false, status: 500 });

		expect(
			await sendCiMetrics({
				benchmarkName: 'a11y-buckets',
				metrics: [metric],
				webhook,
				logPrefix: '[a11y]',
			}),
		).toBe(0);
	});

	test('drops the metrics rather than throwing when the request fails', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		stubFetch(new Error('network down'));

		expect(
			await sendCiMetrics({
				benchmarkName: 'a11y-buckets',
				metrics: [metric],
				webhook,
				logPrefix: '[a11y]',
			}),
		).toBe(0);
	});
});
