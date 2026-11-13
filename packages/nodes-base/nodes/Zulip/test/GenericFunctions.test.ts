import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { toMultiOptionsCsv, zulipApiRequest } from '../GenericFunctions';

describe('Zulip > GenericFunctions', () => {
	describe('zulipApiRequest', () => {
		it('should encode path values and join them with the credentials URL', async () => {
			const context = mockDeep<IExecuteFunctions>();
			context.getCredentials.mockResolvedValue({
				url: 'https://chat.example.com/',
				email: 'bot@example.com',
				apiKey: 'fake-api-key',
			});
			context.helpers.request.mockResolvedValue({});

			const messageId = '42/history?x=1';
			await zulipApiRequest.call(context, 'GET', requestPath`/messages/${messageId}`);

			expect(context.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: expect.objectContaining({
						value: 'https://chat.example.com/api/v1/messages/42%2Fhistory%3Fx=1',
					}),
				}),
			);
		});
	});

	describe('toMultiOptionsCsv', () => {
		it('joins array values', () => {
			expect(toMultiOptionsCsv(['user1@example.com', 'user2@example.com'])).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('trims entries inside an array (interpolated array elements)', () => {
			expect(toMultiOptionsCsv(['user1@example.com ', ' user2@example.com'])).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('coerces non-string array entries via String()', () => {
			expect(toMultiOptionsCsv([1, 2, 3])).toBe('1,2,3');
		});

		it('accepts a comma-joined string (the whitespace-expression coercion case)', () => {
			expect(toMultiOptionsCsv('user1@example.com,user2@example.com ')).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('trims whitespace around each entry in a comma-string', () => {
			expect(toMultiOptionsCsv(' user1@example.com , user2@example.com ')).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('drops empty entries', () => {
			expect(toMultiOptionsCsv(['user1@example.com', '', '  ', 'user2@example.com'])).toBe(
				'user1@example.com,user2@example.com',
			);
		});

		it('returns an empty string for undefined/null/empty values', () => {
			expect(toMultiOptionsCsv(undefined)).toBe('');
			expect(toMultiOptionsCsv(null)).toBe('');
			expect(toMultiOptionsCsv('')).toBe('');
			expect(toMultiOptionsCsv([])).toBe('');
		});
	});
});
