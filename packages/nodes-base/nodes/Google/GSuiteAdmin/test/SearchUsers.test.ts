import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { searchUsers } from '../GenericFunctions';

describe('GenericFunctions - searchUsers', () => {
	const mockGoogleApiRequestAllItems = jest.fn();

	const mockContext = {
		helpers: {
			requestOAuth2: mockGoogleApiRequestAllItems,
		},
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockGoogleApiRequestAllItems.mockClear();
	});

	//TODO - this test need to be fixed
	it('should return a list of users when API responds with users', async () => {
		mockGoogleApiRequestAllItems.mockResolvedValue([
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
	});

	it('should return an empty array when API responds with no users', async () => {
		mockGoogleApiRequestAllItems.mockResolvedValue([]);

		const result = await searchUsers.call(mockContext);

		expect(result).toEqual({ results: [] });
	});

	it('should handle missing fields gracefully', async () => {
		mockGoogleApiRequestAllItems.mockResolvedValue([
			{ primaryEmail: 'john.doe@example.com', id: '1' },
			{ name: { fullName: 'Jane Smith' }, id: '2' },
			{},
		]);

		const result = await searchUsers.call(mockContext);

		expect(result).toEqual({
			results: [
				{ name: 'john.doe@example.com', value: '1' },
				{ name: 'Jane Smith', value: '2' },
				{ name: 'Unnamed User', value: undefined },
			],
		});
	});

	it('should warn and return an empty array when no users are found', async () => {
		mockGoogleApiRequestAllItems.mockResolvedValue([]);

		const result = await searchUsers.call(mockContext);

		expect(result).toEqual({ results: [] });
	});
});
