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
			accounts: [
				{ name: 'accounts/123', accountName: 'Test Account 1' },
				{ name: 'accounts/234', accountName: 'Test Account 2' },
			],
		});

		const filter = '123';
		const result = await searchAccounts.call(mockContext, filter);

		expect(result).toEqual({
			results: [{ name: 'Test Account 1', value: 'accounts/123' }],
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
			accounts: [{ name: 'accounts/123', accountName: 'Test Account 1' }],
			nextPageToken: 'nextToken1',
		});
		mockGoogleApiRequest.mockResolvedValue({
			accounts: [{ name: 'accounts/234', accountName: 'Test Account 2' }],
			nextPageToken: 'nextToken2',
		});
		mockGoogleApiRequest.mockResolvedValue({
			accounts: [{ name: 'accounts/345', accountName: 'Test Account 3' }],
		});

		const result = await searchAccounts.call(mockContext);

		// The request would only return the last result
		// N8N handles the pagination and adds the previous results to the results array
		expect(result).toEqual({
			results: [{ name: 'Test Account 3', value: 'accounts/345' }],
			paginationToken: undefined,
		});
	});
});
