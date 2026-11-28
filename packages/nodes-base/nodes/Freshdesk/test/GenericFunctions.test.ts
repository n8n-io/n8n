import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { freshdeskApiRequest } from '../GenericFunctions';

describe('freshdeskApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key', domain: 'acme' });
		context.helpers.request.mockResolvedValue({});

		const ticketId = '77/delete?x=1';
		await freshdeskApiRequest.call(context, 'GET', requestPath`/tickets/${ticketId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://acme.freshdesk.com/api/v2/tickets/77%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
