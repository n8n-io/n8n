import { NodeTestHarness } from '@nodes-testing/node-test-harness';

describe('Execute Grist Node', () => {
	new NodeTestHarness().setupTests({
		credentials: {
			gristApi: {
				apiKey: 'test-api-key',
				planType: 'free',
			},
		},
		nock: {
			baseUrl: 'https://docs.getgrist.com',
			mocks: [
				{
					method: 'put',
					path: '/api/docs/test-doc-id/tables/test-table-id/records',
					statusCode: 200,
					responseBody: 'null',
					requestHeaders: {
						authorization: 'Bearer test-api-key',
					},
					requestBody: {
						records: [
							{
								require: { Repo: 'dtinth/automatron' },
								fields: { Repo: 'dtinth/automatron', Description: 'LINE Bot' },
							},
							{
								require: { Repo: 'dtinth/WebMIDICon' },
								fields: { Repo: 'dtinth/WebMIDICon', Description: 'MIDI Controller' },
							},
							{
								require: { Repo: 'dtinth/mockapis' },
								fields: { Repo: 'dtinth/mockapis', Description: 'Mock API Endpoints' },
							},
						],
					},
				},
				{
					method: 'put',
					path: '/api/docs/test-doc-id/tables/test-table-id/records',
					statusCode: 200,
					responseBody: 'null',
					requestHeaders: {
						authorization: 'Bearer test-api-key',
					},
					requestBody: {
						records: [
							{
								require: { Repo: 'dtinth/automatron' },
								fields: { Description: 'LINE Bot', Updated_At: '2025-08-11' },
							},
							{
								require: { Repo: 'dtinth/WebMIDICon' },
								fields: { Description: 'MIDI Controller', Updated_At: '2025-08-11' },
							},
							{
								require: { Repo: 'dtinth/mockapis' },
								fields: { Description: 'Mock API Endpoints', Updated_At: '2025-08-11' },
							},
						],
					},
				},
			],
		},
	});
});
