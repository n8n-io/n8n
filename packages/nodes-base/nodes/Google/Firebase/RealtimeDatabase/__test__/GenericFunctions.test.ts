import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { googleApiRequest } from '../GenericFunctions';

describe('GoogleFirebaseRealtimeDatabase > GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	let mockNode: INode;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'Test RealtimeDatabase Node',
			type: 'n8n-nodes-base.googleFirebaseRealtimeDatabase',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);

		jest.clearAllMocks();
	});

	describe('googleApiRequest', () => {
		const mockRequestOAuth2 = jest.fn();

		beforeEach(() => {
			mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;
			mockLoadOptionsFunctions.helpers.requestOAuth2 = mockRequestOAuth2;
		});

		describe('successful requests', () => {
			beforeEach(() => {
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					region: 'firebaseio.com',
				});
				mockLoadOptionsFunctions.getCredentials.mockResolvedValue({
					region: 'firebaseio.com',
				});
			});

			it('should make successful API request with default options', async () => {
				const mockResponse = { data: { test: 'value' } };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				const result = await googleApiRequest.call(
					mockExecuteFunctions,
					'test-project',
					'GET',
					'/users',
				);

				expect(result).toEqual(mockResponse);
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'googleFirebaseRealtimeDatabaseOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://test-project.firebaseio.com//users.json',
						headers: {
							'Content-Type': 'application/json',
						},
						qs: {},
						json: true,
					}),
				);
			});

			it('should include body for POST requests', async () => {
				const mockResponse = { success: true };
				const requestBody = { name: 'John Doe', email: 'john@example.com' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await googleApiRequest.call(
					mockExecuteFunctions,
					'test-project',
					'POST',
					'/users',
					requestBody,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'googleFirebaseRealtimeDatabaseOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						body: requestBody,
					}),
				);
			});

			it('should remove empty body for GET requests', async () => {
				const mockResponse = { data: [] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await googleApiRequest.call(mockExecuteFunctions, 'test-project', 'GET', '/users', {});

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'googleFirebaseRealtimeDatabaseOAuth2Api',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					expect.not.objectContaining({ body: expect.anything() }),
				);
			});

			it('should include query parameters', async () => {
				const mockResponse = { data: [] };
				const queryParams = { orderBy: '"$key"', limitToFirst: 10 };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await googleApiRequest.call(
					mockExecuteFunctions,
					'test-project',
					'GET',
					'/users',
					{},
					queryParams,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'googleFirebaseRealtimeDatabaseOAuth2Api',
					expect.objectContaining({
						qs: queryParams,
					}),
				);
			});

			it('should include custom headers', async () => {
				const mockResponse = { data: [] };
				const customHeaders = { 'X-Custom-Header': 'custom-value' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await googleApiRequest.call(
					mockExecuteFunctions,
					'test-project',
					'GET',
					'/users',
					{},
					{},
					customHeaders,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'googleFirebaseRealtimeDatabaseOAuth2Api',
					expect.objectContaining({
						headers: {
							'Content-Type': 'application/json',
							'X-Custom-Header': 'custom-value',
						},
					}),
				);
			});

			it('should use custom URI when provided', async () => {
				const mockResponse = { data: [] };
				const customUri = 'https://custom-project.firebaseio.com/custom/path.json';
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await googleApiRequest.call(
					mockExecuteFunctions,
					'test-project',
					'GET',
					'/users',
					{},
					{},
					{},
					customUri,
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'googleFirebaseRealtimeDatabaseOAuth2Api',
					expect.objectContaining({
						url: customUri,
					}),
				);
			});

			it('should use different regions correctly', async () => {
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					region: 'europe-west1-firebase.cloudfunctions.net',
				});
				const mockResponse = { data: [] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await googleApiRequest.call(mockExecuteFunctions, 'test-project', 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'googleFirebaseRealtimeDatabaseOAuth2Api',
					expect.objectContaining({
						url: 'https://test-project.europe-west1-firebase.cloudfunctions.net//users.json',
					}),
				);
			});
		});

		describe('error handling', () => {
			beforeEach(() => {
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					region: 'firebaseio.com',
				});
			});

			it('should throw NodeApiError on API failure', async () => {
				const apiError = new Error('API request failed');
				mockRequestOAuth2.mockRejectedValue(apiError);

				await expect(
					googleApiRequest.call(mockExecuteFunctions, 'test-project', 'GET', '/users'),
				).rejects.toThrow(NodeApiError);

				expect(mockExecuteFunctions.getNode).toHaveBeenCalled();
			});

			it('should handle credential errors', async () => {
				const credentialError = new Error('Invalid credentials');
				mockExecuteFunctions.getCredentials.mockRejectedValue(credentialError);

				await expect(
					googleApiRequest.call(mockExecuteFunctions, 'test-project', 'GET', '/users'),
				).rejects.toThrow('Invalid credentials');
			});

			it('should handle missing region in credentials', async () => {
				mockExecuteFunctions.getCredentials.mockResolvedValue({});
				const mockResponse = { data: [] };
				mockRequestOAuth2.mockResolvedValue(mockResponse);

				await googleApiRequest.call(mockExecuteFunctions, 'test-project', 'GET', '/users');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'googleFirebaseRealtimeDatabaseOAuth2Api',
					expect.objectContaining({
						url: 'https://test-project.undefined//users.json',
					}),
				);
			});
		});
	});
});
