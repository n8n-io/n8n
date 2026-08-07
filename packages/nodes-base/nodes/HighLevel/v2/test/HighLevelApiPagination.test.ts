import type { IExecutePaginationFunctions } from 'n8n-workflow';

import { highLevelApiPagination } from '../GenericFunctions';
import type { Mock } from 'vitest';

describe('highLevelApiPagination', () => {
	let mockContext: Partial<IExecutePaginationFunctions>;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: vi.fn(),
			makeRoutingRequest: vi.fn(),
		};
	});

	it('should paginate and return all items when returnAll is true', async () => {
		(mockContext.getNodeParameter as Mock).mockImplementation((parameter) => {
			if (parameter === 'resource') return 'contact';
			if (parameter === 'returnAll') return true;
		});

		(mockContext.makeRoutingRequest as Mock)
			.mockResolvedValueOnce([
				{
					json: {
						contacts: [{ id: '1' }, { id: '2' }],
						meta: { startAfterId: '2', startAfter: 2, total: 4 },
					},
				},
			])
			.mockResolvedValueOnce([
				{
					json: {
						contacts: [{ id: '3' }, { id: '4' }],
						meta: { startAfterId: null, startAfter: null, total: 4 },
					},
				},
			]);

		const requestData = { options: { qs: {} } } as any;

		const result = await highLevelApiPagination.call(
			mockContext as IExecutePaginationFunctions,
			requestData,
		);

		expect(result).toEqual([
			{ json: { id: '1' } },
			{ json: { id: '2' } },
			{ json: { id: '3' } },
			{ json: { id: '4' } },
		]);
	});

	it('should return only the first page of items when returnAll is false', async () => {
		(mockContext.getNodeParameter as Mock).mockImplementation((parameter) => {
			if (parameter === 'resource') return 'contact';
			if (parameter === 'returnAll') return false;
		});

		(mockContext.makeRoutingRequest as Mock).mockResolvedValueOnce([
			{
				json: {
					contacts: [{ id: '1' }, { id: '2' }],
					meta: { startAfterId: '2', startAfter: 2, total: 4 },
				},
			},
		]);

		const requestData = { options: { qs: {} } } as any;

		const result = await highLevelApiPagination.call(
			mockContext as IExecutePaginationFunctions,
			requestData,
		);

		expect(result).toEqual([{ json: { id: '1' } }, { json: { id: '2' } }]);
	});

	it('should handle cases with no items', async () => {
		(mockContext.getNodeParameter as Mock).mockImplementation((parameter) => {
			if (parameter === 'resource') return 'contact';
			if (parameter === 'returnAll') return true;
		});

		(mockContext.makeRoutingRequest as Mock).mockResolvedValueOnce([
			{
				json: {
					contacts: [],
					meta: { startAfterId: null, startAfter: null, total: 0 },
				},
			},
		]);

		const requestData = { options: { qs: {} } } as any;

		const result = await highLevelApiPagination.call(
			mockContext as IExecutePaginationFunctions,
			requestData,
		);

		expect(result).toEqual([]);
	});
});
