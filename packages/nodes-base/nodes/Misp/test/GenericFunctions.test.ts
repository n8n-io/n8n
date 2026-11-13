import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { mispApiRequest } from '../GenericFunctions';

describe('mispApiRequest', () => {
	it('should encode path values and join them with the credentials base URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			apiKey: 'fake-api-key',
			baseUrl: 'https://misp.example.com/',
			allowUnauthorizedCerts: false,
		});
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const eventId = '12/delete?x=1';
		await mispApiRequest.call(context, 'GET', requestPath`/events/view/${eventId}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'mispApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://misp.example.com/events/view/12%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
