import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { searchAccounts } from '../GenericFunctions';

describe('GenericFunctions - searchAccounts', () => {
	const mockGoogleApiRequest = jest.fn();

	const mockContext = {
		helpers: {
			httpRequestWithAuthentication: mockGoogleApiRequest,
		},
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockGoogleApiRequest.mockClear();
	});

	it('should return accounts with filtering', async () => {
		mockGoogleApiRequest.mockResolvedValue({
			accounts: [{ name: 'accounts/123' }, { name: 'accounts/234' }],
		});

		const filter = '123';
		const result = await searchAccounts.call(mockContext, filter);

		expect(result).toEqual({
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			results: [{ name: 'accounts/123', value: 'accounts/123' }],
			paginationToken: undefined,
		});
	});

	it('should handle empty results', async () => {
		mockGoogleApiRequest.mockResolvedValue({ accounts: [] });

		const result = await searchAccounts.call(mockContext);

		expect(result).toEqual({ results: [], paginationToken: undefined });
	});

	it('should handle pagination', async () => {
		mockGoogleApiRequest.mockResolvedValue({
			accounts: [{ name: 'accounts/123' }],
			nextPageToken: 'nextToken1',
		});
		mockGoogleApiRequest.mockResolvedValue({
			accounts: [{ name: 'accounts/234' }],
			nextPageToken: 'nextToken2',
		});
		mockGoogleApiRequest.mockResolvedValue({
			accounts: [{ name: 'accounts/345' }],
		});

		const result = await searchAccounts.call(mockContext);

		// The request would only return the last result
		// N8N handles the pagination and adds the previous results to the results array
		expect(result).toEqual({
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			results: [{ name: 'accounts/345', value: 'accounts/345' }],
			paginationToken: undefined,
		});
	});
});
