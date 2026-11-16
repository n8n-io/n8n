import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { monicaCrmApiRequest } from '../GenericFunctions';

describe('monicaCrmApiRequest', () => {
	it('should encode path values and join them with the self-hosted domain', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			apiToken: 'fake-token',
			environment: 'selfHosted',
			domain: 'https://monica.example.com/',
		});
		context.helpers.request.mockResolvedValue({ data: {} });

		const contactId = '303/delete?x=1';
		await monicaCrmApiRequest.call(context, 'GET', requestPath`/contacts/${contactId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://monica.example.com/api/contacts/303%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
