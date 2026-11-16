import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { parseAnalyzers, theHiveApiRequest } from '../GenericFunctions';

describe('theHiveApiRequest', () => {
	it('should encode path values and join them with the credentials URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			url: 'https://thehive.example.com/',
			allowUnauthorizedCerts: false,
		});
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const id = '~41160/markAsRead?x=1';
		await theHiveApiRequest.call(context, 'GET', requestPath`/alert/${id}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'theHiveApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://thehive.example.com/api/alert/~41160%2FmarkAsRead%3Fx=1',
				}),
			}),
		);
	});
});

describe('Test TheHive, parseAnalyzers', () => {
	it('should map an array of "analyzerId::cortexId" entries', () => {
		const result = parseAnalyzers(['analyzer-1::cortex-1', 'analyzer-2::cortex-2']);

		expect(result).toEqual([
			{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' },
			{ analyzerId: 'analyzer-2', cortexId: 'cortex-2' },
		]);
	});

	it('should map a comma-joined string (expression coercion case)', () => {
		const result = parseAnalyzers('analyzer-1::cortex-1, analyzer-2::cortex-2');

		expect(result).toEqual([
			{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' },
			{ analyzerId: 'analyzer-2', cortexId: 'cortex-2' },
		]);
	});

	it('should handle a single analyzer provided as a string', () => {
		const result = parseAnalyzers('analyzer-1::cortex-1');

		expect(result).toEqual([{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' }]);
	});

	it('should drop empty entries from a comma-joined string', () => {
		const result = parseAnalyzers('analyzer-1::cortex-1,, analyzer-2::cortex-2,');

		expect(result).toEqual([
			{ analyzerId: 'analyzer-1', cortexId: 'cortex-1' },
			{ analyzerId: 'analyzer-2', cortexId: 'cortex-2' },
		]);
	});

	it('should return an empty array for an empty string', () => {
		expect(parseAnalyzers('')).toEqual([]);
	});
});
