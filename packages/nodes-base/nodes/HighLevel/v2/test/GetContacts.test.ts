import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getContacts } from '../GenericFunctions';

describe('getContacts', () => {
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

	it('should return a list of contacts', async () => {
		const mockContacts = [
			{ id: '1', name: 'Alice', email: 'alice@example.com' },
			{ id: '2', name: 'Bob', email: 'bob@example.com' },
		];

		mockHighLevelApiRequest.mockResolvedValue({ contacts: mockContacts });
		mockGetCredentials.mockResolvedValue({ oauthTokenData: { locationId: '123' } });

		const response = await getContacts.call(mockContext);

		expect(response).toEqual([
			{ name: 'alice@example.com', value: '1' },
			{ name: 'bob@example.com', value: '2' },
		]);
	});

	it('should handle empty contacts list', async () => {
		mockHighLevelApiRequest.mockResolvedValue({ contacts: [] });
		mockGetCredentials.mockResolvedValue({ oauthTokenData: { locationId: '123' } });

		const response = await getContacts.call(mockContext);

		expect(response).toEqual([]);
	});
});
