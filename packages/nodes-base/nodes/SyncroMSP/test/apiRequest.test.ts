import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { apiRequest } from '../v1/transport';

describe('SyncroMSP > apiRequest', () => {
	it('should encode a path value as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ subdomain: 'acme', apiKey: 'fake-api-key' });
		context.helpers.httpRequest.mockResolvedValue({});

		const ticketId = '4567890/customers?x=1';
		await apiRequest.call(context, 'GET', requestPath`tickets/${ticketId}`);

		expect(context.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				url: expect.objectContaining({
					value: 'https://acme.syncromsp.com/api/v1/tickets/4567890%2Fcustomers%3Fx=1',
				}),
			}),
		);
	});
});
