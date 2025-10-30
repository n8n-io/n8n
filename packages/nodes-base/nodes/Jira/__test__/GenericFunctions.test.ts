import { type DeepMockProxy, mockDeep } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { handlePagination, jiraSoftwareCloudApiRequestAllItems } from '../GenericFunctions';

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
