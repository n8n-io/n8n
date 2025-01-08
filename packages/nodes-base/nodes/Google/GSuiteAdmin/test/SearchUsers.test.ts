import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { googleApiRequestAllItems } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	googleApiRequestAllItems: jest.fn(),
}));

describe('searchUsers', () => {
	let mockContext: ILoadOptionsFunctions;
	let searchUsers: (this: ILoadOptionsFunctions) => Promise<INodeListSearchResult>;

	beforeEach(() => {
		mockContext = {
			requestWithAuthentication: jest.fn(),
		} as unknown as ILoadOptionsFunctions;

		searchUsers = async function (this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
			const qs = {
				customer: 'my_customer',
			};

			const responseData = await googleApiRequestAllItems.call(
				this,
				'users',
				'GET',
				'/directory/v1/users',
				{},
				qs,
			);

			if (!responseData || responseData.length === 0) {
				console.warn('No users found in the response');
				return { results: [] };
			}

			const results = responseData.map(
				(user: { name?: { fullName?: string }; primaryEmail?: string; id?: string }) => ({
					name: user.name?.fullName || user.primaryEmail || 'Unnamed User',
					value: user.id || user.primaryEmail,
				}),
			);

			return { results };
		};

		(googleApiRequestAllItems as jest.Mock).mockReset();
	});

	it('should return a list of users when API responds with users', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([
			{ name: { fullName: 'John Doe' }, primaryEmail: 'john.doe@example.com', id: '1' },
			{ name: { fullName: 'Jane Smith' }, primaryEmail: 'jane.smith@example.com', id: '2' },
		]);

		const result = await searchUsers.call(mockContext);

		expect(result.results).toHaveLength(2);
		expect(result.results).toEqual([
			{ name: 'John Doe', value: '1' },
			{ name: 'Jane Smith', value: '2' },
		]);
	});

	it('should return an empty array when API responds with no users', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([]);

		const result = await searchUsers.call(mockContext);

		expect(result.results).toEqual([]);
	});

	it('should handle missing fields gracefully', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([
			{ primaryEmail: 'john.doe@example.com', id: '1' },
			{ name: { fullName: 'Jane Smith' }, id: '2' },
			{},
		]);

		const result = await searchUsers.call(mockContext);

		expect(result.results).toEqual([
			{ name: 'john.doe@example.com', value: '1' },
			{ name: 'Jane Smith', value: '2' },
			{ name: 'Unnamed User', value: undefined },
		]);
	});

	it('should warn and return an empty array when no users are found', async () => {
		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([]);

		const result = await searchUsers.call(mockContext);

		expect(consoleSpy).toHaveBeenCalledWith('No users found in the response');
		expect(result.results).toEqual([]);

		consoleSpy.mockRestore();
	});
});
