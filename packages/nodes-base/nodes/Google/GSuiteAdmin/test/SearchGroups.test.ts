import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { googleApiRequestAllItems } from '../GenericFunctions';
import { searchGroups } from '../SearchFunctions';

jest.mock('../GenericFunctions');

describe('GenericFunctions - searchGroups', () => {
	const mockContext = {} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		(googleApiRequestAllItems as jest.Mock).mockClear();
	});

	it('should return a list of groups when googleApiRequestAllItems returns groups', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([
			{
				kind: 'admin#directory#group',
				id: '01302m922pmp3e4',
				email: 'new3@digital-boss.de',
				name: 'New2',
				description: 'new1',
			},
			{
				kind: 'admin#directory#group',
				id: '01x0gk373c9z46j',
				email: 'newoness@digital-boss.de',
				name: 'NewOness',
				description: 'test',
			},
		]);

		const result = await searchGroups.call(mockContext);

		expect(result).toEqual({
			results: [
				{ name: 'New2', value: '01302m922pmp3e4' },
				{ name: 'NewOness', value: '01x0gk373c9z46j' },
			],
		});
		expect(googleApiRequestAllItems).toHaveBeenCalledTimes(1);
		expect(googleApiRequestAllItems).toHaveBeenCalledWith(
			'groups',
			'GET',
			'/directory/v1/groups',
			{},
			{ customer: 'my_customer' },
		);
	});

	it('should return an empty array when googleApiRequestAllItems returns no groups', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([]);

		const result = await searchGroups.call(mockContext);

		expect(result).toEqual({ results: [] });
		expect(googleApiRequestAllItems).toHaveBeenCalledTimes(1);
		expect(googleApiRequestAllItems).toHaveBeenCalledWith(
			'groups',
			'GET',
			'/directory/v1/groups',
			{},
			{ customer: 'my_customer' },
		);
	});
});
