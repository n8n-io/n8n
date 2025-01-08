import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { capitalizeFirstLetter, linearApiRequest, sort } from '../GenericFunctions';

describe('Linear -> GenericFunctions', () => {
	const mockHttpRequestWithAuthentication = jest.fn();

	describe('linearApiRequest', () => {
		let mockExecuteFunctions:
			| IExecuteFunctions
			| IWebhookFunctions
			| IHookFunctions
			| ILoadOptionsFunctions;

		const setupMockFunctions = (authentication: string) => {
			mockExecuteFunctions = {
				getNodeParameter: jest.fn().mockReturnValue(authentication),
				helpers: {
					httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
				},
				getNode: jest.fn().mockReturnValue({}),
			} as unknown as
				| IExecuteFunctions
				| IWebhookFunctions
				| IHookFunctions
				| ILoadOptionsFunctions;
			jest.clearAllMocks();
		};

		beforeEach(() => {
			setupMockFunctions('apiToken');
		});

		it('should make a successful API request', async () => {
			const response = { data: { success: true } };

			mockHttpRequestWithAuthentication.mockResolvedValue(response);

			const result = await linearApiRequest.call(mockExecuteFunctions, {
				query: '{ viewer { id } }',
			});

			expect(result).toEqual(response);
			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'linearApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://api.linear.app/graphql',
					json: true,
					body: { query: '{ viewer { id } }' },
				}),
			);
		});

		it('should handle API request errors', async () => {
			const errorResponse = {
				errors: [
					{
						message: 'Access denied',
						extensions: {
							userPresentableMessage: 'You need to have the "Admin" scope to create webhooks.',
						},
					},
				],
			};

			mockHttpRequestWithAuthentication.mockResolvedValue(errorResponse);

			await expect(
				linearApiRequest.call(mockExecuteFunctions, { query: '{ viewer { id } }' }),
			).rejects.toThrow(NodeApiError);

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'linearApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://api.linear.app/graphql',
					json: true,
					body: { query: '{ viewer { id } }' },
				}),
			);
		});
	});

	describe('capitalizeFirstLetter', () => {
		it('should capitalize the first letter of a string', () => {
			expect(capitalizeFirstLetter('hello')).toBe('Hello');
			expect(capitalizeFirstLetter('world')).toBe('World');
			expect(capitalizeFirstLetter('capitalize')).toBe('Capitalize');
		});

		it('should return an empty string if input is empty', () => {
			expect(capitalizeFirstLetter('')).toBe('');
		});

		it('should handle single character strings', () => {
			expect(capitalizeFirstLetter('a')).toBe('A');
			expect(capitalizeFirstLetter('b')).toBe('B');
		});

		it('should not change the case of the rest of the string', () => {
			expect(capitalizeFirstLetter('hELLO')).toBe('HELLO');
			expect(capitalizeFirstLetter('wORLD')).toBe('WORLD');
		});
	});

	describe('sort', () => {
		it('should sort objects by name in ascending order', () => {
			const array = [{ name: 'banana' }, { name: 'apple' }, { name: 'cherry' }];

			const sortedArray = array.sort(sort);

			expect(sortedArray).toEqual([{ name: 'apple' }, { name: 'banana' }, { name: 'cherry' }]);
		});

		it('should handle case insensitivity', () => {
			const array = [{ name: 'Banana' }, { name: 'apple' }, { name: 'cherry' }];

			const sortedArray = array.sort(sort);

			expect(sortedArray).toEqual([{ name: 'apple' }, { name: 'Banana' }, { name: 'cherry' }]);
		});

		it('should return 0 for objects with the same name', () => {
			const result = sort({ name: 'apple' }, { name: 'apple' });
			expect(result).toBe(0);
		});
	});
});
