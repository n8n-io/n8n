import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { googleApiRequestAllItems } from '../GenericFunctions';
import { searchUsers } from '../SearchFunctions';

jest.mock('../GenericFunctions');

describe('GenericFunctions - searchUsers', () => {
	const mockContext = {} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		(googleApiRequestAllItems as jest.Mock).mockClear();
	});

	it('should return a list of users when googleApiRequestAllItems returns users', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([
			{ id: '1', name: { fullName: 'John Doe' } },
			{ id: '2', name: { fullName: 'Jane Smith' } },
		]);

		const result = await searchUsers.call(mockContext);

		expect(result).toEqual({
			results: [
				{ name: 'John Doe', value: '1' },
				{ name: 'Jane Smith', value: '2' },
			],
		});
		expect(googleApiRequestAllItems).toHaveBeenCalledTimes(1);
		expect(googleApiRequestAllItems).toHaveBeenCalledWith(
			'users',
			'GET',
			'/directory/v1/users',
			{},
			{ customer: 'my_customer' },
		);
	});

	it('should return an empty array when googleApiRequestAllItems returns no users', async () => {
		(googleApiRequestAllItems as jest.Mock).mockResolvedValueOnce([]);

		const result = await searchUsers.call(mockContext);

		expect(result).toEqual({ results: [] });
		expect(googleApiRequestAllItems).toHaveBeenCalledTimes(1);
		expect(googleApiRequestAllItems).toHaveBeenCalledWith(
			'users',
			'GET',
			'/directory/v1/users',
			{},
			{ customer: 'my_customer' },
		);
	});
});
