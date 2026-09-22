import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { buildColumnTypeMap, gristApiRequest, parseFilterProperties } from '../GenericFunctions';
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
		// Fields sent happen to equal the full input item here, since autoMap maps every key.
		expect(result).toEqual(items.map((item, i) => ({ json: item.json, pairedItem: { item: i } })));
	});

	it('includes the record id when the API returns recordIds', async () => {
		vi.mocked(gristApiRequest).mockResolvedValue({ recordIds: [[101], [102], [103]] });

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
		ctx.continueOnFail.mockReturnValue(true);
		ctx.helpers.returnJsonArray.mockImplementation(returnJsonArray);
		ctx.helpers.constructExecutionMetaData.mockImplementation(constructExecutionMetaData);
		ctx.getNodeParameter.mockImplementation(((name: string, i: number) => {
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
		ctx.continueOnFail.mockReturnValue(false);
		ctx.getNodeParameter.mockImplementation(((name: string, i: number) => {
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

		await expect(new Grist().execute.call(ctx)).rejects.toThrow('Grist API is down');
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

describe('parseFilterProperties', () => {
	it('keeps a numeric-looking value as string for a Text column', () => {
		const result = parseFilterProperties([{ field: 'name', values: '123' }], { name: 'Text' });
		expect(result).toEqual({ name: ['123'] });
		expect(typeof result.name[0]).toBe('string');
	});

	it('coerces to number for a Numeric column', () => {
		const result = parseFilterProperties([{ field: 'price', values: '123' }], {
			price: 'Numeric',
		});
		expect(result).toEqual({ price: [123] });
		expect(typeof result.price[0]).toBe('number');
	});

	it('coerces negative value to number for an Int column', () => {
		const result = parseFilterProperties([{ field: 'count', values: '-5' }], { count: 'Int' });
		expect(result).toEqual({ count: [-5] });
		expect(typeof result.count[0]).toBe('number');
	});

	it('coerces zero to number for an Int column', () => {
		const result = parseFilterProperties([{ field: 'count', values: '0' }], { count: 'Int' });
		expect(result).toEqual({ count: [0] });
		expect(typeof result.count[0]).toBe('number');
	});

	it('coerces to number for a Ref:Users column', () => {
		const result = parseFilterProperties([{ field: 'owner', values: '42' }], {
			owner: 'Ref:Users',
		});
		expect(result).toEqual({ owner: [42] });
		expect(typeof result.owner[0]).toBe('number');
	});

	it('coerces to number for a RefList:Users column', () => {
		const result = parseFilterProperties([{ field: 'members', values: '42' }], {
			members: 'RefList:Users',
		});
		expect(result).toEqual({ members: [42] });
		expect(typeof result.members[0]).toBe('number');
	});

	it('keeps value as string for a DateTime:America/New_York column', () => {
		const result = parseFilterProperties([{ field: 'ts', values: '123' }], {
			ts: 'DateTime:America/New_York',
		});
		expect(result).toEqual({ ts: ['123'] });
		expect(typeof result.ts[0]).toBe('string');
	});

	it('keeps value as string for a Choice column', () => {
		const resultNumeric = parseFilterProperties([{ field: 'color', values: '123' }], {
			color: 'Choice',
		});
		expect(resultNumeric).toEqual({ color: ['123'] });

		const resultAlpha = parseFilterProperties([{ field: 'color', values: 'abc' }], {
			color: 'Choice',
		});
		expect(resultAlpha).toEqual({ color: ['abc'] });
	});

	it('keeps value as string for a Bool column', () => {
		const result = parseFilterProperties([{ field: 'flag', values: '123' }], { flag: 'Bool' });
		expect(result).toEqual({ flag: ['123'] });
		expect(typeof result.flag[0]).toBe('string');
	});

	it('auto-detects (coerces) for an Any column', () => {
		const result = parseFilterProperties([{ field: 'data', values: '123' }], { data: 'Any' });
		expect(result).toEqual({ data: [123] });
		expect(typeof result.data[0]).toBe('number');
	});

	it('auto-detects (coerces) when column type is missing from the map', () => {
		const result = parseFilterProperties([{ field: 'data', values: '123' }], {});
		expect(result).toEqual({ data: [123] });
		expect(typeof result.data[0]).toBe('number');
	});

	it('keeps non-numeric string as string even for a Numeric column', () => {
		const result = parseFilterProperties([{ field: 'price', values: 'abc' }], {
			price: 'Numeric',
		});
		expect(result).toEqual({ price: ['abc'] });
		expect(typeof result.price[0]).toBe('string');
	});

	it('keeps comma-separated number as string for a Numeric column', () => {
		const result = parseFilterProperties([{ field: 'price', values: '123,456' }], {
			price: 'Numeric',
		});
		expect(result).toEqual({ price: ['123,456'] });
		expect(typeof result.price[0]).toBe('string');
	});

	it('keeps value exceeding MAX_SAFE_INTEGER as string for a Text column', () => {
		const result = parseFilterProperties([{ field: 'bigId', values: '99999999999999999999' }], {
			bigId: 'Text',
		});
		expect(result).toEqual({ bigId: ['99999999999999999999'] });
		expect(typeof result.bigId[0]).toBe('string');
	});

	it('evaluates each field against its own column type', () => {
		const result = parseFilterProperties(
			[
				{ field: 'textField', values: '123' },
				{ field: 'numericField', values: '456' },
			],
			{ textField: 'Text', numericField: 'Numeric' },
		);
		expect(result).toEqual({ textField: ['123'], numericField: [456] });
		expect(typeof result.textField[0]).toBe('string');
		expect(typeof result.numericField[0]).toBe('number');
	});

	it('accumulates duplicate field entries into the same array', () => {
		const result = parseFilterProperties(
			[
				{ field: 'name', values: '123' },
				{ field: 'name', values: '456' },
			],
			{ name: 'Text' },
		);
		expect(result).toEqual({ name: ['123', '456'] });
		expect(typeof result.name[0]).toBe('string');
		expect(typeof result.name[1]).toBe('string');
	});
});

describe('buildColumnTypeMap', () => {
	it('maps well-formed column entries', () => {
		const result = buildColumnTypeMap([
			{ id: 'A', fields: { type: 'Text' } },
			{ id: 'B', fields: { type: 'Numeric' } },
		]);
		expect(result).toEqual({ A: 'Text', B: 'Numeric' });
	});

	it('skips entries with missing fields', () => {
		const result = buildColumnTypeMap([{ id: 'A', fields: { type: 'Text' } }, { id: 'B' }]);
		expect(result).toEqual({ A: 'Text' });
		expect('B' in result).toBe(false);
	});

	it('skips entries where fields has no type', () => {
		const result = buildColumnTypeMap([
			{ id: 'A', fields: { type: 'Text' } },
			{ id: 'B', fields: {} },
		]);
		expect(result).toEqual({ A: 'Text' });
		expect('B' in result).toBe(false);
	});

	it('returns an empty object for empty input', () => {
		expect(buildColumnTypeMap([])).toEqual({});
	});
});
