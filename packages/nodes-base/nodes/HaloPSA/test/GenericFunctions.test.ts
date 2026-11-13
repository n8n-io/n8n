import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { haloPSAApiRequest } from '../GenericFunctions';

describe('haloPSAApiRequest', () => {
	it('should encode path values and join them with the resource server URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			resourceApiUrl: 'https://acme.halopsa.com/api',
		});
		context.helpers.request.mockResolvedValue({});

		const ticketId = '56/delete?x=1';
		await haloPSAApiRequest.call(
			context,
			'GET',
			requestPath`/tickets/${ticketId}`,
			'fake-access-token',
		);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://acme.halopsa.com/api/tickets/56%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
