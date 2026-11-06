import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

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

describe('quickBooksApiRequestAllItems', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.resetAllMocks();
		mockExecuteFunctions.getNodeParameter.mockReturnValue('customer');
		mockExecuteFunctions.getCredentials.mockResolvedValue({ environment: 'production' });
	});

	it('keeps filtered matches when a later page is empty', async () => {
		mockExecuteFunctions.helpers.requestOAuth2.mockImplementation(
			async (_credentialType, options) => {
				const query = options.qs?.query;
				if (query === 'SELECT COUNT(*) FROM customer') {
					return { QueryResponse: { totalCount: 3000 } };
				}
				if (typeof query === 'string' && query.endsWith('STARTPOSITION 1')) {
					return {
						QueryResponse: { Customer: [{ Id: '1' }, { Id: '2' }], maxResults: 2 },
					};
				}
				return { QueryResponse: {} };
			},
		);

		const result = await quickBooksApiRequestAllItems.call(
			mockExecuteFunctions,
			'GET',
			'/query',
			{ query: "SELECT * FROM customer WHERE DisplayName = 'match'" },
			{},
			'customer',
		);

		expect(result).toEqual([{ Id: '1' }, { Id: '2' }]);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'quickBooksOAuth2Api',
			expect.objectContaining({
				qs: {
					query:
						"SELECT * FROM customer WHERE DisplayName = 'match' MAXRESULTS 1000 STARTPOSITION 1",
				},
			}),
		);
	});

	it('returns all full pages followed by a partial page', async () => {
		const firstPage = Array.from({ length: 1000 }, (_, index) => ({ Id: `${index + 1}` }));
		const secondPage = [{ Id: '1001' }, { Id: '1002' }];
		mockExecuteFunctions.helpers.requestOAuth2
			.mockResolvedValueOnce({ QueryResponse: { Customer: firstPage } })
			.mockResolvedValueOnce({ QueryResponse: { Customer: secondPage } });

		const result = await quickBooksApiRequestAllItems.call(
			mockExecuteFunctions,
			'GET',
			'/query',
			{ query: 'SELECT * FROM customer' },
			{},
			'customer',
		);

		expect(result).toEqual([...firstPage, ...secondPage]);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenNthCalledWith(
			2,
			'quickBooksOAuth2Api',
			expect.objectContaining({
				qs: { query: 'SELECT * FROM customer MAXRESULTS 1000 STARTPOSITION 1001' },
			}),
		);
	});

	it('keeps a full final page when the following page has no entity array', async () => {
		const firstPage = Array.from({ length: 1000 }, (_, index) => ({ Id: `${index + 1}` }));
		mockExecuteFunctions.helpers.requestOAuth2
			.mockResolvedValueOnce({ QueryResponse: { Customer: firstPage } })
			.mockResolvedValueOnce({ QueryResponse: {} });

		const result = await quickBooksApiRequestAllItems.call(
			mockExecuteFunctions,
			'GET',
			'/query',
			{ query: 'SELECT * FROM customer' },
			{},
			'customer',
		);

		expect(result).toEqual(firstPage);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
	});

	it('returns an empty result when the first page has no matches', async () => {
		mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValueOnce({
			QueryResponse: { Customer: [] },
		});

		await expect(
			quickBooksApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				'/query',
				{ query: 'SELECT * FROM customer' },
				{},
				'customer',
			),
		).resolves.toEqual([]);
	});

	it.each(['CreditMemo', 'Term', 'TaxCode'])('reads the %s response key', async (resource) => {
		const items = [{ Id: '1' }];
		mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValueOnce({
			QueryResponse: { [resource]: items },
		});

		const result = await quickBooksApiRequestAllItems.call(
			mockExecuteFunctions,
			'GET',
			'/query',
			{ query: `SELECT * FROM ${resource}` },
			{},
			resource,
		);

		expect(result).toEqual(items);
	});
});

describe('handleListing', () => {
	it('returns filtered matches through the Return All path', async () => {
		const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getNodeParameter.mockImplementation((name) => {
			if (name === 'resource') return 'customer';
			if (name === 'operation') return 'getAll';
			if (name === 'returnAll') return true;
			if (name === 'filters') return { query: "WHERE DisplayName = 'match'" };
			return undefined;
		});
		mockExecuteFunctions.getCredentials.mockResolvedValue({ environment: 'production' });
		mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValueOnce({
			QueryResponse: { Customer: [{ Id: '1' }, { Id: '2' }] },
		});

		const result = await handleListing.call(mockExecuteFunctions, 0, '/query', 'customer');

		expect(result).toEqual([{ Id: '1' }, { Id: '2' }]);
		expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
			'quickBooksOAuth2Api',
			expect.objectContaining({
				qs: {
					query:
						"SELECT * FROM customer WHERE DisplayName = 'match' MAXRESULTS 1000 STARTPOSITION 1",
				},
			}),
		);
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
