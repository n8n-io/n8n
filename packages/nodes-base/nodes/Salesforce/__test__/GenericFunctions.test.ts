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
	escapeSoqlString,
	validateSoqlFieldName,
	validateSoqlOperator,
	validateSoqlObjectName,
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
		it('should handle equals operation with numeric type', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: [{ field: 'field_1', operation: 'equal', value: 123 }],
				},
			};

			const result = getConditions(options);

			expect(result).toBe('WHERE field_1 = 123');
		});

		it('should handle other operations with numeric types', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: [
						{ field: 'field_1', operation: '>', value: 123 },
						{ field: 'field_2', operation: '<', value: 456 },
						{ field: 'field_3', operation: '>=', value: 789 },
						{ field: 'field_4', operation: '<=', value: 0 },
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
					conditionValues: [{ field: 'id', operation: 'equal', value: 123 }],
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
					conditionValues: [{ field: 'id', operation: 'equal', value: 123 }],
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

		describe('Security Functions: escaping', () => {
			describe('escapeSoqlString', () => {
				it('should escape single quotes', () => {
					const input = "Bob's Account";
					const result = escapeSoqlString(input);
					expect(result).toBe("Bob\\'s Account");
				});

				it('should escape backslashes', () => {
					const input = 'Path\\to\\file';
					const result = escapeSoqlString(input);
					expect(result).toBe('Path\\\\to\\\\file');
				});

				it('should escape double quotes', () => {
					const input = 'He said "hello"';
					const result = escapeSoqlString(input);
					expect(result).toBe('He said \\"hello\\"');
				});

				it('should escape newlines', () => {
					const input = 'Line1\nLine2';
					const result = escapeSoqlString(input);
					expect(result).toBe('Line1\\nLine2');
				});

				it('should escape carriage returns', () => {
					const input = 'Line1\rLine2';
					const result = escapeSoqlString(input);
					expect(result).toBe('Line1\\rLine2');
				});

				it('should escape tabs', () => {
					const input = 'Column1\tColumn2';
					const result = escapeSoqlString(input);
					expect(result).toBe('Column1\\tColumn2');
				});

				it('should escape backspace characters', () => {
					const input = 'Text\bBackspace';
					const result = escapeSoqlString(input);
					expect(result).toBe('Text\\bBackspace');
				});

				it('should escape form feed characters', () => {
					const input = 'Page1\fPage2';
					const result = escapeSoqlString(input);
					expect(result).toBe('Page1\\fPage2');
				});

				it('should escape single quote', () => {
					const maliciousInput = "Bob' OR '1'='1";
					const result = escapeSoqlString(maliciousInput);
					expect(result).toBe("Bob\\' OR \\'1\\'=\\'1");
				});

				it('should escape backslash escape attempt', () => {
					const maliciousInput = "Bob\\' OR '1'='1";
					const result = escapeSoqlString(maliciousInput);
					expect(result).toBe("Bob\\\\\\' OR \\'1\\'=\\'1");
				});

				it('should handle multiple special characters', () => {
					const input = "Test's\nData\\Path\tValue";
					const result = escapeSoqlString(input);
					expect(result).toBe("Test\\'s\\nData\\\\Path\\tValue");
				});

				it('should handle empty string', () => {
					const input = '';
					const result = escapeSoqlString(input);
					expect(result).toBe('');
				});

				it('should handle string with no special characters', () => {
					const input = 'NormalText123';
					const result = escapeSoqlString(input);
					expect(result).toBe('NormalText123');
				});
			});

			describe('validateSoqlFieldName', () => {
				it('should accept valid simple field name', () => {
					expect(() => validateSoqlFieldName('Name')).not.toThrow();
					expect(() => validateSoqlFieldName('Email')).not.toThrow();
					expect(() => validateSoqlFieldName('Id')).not.toThrow();
				});

				it('should accept valid field name with underscores', () => {
					expect(() => validateSoqlFieldName('Custom_Field__c')).not.toThrow();
					expect(() => validateSoqlFieldName('First_Name')).not.toThrow();
				});

				it('should accept valid field name with numbers', () => {
					expect(() => validateSoqlFieldName('Field123')).not.toThrow();
					expect(() => validateSoqlFieldName('Custom2__c')).not.toThrow();
				});

				it('should accept relationship field names with dots', () => {
					expect(() => validateSoqlFieldName('Account.Name')).not.toThrow();
					expect(() => validateSoqlFieldName('Owner.Email')).not.toThrow();
					expect(() => validateSoqlFieldName('Parent.Parent.Name')).not.toThrow();
				});

				it('should reject field name with spaces', () => {
					expect(() => validateSoqlFieldName('Invalid Field')).toThrow(
						'Invalid SOQL field name: Invalid Field',
					);
				});

				it('should reject field name with special characters', () => {
					expect(() => validateSoqlFieldName("Name' OR '1'='1")).toThrow(
						"Invalid SOQL field name: Name' OR '1'='1",
					);
				});

				it('should reject field name with semicolon', () => {
					expect(() => validateSoqlFieldName('Name;DROP TABLE')).toThrow(
						'Invalid SOQL field name: Name;DROP TABLE',
					);
				});

				it('should reject field name with parentheses', () => {
					expect(() => validateSoqlFieldName('COUNT(Id)')).toThrow(
						'Invalid SOQL field name: COUNT(Id)',
					);
				});

				it('should reject field name with SQL keywords injection', () => {
					expect(() => validateSoqlFieldName('Name WHERE 1=1')).toThrow(
						'Invalid SOQL field name: Name WHERE 1=1',
					);
				});

				it('should reject field name starting with number', () => {
					expect(() => validateSoqlFieldName('123Field')).toThrow(
						'Invalid SOQL field name: 123Field',
					);
				});

				it('should reject empty field name', () => {
					expect(() => validateSoqlFieldName('')).toThrow('Invalid SOQL field name: ');
				});

				it('should reject field name with only dots', () => {
					expect(() => validateSoqlFieldName('...')).toThrow('Invalid SOQL field name: ...');
				});
			});

			describe('validateSoqlOperator', () => {
				it('should accept valid comparison operators', () => {
					expect(() => validateSoqlOperator('=')).not.toThrow();
					expect(() => validateSoqlOperator('!=')).not.toThrow();
					expect(() => validateSoqlOperator('<')).not.toThrow();
					expect(() => validateSoqlOperator('<=')).not.toThrow();
					expect(() => validateSoqlOperator('>')).not.toThrow();
					expect(() => validateSoqlOperator('>=')).not.toThrow();
				});

				it('should accept LIKE operator', () => {
					expect(() => validateSoqlOperator('LIKE')).not.toThrow();
				});

				it('should accept NOT LIKE operator', () => {
					expect(() => validateSoqlOperator('NOT LIKE')).not.toThrow();
				});

				it('should accept IN operator', () => {
					expect(() => validateSoqlOperator('IN')).not.toThrow();
				});

				it('should accept NOT IN operator', () => {
					expect(() => validateSoqlOperator('NOT IN')).not.toThrow();
				});

				it('should accept INCLUDES operator', () => {
					expect(() => validateSoqlOperator('INCLUDES')).not.toThrow();
				});

				it('should accept EXCLUDES operator', () => {
					expect(() => validateSoqlOperator('EXCLUDES')).not.toThrow();
				});

				it('should be case-insensitive for operators', () => {
					expect(() => validateSoqlOperator('like')).not.toThrow();
					expect(() => validateSoqlOperator('Like')).not.toThrow();
					expect(() => validateSoqlOperator('in')).not.toThrow();
					expect(() => validateSoqlOperator('not in')).not.toThrow();
				});

				it('should normalize whitespace in operators', () => {
					expect(() => validateSoqlOperator('NOT  IN')).not.toThrow();
					expect(() => validateSoqlOperator('  NOT IN  ')).not.toThrow();
				});

				it('should reject invalid operator', () => {
					expect(() => validateSoqlOperator('INVALID')).toThrow('Invalid SOQL operator: INVALID');
				});

				it('should reject SQL injection attempt', () => {
					expect(() => validateSoqlOperator("= '1' OR '1'='1")).toThrow(
						"Invalid SOQL operator: = '1' OR '1'='1",
					);
				});

				it('should reject operator with semicolon', () => {
					expect(() => validateSoqlOperator('=;DROP TABLE')).toThrow(
						'Invalid SOQL operator: =;DROP TABLE',
					);
				});

				it('should reject empty operator', () => {
					expect(() => validateSoqlOperator('')).toThrow('Invalid SOQL operator: ');
				});

				it('should normalize and accept operator with extra spaces', () => {
					// After whitespace normalization, '=  ' becomes '='
					expect(() => validateSoqlOperator('=  ')).not.toThrow();
				});
			});

			describe('validateSoqlObjectName', () => {
				it('should accept valid standard object names', () => {
					expect(() => validateSoqlObjectName('Account')).not.toThrow();
					expect(() => validateSoqlObjectName('Contact')).not.toThrow();
					expect(() => validateSoqlObjectName('Lead')).not.toThrow();
					expect(() => validateSoqlObjectName('Opportunity')).not.toThrow();
				});

				it('should accept valid custom object names', () => {
					expect(() => validateSoqlObjectName('Custom_Object__c')).not.toThrow();
					expect(() => validateSoqlObjectName('MyCustom__c')).not.toThrow();
				});

				it('should accept external object names', () => {
					expect(() => validateSoqlObjectName('ExternalObject__x')).not.toThrow();
				});

				it('should accept platform event names', () => {
					expect(() => validateSoqlObjectName('MyEvent__e')).not.toThrow();
				});

				it('should accept big object names', () => {
					expect(() => validateSoqlObjectName('MyBigObject__b')).not.toThrow();
				});

				it('should accept custom metadata type names', () => {
					expect(() => validateSoqlObjectName('MyMetadata__mdt')).not.toThrow();
				});

				it('should accept namespaced custom objects', () => {
					expect(() => validateSoqlObjectName('Namespace__CustomObject__c')).not.toThrow();
				});

				it('should accept object names with numbers', () => {
					expect(() => validateSoqlObjectName('Object123__c')).not.toThrow();
				});

				it('should reject object name with spaces', () => {
					expect(() => validateSoqlObjectName('Invalid Object')).toThrow(
						'Invalid SOQL object name: Invalid Object',
					);
				});

				it('should reject object name with special characters', () => {
					expect(() => validateSoqlObjectName("Account' OR '1'='1")).toThrow(
						"Invalid SOQL object name: Account' OR '1'='1",
					);
				});

				it('should reject object name with semicolon', () => {
					expect(() => validateSoqlObjectName('Account;DROP TABLE')).toThrow(
						'Invalid SOQL object name: Account;DROP TABLE',
					);
				});

				it('should reject object name with parentheses', () => {
					expect(() => validateSoqlObjectName('Account()')).toThrow(
						'Invalid SOQL object name: Account()',
					);
				});

				it('should reject object name with SQL keywords', () => {
					expect(() => validateSoqlObjectName('Account WHERE 1=1')).toThrow(
						'Invalid SOQL object name: Account WHERE 1=1',
					);
				});

				it('should reject object name starting with number', () => {
					expect(() => validateSoqlObjectName('123Object')).toThrow(
						'Invalid SOQL object name: 123Object',
					);
				});

				it('should reject empty object name', () => {
					expect(() => validateSoqlObjectName('')).toThrow('Invalid SOQL object name: ');
				});

				it('should reject object name with dots', () => {
					expect(() => validateSoqlObjectName('Account.Name')).toThrow(
						'Invalid SOQL object name: Account.Name',
					);
				});
			});

			describe('getValue', () => {
				it('should escape single quotes in non-numeric string values', () => {
					const value = "Bob's Account";
					const result = getValue(value) as string;
					expect(result).toBe("'Bob\\'s Account'");
				});

				it('should escape single quotes in numeric string values', () => {
					const maliciousValue = "Bob' OR '1'='1";
					const result = getValue(maliciousValue) as string;
					expect(result).toBe("'Bob\\' OR \\'1\\'=\\'1'");
				});

				it('should treat numeric strings as quoted strings to preserve data integrity', () => {
					// Critical fix: strings like '123' should remain as strings
					// to prevent data corruption for zip codes, phone numbers, IDs with leading zeros
					const value = '123';
					const result = getValue(value);
					expect(result).toBe("'123'");
				});

				it('should preserve leading zeros in string values', () => {
					const value = '00123';
					const result = getValue(value);
					expect(result).toBe("'00123'");
				});

				it('should return ISO datetime strings as-is', () => {
					const value = '2025-01-01T00:00:00Z';
					const result = getValue(value);
					expect(result).toBe(value);
				});

				it('should return ISO datetime with timezone as-is', () => {
					const value = '2025-01-01T12:30:00+05:30';
					const result = getValue(value);
					expect(result).toBe(value);
				});

				it('should return ISO datetime with milliseconds as-is', () => {
					const value = '2025-01-01T12:30:00.123Z';
					const result = getValue(value);
					expect(result).toBe(value);
				});

				it('should return date strings as-is', () => {
					const value = '2025-01-01';
					const result = getValue(value);
					expect(result).toBe(value);
				});

				it('should handle Salesforce date literal TODAY', () => {
					const value = 'TODAY';
					const result = getValue(value);
					expect(result).toBe('TODAY');
				});

				it('should handle Salesforce date literal YESTERDAY', () => {
					const value = 'YESTERDAY';
					const result = getValue(value);
					expect(result).toBe('YESTERDAY');
				});

				it('should handle Salesforce date literal LAST_N_DAYS', () => {
					const value = 'LAST_N_DAYS:7';
					const result = getValue(value);
					expect(result).toBe('LAST_N_DAYS:7');
				});

				it('should handle Salesforce date literal NEXT_N_WEEKS', () => {
					const value = 'NEXT_N_WEEKS:4';
					const result = getValue(value);
					expect(result).toBe('NEXT_N_WEEKS:4');
				});

				it('should handle Salesforce date literal THIS_QUARTER', () => {
					const value = 'THIS_QUARTER';
					const result = getValue(value);
					expect(result).toBe('THIS_QUARTER');
				});

				it('should be case-insensitive for date literals', () => {
					const value = 'today';
					const result = getValue(value);
					expect(result).toBe('TODAY');
				});

				it('should handle null values', () => {
					const value = null;
					const result = getValue(value);
					expect(result).toBe('null');
				});

				it('should handle undefined values', () => {
					const value = undefined;
					const result = getValue(value);
					expect(result).toBe('null');
				});

				it('should throw error for non-finite numbers', () => {
					expect(() => getValue(Infinity)).toThrow(
						'Invalid numeric value: must be a finite number',
					);
					expect(() => getValue(-Infinity)).toThrow(
						'Invalid numeric value: must be a finite number',
					);
					expect(() => getValue(NaN)).toThrow('Invalid numeric value: must be a finite number');
				});

				it('should handle arrays with string values safely', () => {
					const values = ['Value1', "Value's2", 'Value3'];
					const result = getValue(values) as string;
					expect(result).toBe("('Value1','Value\\'s2','Value3')");
				});

				it('should prevent SOQL injection in array values', () => {
					const maliciousArray = ["Bob' OR '1'='1", 'Normal'];
					const result = getValue(maliciousArray) as string;
					expect(result).toBe("('Bob\\' OR \\'1\\'=\\'1','Normal')");
				});

				it('should handle arrays with numbers safely', () => {
					const values = [1, 2, 3];
					const result = getValue(values) as string;
					expect(result).toBe('(1,2,3)');
				});

				it('should handle arrays with booleans safely', () => {
					const values = [true, false];
					const result = getValue(values) as string;
					expect(result).toBe('(true,false)');
				});

				it('should handle mixed type arrays safely', () => {
					const values = [123, "Bob's", true];
					const result = getValue(values) as string;
					expect(result).toBe("(123,'Bob\\'s',true)");
				});

				it('should handle empty array', () => {
					const values: any[] = [];
					const result = getValue(values) as string;
					expect(result).toBe('()');
				});
			});

			describe('getConditions', () => {
				it('should validate field names in conditions', () => {
					const options: IDataObject = {
						conditionsUi: {
							conditionValues: [{ field: "Name' OR '1'='1", operation: 'equal', value: '123' }],
						},
					};

					expect(() => getConditions(options)).toThrow("Invalid SOQL field name: Name' OR '1'='1");
				});

				it('should validate operators in conditions', () => {
					const options: IDataObject = {
						conditionsUi: {
							conditionValues: [{ field: 'Name', operation: "= '1' OR '1'='1", value: '123' }],
						},
					};

					expect(() => getConditions(options)).toThrow("Invalid SOQL operator: = '1' OR '1'='1");
				});

				it('should escape string values in conditions', () => {
					const options: IDataObject = {
						conditionsUi: {
							conditionValues: [{ field: 'Name', operation: 'equal', value: "Bob's Account" }],
						},
					};

					const result = getConditions(options);
					expect(result).toBe("WHERE Name = 'Bob\\'s Account'");
				});

				it('should prevent SOQL injection in condition values', () => {
					const options: IDataObject = {
						conditionsUi: {
							conditionValues: [{ field: 'Name', operation: 'equal', value: "Bob' OR '1'='1" }],
						},
					};

					const result = getConditions(options);
					expect(result).toBe("WHERE Name = 'Bob\\' OR \\'1\\'=\\'1'");
				});

				it('should handle multiple conditions with validation', () => {
					const options: IDataObject = {
						conditionsUi: {
							conditionValues: [
								{ field: 'Name', operation: '=', value: "Bob's" },
								{ field: 'Email', operation: 'LIKE', value: '%test%' },
							],
						},
					};

					const result = getConditions(options);
					expect(result).toBe("WHERE Name = 'Bob\\'s' AND Email LIKE '%test%'");
				});
			});

			describe('getQuery', () => {
				it('should validate object name', () => {
					const options: IDataObject = {
						fields: 'Id,Name',
					};

					expect(() => getQuery(options, "Account' OR '1'='1", true)).toThrow(
						"Invalid SOQL object name: Account' OR '1'='1",
					);
				});

				it('should validate field names in comma-separated string', () => {
					const options: IDataObject = {
						fields: "Id,Name' OR '1'='1",
					};

					expect(() => getQuery(options, 'Account', true)).toThrow(
						"Invalid SOQL field name: Name' OR '1'='1",
					);
				});

				it('should validate field names in array', () => {
					const options: IDataObject = {
						fields: ['Id', "Name' OR '1'='1"],
					};

					expect(() => getQuery(options, 'Account', true)).toThrow(
						"Invalid SOQL field name: Name' OR '1'='1",
					);
				});

				it('should accept valid query with relationship fields', () => {
					const options: IDataObject = {
						fields: 'Id,Name,Account.Name,Owner.Email',
					};

					const result = getQuery(options, 'Contact', true);
					expect(result).toBe('SELECT Id,Name,Account.Name,Owner.Email FROM Contact ');
				});

				it('should validate object name and fields together', () => {
					const options: IDataObject = {
						fields: 'Id,Name,Email',
						conditionsUi: {
							conditionValues: [{ field: 'Name', operation: '=', value: "Bob's" }],
						},
					};

					const result = getQuery(options, 'Account', true);
					expect(result).toBe("SELECT Id,Name,Email FROM Account WHERE Name = 'Bob\\'s'");
				});
			});
		});
	});
});
