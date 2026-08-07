import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { gristApiRequest } from '../GenericFunctions';
import { Grist } from '../Grist.node';

vi.mock('../GenericFunctions', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../GenericFunctions')>();
	return { ...actual, gristApiRequest: vi.fn() };
});

describe('Execute Grist Node', () => {
	const items: INodeExecutionData[] = [
		{ json: { Repo: 'dtinth/automatron', Description: 'LINE Bot' } },
		{ json: { Repo: 'dtinth/WebMIDICon', Description: 'MIDI Controller' } },
		{ json: { Repo: 'dtinth/mockapis', Description: 'Mock API Endpoints' } },
	];

	// Batching (all input items sent in a single PUT) can't be exercised via
	// NodeTestHarness workflow fixtures here: synthesizing multiple input
	// items would need a Code node, which needs a JS Task Runner that
	// NodeTestHarness never starts. Mock IExecuteFunctions directly instead,
	// same as e.g. Kafka.node.test.ts and ExcelSharePoint's append.test.ts.
	const run = async (getNodeParameter: IExecuteFunctions['getNodeParameter']) => {
		const ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue(items);
		ctx.getNodeParameter.mockImplementation(getNodeParameter);

		const result = await new Grist().execute.call(ctx);
		return result[0];
	};

	beforeEach(() => {
		vi.mocked(gristApiRequest).mockReset().mockResolvedValue(null);
	});

	it('sends auto-mapped fields for all items in one batched request', async () => {
		const result = await run(((name: string, i: number) => {
			switch (name) {
				case 'operation':
					return 'upsert';
				case 'docId':
					return 'test-doc-id';
				case 'tableId':
					return 'test-table-id';
				case 'dataToSend':
					return 'autoMapInputs';
				case 'inputsToIgnore':
					return '';
				case 'onMany':
					return 'first';
				case 'upsertCriteria':
					return { properties: [{ fieldId: 'Repo', fieldValue: items[i].json.Repo }] };
				default:
					throw new Error(`Unexpected getNodeParameter call: ${name}`);
			}
		}) as IExecuteFunctions['getNodeParameter']);

		expect(gristApiRequest).toHaveBeenCalledTimes(1);
		expect(gristApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/docs/test-doc-id/tables/test-table-id/records',
			{
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
			{},
		);
		expect(result).toEqual(items.map((item, i) => ({ json: item.json, pairedItem: { item: i } })));
	});

	it('sends explicitly defined fields for all items in one batched request', async () => {
		const result = await run(((name: string, i: number) => {
			switch (name) {
				case 'operation':
					return 'upsert';
				case 'docId':
					return 'test-doc-id';
				case 'tableId':
					return 'test-table-id';
				case 'dataToSend':
					return 'defineInNode';
				case 'onMany':
					return 'first';
				case 'upsertCriteria':
					return { properties: [{ fieldId: 'Repo', fieldValue: items[i].json.Repo }] };
				case 'fieldsToSend':
					return {
						properties: [
							{ fieldId: 'Description', fieldValue: items[i].json.Description },
							{ fieldId: 'Updated_At', fieldValue: '2025-08-11' },
						],
					};
				default:
					throw new Error(`Unexpected getNodeParameter call: ${name}`);
			}
		}) as IExecuteFunctions['getNodeParameter']);

		expect(gristApiRequest).toHaveBeenCalledTimes(1);
		expect(gristApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/docs/test-doc-id/tables/test-table-id/records',
			{
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
			{},
		);
		expect(result).toEqual(items.map((item, i) => ({ json: item.json, pairedItem: { item: i } })));
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
