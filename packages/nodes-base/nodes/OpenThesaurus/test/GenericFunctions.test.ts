import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { openThesaurusApiRequest } from '../GenericFunctions';

describe('openThesaurusApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.request.mockResolvedValue({});

		const word = 'Haus/admin?x=1';
		await openThesaurusApiRequest.call(context, 'GET', requestPath`/synonyme/${word}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://www.openthesaurus.de/synonyme/Haus%2Fadmin%3Fx=1',
				}),
			}),
		);
	});
});
