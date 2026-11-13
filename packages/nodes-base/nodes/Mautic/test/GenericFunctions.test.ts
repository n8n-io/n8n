import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { mauticApiRequest } from '../GenericFunctions';

describe('mauticApiRequest', () => {
	it('should encode path values and join them with the credentials URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('credentials');
		context.getCredentials.mockResolvedValue({ url: 'https://mautic.example.com/' });
		context.helpers.requestWithAuthentication.mockResolvedValue({ contact: {} });

		const contactId = '34/delete?x=1';
		await mauticApiRequest.call(context, 'GET', requestPath`/contacts/${contactId}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'mauticApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://mautic.example.com/api/contacts/34%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
