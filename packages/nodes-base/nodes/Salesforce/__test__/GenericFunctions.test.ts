import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, INodePropertyOptions, IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	getValue,
	getConditions,
	sortOptions,
	getDefaultFields,
	getQuery,
	filterAndManageProcessedItems,
	salesforceApiRequest,
} from '../GenericFunctions';

// Mock external dependencies
jest.mock('jsonwebtoken');
jest.mock('moment-timezone', () => {
	const mockMoment = (value?: any) => ({
		unix: jest.fn(() => 1640995200), // Mock timestamp: 2022-01-01T00:00:00Z
		isValid: jest.fn(() => {
			// Mock moment validation logic to match real moment behavior
			// Real moment considers many values "valid" even if they're not proper dates
			if (typeof value === 'string') {
				// ISO date formats
				if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
					return true;
				}
				// Only consider obviously non-date strings as invalid
				// Real moment would consider numeric strings like '123' as valid (with deprecation warning)
				if (/^[a-zA-Z\s]+$/.test(value)) {
					return false; // Pure text strings like 'foo bar baz' are invalid
				}
				// Everything else (including numeric strings) is considered "valid" by moment
				return true;
			}
			return false;
		}),
	});

	return {
		__esModule: true,
		default: mockMoment,
	};
});

import * as jwt from 'jsonwebtoken';

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Salesforce -> GenericFunctions', () => {
	describe('getValue', () => {
		it('should return date string as is', () => {
			const value = '2025-01-01T00:00:00Z';

			const result = getValue(value) as string;

			expect(result).toBe(value);
		});

		it('should return string in single quotes', () => {
			const value = 'foo bar baz';

			const result = getValue(value) as string;

			expect(result).toBe("'foo bar baz'");
		});

		it('should return number as is', () => {
			const value = 123;

			const result = getValue(value) as number;

			expect(result).toBe(value);
		});

		it('should return boolean as is', () => {
			const value = false;

			const result = getValue(value) as boolean;

			expect(result).toBe(value);
		});
	});

	describe('sortOptions', () => {
		it('should sort options alphabetically by name', () => {
			const unsorted: INodePropertyOptions[] = [
				{
					name: 'B Property',
					value: 'foo',
				},
				{
					name: 'C Property',
					value: 'bar',
				},
				{
					name: 'A Property',
					value: 'baz',
				},
			];
			const sorted: INodePropertyOptions[] = [
				{
					name: 'A Property',
					value: 'baz',
				},
				{
					name: 'B Property',
					value: 'foo',
				},
				{
					name: 'C Property',
					value: 'bar',
				},
			];

			sortOptions(unsorted);

			expect(unsorted).toEqual(sorted);
		});
	});

	describe('getConditions', () => {
		it('should handle equals operation', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: [{ field: 'field_1', operation: 'equal', value: '123' }],
				},
			};

			const result = getConditions(options);

			expect(result).toBe('WHERE field_1 = 123');
		});

		it('should handle other operations', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: [
						{ field: 'field_1', operation: '>', value: '123' },
						{ field: 'field_2', operation: '<', value: '456' },
						{ field: 'field_3', operation: '>=', value: '789' },
						{ field: 'field_4', operation: '<=', value: '0' },
					],
				},
			};

			const result = getConditions(options);

			expect(result).toBe(
				'WHERE field_1 > 123 AND field_2 < 456 AND field_3 >= 789 AND field_4 <= 0',
			);
		});

		it('should return undefined when conditions is not an array', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: 'not an array',
				},
			};

			const result = getConditions(options);

			expect(result).toBeUndefined();
		});

		it('should return undefined when conditions is an empty array', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: [],
				},
			};

			const result = getConditions(options);

			expect(result).toBeUndefined();
		});
	});

	describe('getDefaultFields', () => {
		it('should return default fields', () => {
			expect(getDefaultFields('Account')).toBe('id,name,type');
			expect(getDefaultFields('Lead')).toBe(
				'id,company,firstname,lastname,street,postalCode,city,email,status',
			);
			expect(getDefaultFields('Contact')).toBe('id,firstname,lastname,email');
			expect(getDefaultFields('Opportunity')).toBe('id,accountId,amount,probability,type');
			expect(getDefaultFields('Case')).toBe('id,accountId,contactId,priority,status,subject,type');
			expect(getDefaultFields('Task')).toBe('id,subject,status,priority');
			expect(getDefaultFields('Attachment')).toBe('id,name');
			expect(getDefaultFields('User')).toBe('id,name,email');
		});
	});

	describe('getQuery', () => {
		it('should return query when the fields are comma separated', () => {
			const options: IDataObject = {
				fields: 'id,name,email',
			};

			const result = getQuery(options, 'Account', true);

			expect(result).toBe('SELECT id,name,email FROM Account ');
		});

		it('should return query when the fields are strings in an array', () => {
			const options: IDataObject = {
				fields: ['id', 'name', 'email'],
			};

			const result = getQuery(options, 'Account', true);

			expect(result).toBe('SELECT id,name,email FROM Account ');
		});

		it('should return query with default fields when the fields are missing', () => {
			const options: IDataObject = {};

			const result = getQuery(options, 'Account', true);

			expect(result).toBe('SELECT id,name,type FROM Account ');
		});

		it('should return query with a condition', () => {
			const options: IDataObject = {
				fields: 'id,name,email',
				conditionsUi: {
					conditionValues: [{ field: 'id', operation: 'equal', value: '123' }],
				},
			};

			const result = getQuery(options, 'Account', true);

			expect(result).toBe('SELECT id,name,email FROM Account WHERE id = 123');
		});

		it('should return query with a limit', () => {
			const options: IDataObject = {
				fields: 'id,name,email',
			};

			const result = getQuery(options, 'Account', false, 5);

			expect(result).toBe('SELECT id,name,email FROM Account  LIMIT 5');
		});

		it('should return query with a condition and a limit', () => {
			const options: IDataObject = {
				fields: 'id,name,email',
				conditionsUi: {
					conditionValues: [{ field: 'id', operation: 'equal', value: '123' }],
				},
			};

			const result = getQuery(options, 'Account', false, 5);

			expect(result).toBe('SELECT id,name,email FROM Account WHERE id = 123 LIMIT 5');
		});
	});

	describe('filterAndManageProcessedItems', () => {
		it('should filter out already processed items', () => {
			const responseData: IDataObject[] = [
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
				{ Id: '003', Name: 'Item 3' },
			];
			const processedIds = ['002'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toEqual([
				{ Id: '001', Name: 'Item 1' },
				{ Id: '003', Name: 'Item 3' },
			]);
			// All processed IDs are kept, plus new items are added
			expect(result.updatedProcessedIds).toEqual(['002', '001', '003']);
		});

		it('should handle empty response data', () => {
			const responseData: IDataObject[] = [];
			const processedIds = ['001', '002'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toEqual([]);
			expect(result.updatedProcessedIds).toEqual(['001', '002']);
		});

		it('should handle empty processed IDs', () => {
			const responseData: IDataObject[] = [
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
			];
			const processedIds: string[] = [];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toEqual(responseData);
			expect(result.updatedProcessedIds).toEqual(['001', '002']);
		});

		it('should handle all items already processed', () => {
			const responseData: IDataObject[] = [
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
			];
			const processedIds = ['001', '002', '003'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toEqual([]);
			// All processed IDs are kept since no new items were found
			expect(result.updatedProcessedIds).toEqual(['001', '002', '003']);
		});

		it('should handle large numbers of processed IDs efficiently', () => {
			// Create 995 existing processed IDs
			const processedIds = Array.from({ length: 995 }, (_, i) => `existing-${i}`);

			// Add 10 new items
			const responseData: IDataObject[] = Array.from({ length: 10 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(10);
			// Should keep all existing IDs + 10 new IDs (no artificial limit)
			expect(result.updatedProcessedIds).toHaveLength(1005);

			// Should keep all existing IDs + new IDs
			expect(result.updatedProcessedIds.slice(0, 995)).toEqual(processedIds);
			expect(result.updatedProcessedIds.slice(-10)).toEqual(
				responseData.map((item) => item.Id as string),
			);
		});

		it('should handle very large batches of new items', () => {
			const processedIds = ['existing-1', 'existing-2'];

			// Create 1005 new items
			const responseData: IDataObject[] = Array.from({ length: 1005 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(1005);
			// Should keep all existing IDs + all new IDs (no artificial limit)
			expect(result.updatedProcessedIds).toHaveLength(1007);

			// Should keep all existing IDs + all new IDs
			const expectedIds = processedIds.concat(responseData.map((item) => item.Id as string));
			expect(result.updatedProcessedIds).toEqual(expectedIds);
		});

		it('should trim processed IDs to MAX_IDS limit (10000)', () => {
			// Create 9995 existing processed IDs
			const processedIds = Array.from({ length: 9995 }, (_, i) => `existing-${i}`);

			// Add 10 new items (total would be 10005)
			const responseData: IDataObject[] = Array.from({ length: 10 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(10);
			// Should be trimmed to exactly 10000 items (MAX_IDS limit)
			expect(result.updatedProcessedIds).toHaveLength(10000);

			// Should keep the last 10000 items (trimmed from the beginning)
			const expectedIds = processedIds
				.slice(-9990)
				.concat(responseData.map((item) => item.Id as string));
			expect(result.updatedProcessedIds).toEqual(expectedIds);
		});

		it('should trim processed IDs when exceeding MAX_IDS with large batch', () => {
			// Create 5000 existing processed IDs
			const processedIds = Array.from({ length: 5000 }, (_, i) => `existing-${i}`);

			// Add 6000 new items (total would be 11000, exceeding MAX_IDS)
			const responseData: IDataObject[] = Array.from({ length: 6000 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(6000);
			// Should be trimmed to exactly 10000 items (MAX_IDS limit)
			expect(result.updatedProcessedIds).toHaveLength(10000);

			// Should keep the last 10000 items (all new items + last 4000 existing)
			const expectedIds = processedIds
				.slice(-4000)
				.concat(responseData.map((item) => item.Id as string));
			expect(result.updatedProcessedIds).toEqual(expectedIds);
		});

		it('should not trim when under MAX_IDS limit', () => {
			// Create 100 existing processed IDs (well under limit)
			const processedIds = Array.from({ length: 100 }, (_, i) => `existing-${i}`);

			// Add 50 new items
			const responseData: IDataObject[] = Array.from({ length: 50 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(50);
			// Should keep all items since under limit
			expect(result.updatedProcessedIds).toHaveLength(150);

			// Should keep all existing IDs + all new IDs
			const expectedIds = processedIds.concat(responseData.map((item) => item.Id as string));
			expect(result.updatedProcessedIds).toEqual(expectedIds);
		});

		it('should handle duplicate IDs in response data correctly', () => {
			const responseData: IDataObject[] = [
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
				{ Id: '001', Name: 'Item 1 Duplicate' }, // Duplicate ID
			];
			const processedIds = ['003'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			// Should include both items with ID '001' since they're not in processedIds
			expect(result.newItems).toEqual([
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
				{ Id: '001', Name: 'Item 1 Duplicate' },
			]);
			expect(result.updatedProcessedIds).toEqual(['003', '001', '002', '001']);
		});

		it('should maintain order of processed IDs', () => {
			const responseData: IDataObject[] = [
				{ Id: '003', Name: 'Item 3' },
				{ Id: '001', Name: 'Item 1' },
				{ Id: '004', Name: 'Item 4' },
			];
			const processedIds = ['100', '200'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.updatedProcessedIds).toEqual(['100', '200', '003', '001', '004']);
		});
	});

	describe('salesforceApiRequest - JWT Authentication', () => {
		let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
		let mockRequest: jest.Mock;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockRequest = jest.fn();
			mockExecuteFunctions.helpers.request = mockRequest;
			jest.clearAllMocks();

			// Setup default mocks
			(mockJwt.sign as jest.Mock).mockReturnValue('mock-jwt-signature');
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'authentication') return 'jwt';
				return undefined;
			});
		});

		afterEach(() => {
			jest.resetAllMocks();
		});

		describe('JWT Authentication Flow', () => {
			it('should authenticate using JWT with production environment', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: 'mock-private-key',
					environment: 'production',
				};
				const mockResponse = {
					access_token: 'mock-access-token',
					instance_url: 'https://test.salesforce.com',
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				await salesforceApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint', {}, {});

				// Verify JWT signature generation
				expect(mockJwt.sign as jest.Mock).toHaveBeenCalledWith(
					{
						iss: 'test-client-id',
						sub: 'test@example.com',
						aud: 'https://login.salesforce.com',
						exp: 1640995200 + 3 * 60, // Current timestamp + 3 minutes
					},
					'mock-private-key',
					{
						algorithm: 'RS256',
						header: {
							alg: 'RS256',
						},
					},
				);

				// Verify token exchange request
				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					method: 'POST',
					form: {
						grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
						assertion: 'mock-jwt-signature',
					},
					uri: 'https://login.salesforce.com/services/oauth2/token',
					json: true,
				});

				// Verify API request with bearer token
				const expectedApiOptions = {
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock-access-token',
					},
					method: 'GET',
					qs: {},
					uri: 'https://test.salesforce.com/services/data/v59.0/test-endpoint',
					json: true,
				};

				expect(mockRequest).toHaveBeenCalledWith(expectedApiOptions);
				expect(mockExecuteFunctions.logger.debug).toHaveBeenCalledWith(
					'Authentication for "Salesforce" node is using "jwt". Invoking URI https://test.salesforce.com/services/data/v59.0/test-endpoint',
				);
			});

			it('should authenticate using JWT with sandbox environment', async () => {
				const mockCredentials = {
					clientId: 'sandbox-client-id',
					username: 'sandbox@example.com',
					privateKey: 'sandbox-private-key',
					environment: 'sandbox',
				};
				const mockResponse = {
					access_token: 'sandbox-access-token',
					instance_url: 'https://test.my.salesforce.com',
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				await salesforceApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'/sandbox-endpoint',
					{ data: 'test' },
					{ param: 'value' },
				);

				// Verify JWT uses sandbox URL
				expect(mockJwt.sign as jest.Mock).toHaveBeenCalledWith(
					{
						iss: 'sandbox-client-id',
						sub: 'sandbox@example.com',
						aud: 'https://test.salesforce.com',
						exp: 1640995200 + 3 * 60,
					},
					'sandbox-private-key',
					{
						algorithm: 'RS256',
						header: {
							alg: 'RS256',
						},
					},
				);

				// Verify token exchange request uses sandbox URL
				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					method: 'POST',
					form: {
						grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
						assertion: 'mock-jwt-signature',
					},
					uri: 'https://test.salesforce.com/services/oauth2/token',
					json: true,
				});
			});

			it('should handle JWT token exchange with body and query parameters', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: 'mock-private-key',
					environment: 'production',
				};
				const mockResponse = {
					access_token: 'mock-access-token',
					instance_url: 'https://test.salesforce.com',
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				const testBody = { name: 'Test Account', type: 'Customer' };
				const testQs = { fields: 'Id,Name', limit: '10' };

				await salesforceApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'/test-endpoint',
					testBody,
					testQs,
				);

				// Verify API request includes body and query parameters
				const expectedApiOptions = {
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock-access-token',
					},
					method: 'POST',
					body: testBody,
					qs: testQs,
					uri: 'https://test.salesforce.com/services/data/v59.0/test-endpoint',
					json: true,
				};

				expect(mockRequest).toHaveBeenCalledWith(expectedApiOptions);
			});

			it('should handle custom URI parameter', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: 'mock-private-key',
					environment: 'production',
				};
				const mockResponse = {
					access_token: 'mock-access-token',
					instance_url: 'https://test.salesforce.com',
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				await salesforceApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/default-endpoint',
					{},
					{},
					'/custom-uri',
				);

				// Verify custom URI is used instead of endpoint
				const expectedApiOptions = {
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock-access-token',
					},
					method: 'GET',
					qs: {},
					uri: 'https://test.salesforce.com/services/data/v59.0/custom-uri',
					json: true,
				};

				expect(mockRequest).toHaveBeenCalledWith(expectedApiOptions);
			});

			it('should merge additional options', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: 'mock-private-key',
					environment: 'production',
				};
				const mockResponse = {
					access_token: 'mock-access-token',
					instance_url: 'https://test.salesforce.com',
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				const additionalOptions = {
					timeout: 30000,
					resolveWithFullResponse: true,
				};

				await salesforceApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/test-endpoint',
					{},
					{},
					undefined,
					additionalOptions,
				);

				// Verify additional options are merged
				const expectedApiOptions = {
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer mock-access-token',
					},
					method: 'GET',
					qs: {},
					uri: 'https://test.salesforce.com/services/data/v59.0/test-endpoint',
					json: true,
					timeout: 30000,
					resolveWithFullResponse: true,
				};

				expect(mockRequest).toHaveBeenCalledWith(expectedApiOptions);
			});
		});

		describe('JWT Authentication Error Handling', () => {
			it('should handle credential retrieval errors', async () => {
				const credentialError = new Error('Failed to get credentials');
				mockExecuteFunctions.getCredentials.mockRejectedValue(credentialError);
				mockExecuteFunctions.getNode.mockReturnValue({
					id: 'test-node',
					name: 'Test Node',
					type: 'n8n-nodes-base.salesforce',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				await expect(
					salesforceApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint', {}, {}),
				).rejects.toThrow(NodeApiError);

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('salesforceJwtApi');
			});

			it('should handle JWT token exchange errors', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: 'mock-private-key',
					environment: 'production',
				};
				const tokenError = new Error('Invalid JWT signature');

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockRejectedValue(tokenError);
				mockExecuteFunctions.getNode.mockReturnValue({
					id: 'test-node',
					name: 'Test Node',
					type: 'n8n-nodes-base.salesforce',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				await expect(
					salesforceApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint', {}, {}),
				).rejects.toThrow(NodeApiError);
			});

			it('should handle API request errors after successful authentication', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: 'mock-private-key',
					environment: 'production',
				};
				const mockResponse = {
					access_token: 'mock-access-token',
					instance_url: 'https://test.salesforce.com',
				};
				const apiError = new Error('API rate limit exceeded');

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest
					.mockResolvedValueOnce(mockResponse) // First call succeeds (token exchange)
					.mockRejectedValueOnce(apiError); // Second call fails (API request)
				mockExecuteFunctions.getNode.mockReturnValue({
					id: 'test-node',
					name: 'Test Node',
					type: 'n8n-nodes-base.salesforce',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				await expect(
					salesforceApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint', {}, {}),
				).rejects.toThrow(NodeApiError);

				// Verify that token exchange succeeded but API request failed
				expect(mockRequest).toHaveBeenCalledTimes(2);
			});

			it('should handle missing instance_url in token response', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: 'mock-private-key',
					environment: 'production',
				};
				const mockResponse = {
					access_token: 'mock-access-token',
					// Missing instance_url
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getNode.mockReturnValue({
					id: 'test-node',
					name: 'Test Node',
					type: 'n8n-nodes-base.salesforce',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				// Should not throw error but handle gracefully
				await salesforceApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint', {}, {});

				// Verify API call was made with undefined instance_url
				expect(mockRequest).toHaveBeenCalledTimes(2);
			});
		});

		describe('JWT Signature Generation', () => {
			it('should generate correct JWT payload for production environment', async () => {
				const mockCredentials = {
					clientId: 'prod-client-id',
					username: 'prod@example.com',
					privateKey: 'prod-private-key',
					environment: 'production',
				};
				const mockResponse = {
					access_token: 'prod-access-token',
					instance_url: 'https://prod.salesforce.com',
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				await salesforceApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint', {}, {});

				expect(mockJwt.sign as jest.Mock).toHaveBeenCalledWith(
					{
						iss: 'prod-client-id',
						sub: 'prod@example.com',
						aud: 'https://login.salesforce.com',
						exp: 1640995200 + 180, // 3 minutes = 180 seconds
					},
					'prod-private-key',
					{
						algorithm: 'RS256',
						header: {
							alg: 'RS256',
						},
					},
				);
			});

			it('should generate correct JWT payload for sandbox environment', async () => {
				const mockCredentials = {
					clientId: 'sandbox-client-id',
					username: 'sandbox@example.com',
					privateKey: 'sandbox-private-key',
					environment: 'sandbox',
				};
				const mockResponse = {
					access_token: 'sandbox-access-token',
					instance_url: 'https://sandbox.salesforce.com',
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				await salesforceApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint', {}, {});

				expect(mockJwt.sign as jest.Mock).toHaveBeenCalledWith(
					{
						iss: 'sandbox-client-id',
						sub: 'sandbox@example.com',
						aud: 'https://test.salesforce.com', // Sandbox uses test.salesforce.com
						exp: 1640995200 + 180,
					},
					'sandbox-private-key',
					{
						algorithm: 'RS256',
						header: {
							alg: 'RS256',
						},
					},
				);
			});

			it('should use RS256 algorithm and proper header configuration', async () => {
				const mockCredentials = {
					clientId: 'test-client-id',
					username: 'test@example.com',
					privateKey: 'test-private-key',
					environment: 'production',
				};
				const mockResponse = {
					access_token: 'test-access-token',
					instance_url: 'https://test.salesforce.com',
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.logger = {
					debug: jest.fn(),
				} as any;

				await salesforceApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint', {}, {});

				const jwtOptions = (mockJwt.sign as jest.Mock).mock.calls[0][2];
				expect(jwtOptions.algorithm).toBe('RS256');
				expect(jwtOptions.header?.alg).toBe('RS256');
			});
		});
	});
});
