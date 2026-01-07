import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';

describe('Google Contacts GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	let mockNode: INode;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockNode = {
			id: 'test-node-id',
			name: 'Google Contacts Test',
			type: 'n8n-nodes-base.googleContacts',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		jest.clearAllMocks();
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);

		// Properly mock the requestOAuth2 helper
		(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock) = jest.fn();
		(mockLoadOptionsFunctions.helpers.requestOAuth2 as jest.Mock) = jest.fn();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('googleApiRequest', () => {
		it('should make successful API request with default parameters', async () => {
			const mockResponse = { id: 'person123', names: [{ displayName: 'John Doe' }] };
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(mockResponse);

			const result = await GenericFunctions.googleApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/people/me',
			);

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleContactsOAuth2Api',
				{
					headers: {
						'Content-Type': 'application/json',
					},
					method: 'GET',
					qs: {},
					uri: 'https://people.googleapis.com/v1/people/me',
					json: true,
				},
			);
			expect(result).toEqual(mockResponse);
		});

		it('should make API request with custom URI', async () => {
			const customUri = 'https://custom.api.com/endpoint';
			const mockResponse = { data: 'custom response' };
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(mockResponse);

			const result = await GenericFunctions.googleApiRequest.call(
				mockExecuteFunctions,
				'POST',
				'/custom',
				{ data: 'test' },
				{ param: 'value' },
				customUri,
			);

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleContactsOAuth2Api',
				{
					headers: {
						'Content-Type': 'application/json',
					},
					method: 'POST',
					body: { data: 'test' },
					qs: { param: 'value' },
					uri: customUri,
					json: true,
				},
			);
			expect(result).toEqual(mockResponse);
		});

		it('should include custom headers when provided', async () => {
			const customHeaders = { 'X-Custom-Header': 'custom-value' };
			const mockResponse = { success: true };
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(mockResponse);

			await GenericFunctions.googleApiRequest.call(
				mockExecuteFunctions,
				'PUT',
				'/people/123',
				{ name: 'Updated Name' },
				{},
				undefined,
				customHeaders,
			);

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleContactsOAuth2Api',
				{
					headers: {
						'Content-Type': 'application/json',
						'X-Custom-Header': 'custom-value',
					},
					method: 'PUT',
					body: { name: 'Updated Name' },
					qs: {},
					uri: 'https://people.googleapis.com/v1/people/123',
					json: true,
				},
			);
		});

		it('should remove empty body from request options', async () => {
			const mockResponse = { data: 'response' };
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(mockResponse);

			await GenericFunctions.googleApiRequest.call(mockExecuteFunctions, 'GET', '/people', {});

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleContactsOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					qs: {},
					uri: 'https://people.googleapis.com/v1/people',
					json: true,
					headers: {
						'Content-Type': 'application/json',
					},
				}),
			);

			const callArgs = (mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mock.calls[0][1];
			expect(callArgs).not.toHaveProperty('body');
		});

		it('should work with ILoadOptionsFunctions context', async () => {
			const mockResponse = { connections: [] };
			(mockLoadOptionsFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(mockResponse);

			const result = await GenericFunctions.googleApiRequest.call(
				mockLoadOptionsFunctions,
				'GET',
				'/people/connections',
			);

			expect(mockLoadOptionsFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleContactsOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://people.googleapis.com/v1/people/connections',
				}),
			);
			expect(result).toEqual(mockResponse);
		});

		it('should throw NodeApiError on request failure', async () => {
			const apiError = new Error('API Error');
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockRejectedValue(apiError);

			await expect(
				GenericFunctions.googleApiRequest.call(mockExecuteFunctions, 'GET', '/people/invalid'),
			).rejects.toThrow(NodeApiError);

			expect(mockExecuteFunctions.getNode).toHaveBeenCalled();
		});

		it('should handle authentication errors', async () => {
			const authError = { code: 401, message: 'Unauthorized' };
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockRejectedValue(authError);

			await expect(
				GenericFunctions.googleApiRequest.call(mockExecuteFunctions, 'POST', '/people'),
			).rejects.toThrow(NodeApiError);
		});

		it('should handle network errors', async () => {
			const networkError = { code: 'ECONNREFUSED', message: 'Connection refused' };
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockRejectedValue(networkError);

			await expect(
				GenericFunctions.googleApiRequest.call(mockExecuteFunctions, 'GET', '/people'),
			).rejects.toThrow(NodeApiError);
		});

		it('should preserve query string parameters', async () => {
			const mockResponse = { data: 'filtered results' };
			const queryParams = { personFields: 'names,emailAddresses', pageSize: '50' };
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(mockResponse);

			await GenericFunctions.googleApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/people/connections',
				{},
				queryParams,
			);

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleContactsOAuth2Api',
				expect.objectContaining({
					qs: queryParams,
				}),
			);
		});
	});

	describe('googleApiRequestAllItems', () => {
		it('should fetch all items with pagination', async () => {
			// Mock the requestOAuth2 helper to simulate pagination responses
			let callCount = 0;
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockImplementation(
				async (_, options) => {
					callCount++;
					if (callCount === 1) {
						// First call should not have pageToken
						expect(options.qs.pageToken).toBeUndefined();
						return {
							connections: [
								{ resourceName: 'people/1', names: [{ displayName: 'John' }] },
								{ resourceName: 'people/2', names: [{ displayName: 'Jane' }] },
							],
							nextPageToken: 'token123',
						};
					} else {
						// Second call should have pageToken from first response
						expect(options.qs.pageToken).toBe('token123');
						return {
							connections: [{ resourceName: 'people/3', names: [{ displayName: 'Bob' }] }],
							nextPageToken: '',
						};
					}
				},
			);

			const result = await GenericFunctions.googleApiRequestAllItems.call(
				mockExecuteFunctions,
				'connections',
				'GET',
				'/people/connections',
				{},
				{ personFields: 'names' },
			);

			expect(result).toHaveLength(3);
			expect(result[0].resourceName).toBe('people/1');
			expect(result[1].resourceName).toBe('people/2');
			expect(result[2].resourceName).toBe('people/3');

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
		});

		it('should handle single page response with no pagination', async () => {
			const singlePageResponse = {
				connections: [{ resourceName: 'people/1', names: [{ displayName: 'Only Contact' }] }],
			};

			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(
				singlePageResponse,
			);

			const result = await GenericFunctions.googleApiRequestAllItems.call(
				mockExecuteFunctions,
				'connections',
				'GET',
				'/people/connections',
			);

			expect(result).toHaveLength(1);
			expect(result[0].resourceName).toBe('people/1');
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		});

		it('should handle empty response', async () => {
			const emptyResponse = {
				connections: [],
			};

			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(emptyResponse);

			const result = await GenericFunctions.googleApiRequestAllItems.call(
				mockExecuteFunctions,
				'connections',
				'GET',
				'/people/connections',
			);

			expect(result).toEqual([]);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		});

		it('should work with ILoadOptionsFunctions context', async () => {
			const mockResponse = {
				items: [
					{ id: '1', name: 'Item 1' },
					{ id: '2', name: 'Item 2' },
				],
			};

			(mockLoadOptionsFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(mockResponse);

			const result = await GenericFunctions.googleApiRequestAllItems.call(
				mockLoadOptionsFunctions,
				'items',
				'GET',
				'/custom/endpoint',
				{ filter: 'active' },
				{ sortBy: 'name' },
			);

			expect(result).toHaveLength(2);
			expect(mockLoadOptionsFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleContactsOAuth2Api',
				expect.objectContaining({
					body: { filter: 'active' },
					qs: expect.objectContaining({
						sortBy: 'name',
						pageSize: 100,
					}),
				}),
			);
		});

		it('should handle pagination with undefined nextPageToken', async () => {
			const responseWithUndefinedToken = {
				connections: [{ resourceName: 'people/1', names: [{ displayName: 'Contact' }] }],
				nextPageToken: undefined,
			};

			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockResolvedValue(
				responseWithUndefinedToken,
			);

			const result = await GenericFunctions.googleApiRequestAllItems.call(
				mockExecuteFunctions,
				'connections',
				'GET',
				'/people/connections',
			);

			expect(result).toHaveLength(1);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		});

		it('should handle large datasets with multiple pages', async () => {
			const createResponse = (pageNum: number, hasNext: boolean) => ({
				connections: Array.from({ length: 10 }, (_, i) => ({
					resourceName: `people/${pageNum * 10 + i + 1}`,
					names: [{ displayName: `Contact ${pageNum * 10 + i + 1}` }],
				})),
				nextPageToken: hasNext ? `token${pageNum + 1}` : '',
			});

			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock)
				.mockResolvedValueOnce(createResponse(0, true))
				.mockResolvedValueOnce(createResponse(1, true))
				.mockResolvedValueOnce(createResponse(2, false));

			const result = await GenericFunctions.googleApiRequestAllItems.call(
				mockExecuteFunctions,
				'connections',
				'GET',
				'/people/connections',
			);

			expect(result).toHaveLength(30);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(3);
		});

		it('should propagate errors from underlying API requests', async () => {
			const apiError = new Error('Rate limit exceeded');
			(mockExecuteFunctions.helpers.requestOAuth2 as jest.Mock).mockRejectedValue(apiError);

			await expect(
				GenericFunctions.googleApiRequestAllItems.call(
					mockExecuteFunctions,
					'connections',
					'GET',
					'/people/connections',
				),
			).rejects.toThrow('Rate limit exceeded');
		});
	});

	describe('allFields', () => {
		it('should contain all expected field names', () => {
			const expectedFields = [
				'addresses',
				'biographies',
				'birthdays',
				'coverPhotos',
				'emailAddresses',
				'events',
				'genders',
				'imClients',
				'interests',
				'locales',
				'memberships',
				'metadata',
				'names',
				'nicknames',
				'occupations',
				'organizations',
				'phoneNumbers',
				'photos',
				'relations',
				'residences',
				'sipAddresses',
				'skills',
				'urls',
				'userDefined',
			];

			expect(GenericFunctions.allFields).toEqual(expectedFields);
		});

		it('should be a read-only array', () => {
			expect(Array.isArray(GenericFunctions.allFields)).toBe(true);
			expect(GenericFunctions.allFields).toHaveLength(24);
		});

		it('should contain unique field names', () => {
			const uniqueFields = [...new Set(GenericFunctions.allFields)];
			expect(uniqueFields).toHaveLength(GenericFunctions.allFields.length);
		});
	});

	describe('cleanData', () => {
		it('should clean single contact data correctly', () => {
			const rawData = {
				resourceName: 'people/123',
				metadata: {
					sources: [{ type: 'CONTACT', id: '123' }],
				},
				names: [
					{
						metadata: { primary: true, verified: true },
						displayName: 'John Doe',
						familyName: 'Doe',
						givenName: 'John',
					},
				],
				emailAddresses: [
					{
						metadata: { primary: true },
						value: 'john@example.com',
						type: 'work',
					},
					{
						metadata: { primary: false },
						value: 'john.personal@example.com',
						type: 'home',
					},
				],
				phoneNumbers: [
					{
						metadata: { primary: true },
						value: '+1234567890',
						type: 'mobile',
					},
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result).toHaveLength(1);
			expect(result[0]).not.toHaveProperty('metadata');
			expect(result[0].names).toEqual({
				displayName: 'John Doe',
				familyName: 'Doe',
				givenName: 'John',
			});
			expect(result[0].emailAddresses).toEqual({
				work: ['john@example.com'],
				home: ['john.personal@example.com'],
			});
			expect(result[0].phoneNumbers).toEqual({
				mobile: ['+1234567890'],
			});
		});

		it('should handle array input', () => {
			const rawData = [
				{
					resourceName: 'people/1',
					names: [{ displayName: 'Person 1', metadata: { primary: true } }],
				},
				{
					resourceName: 'people/2',
					names: [{ displayName: 'Person 2', metadata: { primary: true } }],
				},
			];

			const result = GenericFunctions.cleanData(rawData);

			expect(result).toHaveLength(2);
			expect(result[0].names.displayName).toBe('Person 1');
			expect(result[1].names.displayName).toBe('Person 2');
		});

		it('should clean photos field correctly', () => {
			const rawData = {
				resourceName: 'people/123',
				photos: [
					{ url: 'https://example.com/photo1.jpg', metadata: { primary: true } },
					{ url: 'https://example.com/photo2.jpg', metadata: { primary: false } },
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0].photos).toEqual([
				'https://example.com/photo1.jpg',
				'https://example.com/photo2.jpg',
			]);
		});

		it('should clean memberships field correctly', () => {
			const rawData = {
				resourceName: 'people/123',
				memberships: [
					{
						metadata: {
							source: { type: 'CONTACT', id: 'group1' },
						},
						contactGroupMembership: { contactGroupId: 'group1' },
					},
					{
						metadata: {
							source: { type: 'CONTACT', id: 'group2' },
						},
						contactGroupMembership: { contactGroupId: 'group2' },
					},
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0].memberships).toEqual(['group1', 'group2']);
		});

		it('should clean birthdays field correctly', () => {
			const rawData = {
				resourceName: 'people/123',
				birthdays: [
					{
						metadata: { primary: true },
						date: { year: 1990, month: 6, day: 15 },
					},
					{
						metadata: { primary: false },
						date: { year: 1985, month: 12, day: 25 },
					},
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0].birthdays).toBe('6/15/1990');
		});

		it('should clean userDefined, organizations, and biographies fields', () => {
			const rawData = {
				resourceName: 'people/123',
				userDefined: [
					{
						metadata: { primary: true },
						key: 'customField',
						value: 'customValue',
					},
				],
				organizations: [
					{
						metadata: { primary: true },
						name: 'Company Name',
						title: 'Job Title',
					},
				],
				biographies: [
					{
						metadata: { primary: true },
						value: 'This is a biography',
					},
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0].userDefined[0]).not.toHaveProperty('metadata');
			expect(result[0].organizations[0]).not.toHaveProperty('metadata');
			expect(result[0].biographies[0]).not.toHaveProperty('metadata');
			expect(result[0].userDefined[0].key).toBe('customField');
			expect(result[0].organizations[0].name).toBe('Company Name');
			expect(result[0].biographies[0].value).toBe('This is a biography');
		});

		it('should handle relations field correctly', () => {
			const rawData = {
				resourceName: 'people/123',
				relations: [
					{
						metadata: { primary: true },
						person: 'Jane Doe',
						type: 'spouse',
					},
					{
						metadata: { primary: false },
						person: 'John Doe Sr.',
						type: 'father',
					},
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0].relations).toEqual({
				spouse: ['Jane Doe'],
				father: ['John Doe Sr.'],
			});
		});

		it('should handle events field correctly', () => {
			const rawData = {
				resourceName: 'people/123',
				events: [
					{
						metadata: { primary: true },
						date: { year: 2020, month: 6, day: 15 },
						type: 'anniversary',
					},
					{
						metadata: { primary: false },
						date: { year: 2021, month: 12, day: 25 },
						type: 'anniversary',
					},
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0].events).toEqual({
				anniversary: ['6/15/2020', '12/25/2021'],
			});
		});

		it('should handle addresses field correctly', () => {
			const rawData = {
				resourceName: 'people/123',
				addresses: [
					{
						metadata: { primary: true },
						formattedValue: '123 Main St, City, State 12345',
						type: 'home',
						streetAddress: '123 Main St',
						city: 'City',
						region: 'State',
						postalCode: '12345',
					},
					{
						metadata: { primary: false },
						formattedValue: '456 Work Ave, Work City, Work State 67890',
						type: 'work',
						streetAddress: '456 Work Ave',
						city: 'Work City',
						region: 'Work State',
						postalCode: '67890',
					},
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0].addresses.home).toHaveLength(1);
			expect(result[0].addresses.work).toHaveLength(1);
			expect(result[0].addresses.home[0]).not.toHaveProperty('metadata');
			expect(result[0].addresses.home[0].formattedValue).toBe('123 Main St, City, State 12345');
			expect(result[0].addresses.work[0].streetAddress).toBe('456 Work Ave');
		});

		it('should handle empty data gracefully', () => {
			const rawData = {
				resourceName: 'people/123',
				metadata: { sources: [] },
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ resourceName: 'people/123' });
		});

		it('should handle missing fields gracefully', () => {
			const rawData = {
				resourceName: 'people/123',
				someOtherField: 'value',
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0]).toEqual({
				resourceName: 'people/123',
				someOtherField: 'value',
			});
		});

		it('should skip fields that result in empty objects', () => {
			const rawData = {
				resourceName: 'people/123',
				emailAddresses: [], // Empty array should not create emailAddresses field
				phoneNumbers: [
					{
						metadata: { primary: true },
						value: '+1234567890',
						type: 'mobile',
					},
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0]).not.toHaveProperty('emailAddresses');
			expect(result[0]).toHaveProperty('phoneNumbers');
		});

		it('should handle complex nested data structures', () => {
			const rawData = {
				resourceName: 'people/123',
				names: [
					{
						metadata: { primary: true, verified: true, source: { type: 'CONTACT' } },
						displayName: 'John Doe',
						familyName: 'Doe',
						givenName: 'John',
						middleName: 'Michael',
						honorificPrefix: 'Mr.',
						honorificSuffix: 'Jr.',
					},
				],
				emailAddresses: [
					{
						metadata: { primary: true, verified: true },
						value: 'john@example.com',
						type: 'work',
						displayName: 'John Work Email',
					},
				],
				addresses: [
					{
						metadata: { primary: true },
						type: 'home',
						formattedValue: '123 Main St\nAnytown, ST 12345\nUSA',
						streetAddress: '123 Main St',
						city: 'Anytown',
						region: 'ST',
						postalCode: '12345',
						country: 'USA',
						countryCode: 'US',
					},
				],
			};

			const result = GenericFunctions.cleanData(rawData);

			expect(result[0].names).toEqual({
				displayName: 'John Doe',
				familyName: 'Doe',
				givenName: 'John',
				middleName: 'Michael',
				honorificPrefix: 'Mr.',
				honorificSuffix: 'Jr.',
			});
			expect(result[0].emailAddresses.work[0]).toBe('john@example.com');
			expect(result[0].addresses.home[0]).not.toHaveProperty('metadata');
			expect(result[0].addresses.home[0].country).toBe('USA');
		});
	});
});
