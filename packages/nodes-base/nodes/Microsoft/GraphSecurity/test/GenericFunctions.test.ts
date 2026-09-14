import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	msGraphSecurityApiRequest,
	tolerateDoubleQuotes,
	throwOnEmptyUpdate,
} from '../GenericFunctions';
import type { Mock, Mocked } from 'vitest';

describe('Microsoft GraphSecurity GenericFunctions', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequest: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequest = vi.fn();
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
		vi.clearAllMocks();

		// Register this AFTER clearAllMocks so it survives. Unstubbed getNodeParameter returns its
		// own 3rd-arg default (or undefined) instead of a truthy deep-mock proxy, so a node with no
		// explicit authentication resolves to the legacy credential for the right reason: the
		// credential-type resolver only switches to the generic credential on an exact
		// 'microsoftOAuth2Api' match, everything else (incl. undefined) falls back to legacy.
		mockExecuteFunctions.getNodeParameter.mockImplementation((_name, _i, fallback) => fallback);
	});

	afterEach(() => {
		vi.resetAllMocks();
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
			it('propagates credential-resolution failures without issuing a request', async () => {
				mockExecuteFunctions.getCredentials.mockRejectedValue(new Error('Credentials not found'));

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow('Credentials not found');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledTimes(1);
				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
					'microsoftGraphSecurityOAuth2Api',
				);
				expect(mockRequest).not.toHaveBeenCalled();
			});

			it('throws a NodeOperationError when the credential has no access token', async () => {
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {},
				} as any);
				mockRequest.mockResolvedValue({ data: 'test' });

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow(NodeOperationError);

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).rejects.toThrow('No access token found in the credential');

				expect(mockRequest).not.toHaveBeenCalled();
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

				const thrown: unknown = await msGraphSecurityApiRequest
					.call(mockExecuteFunctions, 'GET', '/alerts')
					.catch((error: unknown) => error);

				expect(thrown).toBeInstanceOf(NodeApiError);
				expect((thrown as NodeApiError).message).toBe('Request failed with bad request');
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

				const thrown: unknown = await msGraphSecurityApiRequest
					.call(mockExecuteFunctions, 'GET', '/alerts')
					.catch((error: unknown) => error);

				expect(thrown).toBeInstanceOf(NodeApiError);
				expect((thrown as NodeApiError).message).toContain(
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

				const thrown: unknown = await msGraphSecurityApiRequest
					.call(mockExecuteFunctions, 'GET', '/alerts')
					.catch((error: unknown) => error);

				expect(thrown).toBeInstanceOf(NodeApiError);
				expect((thrown as NodeApiError).message).toContain(
					'Please check that your query parameter syntax is correct',
				);
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

		describe('graphApiBaseUrl from credentials', () => {
			it('should use base URL from credentials', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://graph.microsoft.us/v1.0/security/alerts',
					json: true,
				});
			});

			it('should fall back to default when credentials.graphApiBaseUrl is empty', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: '',
				});

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://graph.microsoft.com/v1.0/security/alerts',
					json: true,
				});
			});

			it('should fall back to default when credentials.graphApiBaseUrl is undefined', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				});

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://graph.microsoft.com/v1.0/security/alerts',
					json: true,
				});
			});

			it('should strip trailing slashes from base URL using regex', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com/',
				});

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://graph.microsoft.com/v1.0/security/alerts',
					json: true,
				});
			});

			it('should strip multiple trailing slashes from base URL', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com///',
				});

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://graph.microsoft.com/v1.0/security/alerts',
					json: true,
				});
			});

			it('should use US Government cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://graph.microsoft.us/v1.0/security/alerts',
					json: true,
				});
			});

			it('should use US Government DOD cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://dod-graph.microsoft.us',
				});

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://dod-graph.microsoft.us/v1.0/security/alerts',
					json: true,
				});
			});

			it('should use China cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequest.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://microsoftgraph.chinacloudapi.cn',
				});

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/security/alerts',
					json: true,
				});
			});

			describe('generic OAuth2 branch', () => {
				beforeEach(() => {
					mockExecuteFunctions.getNodeParameter.mockImplementation((name, _i, fallback) =>
						name === 'authentication' ? 'microsoftOAuth2Api' : fallback,
					);
				});

				it('should use US Government cloud endpoint', async () => {
					const mockResponse = { data: 'test' };
					mockRequest.mockResolvedValue(mockResponse);
					mockExecuteFunctions.getCredentials.mockResolvedValue({
						oauthTokenData: {
							access_token: 'test-access-token',
						},
						graphApiBaseUrl: 'https://graph.microsoft.us',
					});

					await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

					expect(mockRequest).toHaveBeenCalledWith({
						headers: {
							Authorization: 'Bearer test-access-token',
						},
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/security/alerts',
						json: true,
					});
				});

				it('should use US Government DOD cloud endpoint', async () => {
					const mockResponse = { data: 'test' };
					mockRequest.mockResolvedValue(mockResponse);
					mockExecuteFunctions.getCredentials.mockResolvedValue({
						oauthTokenData: {
							access_token: 'test-access-token',
						},
						graphApiBaseUrl: 'https://dod-graph.microsoft.us',
					});

					await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

					expect(mockRequest).toHaveBeenCalledWith({
						headers: {
							Authorization: 'Bearer test-access-token',
						},
						method: 'GET',
						uri: 'https://dod-graph.microsoft.us/v1.0/security/alerts',
						json: true,
					});
				});

				it('should use China cloud endpoint', async () => {
					const mockResponse = { data: 'test' };
					mockRequest.mockResolvedValue(mockResponse);
					mockExecuteFunctions.getCredentials.mockResolvedValue({
						oauthTokenData: {
							access_token: 'test-access-token',
						},
						graphApiBaseUrl: 'https://microsoftgraph.chinacloudapi.cn',
					});

					await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

					expect(mockRequest).toHaveBeenCalledWith({
						headers: {
							Authorization: 'Bearer test-access-token',
						},
						method: 'GET',
						uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/security/alerts',
						json: true,
					});
				});
			});
		});

		describe('credential resolution', () => {
			it('should use the legacy credential by default (backfill/fallback contract)', async () => {
				mockRequest.mockResolvedValue({ data: 'test' });

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledTimes(1);
				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
					'microsoftGraphSecurityOAuth2Api',
				);
			});

			it('should use the legacy credential when authentication is microsoftGraphSecurityOAuth2Api', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((name, _i, fallback) =>
					name === 'authentication' ? 'microsoftGraphSecurityOAuth2Api' : fallback,
				);
				mockRequest.mockResolvedValue({ data: 'test' });

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledTimes(1);
				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
					'microsoftGraphSecurityOAuth2Api',
				);
			});

			it('should use the generic credential when authentication is microsoftOAuth2Api', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((name, _i, fallback) =>
					name === 'authentication' ? 'microsoftOAuth2Api' : fallback,
				);
				mockRequest.mockResolvedValue({ data: 'test' });

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledTimes(1);
				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			});

			it('resolves the legacy credential for a saved node with no authentication param', async () => {
				mockRequest.mockResolvedValue({ data: 'test' });

				await expect(
					msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts'),
				).resolves.not.toThrow();

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
					'microsoftGraphSecurityOAuth2Api',
				);
			});

			it('resolves the legacy credential for any unrecognized authentication value', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((name, _i, fallback) =>
					name === 'authentication' ? 'somethingElse' : fallback,
				);
				mockRequest.mockResolvedValue({ data: 'test' });

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
					'microsoftGraphSecurityOAuth2Api',
				);
			});

			it('resolves the legacy credential when the resolved authentication value is undefined', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((name, _i, fallback) =>
					name === 'authentication' ? undefined : fallback,
				);
				mockRequest.mockResolvedValue({ data: 'test' });

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
					'microsoftGraphSecurityOAuth2Api',
				);
			});

			it('should build a default-base-URL request on the generic branch', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((name, _i, fallback) =>
					name === 'authentication' ? 'microsoftOAuth2Api' : fallback,
				);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				});
				mockRequest.mockResolvedValue({ data: 'test' });

				await msGraphSecurityApiRequest.call(mockExecuteFunctions, 'GET', '/alerts');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequest).toHaveBeenCalledWith({
					headers: {
						Authorization: 'Bearer test-access-token',
					},
					method: 'GET',
					uri: 'https://graph.microsoft.com/v1.0/security/alerts',
					json: true,
				});
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
			expect(() => {
				throwOnEmptyUpdate.call(mockExecuteFunctions);
			}).toThrow();

			expect(mockExecuteFunctions.getNode).toHaveBeenCalled();
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
