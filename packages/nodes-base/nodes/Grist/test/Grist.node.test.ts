import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getColumns, gristApiRequest } from '../GenericFunctions';
import { Grist } from '../Grist.node';

// `getColumns` calls the module's own `gristApiRequest`, which this mock does not reach, so
// version 2 tests stub it as well.
vi.mock('../GenericFunctions', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../GenericFunctions')>();
	return { ...actual, gristApiRequest: vi.fn(), getColumns: vi.fn() };
});

describe('Execute Grist Node', () => {
	const items: INodeExecutionData[] = [
		{ json: { Repo: 'dtinth/automatron', Description: 'LINE Bot' } },
		{ json: { Repo: 'dtinth/WebMIDICon', Description: 'MIDI Controller' } },
		{ json: { Repo: 'dtinth/mockapis', Description: 'Mock API Endpoints' } },
	];
	const v1Node = mock<INode>({ typeVersion: 1 });

	const v1UpsertParameters = ((name: string, i: number) => {
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
	}) as IExecuteFunctions['getNodeParameter'];

	// Batching (all input items sent in a single PUT) can't be exercised via
	// NodeTestHarness workflow fixtures here: synthesizing multiple input
	// items would need a Code node, which needs a JS Task Runner that
	// NodeTestHarness never starts. Mock IExecuteFunctions directly instead,
	// same as e.g. Kafka.node.test.ts and ExcelSharePoint's append.test.ts.
	const run = async (getNodeParameter: IExecuteFunctions['getNodeParameter']) => {
		const ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue(items);
		ctx.getNode.mockReturnValue(v1Node);
		ctx.getNodeParameter.mockImplementation(getNodeParameter);

		const result = await new Grist().execute.call(ctx);
		return result[0];
	};

	beforeEach(() => {
		vi.mocked(gristApiRequest).mockReset().mockResolvedValue(null);
		vi.mocked(getColumns).mockReset();
	});

	// Runs a version 2 node on one input item, with parameters read from a map.
	const runV2 = async (parameters: Record<string, unknown>, json: IDataObject = {}) => {
		const ctx = mock<IExecuteFunctions>();
		ctx.helpers.returnJsonArray = returnJsonArray;
		ctx.helpers.constructExecutionMetaData = constructExecutionMetaData;
		ctx.getInputData.mockReturnValue([{ json }]);
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		const values: Record<string, unknown> = {
			docId: 'test-doc-id',
			tableId: 'test-table-id',
			...parameters,
		};
		ctx.getNodeParameter.mockImplementation(
			((name: string, _i: number, fallback?: unknown) =>
				values[name] ?? fallback) as IExecuteFunctions['getNodeParameter'],
		);

		const [result] = await new Grist().execute.call(ctx);
		return result;
	};

	it('sends auto-mapped fields for all items in one batched request', async () => {
		const result = await run(v1UpsertParameters);

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
		// Fields sent happen to equal the full input item here, since autoMap maps every key.
		expect(result).toEqual(items.map((item, i) => ({ json: item.json, pairedItem: { item: i } })));
	});

	it('includes the record id when the API returns recordIds', async () => {
		vi.mocked(gristApiRequest).mockResolvedValue({ recordIds: [[101], [102], [103]] });

		const result = await run(v1UpsertParameters);

		expect(result).toEqual([
			{ json: { id: 101, ...items[0].json }, pairedItem: { item: 0 } },
			{ json: { id: 102, ...items[1].json }, pairedItem: { item: 1 } },
			{ json: { id: 103, ...items[2].json }, pairedItem: { item: 2 } },
		]);
	});

	it('emits one error item paired with every input item when continueOnFail is set', async () => {
		vi.mocked(gristApiRequest).mockRejectedValue(new Error('Grist API is down'));

		const ctx = mockDeep<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue(items);
		ctx.getNode.mockReturnValue(v1Node);
		ctx.continueOnFail.mockReturnValue(true);
		ctx.helpers.returnJsonArray.mockImplementation(returnJsonArray);
		ctx.helpers.constructExecutionMetaData.mockImplementation(constructExecutionMetaData);
		ctx.getNodeParameter.mockImplementation(v1UpsertParameters);

		const [result] = await new Grist().execute.call(ctx);

		// One combined API call for the whole batch means one error, paired with
		// every input item (array-form pairedItem), not an error per item.
		expect(result).toHaveLength(1);
		expect(result[0].json.error).toBe('Grist API is down');
		expect(result[0].pairedItem).toEqual(items.map((_, i) => ({ item: i })));
	});

	it('rethrows when continueOnFail is not set', async () => {
		vi.mocked(gristApiRequest).mockRejectedValue(new Error('Grist API is down'));

		const ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue(items);
		ctx.getNode.mockReturnValue(v1Node);
		ctx.continueOnFail.mockReturnValue(false);
		ctx.getNodeParameter.mockImplementation(v1UpsertParameters);

		await expect(new Grist().execute.call(ctx)).rejects.toThrow('Grist API is down');
	});

	describe('auto-mapped create in version 2', () => {
		const runAutoMap = async (columnIds: string[], parameters: Record<string, unknown> = {}) => {
			vi.mocked(getColumns).mockResolvedValue(
				columnIds.map((id) => ({ id, fields: { type: 'Text' } })),
			);
			vi.mocked(gristApiRequest).mockResolvedValue({ records: [{ id: 1 }] });

			await runV2(
				{ operation: 'create', 'columns.mappingMode': 'autoMapInputData', ...parameters },
				{ Repo: 'dtinth/automatron', _source: 'webhook' },
			);
			const post = vi.mocked(gristApiRequest).mock.calls.find(([method]) => method === 'POST');
			return (post?.[2] as { records: Array<{ fields: unknown }> }).records[0].fields;
		};

		it('leaves out a field the table has no column for', async () => {
			expect(await runAutoMap(['Repo'])).toEqual({ Repo: 'dtinth/automatron' });
		});

		it('uses the columns the table has now, not the stored schema', async () => {
			const schema = [{ id: 'Repo', displayName: 'Repo', type: 'string' }];
			expect(await runAutoMap(['Repo', '_source'], { 'columns.schema': schema })).toEqual({
				Repo: 'dtinth/automatron',
				_source: 'webhook',
			});
		});
	});

	describe('reading rows in version 2', () => {
		const runGetAll = async (records: IDataObject[]) => {
			vi.mocked(getColumns).mockResolvedValue([{ id: 'Sizes', fields: { type: 'ChoiceList' } }]);
			vi.mocked(gristApiRequest).mockResolvedValue({ records });

			const result = await runV2({ operation: 'getAll', returnAll: true, additionalOptions: {} });
			return result.map((item) => item.json);
		};

		it('does not read the columns when no value is a list', async () => {
			const rows = await runGetAll([{ id: 1, fields: { Name: 'Ada', Age: 36 } }]);

			expect(getColumns).not.toHaveBeenCalled();
			expect(rows).toEqual([{ id: 1, Name: 'Ada', Age: 36 }]);
		});

		it('reads the columns to decode a list, including one that holds the letter L', async () => {
			const rows = await runGetAll([{ id: 1, fields: { Sizes: ['L', 'L', 'M'] } }]);

			expect(getColumns).toHaveBeenCalledTimes(1);
			expect(rows).toEqual([{ id: 1, Sizes: ['L', 'M'] }]);
		});
	});

	it('names a row ID to match on that is not a number', async () => {
		await expect(
			runV2({
				operation: 'update',
				'columns.mappingMode': 'defineBelow',
				'columns.value': { id: 'Row 7', Repo: 'dtinth/automatron' },
				'columns.matchingColumns': ['id'],
			}),
		).rejects.toThrow('The row ID to match on is not a number: Row 7');
		expect(gristApiRequest).not.toHaveBeenCalled();
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
		expect(result).toEqual([
			{ json: { Description: 'LINE Bot', Updated_At: '2025-08-11' }, pairedItem: { item: 0 } },
			{
				json: { Description: 'MIDI Controller', Updated_At: '2025-08-11' },
				pairedItem: { item: 1 },
			},
			{
				json: { Description: 'Mock API Endpoints', Updated_At: '2025-08-11' },
				pairedItem: { item: 2 },
			},
		]);
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

describe('Grist authentication parameter', () => {
	// Workflows saved before the selector existed have no stored `authentication` value. Resolve a
	// node without one the way execution does, rather than asserting the declared default: adding
	// `displayOptions` to the parameter would drop it here while a default check still passed.
	it('resolves to the API key for a workflow saved without one', () => {
		const description = new Grist().description;
		const node: INode = {
			id: 'uuid-1234',
			name: 'Grist',
			type: 'n8n-nodes-base.grist',
			typeVersion: 1,
			position: [0, 0],
			parameters: { operation: 'getAll', docId: 'doc1', tableId: 'Table1' },
		};

		const resolved = NodeHelpers.getNodeParameters(
			description.properties,
			node.parameters,
			true,
			false,
			node,
			description,
		);

		expect(resolved?.authentication).toBe('apiKey');
	});
});
