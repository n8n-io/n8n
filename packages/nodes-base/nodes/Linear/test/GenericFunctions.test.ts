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
		it('should correctly sort objects by name in ascending order', () => {
			// Test data
			const items = [
				{ name: 'Banana', id: 3 },
				{ name: 'apple', id: 2 },
				{ name: 'Cherry', id: 1 },
				{ name: 'date', id: 4 },
			];

			// Execute sort
			const sorted = [...items].sort(sort);

			// Verify sorted order (case-insensitive)
			expect(sorted.map((item) => item.id)).toEqual([2, 3, 1, 4]);
			expect(sorted.map((item) => item.name)).toEqual(['apple', 'Banana', 'Cherry', 'date']);
		});

		it('should treat uppercase and lowercase names as equal', () => {
			const a = { name: 'apple' };
			const b = { name: 'APPLE' };

			expect(sort(a, b)).toBe(0);
			expect(sort(b, a)).toBe(0);
		});

		it('should return -1 when first name comes before second name alphabetically', () => {
			const a = { name: 'apple' };
			const b = { name: 'banana' };

			expect(sort(a, b)).toBe(-1);
		});

		it('should return 1 when first name comes after second name alphabetically', () => {
			const a = { name: 'cherry' };
			const b = { name: 'banana' };

			expect(sort(a, b)).toBe(1);
		});

		it('should return 0 for identical names', () => {
			const a = { name: 'apple' };
			const b = { name: 'apple' };

			expect(sort(a, b)).toBe(0);
		});

		it('should handle mixed case properly', () => {
			// Test data
			const items = [
				{ name: 'abc', id: 1 },
				{ name: 'ABC', id: 2 },
				{ name: 'Abc', id: 3 },
				{ name: 'aBC', id: 4 },
			];

			// They should all be considered equal in terms of sorting
			const sorted = [...items].sort(sort);

			// Original order should be maintained for equal values
			expect(sorted.map((item) => item.id)).toEqual([1, 2, 3, 4]);
		});
	});
});
