import type { IDataObject, IExecuteFunctions, IRequestOptions } from 'n8n-workflow';

import { pagerDutyApiRequestAllItems } from '../GenericFunctions';

describe('PagerDuty -> pagerDutyApiRequestAllItems', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	const mockRequest = vi.fn();
	/** `pagerDutyApiRequest` reuses the same `qs` object across calls, so snapshot it. */
	let sentQueryStrings: IDataObject[] = [];

	const TOTAL_RECORDS = 250;
	/** Guards against a non-advancing implementation spinning forever. */
	const MAX_REQUESTS = 1000;

	const setupMockFunctions = () => {
		sentQueryStrings = [];
		mockExecuteFunctions = {
			getNodeParameter: vi.fn().mockReturnValue('apiToken'),
			getCredentials: vi.fn().mockResolvedValue({ apiToken: 'test-token' }),
			helpers: {
				request: mockRequest,
			},
			getNode: vi.fn().mockReturnValue({}),
		} as unknown as IExecuteFunctions;
		vi.clearAllMocks();
		mockRequest.mockImplementation(async (options: IRequestOptions) => {
			const qs = { ...options.qs } as { limit: number; offset: number };
			sentQueryStrings.push(qs);
			if (sentQueryStrings.length > MAX_REQUESTS) {
				throw new Error(`Pagination did not terminate within ${MAX_REQUESTS} requests`);
			}
			return await Promise.resolve(buildPage(qs.offset, qs.limit));
		});
	};

	/**
	 * Serves records from `offset` onwards, mirroring PagerDuty's classic
	 * `limit`/`offset`/`more` scheme where `offset` is a record index.
	 */
	const buildPage = (offset: number, limit: number) => ({
		incidents: Array.from(
			{ length: Math.max(0, Math.min(limit, TOTAL_RECORDS - offset)) },
			(_, index) => ({ id: `incident-${offset + index}` }),
		),
		more: offset + limit < TOTAL_RECORDS,
	});

	beforeEach(() => {
		setupMockFunctions();
	});

	it('should advance the offset by the page size, not by one', async () => {
		await pagerDutyApiRequestAllItems.call(
			mockExecuteFunctions,
			'incidents',
			'GET',
			'/incidents',
			{},
			{},
		);

		expect(sentQueryStrings).toEqual([
			expect.objectContaining({ limit: 100, offset: 0 }),
			expect.objectContaining({ limit: 100, offset: 100 }),
			expect.objectContaining({ limit: 100, offset: 200 }),
		]);
	});

	it('should return every record exactly once', async () => {
		const result = await pagerDutyApiRequestAllItems.call(
			mockExecuteFunctions,
			'incidents',
			'GET',
			'/incidents',
			{},
			{},
		);

		expect(result).toHaveLength(250);
		expect(new Set(result.map((item: IDataObject) => item.id)).size).toBe(250);
		expect(result[0]).toEqual({ id: 'incident-0' });
		expect(result[249]).toEqual({ id: 'incident-249' });
	});

	it('should stop requesting once the API reports no more records', async () => {
		await pagerDutyApiRequestAllItems.call(
			mockExecuteFunctions,
			'incidents',
			'GET',
			'/incidents',
			{},
			{},
		);

		expect(mockRequest).toHaveBeenCalledTimes(3);
	});
});
