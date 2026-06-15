import { type DeepMockProxy, mockDeep } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import {
	handlePagination,
	jiraSoftwareCloudApiRequestAllItems,
	type JiraSoftwareCloudApiRequest,
} from '../GenericFunctions';

describe('Jira -> GenericFunctions', () => {
	describe('jiraSoftwareCloudApiRequestAllItems', () => {
		let mockExecuteFunctions: DeepMockProxy<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.getNodeParameter.mockReturnValue('server');
			mockExecuteFunctions.getCredentials.mockResolvedValue({ domain: 'jira.domain.com' });
			mockExecuteFunctions.helpers.requestWithAuthentication.mockImplementation(
				async function (_, options) {
					if (!options.qs?.startAt) {
						return {
							issues: [{ id: 1000 }, { id: 1001 }],
							startAt: 0,
							maxResults: 2,
							total: 3,
						};
					}

					return {
						issues: [{ id: 1002 }],
						startAt: 2,
						maxResults: 2,
						total: 3,
					};
				},
			);
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should get all items and not pass the body when the method is GET', async () => {
			const result = await jiraSoftwareCloudApiRequestAllItems.call(
				mockExecuteFunctions,
				'issues',
				'/api/2/search',
				'GET',
			);

			expect(result).toEqual([{ id: 1000 }, { id: 1001 }, { id: 1002 }]);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toBeCalledTimes(2);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareServerApi',
				expect.not.objectContaining({
					body: expect.anything(),
				}),
			);
		});
	});

	describe('jiraSoftwareCloudApiRequest credential routing', () => {
		let mockExecuteFunctions: DeepMockProxy<IExecuteFunctions>;
		let jiraSoftwareCloudApiRequest: JiraSoftwareCloudApiRequest;

		beforeEach(async () => {
			jest.resetModules();
			({ jiraSoftwareCloudApiRequest } = await import('../GenericFunctions'));
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({});
			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Jira' } as ReturnType<
				IExecuteFunctions['getNode']
			>);
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should use jiraSoftwareCloudApi credential for jiraVersion "cloud"', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('cloud');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				domain: 'https://example.atlassian.net',
			});

			await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('jiraSoftwareCloudApi');
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareCloudApi',
				expect.objectContaining({ uri: 'https://example.atlassian.net/rest/api/2/myself' }),
			);
		});

		it('should use jiraSoftwareCloudOAuth2Api credential for jiraVersion "cloudOAuth2" and look up cloudId', async () => {
			const cloudId = 'abc123-cloud-id';
			mockExecuteFunctions.getNodeParameter.mockReturnValue('cloudOAuth2');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				domain: 'https://example.atlassian.net',
			});
			// First call returns accessible-resources, second call returns the actual API response
			mockExecuteFunctions.helpers.requestWithAuthentication
				.mockResolvedValueOnce([{ id: cloudId, url: 'https://example.atlassian.net' }])
				.mockResolvedValueOnce({});

			await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
			);
			// First call must be the accessible-resources lookup
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenNthCalledWith(
				1,
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					uri: 'https://api.atlassian.com/oauth/token/accessible-resources',
				}),
			);
			// Second call must use the api.atlassian.com base URL with cloudId
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenNthCalledWith(
				2,
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					uri: `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/2/myself`,
				}),
			);
		});

		it('should use jiraSoftwareServerApi credential for jiraVersion "server"', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('server');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				domain: 'https://jira.company.com',
			});

			await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('jiraSoftwareServerApi');
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareServerApi',
				expect.objectContaining({ uri: 'https://jira.company.com/rest/api/2/myself' }),
			);
		});

		it('should use jiraSoftwareServerPatApi credential for jiraVersion "serverPat"', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('serverPat');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				domain: 'https://jira.company.com',
			});

			await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('jiraSoftwareServerPatApi');
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareServerPatApi',
				expect.objectContaining({ uri: 'https://jira.company.com/rest/api/2/myself' }),
			);
		});
	});

	describe('handlePagination', () => {
		it('should initialize offset pagination parameters with GET when responseData is not provided', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = handlePagination('GET', body, query, 'offset');

			expect(result).toBe(true);
			expect(query.startAt).toBe(0);
			expect(query.maxResults).toBe(100);
			expect(body).toEqual({});
		});

		it('should initialize offset pagination parameters with POST when responseData is not provided', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = handlePagination('POST', body, query, 'offset');

			expect(result).toBe(true);
			expect(body.startAt).toBe(0);
			expect(body.maxResults).toBe(100);
			expect(query).toEqual({});
		});

		it('should initialize token pagination parameters with GET when responseData is not provided', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = handlePagination('GET', body, query, 'token');

			expect(result).toBe(true);
			expect(query.maxResults).toBe(100);
			expect(body).toEqual({});
		});

		it('should initialize token pagination parameters with POST when responseData is not provided', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = handlePagination('POST', body, query, 'token');

			expect(result).toBe(true);
			expect(query).toEqual({});
			expect(body.maxResults).toBe(100);
		});

		it('should handle offset pagination with GET and more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				startAt: 0,
				maxResults: 100,
				total: 250,
			};

			const result = handlePagination('GET', body, query, 'offset', responseData);

			expect(result).toBe(true);
			expect(query.startAt).toBe(100);
			expect(body).toEqual({});
		});

		it('should handle offset pagination with POST and more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				startAt: 0,
				maxResults: 100,
				total: 250,
			};

			const result = handlePagination('POST', body, query, 'offset', responseData);

			expect(result).toBe(true);
			expect(body.startAt).toBe(100);
			expect(query).toEqual({});
		});

		it('should handle offset pagination with GET and no more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				startAt: 200,
				maxResults: 100,
				total: 250,
			};

			const result = handlePagination('GET', body, query, 'offset', responseData);

			expect(result).toBe(false);
			expect(query.startAt).toBe(300);
			expect(body).toEqual({});
		});

		it('should handle offset pagination with POST and no more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				startAt: 200,
				maxResults: 100,
				total: 250,
			};

			const result = handlePagination('POST', body, query, 'offset', responseData);

			expect(result).toBe(false);
			expect(body.startAt).toBe(300);
			expect(query).toEqual({});
		});

		it('should handle token pagination with GET and more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				nextPageToken: 'someToken123',
			};

			const result = handlePagination('GET', body, query, 'token', responseData);

			expect(result).toBe(true);
			expect(query.nextPageToken).toBe('someToken123');
			expect(body).toEqual({});
		});

		it('should handle token pagination with POST and more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				nextPageToken: 'someToken123',
			};

			const result = handlePagination('POST', body, query, 'token', responseData);

			expect(result).toBe(true);
			expect(body.nextPageToken).toBe('someToken123');
			expect(query).toEqual({});
		});

		it('should handle token pagination with GET and no more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				nextPageToken: '',
			};

			const result = handlePagination('GET', body, query, 'token', responseData);

			expect(result).toBe(false);
			expect(query.nextPageToken).toBe('');
			expect(body).toEqual({});
		});

		it('should handle token pagination with POST and no more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				nextPageToken: '',
			};

			const result = handlePagination('POST', body, query, 'token', responseData);

			expect(result).toBe(false);
			expect(body.nextPageToken).toBe('');
			expect(query).toEqual({});
		});
	});
});
