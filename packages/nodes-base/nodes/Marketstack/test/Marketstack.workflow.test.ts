import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Marketstack', () => {
	const credentials = {
		marketstackApi: {
			apiKey: 'test-api-key',
			useHttps: true,
		},
	};

	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock('https://api.marketstack.com/v1');

			mock
				.get('/eod/2024-01-02')
				.query({ access_key: 'test-api-key', symbols: 'AAPL', offset: 0 })
				.reply(200, {
					count: 1,
					total: 1,
					data: [{ symbol: 'AAPL', date: '2024-01-02T00:00:00+0000', close: 185.64 }],
				});
			mock
				.get('/exchanges/XNAS')
				.query({ access_key: 'test-api-key' })
				.reply(200, { name: 'NASDAQ Stock Exchange', mic: 'XNAS' });
			mock
				.get('/tickers/AAPL')
				.query({ access_key: 'test-api-key' })
				.reply(200, { name: 'Apple Inc', symbol: 'AAPL' });
		});

		afterAll(() => {
			expect(nock.isDone()).toBe(true);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
