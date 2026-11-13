import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { freshworksCrmApiRequest } from '../GenericFunctions';

describe('freshworksCrmApiRequest', () => {
	it('should encode a path value with a slash as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key', domain: 'acme' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const id = '42/delete?x=1';
		await freshworksCrmApiRequest.call(context, 'GET', requestPath`/contacts/${id}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'freshworksCrmApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://acme.myfreshworks.com/crm/sales/api/contacts/42%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
