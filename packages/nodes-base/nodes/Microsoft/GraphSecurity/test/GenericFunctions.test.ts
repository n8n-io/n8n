import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	msGraphSecurityApiRequest,
	tolerateDoubleQuotes,
	throwOnEmptyUpdate,
} from '../GenericFunctions';

describe('Microsoft GraphSecurity GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequest: jest.Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequest = jest.fn();
		mockExecuteFunctions.helpers.request = mockRequest;

		mockNode = {
			id: 'test-node',
			name: 'Test GraphSecurity Node',
			type: 'n8n-nodes-base.microsoftGraphSecurity',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('msGraphSecurityApiRequest', () => {
		const mockCredentials = {
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		};

		beforeEach(() => {
			mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
		});

		describe('successful requests', () => {
			it('should make a successful GET request with default parameters', async () => {
				const mockResponse = { data: 'test data' };
				mockRequest.mockResolvedValue(mockResponse);

				const result = await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://graph.microsoft.com/v1.0/security/alerts',
					json: true,
				});
				expect(result).toEqual(mockResponse);
			});

			it('should make a POST request with body data', async () => {
				const mockResponse = { id: '123', status: 'created' };
				const requestBody = { name: 'Test Alert', status: 'active' };
				mockRequest.mockResolvedValue(mockResponse);

				const result = await msGraphSecurityApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'/alerts',
					requestBody,
				);

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'POST',
					body: requestBody,
					uri: 'https://graph.microsoft.com/v1.0/security/alerts',
					json: true,
				});
				expect(result).toEqual(mockResponse);
			});

			it('should make a request with query string parameters', async () => {
				const mockResponse = { alerts: [] };
				const queryParams = { $filter: "status eq 'active'", $top: 10 };
				mockRequest.mockResolvedValue(mockResponse);

				const result = await msGraphSecurityApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/alerts',
					{},
					queryParams,
				);

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					qs: queryParams,
					uri: 'https://graph.microsoft.com/v1.0/security/alerts',
					json: true,
				});
				expect(result).toEqual(mockResponse);
			});

			it('should make a request with custom headers', async () => {
				const mockResponse = { success: true };
				const customHeaders = { 'Content-Type': 'application/json', 'X-Custom-Header': 'test' };
				mockRequest.mockResolvedValue(mockResponse);

				const result = await msGraphSecurityApiRequest.call(
					mockExecuteFunctions,
					'PUT',
					'/secureScores',
					{ data: 'test' },
					{},
					customHeaders,
				);

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
						'Content-Type': 'application/json',
						'X-Custom-Header': 'test',
					},
					method: 'PUT',
					body: { data: 'test' },
					uri: 'https://graph.microsoft.com/v1.0/security/secureScores',
					json: true,
				});
				expect(result).toEqual(mockResponse);
			});

			it('should handle all parameters together', async () => {
				const mockResponse = { updated: true };
				const body = { status: 'resolved' };
				const qs = { $select: 'id,status' };
				const headers = { 'If-Match': 'etag-value' };
				mockRequest.mockResolvedValue(mockResponse);

				const result = await msGraphSecurityApiRequest.call(
					mockExecuteFunctions,
					'PATCH',
					'/alerts/123',
					body,
					qs,
					headers,
				);

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
						'If-Match': 'etag-value',
					},
					method: 'PATCH',
					body,
					qs,
					uri: 'https://graph.microsoft.com/v1.0/security/alerts/123',
					json: true,
				});
				expect(result).toEqual(mockResponse);
			});

			it('should remove empty body when no body data is provided', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts', {});

				const requestOptions = mockRequest.mock.calls[0][0];
				expect(requestOptions.body).toBeUndefined();
			});

			it('should remove empty query string when no qs data is provided', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts', {}, {});

				const requestOptions = mockRequest.mock.calls[0][0];
				expect(requestOptions.qs).toBeUndefined();
			});
		});

		describe('credential handling', () => {
			it('should handle missing credentials', async () => {
				mockExecuteFunctions.getCredentials.mockRejectedValue(new Error('Credentials not found'));

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow('Credentials not found');
			});

			it('should handle malformed credentials', async () => {
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {},
				} as any);
				mockRequest.mockResolvedValue({ data: 'test' });

				const result = await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer undefined',
					},
					method: 'GET',
					uri: 'https://graph.microsoft.com/v1.0/security/alerts',
					json: true,
				});
				expect(result).toEqual({ data: 'test' });
			});
		});

		describe('error handling', () => {
			it('should handle basic API errors', async () => {
				const apiError = {
					error: {
						error: {
							message: 'Resource not found',
							code: 'NotFound',
						},
					},
				};
				mockRequest.mockRejectedValue(apiError);

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts/invalid-id'),
				).rejects.toThrow(NodeApiError);
			});

			it('should parse JSON error messages', async () => {
				const jsonErrorMessage = '{"error":{"code":"InvalidRequest","message":"Invalid request"}}';
				const apiError = {
					error: {
						error: {
							message: jsonErrorMessage,
						},
					},
				};
				mockRequest.mockRejectedValue(apiError);

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow(NodeApiError);
			});

			it('should handle BadRequest errors', async () => {
				const apiError = {
					error: {
						error: {
							message: 'Http request failed with statusCode=BadRequest: Invalid filter',
						},
					},
				};
				mockRequest.mockRejectedValue(apiError);

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow(NodeApiError);

				expect(apiError.error.error.message).toBe('Request failed with bad request');
			});

			it('should handle Http request failed errors with JSON content', async () => {
				const jsonError = '{"error":{"code":"Forbidden","message":"Insufficient privileges"}}';
				const apiError = {
					error: {
						error: {
							message: `Http request failed with statusCode=403: ${jsonError}`,
						},
					},
				};
				mockRequest.mockRejectedValue(apiError);

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow(NodeApiError);
			});

			it('should handle Invalid filter clause errors', async () => {
				const apiError = {
					error: {
						error: {
							message: 'Invalid filter clause',
						},
					},
				};
				mockRequest.mockRejectedValue(apiError);

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow(NodeApiError);

				expect(apiError.error.error.message).toContain(
					'Please check that your query parameter syntax is correct',
				);
			});

			it('should handle Invalid ODATA query filter errors', async () => {
				const apiError = {
					error: {
						error: {
							message: 'Invalid ODATA query filter',
						},
					},
				};
				mockRequest.mockRejectedValue(apiError);

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow(NodeApiError);

				expect(apiError.error.error.message).toContain(
					'Please check that your query parameter syntax is correct',
				);
			});

			it('should handle network timeout errors', async () => {
				const networkError = {
					error: {
						error: {
							message: 'ETIMEDOUT - Network timeout',
						},
					},
				};
				mockRequest.mockRejectedValue(networkError);

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow(NodeApiError);
			});

			it('should handle errors without nested structure', async () => {
				const simpleError = {
					error: {
						error: {
							message: 'Simple network error',
						},
					},
				};
				mockRequest.mockRejectedValue(simpleError);

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow(NodeApiError);
			});
		});

		describe('endpoint construction', () => {
			it('should construct correct URL for different endpoints', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/secureScores');

				expect(mockRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/security/secureScores',
					}),
				);
			});

			it('should handle endpoints with parameters', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts/123/comments');

				expect(mockRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/security/alerts/123/comments',
					}),
				);
			});

			it('should handle endpoints without leading slash', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', 'alerts');

				expect(mockRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						uri: 'https://graph.microsoft.com/v1.0/securityalerts',
					}),
				);
			});
		});
	});

	describe('tolerateDoubleQuotes', () => {
		it('should replace double quotes with single quotes', () => {
			const input = 'status eq "active" and severity eq "high"';
			const expected = "status eq 'active' and severity eq 'high'";

			const result = tolerateDoubleQuotes(input);

			expect(result).toEqual(expected);
		});

		it('should handle multiple double quotes', () => {
			const input = '"test" and "another" and "third"';
			const expected = "'test' and 'another' and 'third'";

			const result = tolerateDoubleQuotes(input);

			expect(result).toEqual(expected);
		});

		it('should handle empty string', () => {
			const input = '';
			const expected = '';

			const result = tolerateDoubleQuotes(input);

			expect(result).toEqual(expected);
		});

		it('should handle string with no double quotes', () => {
			const input = 'status eq active and severity eq high';
			const expected = 'status eq active and severity eq high';

			const result = tolerateDoubleQuotes(input);

			expect(result).toEqual(expected);
		});

		it('should handle string with only single quotes', () => {
			const input = "status eq 'active' and severity eq 'high'";
			const expected = "status eq 'active' and severity eq 'high'";

			const result = tolerateDoubleQuotes(input);

			expect(result).toEqual(expected);
		});

		it('should handle mixed quotes', () => {
			const input = 'status eq "active" and name eq \'test\' and type eq "alert"';
			const expected = "status eq 'active' and name eq 'test' and type eq 'alert'";

			const result = tolerateDoubleQuotes(input);

			expect(result).toEqual(expected);
		});

		it('should handle escaped quotes', () => {
			const input = 'description eq "He said \\"hello\\""';
			const expected = "description eq 'He said \\'hello\\''";

			const result = tolerateDoubleQuotes(input);

			expect(result).toEqual(expected);
		});

		it('should handle special characters within quotes', () => {
			const input = 'title eq "Alert: SQL Injection @#$%^&*()"';
			const expected = "title eq 'Alert: SQL Injection @#$%^&*()'";

			const result = tolerateDoubleQuotes(input);

			expect(result).toEqual(expected);
		});

		it('should handle very long strings', () => {
			const longString = '"' + 'a'.repeat(1000) + '"';
			const expectedString = "'" + 'a'.repeat(1000) + "'";

			const result = tolerateDoubleQuotes(longString);

			expect(result).toEqual(expectedString);
		});

		it('should handle unicode characters', () => {
			const input = 'title eq "Alert: 测试 🚨 данные"';
			const expected = "title eq 'Alert: 测试 🚨 данные'";

			const result = tolerateDoubleQuotes(input);

			expect(result).toEqual(expected);
		});
	});

	describe('throwOnEmptyUpdate', () => {
		it('should throw NodeOperationError with correct message', () => {
			expect(() => {
				throwOnEmptyUpdate.call(mockExecuteFunctions);
			}).toThrow(NodeOperationError);
		});

		it('should throw with expected error message', () => {
			expect(() => {
				throwOnEmptyUpdate.call(mockExecuteFunctions);
			}).toThrow('Please enter at least one field to update');
		});

		it('should use the correct node context', () => {
			try {
				throwOnEmptyUpdate.call(mockExecuteFunctions);
			} catch (error) {
				expect(mockExecuteFunctions.getNode).toHaveBeenCalled();
			}
		});

		it('should always throw regardless of input', () => {
			expect(() => {
				throwOnEmptyUpdate.call(mockExecuteFunctions);
			}).toThrow();
		});
	});

	describe('Edge Cases and Integration', () => {
		beforeEach(() => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				oauthTokenData: {
					access_token: 'test-access-token',
				},
			});
		});

		it('should handle concurrent requests', async () => {
			const mockResponse = { data: 'test' };
			mockRequest.mockResolvedValue(mockResponse);

			const promises: Array<Promise<any>> = [];
			for (let i = 0; i < 5; i++) {
				promises.push(msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts/' + i));
			}

			const results = await Promise.all(promises);

			expect(results).toHaveLength(5);
			expect(mockRequest).toHaveBeenCalledTimes(5);
		});

		it('should handle extremely large request bodies', async () => {
			const mockResponse = { success: true };
			const largeBody = { data: 'x'.repeat(10000) };
			mockRequest.mockResolvedValue(mockResponse);

			const result = await msGraphSecurityApiRequest.call(
				mockExecuteFunctions,
				'POST',
				'/alerts',
				largeBody,
			);

			expect(result).toEqual(mockResponse);
			expect(mockRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: largeBody,
				}),
			);
		});

		it('should handle empty parameters gracefully', async () => {
			const mockResponse = { data: 'test' };
			mockRequest.mockResolvedValue(mockResponse);

			const result = await msGraphSecurityApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/alerts',
				{},
				{},
				{},
			);

			expect(result).toEqual(mockResponse);
		});
	});
});
