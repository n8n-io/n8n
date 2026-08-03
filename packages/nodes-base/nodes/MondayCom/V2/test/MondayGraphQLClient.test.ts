/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeApiError } from 'n8n-workflow';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
	MondayGraphQLClient,
	MondayErrorCode,
	type MondayGraphQLResponse,
} from '../transport/MondayGraphQLClient';

describe('MondayGraphQLClient', () => {
	let mockContext: any;
	let client: MondayGraphQLClient;

	beforeEach(() => {
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			getNodeParameter: vi.fn(() => 'accessToken'),
			helpers: {
				httpRequestWithAuthentication: vi.fn(),
			},
		};
		// baseRetryDelayMs = 1 so retry tests don't sleep for real
		client = new MondayGraphQLClient(mockContext, '2024-10', 1);
	});

	describe('execute', () => {
		it('should return data on successful query', async () => {
			const mockData = { me: { id: '123', name: 'Test User' } };
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: mockData,
				errors: undefined,
			});

			const result = await client.execute('{ me { id name } }', 0);
			expect(result).toEqual(mockData);
		});

		it('should throw NodeApiError on GraphQL errors', async () => {
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Authentication required',
						error_code: MondayErrorCode.Unauthorized,
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			await expect(client.execute('{ me { id } }', 0)).rejects.toThrow(NodeApiError);
		});

		it('should throw on empty response data', async () => {
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: undefined,
				errors: undefined,
			});

			await expect(client.execute('{ me { id } }', 0)).rejects.toThrow();
		});

		it('should include variables in request', async () => {
			const variables = { boardId: '12345' };
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { boards: [] },
				errors: undefined,
			});

			await client.execute(
				'query($boardId: Int!) { boards(ids: [$boardId]) { id } }',
				0,
				variables,
			);

			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'mondayComApi',
				expect.objectContaining({
					body: expect.objectContaining({
						variables,
					}),
				}),
			);
		});

		it('should set API-Version header', async () => {
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { me: { id: '123' } },
				errors: undefined,
			});

			await client.execute('{ me { id } }', 0);

			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'mondayComApi',
				expect.objectContaining({
					headers: expect.objectContaining({
						'API-Version': '2024-10',
						'User-Agent': 'n8n-monday',
					}),
				}),
			);
		});
	});

	describe('credential selection (dual auth)', () => {
		it('authenticates with mondayComApi when the node uses an access token', async () => {
			mockContext.getNodeParameter.mockReturnValue('accessToken');
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { me: { id: '123' } },
			});

			await client.execute('{ me { id } }', 0);

			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'mondayComApi',
				expect.anything(),
			);
		});

		it('authenticates with mondayComOAuth2Api when the node uses OAuth2', async () => {
			mockContext.getNodeParameter.mockReturnValue('oAuth2');
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { me: { id: '123' } },
			});

			await client.execute('{ me { id } }', 0);

			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'mondayComOAuth2Api',
				expect.anything(),
			);
		});

		it('falls back to mondayComApi when the authentication parameter is unreadable', async () => {
			mockContext.getNodeParameter.mockImplementation(() => {
				throw new Error('Could not get parameter');
			});
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { me: { id: '123' } },
			});

			await client.execute('{ me { id } }', 0);

			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'mondayComApi',
				expect.anything(),
			);
		});
	});

	describe('error mapping', () => {
		it('should map ComplexityException with retry guidance', async () => {
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Query complexity too high',
						error_code: MondayErrorCode.ComplexityException,
					},
				],
				extensions: {
					retry_in_seconds: 5,
				},
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				// retryAttempts = 0: complexity errors are retryable and would
				// otherwise honor the retry_in_seconds hint before rethrowing.
				await client.execute('{ complex query }', 0, undefined, 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.message).toContain('too complex');
				expect(apiError.description).toContain('retry');
			}
		});

		it('should map ColumnValueException', async () => {
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Invalid column value provided',
						error_code: MondayErrorCode.ColumnValueException,
						status_code: 400,
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				await client.execute('mutation { ... }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.message).toContain('Invalid column value');
			}
		});

		it('should map error codes from the current extensions-based format', async () => {
			// Real shape observed live (2026-07): code sits under extensions, not top level
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'The board does not exist. Please check your board ID and try again',
						extensions: {
							code: MondayErrorCode.InvalidBoardIdException,
							error_data: { board_id: 1 },
						},
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				await client.execute('mutation { create_item(board_id: 1) { id } }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.message).toContain('Invalid or inaccessible board');
			}
		});

		it('should map InvalidBoardIdException', async () => {
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Board does not exist',
						error_code: MondayErrorCode.InvalidBoardIdException,
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				await client.execute('{ boards(ids: [999]) { id } }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.message).toContain('Invalid or inaccessible board');
			}
		});

		it('should map MutationCallsExceeded (rate limit)', async () => {
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Mutation calls exceeded',
						error_code: MondayErrorCode.MutationCallsExceeded,
					},
				],
				extensions: {
					retry_in_seconds: 60,
				},
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				// retryAttempts = 0: rate-limit errors are retryable, and the retry
				// loop would otherwise honor the 60s retry_in_seconds hint.
				await client.execute('mutation { ... }', 0, undefined, 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.message).toContain('Rate limit');
			}
		});

		it('should retry rate-limited mutations and succeed', async () => {
			const rateLimited: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Mutation calls exceeded',
						error_code: MondayErrorCode.MutationCallsExceeded,
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication
				.mockResolvedValueOnce(rateLimited)
				.mockResolvedValueOnce({ data: { create_item: { id: '1' } } });

			const result = await client.execute('mutation { ... }', 0, undefined, 1);
			expect(result).toEqual({ create_item: { id: '1' } });
			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		it('should map Unauthorized error', async () => {
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Unauthorized',
						error_code: MondayErrorCode.Unauthorized,
						status_code: 401,
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				await client.execute('{ me { id } }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.message).toContain('Authentication failed');
				expect(apiError.description).toContain('API token');
			}
		});

		it('should map NOT_AUTHENTICATED (real 401 body shape, verified live)', async () => {
			// Real response: {"errors":[{"message":"Not authenticated","extensions":{"code":"NOT_AUTHENTICATED"}}]}
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Not authenticated',
						extensions: { code: 'NOT_AUTHENTICATED' },
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				await client.execute('{ me { id } }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				expect((error as NodeApiError).message).toContain('Authentication failed');
			}
		});

		it('should surface HTTP-layer 401 as an auth failure, not generic HTTP error', async () => {
			const httpError = Object.assign(new Error('401 - Unauthorized'), { statusCode: 401 });
			mockContext.helpers.httpRequestWithAuthentication.mockRejectedValue(httpError);

			try {
				await client.execute('{ me { id } }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				expect((error as NodeApiError).message).toContain('Authentication failed');
			}
			// 401 is not transient — must not have been retried
			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('should map DATA_VALIDATIONS_ERROR with per-column failure details (real 422 shape, verified live)', async () => {
			// Real response from create_item on a board with validation rules
			// (enterprise account, 2026-07-17): error_data is an ARRAY.
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'data_validation_error',
						path: ['create_item'],
						extensions: {
							code: 'DATA_VALIDATIONS_ERROR',
							status_code: 422,
							error_data: [
								{
									itemId: null,
									columnIds: ['numeric_mm5bccxb'],
									message: "'vnumbers' must be at least [5]",
								},
								{ itemId: null, columnIds: ['text_mm5bkhh1'], message: "'vtext' is required" },
							],
						},
					},
				],
				extensions: { request_id: 'req-422' },
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				await client.execute('mutation { create_item }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.message).toContain('validation rules rejected');
				expect(apiError.description).toContain("'vnumbers' must be at least [5]");
				expect(apiError.description).toContain("'vtext' is required");
				expect(apiError.description).toContain('numeric_mm5bccxb');
				expect(apiError.description).toContain('text_mm5bkhh1');
			}
			// 422 validation failures are not transient — no retry
			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('should map plan-gated UserUnauthorizedException to a Pro/Enterprise hint', async () => {
			// Real shape from create_validation_rule on a free-tier account (2026-07-17)
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'User unauthorized to perform action',
						extensions: {
							code: 'UserUnauthorizedException',
							error_data: {
								failure_reason:
									'ms-authorization.permissions.data_validation_rules.conciseDescription',
							},
						},
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				await client.execute('mutation { create_validation_rule }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.message).toContain('Pro or Enterprise');
			}
		});

		it('should map generic UserUnauthorizedException without a plan hint', async () => {
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'User unauthorized to perform action',
						extensions: {
							code: 'UserUnauthorizedException',
							error_data: { failure_reason: 'ms-authorization.permissions.something_else' },
						},
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				await client.execute('mutation { whatever }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.message).toContain('Not authorized');
				expect(apiError.message).not.toContain('Pro or Enterprise');
			}
		});

		it('should include fallback message for unknown error codes', async () => {
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Some unknown error',
						error_code: 'UnknownErrorCode',
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			try {
				await client.execute('{ query }', 0);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				const apiError = error as NodeApiError;
				expect(apiError.description).toContain('Some unknown error');
			}
		});
	});

	describe('retry logic', () => {
		it('should retry on HTTP 5xx errors', async () => {
			// First call throws 500, second succeeds
			mockContext.helpers.httpRequestWithAuthentication
				.mockRejectedValueOnce(new Error('Internal Server Error'))
				.mockResolvedValueOnce({
					data: { me: { id: '123' } },
					errors: undefined,
				});

			const result = await client.execute('{ me { id } }', 0, undefined, 1);
			expect(result).toEqual({ me: { id: '123' } });
			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		it('should not retry non-transient GraphQL errors', async () => {
			const mockError: MondayGraphQLResponse = {
				errors: [
					{
						message: 'Invalid column value provided',
						error_code: MondayErrorCode.ColumnValueException,
					},
				],
			};
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue(mockError);

			await expect(client.execute('mutation { ... }', 0, undefined, 3)).rejects.toThrow();
			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('should respect max retry attempts', async () => {
			mockContext.helpers.httpRequestWithAuthentication.mockRejectedValue(
				new Error('Network error'),
			);

			await expect(client.execute('{ me { id } }', 0, undefined, 2)).rejects.toThrow();

			// Called once initially + 2 retries = 3 times
			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
		});
	});

	describe('API version', () => {
		it('should default to the pinned MONDAY_API_VERSION constant', async () => {
			const { MONDAY_API_VERSION } = await import('../transport/constants');
			const defaultClient = new MondayGraphQLClient(mockContext);
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { me: { id: '123' } },
			});

			await defaultClient.execute('{ me { id } }', 0);

			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'mondayComApi',
				expect.objectContaining({
					headers: expect.objectContaining({
						'API-Version': MONDAY_API_VERSION,
						'User-Agent': 'n8n-monday',
					}),
				}),
			);
			// Pinned version must be a stable quarterly release (01/04/07/10), never dev/RC
			expect(MONDAY_API_VERSION).toMatch(/^\d{4}-(01|04|07|10)$/);
		});

		it('should use custom API version if provided', async () => {
			const customClient = new MondayGraphQLClient(mockContext, '2024-01');
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { me: { id: '123' } },
				errors: undefined,
			});

			await customClient.execute('{ me { id } }', 0);

			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'mondayComApi',
				expect.objectContaining({
					headers: expect.objectContaining({
						'API-Version': '2024-01',
						'User-Agent': 'n8n-monday',
					}),
				}),
			);
		});
	});

	describe('executeBulk', () => {
		it('returns data and empty errors on full success', async () => {
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { item0: { id: '1' }, item1: { id: '2' } },
			});

			const result = await client.executeBulk('mutation { ... }', 0);
			expect(result.data).toEqual({ item0: { id: '1' }, item1: { id: '2' } });
			expect(result.errors).toEqual([]);
		});

		it('returns partial data plus per-alias errors instead of throwing', async () => {
			// Verified live: one bad ID nulls its alias, the others still execute.
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { item0: { id: '1', state: 'archived' }, item1: null },
				errors: [
					{
						message: 'Item not found',
						path: ['item1'],
						extensions: { code: 'InvalidItemIdException', status_code: 200 },
					},
				],
			});

			const result = await client.executeBulk('mutation { ... }', 0);
			expect(result.data.item0).toEqual({ id: '1', state: 'archived' });
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].path).toEqual(['item1']);
		});

		it('throws the mapped error when every alias failed', async () => {
			mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { item0: null, item1: null },
				errors: [
					{
						message: 'Item not found',
						path: ['item0'],
						extensions: { code: 'InvalidItemIdException' },
					},
					{
						message: 'Item not found',
						path: ['item1'],
						extensions: { code: 'InvalidItemIdException' },
					},
				],
			});

			await expect(client.executeBulk('mutation { ... }', 0)).rejects.toThrow(NodeApiError);
		});

		it('keeps retry behavior for batch-wide transient errors', async () => {
			mockContext.helpers.httpRequestWithAuthentication
				.mockResolvedValueOnce({
					errors: [{ message: 'Rate limited', error_code: MondayErrorCode.MutationCallsExceeded }],
				})
				.mockResolvedValueOnce({ data: { item0: { id: '1' } } });

			const result = await client.executeBulk('mutation { ... }', 0, undefined, 1);
			expect(result.data).toEqual({ item0: { id: '1' } });
			expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		});
	});
});
