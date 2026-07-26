import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { ICredentialsDecrypted, ICredentialTestFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Grist } from '../Grist.node';

describe('Execute Grist Node', () => {
	new NodeTestHarness().setupTests({
		credentials: {
			gristApi: {
				apiKey: 'test-api-key',
				planType: 'free',
			},
		},
		nock: {
			baseUrl: 'https://api.getgrist.com',
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

describe('Grist credentialTest', () => {
	const run = async (
		orgs: unknown,
		data: ICredentialsDecrypted['data'] = { apiKey: 'k', url: 'https://api.getgrist.com' },
	) => {
		const request = vi.fn().mockResolvedValue(orgs);
		const testFns = mock<ICredentialTestFunctions>();
		testFns.helpers = { ...testFns.helpers, request };
		// Plain object (not a deep mock) so an absent `url` reads as undefined rather than an auto-mock.
		const credential = { data } as unknown as ICredentialsDecrypted;

		const result = await new Grist().methods.credentialTest.gristApiTest.call(testFns, credential);
		return { result, request };
	};

	it('passes when at least one org is accessible', async () => {
		const { result, request } = await run([{ id: 1, name: 'Personal' }]);

		expect(result.status).toBe('OK');
		expect(request.mock.calls[0][0].uri).toBe('https://api.getgrist.com/api/orgs');
		expect(request.mock.calls[0][0].headers.Authorization).toBe('Bearer k');
	});

	it('fails when no orgs are accessible', async () => {
		const { result } = await run([]);

		expect(result.status).toBe('Error');
		expect(result.message).toContain('no Grist organizations are accessible');
	});

	it('fails when the response is not an array', async () => {
		const { result } = await run({ unexpected: true });

		expect(result.status).toBe('Error');
	});

	it('reports the request error message on failure', async () => {
		const request = vi.fn().mockRejectedValue(new Error('Unauthorized'));
		const testFns = mock<ICredentialTestFunctions>();
		testFns.helpers = { ...testFns.helpers, request };
		const credential = {
			data: { apiKey: 'bad', url: 'https://api.getgrist.com' },
		} as unknown as ICredentialsDecrypted;

		const result = await new Grist().methods.credentialTest.gristApiTest.call(testFns, credential);

		expect(result.status).toBe('Error');
		expect(result.message).toBe('Unauthorized');
	});

	it('resolves the base URL from a legacy credential without a url', async () => {
		const { request } = await run([{ id: 1 }], {
			apiKey: 'k',
			selfHostedUrl: 'http://localhost:8484',
		});

		expect(request.mock.calls[0][0].uri).toBe('http://localhost:8484/api/orgs');
	});
});
