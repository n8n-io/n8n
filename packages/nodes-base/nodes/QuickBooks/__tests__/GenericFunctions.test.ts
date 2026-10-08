import { mockDeep } from 'vitest-mock-extended';
import { NodeApiError } from 'n8n-workflow';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import {
	handleListing,
	processLines,
	quickBooksApiRequest,
	quickBooksApiRequestAllItems,
} from '../GenericFunctions';

describe('quickBooksApiRequest', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.resetAllMocks();
		mockExecuteFunctions.getNodeParameter.mockReturnValue('invoice');
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			environment: 'production',
		});
	});

	it('should initialize headers for send operation', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('invoice')
			.mockReturnValueOnce('send');

		await quickBooksApiRequest.call(mockExecuteFunctions, 'POST', '/test', {}, {});

		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'quickBooksOAuth2Api',
			expect.objectContaining({
				headers: expect.objectContaining({
					'Content-Type': 'application/octet-stream',
				}),
			}),
		);
	});

	it('should initialize headers for void operation', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('invoice')
			.mockReturnValueOnce('void');

		await quickBooksApiRequest.call(mockExecuteFunctions, 'POST', '/test', {}, {});

		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'quickBooksOAuth2Api',
			expect.objectContaining({
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
				}),
			}),
		);
	});

	it('should initialize headers for delete operation', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('payment')
			.mockReturnValueOnce('delete');

		await quickBooksApiRequest.call(mockExecuteFunctions, 'POST', '/test', {}, {});

		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'quickBooksOAuth2Api',
			expect.objectContaining({
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
				}),
			}),
		);
	});

	it('should initialize headers for download operation', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('invoice')
			.mockReturnValueOnce('get')
			.mockReturnValueOnce(true);

		await quickBooksApiRequest.call(mockExecuteFunctions, 'GET', '/test', {}, {});

		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'quickBooksOAuth2Api',
			expect.objectContaining({
				headers: expect.objectContaining({
					Accept: 'application/pdf',
				}),
			}),
		);
	});
});

describe('QuickBooks listings', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	const endpoint = '/v3/company/123/query';
	const filter = 'WHERE Active = true ORDERBY Id';
	const query = `SELECT * FROM customer ${filter}`;
	let parameters: IDataObject;

	beforeEach(() => {
		vi.resetAllMocks();
		parameters = {
			resource: 'customer',
			operation: 'getAll',
			returnAll: true,
			filters: { query: filter },
			limit: 2,
		};
		mockExecuteFunctions.getNodeParameter.mockImplementation((name) => parameters[name]);
		mockExecuteFunctions.getCredentials.mockResolvedValue({ environment: 'production' });
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'quickbooks',
			name: 'QuickBooks',
			type: 'n8n-nodes-base.quickbooks',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
	});

	function mockQueryResponses(responses: Record<string, IDataObject>) {
		mockExecuteFunctions.helpers.requestOAuth2.mockImplementation(async (_, options) => {
			const requestQuery = options.qs?.query as string;
			if (requestQuery.startsWith('SELECT COUNT(*)')) {
				return { QueryResponse: { totalCount: 3000 } };
			}
			return { QueryResponse: responses[requestQuery] ?? {} };
		});
	}

	it('should return filtered matches without querying an unfiltered count', async () => {
		const customers = [{ Id: '1' }, { Id: '2' }];
		mockQueryResponses({
			[`${query} MAXRESULTS 1000 STARTPOSITION 1`]: { Customer: customers },
		});

		const result = await handleListing.call(mockExecuteFunctions, 0, endpoint, 'customer');

		expect(result).toEqual(customers);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'quickBooksOAuth2Api',
			expect.objectContaining({
				qs: { query: `${query} MAXRESULTS 1000 STARTPOSITION 1` },
			}),
		);
	});

	it('should preserve the filter and sort order on each page', async () => {
		const firstPage = Array.from({ length: 1000 }, (_, i) => ({ Id: String(i + 1) }));
		const secondPage = [{ Id: '1001' }, { Id: '1002' }];
		mockQueryResponses({
			[`${query} MAXRESULTS 1000 STARTPOSITION 1`]: { Customer: firstPage },
			[`${query} MAXRESULTS 1000 STARTPOSITION 1001`]: { Customer: secondPage },
		});

		const result = await handleListing.call(mockExecuteFunctions, 0, endpoint, 'customer');

		expect(result).toEqual([...firstPage, ...secondPage]);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
	});

	it('should retain a full page when the next page has no matches', async () => {
		const customers = Array.from({ length: 1000 }, (_, i) => ({ Id: String(i + 1) }));
		mockQueryResponses({
			[`${query} MAXRESULTS 1000 STARTPOSITION 1`]: { Customer: customers },
		});

		const result = await handleListing.call(mockExecuteFunctions, 0, endpoint, 'customer');

		expect(result).toEqual(customers);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
	});

	it.each([{}, { Customer: [] }])('should return an empty listing for %j', async (response) => {
		mockQueryResponses({ [`${query} MAXRESULTS 1000 STARTPOSITION 1`]: response });

		const result = await handleListing.call(mockExecuteFunctions, 0, endpoint, 'customer');

		expect(result).toEqual([]);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
	});

	it.each(['CreditMemo', 'Term', 'TaxCode'])(
		'should preserve the %s response key',
		async (resource) => {
			const resourceQuery = `SELECT * FROM ${resource}`;
			const items = [{ Id: '1' }];
			mockQueryResponses({
				[`${resourceQuery} MAXRESULTS 1000 STARTPOSITION 1`]: { [resource]: items },
			});

			const result = await quickBooksApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				endpoint,
				{ query: resourceQuery },
				{},
				resource,
			);

			expect(result).toEqual(items);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		},
	);

	it('should propagate API errors from later pages', async () => {
		const customers = Array.from({ length: 1000 }, (_, i) => ({ Id: String(i + 1) }));
		mockExecuteFunctions.helpers.requestOAuth2.mockImplementation(async (_, options) => {
			const requestQuery = options.qs?.query as string;
			if (requestQuery.startsWith('SELECT COUNT(*)')) {
				return { QueryResponse: { totalCount: 3000 } };
			}
			if (requestQuery === `${query} MAXRESULTS 1000 STARTPOSITION 1`) {
				return { QueryResponse: { Customer: customers } };
			}
			throw new Error('QuickBooks request failed');
		});

		await expect(
			handleListing.call(mockExecuteFunctions, 0, endpoint, 'customer'),
		).rejects.toBeInstanceOf(NodeApiError);
	});

	it('should preserve limited listings', async () => {
		parameters.returnAll = false;
		const customers = [{ Id: '1' }, { Id: '2' }];
		mockQueryResponses({ [`${query} MAXRESULTS 2`]: { Customer: customers } });

		const result = await handleListing.call(mockExecuteFunctions, 0, endpoint, 'customer');

		expect(result).toEqual(customers);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
	});
});

describe('processLines', () => {
	const mockExecuteFunctions: Partial<IExecuteFunctions> = {
		getNodeParameter: vi.fn(),
	};

	test('should process AccountBasedExpenseLineDetail for bill resource', () => {
		const lines = [{ DetailType: 'AccountBasedExpenseLineDetail', accountId: '123' }];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'bill');

		expect(result).toEqual([
			{
				DetailType: 'AccountBasedExpenseLineDetail',
				AccountBasedExpenseLineDetail: { AccountRef: { value: '123' } },
			},
		]);
	});

	test('should process ItemBasedExpenseLineDetail for bill resource', () => {
		const lines = [{ DetailType: 'ItemBasedExpenseLineDetail', itemId: '456' }];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'bill');

		expect(result).toEqual([
			{
				DetailType: 'ItemBasedExpenseLineDetail',
				ItemBasedExpenseLineDetail: { ItemRef: { value: '456' } },
			},
		]);
	});

	test('should process SalesItemLineDetail for estimate resource', () => {
		const lines = [{ DetailType: 'SalesItemLineDetail', itemId: '789', TaxCodeRef: 'TAX1' }];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'estimate');

		expect(result).toEqual([
			{
				DetailType: 'SalesItemLineDetail',
				SalesItemLineDetail: { ItemRef: { value: '789' }, TaxCodeRef: { value: 'TAX1' } },
			},
		]);
	});

	test('should process SalesItemLineDetail for invoice resource with Qty', () => {
		const lines = [
			{ DetailType: 'SalesItemLineDetail', itemId: '101', TaxCodeRef: 'TAX2', Qty: 10 },
		];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'invoice');

		expect(result).toEqual([
			{
				DetailType: 'SalesItemLineDetail',
				SalesItemLineDetail: { ItemRef: { value: '101' }, TaxCodeRef: { value: 'TAX2' }, Qty: 10 },
			},
		]);
	});

	test('should process SalesItemLineDetail for invoice resource without Qty', () => {
		const lines = [{ DetailType: 'SalesItemLineDetail', itemId: '202', TaxCodeRef: 'TAX3' }];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'invoice');

		expect(result).toEqual([
			{
				DetailType: 'SalesItemLineDetail',
				SalesItemLineDetail: { ItemRef: { value: '202' }, TaxCodeRef: { value: 'TAX3' } },
			},
		]);
	});
});
