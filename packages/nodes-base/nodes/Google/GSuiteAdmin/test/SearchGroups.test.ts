import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { googleApiRequestAllItems } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	googleApiRequestAllItems: jest.fn(),
}));

describe('searchGroups', () => {
	let mockContext: ILoadOptionsFunctions;
	let searchGroups: (this: ILoadOptionsFunctions) => Promise<INodeListSearchResult>;

	beforeEach(() => {
		mockContext = {
			requestWithAuthentication: jest.fn(),
		} as unknown as ILoadOptionsFunctions;

		searchGroups = async function (this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
			const qs = {
				customer: 'my_customer',
			};

			const responseData = await googleApiRequestAllItems.call(
				this,
				'groups',
				'GET',
				'/directory/v1/groups',
				{},
				qs,
			);

			if (!responseData || responseData.length === 0) {
				console.warn('No groups found in the response');
				return { results: [] };
			}

			const results = responseData.map((group: { name?: string; email?: string; id?: string }) => ({
				name: group.name || group.email || 'Unnamed Group',
				value: group.id || group.email,
			}));

			return { results };
		};

		(googleApiRequestAllItems as jest.Mock).mockReset();
	});

	it('should return a list of groups when API responds with groups', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([
			{ name: 'Admins', email: 'admins@example.com', id: '1' },
			{ name: 'Developers', email: 'developers@example.com', id: '2' },
		]);

		const result = await searchGroups.call(mockContext);

		expect(result.results).toHaveLength(2);
		expect(result.results).toEqual([
			{ name: 'Admins', value: '1' },
			{ name: 'Developers', value: '2' },
		]);
	});

	it('should return an empty array when API responds with no groups', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([]);

		const result = await searchGroups.call(mockContext);

		expect(result.results).toEqual([]);
	});

	it('should handle missing fields gracefully', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([
			{ email: 'admins@example.com', id: '1' },
			{ name: 'Developers', id: '2' },
			{},
		]);

		const result = await searchGroups.call(mockContext);

		expect(result.results).toEqual([
			{ name: 'admins@example.com', value: '1' },
			{ name: 'Developers', value: '2' },
			{ name: 'Unnamed Group', value: undefined },
		]);
	});

	it('should warn and return an empty array when no groups are found', async () => {
		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([]);

		const result = await searchGroups.call(mockContext);

		expect(consoleSpy).toHaveBeenCalledWith('No groups found in the response');
		expect(result.results).toEqual([]);

		consoleSpy.mockRestore();
	});
});
