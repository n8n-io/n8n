import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { getUsers, oktaApiRequest } from '../GenericFunctions';

describe('oktaApiRequest', () => {
	const mockGetCredentials = jest.fn();
	const mockHttpRequestWithAuthentication = jest.fn();

	const mockContext = {
		getCredentials: mockGetCredentials,
		helpers: {
			httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
		},
	} as unknown as IExecuteFunctions;

	beforeEach(() => {
		mockGetCredentials.mockClear();
		mockHttpRequestWithAuthentication.mockClear();
	});

	it('should make a GET request and return data', async () => {
		mockGetCredentials.mockResolvedValue({ url: 'https://okta.example.com' });
		mockHttpRequestWithAuthentication.mockResolvedValue([
			{ profile: { firstName: 'John', lastName: 'Doe' }, id: '1' },
		]);

		const response = await oktaApiRequest.call(mockContext, 'GET', 'users');

		expect(mockGetCredentials).toHaveBeenCalledWith('oktaApi');
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('oktaApi', {
			headers: { 'Content-Type': 'application/json' },
			method: 'GET',
			body: undefined,
			qs: undefined,
			url: 'https://okta.example.com/api/v1/users',
			json: true,
		});
		expect(response).toEqual([{ profile: { firstName: 'John', lastName: 'Doe' }, id: '1' }]);
	});

	// Tests for error handling
	it('should handle errors from oktaApiRequest', async () => {
		mockHttpRequestWithAuthentication.mockRejectedValue(new Error('Network error'));

		await expect(oktaApiRequest.call(mockContext, 'GET', 'users')).rejects.toThrow('Network error');
	});
});

describe('getUsers', () => {
	const mockOktaApiRequest = jest.fn();
	const mockContext = {
		getCredentials: jest.fn().mockResolvedValue({ url: 'https://okta.example.com' }),
		helpers: {
			httpRequestWithAuthentication: mockOktaApiRequest,
		},
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockOktaApiRequest.mockClear();
	});

	it('should return users with filtering', async () => {
		mockOktaApiRequest.mockResolvedValue([
			{ profile: { firstName: 'John', lastName: 'Doe' }, id: '1' },
			{ profile: { firstName: 'Jane', lastName: 'Doe' }, id: '2' },
		]);

		const response = await getUsers.call(mockContext, 'john');

		expect(response).toEqual({
			results: [{ name: 'John Doe', value: '1' }],
		});
	});

	it('should return all users when no filter is applied', async () => {
		mockOktaApiRequest.mockResolvedValue([
			{ profile: { firstName: 'John', lastName: 'Doe' }, id: '1' },
			{ profile: { firstName: 'Jane', lastName: 'Doe' }, id: '2' },
		]);

		const response = await getUsers.call(mockContext);

		expect(response).toEqual({
			results: [
				{ name: 'John Doe', value: '1' },
				{ name: 'Jane Doe', value: '2' },
			],
		});
	});

	// Tests for empty results
	it('should handle empty results from oktaApiRequest', async () => {
		mockOktaApiRequest.mockResolvedValue([]);

		const response = await getUsers.call(mockContext);

		expect(response).toEqual({
			results: [],
		});
	});
});
