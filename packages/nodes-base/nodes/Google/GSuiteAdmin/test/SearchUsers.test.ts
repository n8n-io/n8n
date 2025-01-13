import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { searchUsers } from '../GenericFunctions';

describe('GenericFunctions - searchUsers', () => {
	const mockGoogleApiRequestAllItems = jest.fn();

	const mockContext = {
		googleApiRequestAllItems: mockGoogleApiRequestAllItems,
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockGoogleApiRequestAllItems.mockClear();
	});

	it('should return a list of users when API responds with users', async () => {
		mockGoogleApiRequestAllItems.mockResolvedValueOnce([
			{
				id: '1',
				name: { fullName: 'John Doe' },
				primaryEmail: 'john.doe@example.com',
			},
			{
				id: '2',
				name: { fullName: 'Jane Smith' },
				primaryEmail: 'jane.smith@example.com',
			},
		]);

		const result = await searchUsers.call(mockContext);

		expect(result).toEqual({
			results: [
				{ name: 'John Doe', value: '1' },
				{ name: 'Jane Smith', value: '2' },
			],
		});
		expect(mockGoogleApiRequestAllItems).toHaveBeenCalledWith(
			'users',
			'GET',
			'/directory/v1/users',
			{},
			{ customer: 'my_customer' },
		);
	});

	it('should return an empty array when API responds with no users', async () => {
		mockGoogleApiRequestAllItems.mockResolvedValue([]);

		const result = await searchUsers.call(mockContext);

		expect(result).toEqual({ results: [] });
	});
});
