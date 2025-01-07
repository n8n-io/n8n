import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getUsers } from '../GenericFunctions';

describe('getUsers', () => {
	const mockHighLevelApiRequest = jest.fn();
	const mockGetCredentials = jest.fn();
	const mockContext = {
		getCredentials: mockGetCredentials,
		helpers: {
			httpRequestWithAuthentication: mockHighLevelApiRequest,
		},
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockHighLevelApiRequest.mockClear();
		mockGetCredentials.mockClear();
	});

	it('should return a list of users', async () => {
		const mockUsers = [
			{ id: '1', name: 'John Doe', email: 'john.doe@example.com' },
			{ id: '2', name: 'Jane Smith', email: 'jane.smith@example.com' },
		];

		mockHighLevelApiRequest.mockResolvedValue({ users: mockUsers });
		mockGetCredentials.mockResolvedValue({ oauthTokenData: { locationId: '123' } });

		const response = await getUsers.call(mockContext);

		expect(response).toEqual([
			{ name: 'John Doe', value: '1' },
			{ name: 'Jane Smith', value: '2' },
		]);
	});

	it('should handle empty users list', async () => {
		mockHighLevelApiRequest.mockResolvedValue({ users: [] });
		mockGetCredentials.mockResolvedValue({ oauthTokenData: { locationId: '123' } });

		const response = await getUsers.call(mockContext);

		expect(response).toEqual([]);
	});
});
